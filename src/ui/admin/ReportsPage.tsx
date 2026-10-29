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
  const qrisRevenue = paidOrders
    .filter((o) => o.payment.method === 'qris')
    .reduce((sum, o) => sum + o.total, 0);
  const cashRevenue = paidOrders
    .filter((o) => o.payment.method === 'tunai')
    .reduce((sum, o) => sum + o.total, 0);

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

  // Late orders analysis
  const lateOrders = filteredOrders.filter((o) => isLate(o, now) && o.status !== 'diambil');

  return (
    <div className="stack" style={{ gap: '24px' }}>
      <div className="admin-page-header">
        <h1>Laporan Bisnis</h1>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as any)}
          style={{ width: 'auto', padding: '6px 10px', fontSize: '0.82rem', borderRadius: '8px' }}
        >
          <option value="all">Semua Periode</option>
          <option value="this_month">Bulan Ini</option>
          <option value="last_30">30 Hari Terakhir</option>
        </select>
      </div>

      {/* Revenue & Volume Cards */}
      <div className="grid grid-4">
        <div className="card stat">
          <div className="value" style={{ color: 'var(--primary)' }}>
            {rupiah(realRevenue)}
          </div>
          <div className="label">Pendapatan Diterima (Lunas)</div>
          <div className="xs muted">Dari {paidOrders.length} transaksi terverifikasi</div>
        </div>

        <div className="card stat">
          <div className="value" style={{ color: unpaidOrders.length ? 'var(--warn)' : 'var(--muted)' }}>
            {rupiah(pendingRevenue)}
          </div>
          <div className="label">Belum Lunas (Piutang Kasir)</div>
          <div className="xs muted">{unpaidOrders.length} pesanan belum lunas</div>
        </div>

        <div className="card stat">
          <div className="value">{totalOrders}</div>
          <div className="label">Total Pesanan Masuk</div>
          <div className="xs muted">Periode terpilih</div>
        </div>

        <div className="card stat">
          <div className="value" style={{ color: lateOrders.length > 0 ? 'var(--danger)' : 'var(--ok)' }}>
            {lateOrders.length}
          </div>
          <div className="label">Pernah / Sedang Terlambat</div>
          <div className="xs muted">Melewati target estimasi</div>
        </div>
      </div>

      {/* Notice regarding accounting transparency */}
      <div className="alert info">
        ℹ️ <strong>Catatan Akuntansi:</strong> Pendapatan bersih hanya mengakui pesanan yang status pembayarannya telah terverifikasi <strong>Lunas</strong> oleh pegawai. Nilai belum lunas dipisahkan agar laporan akurat tanpa menggelembungkan omzet riil.
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-2">
        {/* Payment Methods Breakdown */}
        <div className="card">
          <h3>Pembayaran Berdasarkan Metode</h3>
          <p className="small muted" style={{ marginBottom: '16px' }}>
            Hanya menghitung dana yang sudah lunas diterima di kasir.
          </p>
          <div className="stack" style={{ gap: '14px' }}>
            <div className="bar-row">
              <div>
                <strong>QRIS</strong>
                <div className="xs muted">
                  {paidOrders.filter((o) => o.payment.method === 'qris').length} transaksi
                </div>
              </div>
              <div className="progress">
                <div
                  style={{
                    width: `${realRevenue > 0 ? (qrisRevenue / realRevenue) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="right">
                <strong>{rupiah(qrisRevenue)}</strong>
              </div>
            </div>

            <div className="bar-row">
              <div>
                <strong>Tunai (Cash)</strong>
                <div className="xs muted">
                  {paidOrders.filter((o) => o.payment.method === 'tunai').length} transaksi
                </div>
              </div>
              <div className="progress">
                <div
                  style={{
                    width: `${realRevenue > 0 ? (cashRevenue / realRevenue) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="right">
                <strong>{rupiah(cashRevenue)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Top Services Breakdown */}
        <div className="card">
          <h3>Layanan Paling Banyak Dipilih</h3>
          <p className="small muted" style={{ marginBottom: '16px' }}>
            Frekuensi pemilihan layanan oleh pelanggan.
          </p>

          {topServices.length === 0 ? (
            <div className="empty">Belum ada data pengerjaan layanan.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Layanan</th>
                    <th className="right">Jumlah</th>
                    <th className="right">Total Omzet</th>
                  </tr>
                </thead>
                <tbody>
                  {topServices.slice(0, 8).map(([name, stat]) => (
                    <tr key={name}>
                      <td><strong>{name}</strong></td>
                      <td className="right">{stat.count}x</td>
                      <td className="right">{rupiah(stat.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
