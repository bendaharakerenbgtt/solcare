import React, { useState } from 'react';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { rupiah } from '../../lib/format';
import { isLate } from '../../lib/estimation';

export const ReportsPage: React.FC = () => {
  const { data: orders } = useAsync(() => repo.listOrders(), []);

  const [dateRange, setDateRange] = useState<'all' | 'this_month' | 'last_30'>('all');

  const now = new Date();

  // Filter by date
  const filteredOrders = (orders || []).filter((o) => {
    if (dateRange === 'all') return true;
    const rec = new Date(o.receivedAt);
    if (dateRange === 'this_month') {
      return rec.getFullYear() === now.getFullYear() && rec.getMonth() === now.getMonth();
    }
    if (dateRange === 'last_30') {
      const diffDays = (now.getTime() - rec.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 30;
    }
    return true;
  });

  // Calculate statistics
  const totalOrders = filteredOrders.length;

  // IMPORTANT BRIEF RULE: Revenue only from fully paid orders
  const paidOrders = filteredOrders.filter((o) => o.payment.status === 'lunas');
  const unpaidOrders = filteredOrders.filter((o) => o.payment.status === 'belum_lunas');

  const realRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const pendingRevenue = unpaidOrders.reduce((sum, o) => sum + o.total, 0);

  // Revenue by payment method
  const qrisOrders = paidOrders.filter((o) => o.payment.method === 'qris');
  const cashOrders = paidOrders.filter((o) => o.payment.method === 'tunai');
  const qrisRevenue = qrisOrders.reduce((sum, o) => sum + o.total, 0);
  const cashRevenue = cashOrders.reduce((sum, o) => sum + o.total, 0);

  const qrisPct = realRevenue > 0 ? Math.round((qrisRevenue / realRevenue) * 100) : 0;
  const cashPct = realRevenue > 0 ? Math.round((cashRevenue / realRevenue) * 100) : 0;

  // Top services selected
  const serviceCount = new Map<string, { count: number; revenue: number }>();
  filteredOrders.forEach((o) => {
    o.services.forEach((s) => {
      const cur = serviceCount.get(s.name) || { count: 0, revenue: 0 };
      serviceCount.set(s.name, {
        count: cur.count + 1,
        revenue: cur.revenue + (o.payment.status === 'lunas' ? s.price : 0),
      });
    });
  });

  const topServices = Array.from(serviceCount.entries()).sort((a, b) => b[1].count - a[1].count);
  const maxServiceCount = topServices.length > 0 ? topServices[0][1].count : 1;

  // Late orders analysis
  const lateOrders = filteredOrders.filter((o) => isLate(o, now) && o.status !== 'diambil');

  return (
    <div className="stack" style={{ gap: '16px' }}>
      <div className="admin-page-header">
        <h1>Laporan Bisnis</h1>
      </div>

      {/* Period Filter Pills (Consistent with Orders & Services) */}
      <div className="services-filter-pills">
        <button
          type="button"
          className={`activity-filter-btn filter-all ${dateRange === 'all' ? 'active' : ''}`}
          onClick={() => setDateRange('all')}
        >
          Semua Periode
        </button>
        <button
          type="button"
          className={`activity-filter-btn filter-main ${dateRange === 'this_month' ? 'active' : ''}`}
          onClick={() => setDateRange('this_month')}
        >
          Bulan Ini
        </button>
        <button
          type="button"
          className={`activity-filter-btn filter-express ${dateRange === 'last_30' ? 'active' : ''}`}
          onClick={() => setDateRange('last_30')}
        >
          30 Hari Terakhir
        </button>
      </div>

      {/* Modern Compact 2x2 Metrics Cards on Mobile (4 cols on Desktop) */}
      <div className="dash-metrics-grid">
        <div className="dash-metric-card">
          <div className="icon-label">
            <span>Pendapatan Lunas</span>
          </div>
          <div className="val currency" style={{ color: 'var(--ok)' }}>
            {rupiah(realRevenue)}
          </div>
          <div className="sub">{paidOrders.length} transaksi terverifikasi</div>
        </div>

        <div className="dash-metric-card">
          <div className="icon-label">
            <span>Piutang (Belum Lunas)</span>
          </div>
          <div
            className="val currency"
            style={{ color: unpaidOrders.length ? 'var(--warn)' : 'var(--muted)' }}
          >
            {rupiah(pendingRevenue)}
          </div>
          <div className="sub">{unpaidOrders.length} pesanan belum lunas</div>
        </div>

        <div className="dash-metric-card">
          <div className="icon-label">
            <span>Total Pesanan</span>
          </div>
          <div className="val">{totalOrders}</div>
          <div className="sub">
            Rata-rata: {paidOrders.length ? rupiah(Math.round(realRevenue / paidOrders.length)) : 'Rp0'}
          </div>
        </div>

        <div className="dash-metric-card">
          <div className="icon-label">
            <span>Status Ketepatan</span>
          </div>
          <div
            className="val"
            style={{ color: lateOrders.length > 0 ? 'var(--danger)' : 'var(--ok)' }}
          >
            {lateOrders.length > 0 ? `${lateOrders.length} Lewat` : '100%'}
          </div>
          <div className="sub">
            {lateOrders.length > 0 ? 'Melewati target estimasi' : 'Semua pengerjaan tepat waktu'}
          </div>
        </div>
      </div>

      {/* Notice regarding accounting transparency (Clean text, no emoji) */}
      <div className="alert info" style={{ fontSize: '0.82rem', lineHeight: '1.45' }}>
        <strong>Catatan Akuntansi:</strong> Pendapatan bersih hanya mengakui pesanan yang status
        pembayarannya telah terverifikasi <strong>Lunas</strong> oleh kasir. Nilai belum lunas
        dipisahkan sebagai piutang agar omzet riil tercatat akurat.
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-2">
        {/* Payment Methods Breakdown */}
        <div className="card">
          <div className="row between" style={{ alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Metode Pembayaran Kasir</h3>
            <span className="badge ok">{paidOrders.length} Lunas</span>
          </div>

          <div className="stack" style={{ gap: '14px' }}>
            {/* QRIS */}
            <div className="stack" style={{ gap: '6px' }}>
              <div className="row between" style={{ fontSize: '0.86rem' }}>
                <div>
                  <strong>QRIS</strong>{' '}
                  <span className="xs muted">({qrisOrders.length} transaksi)</span>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>
                  {rupiah(qrisRevenue)}{' '}
                  <span className="xs muted" style={{ fontWeight: 600 }}>
                    ({qrisPct}%)
                  </span>
                </div>
              </div>
              <div className="report-progress-bar">
                <div className="report-progress-fill qris" style={{ width: `${qrisPct}%` }} />
              </div>
            </div>

            {/* Tunai */}
            <div className="stack" style={{ gap: '6px' }}>
              <div className="row between" style={{ fontSize: '0.86rem' }}>
                <div>
                  <strong>Tunai (Cash)</strong>{' '}
                  <span className="xs muted">({cashOrders.length} transaksi)</span>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>
                  {rupiah(cashRevenue)}{' '}
                  <span className="xs muted" style={{ fontWeight: 600 }}>
                    ({cashPct}%)
                  </span>
                </div>
              </div>
              <div className="report-progress-bar">
                <div className="report-progress-fill cash" style={{ width: `${cashPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Top Services Leaderboard */}
        <div className="card">
          <div className="row between" style={{ alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Layanan Terpopuler</h3>
            <span className="badge teal">{topServices.length} Jenis</span>
          </div>

          {topServices.length === 0 ? (
            <div className="empty" style={{ padding: '24px 12px' }}>
              Belum ada data pengerjaan layanan pada periode ini.
            </div>
          ) : (
            <div className="report-leaderboard">
              {topServices.slice(0, 5).map(([name, stat], idx) => {
                const rankClass = idx === 0 ? 'top-1' : idx === 1 ? 'top-2' : idx === 2 ? 'top-3' : '';
                const pct = Math.round((stat.count / maxServiceCount) * 100);

                return (
                  <div key={name} className="report-rank-row">
                    <div className="report-rank-top">
                      <div className="report-rank-title">
                        <span className={`report-rank-badge ${rankClass}`}>{idx + 1}</span>
                        <span>{name}</span>
                      </div>
                      <div className="report-rank-stats">
                        <span className="badge" style={{ fontSize: '0.72rem' }}>
                          {stat.count}x
                        </span>
                        <strong style={{ fontSize: '0.84rem', color: 'var(--primary)' }}>
                          {rupiah(stat.revenue)}
                        </strong>
                      </div>
                    </div>
                    <div className="report-progress-bar">
                      <div className="report-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
