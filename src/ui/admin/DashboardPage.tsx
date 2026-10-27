import React from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { fmtDateTime, rupiah, STATUS_LABEL, displayCode } from '../../lib/format';
import { isLate } from '../../lib/estimation';
import { dateKey } from '../../lib/dates';

export const DashboardPage: React.FC = () => {
  const { data: orders, loading } = useAsync(() => repo.listOrders(), []);
  const { data: settings } = useAsync(() => repo.getSettings(), []);

  const now = new Date();
  const todayStr = dateKey(now);

  const activeOrders = (orders || []).filter((o) => o.status !== 'selesai' && o.status !== 'diambil');
  const todayEst = (orders || []).filter((o) => o.estimatedAt && o.estimatedAt.startsWith(todayStr) && o.status !== 'diambil');
  const completedOrders = (orders || []).filter((o) => o.status === 'selesai');
  const pickedUpOrders = (orders || []).filter((o) => o.status === 'diambil');
  const lateOrders = (orders || []).filter((o) => isLate(o, now) && o.status !== 'diambil');
  const unpaidOrders = (orders || []).filter((o) => o.payment.status === 'belum_lunas');

  const recentOrders = (orders || []).slice(0, 6);

  return (
    <div className="stack" style={{ gap: '24px' }}>
      <div className="admin-top admin-top-responsive">
        <div>
          <h1>Dashboard Operasional</h1>
          <p className="small muted">
            Ringkasan antrean, beban kerja, dan status pesanan hari ini.
          </p>
        </div>
        <div className="spacer" />
        <Link to="/admin/orders/new" className="btn admin-header-action-btn">
          ➕ Catat Pesanan Baru
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-4">
        <div className="card stat">
          <div className="value" style={{ color: 'var(--primary)' }}>
            {activeOrders.length}
          </div>
          <div className="label">Pesanan Aktif</div>
          <div className="xs muted">Kapasitas: {settings?.dailyCapacity || 20} unit/hari</div>
        </div>

        <div className="card stat">
          <div className="value" style={{ color: 'var(--ink)' }}>
            {todayEst.length}
          </div>
          <div className="label">Estimasi Selesai Hari Ini</div>
          <div className="xs muted">Perlu diselesaikan segera</div>
        </div>

        <div className="card stat">
          <div className="value" style={{ color: lateOrders.length > 0 ? 'var(--danger)' : 'var(--ok)' }}>
            {lateOrders.length}
          </div>
          <div className="label">Pesanan Terlambat</div>
          <div className="xs muted">Melewati target estimasi</div>
        </div>

        <div className="card stat">
          <div className="value" style={{ color: 'var(--ok)' }}>
            {completedOrders.length}
          </div>
          <div className="label">Siap Diambil</div>
          <div className="xs muted">Menunggu dijemput pelanggan</div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-3">
        <div className="card flat" style={{ padding: '16px' }}>
          <div className="row between">
            <span className="small muted">Total Sudah Diambil:</span>
            <strong>{pickedUpOrders.length} pesanan</strong>
          </div>
        </div>
        <div className="card flat" style={{ padding: '16px' }}>
          <div className="row between">
            <span className="small muted">Status Belum Lunas:</span>
            <strong style={{ color: unpaidOrders.length ? 'var(--warn)' : 'inherit' }}>
              {unpaidOrders.length} pesanan
            </strong>
          </div>
        </div>
        <div className="card flat" style={{ padding: '16px' }}>
          <div className="row between">
            <span className="small muted">Total Seluruh Pesanan:</span>
            <strong>{orders?.length || 0} pesanan</strong>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="card">
        <div className="row between" style={{ marginBottom: '16px' }}>
          <h3>Pesanan Terbaru</h3>
          <Link to="/admin/orders" className="small">
            Lihat Semua Pesanan →
          </Link>
        </div>

        {loading ? (
          <div className="empty">Memuat data pesanan...</div>
        ) : recentOrders.length === 0 ? (
          <div className="empty">Belum ada pesanan dicatat. Silakan input pesanan baru.</div>
        ) : (
          <>
            <div className="table-scroll-hint">👉 Geser ke samping untuk melihat tabel lengkap</div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                <tr>
                  <th>Kode & Tanggal</th>
                  <th>Pelanggan</th>
                  <th>Barang</th>
                  <th>Status</th>
                  <th>Estimasi</th>
                  <th>Pembayaran</th>
                  <th className="right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => {
                  const late = isLate(o, now) && o.status !== 'diambil';
                  return (
                    <tr key={o.id}>
                      <td>
                        <strong className="mono">{displayCode(o.code)}</strong>
                        <div className="xs muted">{fmtDateTime(o.receivedAt)}</div>
                      </td>
                      <td>
                        <strong>{o.customerName}</strong>
                        <div className="xs muted">{o.customerPhone}</div>
                      </td>
                      <td>
                        {o.itemType} - {o.brand} {o.model}
                      </td>
                      <td>
                        <span className={`badge ${o.status === 'selesai' ? 'ok' : o.status === 'diambil' ? '' : 'teal'}`}>
                          {STATUS_LABEL[o.status]}
                        </span>
                      </td>
                      <td>
                        <div className={late ? 'badge danger' : ''}>
                          {o.estimatedAt ? fmtDateTime(o.estimatedAt) : '-'}
                        </div>
                      </td>
                      <td>
                        <div>{rupiah(o.total)}</div>
                        <span className={`badge ${o.payment.status === 'lunas' ? 'ok' : 'warn'}`}>
                          {o.payment.status === 'lunas' ? 'Lunas' : 'Belum Lunas'}
                        </span>
                      </td>
                      <td className="right">
                        <Link to={`/admin/orders/${o.id}`} className="btn secondary sm">
                          Detail / Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
        )}
      </div>
    </div>
  );
};
