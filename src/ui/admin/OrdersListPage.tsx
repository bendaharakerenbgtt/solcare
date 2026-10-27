import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { fmtDateTime, rupiah, STATUS_LABEL, displayCode } from '../../lib/format';
import { ORDER_STATUSES } from '../../data/types';
import { isLate } from '../../lib/estimation';

export const OrdersListPage: React.FC = () => {
  const { data: orders, loading } = useAsync(() => repo.listOrders(), []);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  const now = new Date();

  const filtered = (orders || []).filter((o) => {
    if (filterStatus !== 'all' && o.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const codeMatch = o.code.toLowerCase().includes(q) || displayCode(o.code).toLowerCase().includes(q);
      const nameMatch = o.customerName.toLowerCase().includes(q);
      const phoneMatch = o.customerPhone.includes(q);
      const itemMatch = `${o.itemType} ${o.brand} ${o.model}`.toLowerCase().includes(q);
      return codeMatch || nameMatch || phoneMatch || itemMatch;
    }
    return true;
  });

  return (
    <div className="stack" style={{ gap: '20px' }}>
      <div className="admin-top">
        <div>
          <h1>Manajemen Pesanan & Antrean</h1>
          <p className="small muted">Daftar seluruh pesanan masuk, status pengerjaan, dan riwayat pembayaran.</p>
        </div>
        <div className="spacer" />
        <Link to="/admin/orders/new" className="btn">
          ➕ Catat Pesanan Baru
        </Link>
      </div>

      <div className="card">
        <div className="row" style={{ gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Cari kode pesanan, nama pelanggan, no. WA, atau barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ width: '220px' }}>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">Semua Status ({orders?.length || 0})</option>
              {ORDER_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {STATUS_LABEL[st]} ({orders?.filter((o) => o.status === st).length || 0})
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="empty">Memuat daftar pesanan...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">Tidak ada pesanan yang sesuai dengan filter.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Kode & Waktu Masuk</th>
                  <th>Pelanggan</th>
                  <th>Barang & Layanan</th>
                  <th>Status</th>
                  <th>Estimasi Selesai</th>
                  <th>Total Biaya</th>
                  <th className="right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
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
                        <div>
                          <strong>{o.itemType}</strong>: {o.brand} {o.model}
                        </div>
                        <div className="xs muted">
                          {o.services.map((s) => s.name).join(', ')}
                        </div>
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
                        {o.completedAt && (
                          <div className="xs ok">Selesai: {fmtDateTime(o.completedAt)}</div>
                        )}
                      </td>
                      <td>
                        <div>{rupiah(o.total)}</div>
                        <span className={`badge ${o.payment.status === 'lunas' ? 'ok' : 'warn'}`}>
                          {o.payment.status === 'lunas' ? 'Lunas' : 'Belum Lunas'}
                        </span>
                        <div className="xs muted" style={{ textTransform: 'uppercase' }}>
                          {o.payment.method}
                        </div>
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
        )}
      </div>
    </div>
  );
};
