import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { fmtDateTime, rupiah, STATUS_LABEL, displayCode, whatsappLink } from '../../lib/format';
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
      <div className="admin-top admin-top-responsive">
        <div>
          <h1>Manajemen Pesanan & Antrean</h1>
          <p className="small muted">Daftar seluruh pesanan masuk, status pengerjaan, dan riwayat pembayaran.</p>
        </div>
        <div className="spacer" />
        <Link to="/admin/orders/new" className="btn admin-header-action-btn">
          + Catat Pesanan Baru
        </Link>
      </div>

      <div className="card">
        <div className="order-filter-bar" style={{ gap: '12px', marginBottom: '16px' }}>
          <div className="order-search-input">
            <input
              type="text"
              placeholder="Cari kode pesanan, nama pelanggan, no. WA, atau barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="order-status-select">
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
          <>
            <div className="desktop-only-table">
              <div className="table-scroll-hint">Geser ke samping untuk melihat tabel lengkap</div>
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
            </div>

            <div className="mobile-only-cards">
              {filtered.map((o) => {
                const late = isLate(o, now) && o.status !== 'diambil';
                const waUrl = o.customerPhone
                  ? whatsappLink(
                      o.customerPhone,
                      `Halo Kak ${o.customerName}, info pengerjaan pesanan Anda (${displayCode(o.code)}) di Solecare.`
                    )
                  : null;
                return (
                  <div key={o.id} className="order-list-mobile-card">
                    <div className="order-list-card-header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <span className="badge teal" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                            {displayCode(o.code)}
                          </span>
                          <span className={`badge ${o.status === 'selesai' ? 'ok' : o.status === 'diambil' ? '' : 'blue'}`}>
                            {STATUS_LABEL[o.status]}
                          </span>
                        </div>
                        <strong style={{ fontSize: '0.98rem', color: 'var(--ink)' }}>{o.customerName}</strong>
                        <span className="xs muted" style={{ display: 'block', marginTop: '1px' }}>{o.customerPhone}</span>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f766e' }}>
                          {rupiah(o.total)}
                        </div>
                        <span className={`badge sm ${o.payment.status === 'lunas' ? 'ok' : 'warn'}`} style={{ marginTop: '2px', display: 'inline-block' }}>
                          {o.payment.status === 'lunas' ? 'Lunas' : 'Belum Lunas'}
                        </span>
                      </div>
                    </div>

                    <div className="order-list-card-body">
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--ink)' }}>
                        {o.itemType}: {o.brand} {o.model}
                      </div>
                      <div className="xs muted" style={{ marginTop: '2px', lineHeight: 1.3 }}>
                        Layanan: {o.services.map((s) => s.name).join(', ')}
                      </div>
                    </div>

                    <div className="order-list-card-meta">
                      <span className="xs muted">
                        Masuk: {fmtDateTime(o.receivedAt)}
                      </span>
                      {o.estimatedAt ? (
                        <span className={`xs ${late ? 'badge danger' : 'muted'}`} style={{ padding: late ? '2px 6px' : '0' }}>
                          {late ? 'Terlambat: ' : 'Target: '}{fmtDateTime(o.estimatedAt)}
                        </span>
                      ) : (
                        <span className="xs muted">Target: -</span>
                      )}
                    </div>

                    <div className="order-list-card-actions">
                      {waUrl && (
                        <a href={waUrl} target="_blank" rel="noreferrer" className="btn wa sm">
                          WhatsApp
                        </a>
                      )}
                      <Link to={`/admin/orders/${o.id}`} className="btn secondary sm">
                        Detail Pesanan
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
