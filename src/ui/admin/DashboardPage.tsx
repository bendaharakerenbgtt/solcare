import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { fmtDateTime, STATUS_LABEL, whatsappLink } from '../../lib/format';
import { isLate } from '../../lib/estimation';
import { dateKey } from '../../lib/dates';
import type { OrderStatus } from '../../data/types';

export const DashboardPage: React.FC = () => {
  const { data: orders, loading, reload } = useAsync(() => repo.listOrders(), []);
  const { data: settings } = useAsync(() => repo.getSettings(), []);

  const now = new Date();
  const todayStr = dateKey(now);

  const [activityTab, setActivityTab] = useState<'all' | 'pencucian' | 'pengeringan' | 'finishing' | 'selesai' | 'menunggu'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const activeOrders = (orders || []).filter((o) => o.status !== 'selesai' && o.status !== 'diambil');
  const todayEst = (orders || []).filter((o) => o.estimatedAt && o.estimatedAt.startsWith(todayStr) && o.status !== 'diambil');
  const completedOrders = (orders || []).filter((o) => o.status === 'selesai');
  const lateOrders = (orders || []).filter((o) => isLate(o, now) && o.status !== 'diambil');

  // Breakdown by activity status
  const washingOrders = (orders || []).filter((o) => o.status === 'pencucian');
  const dryingOrders = (orders || []).filter((o) => o.status === 'pengeringan');
  const finishingOrders = (orders || []).filter((o) => o.status === 'finishing');
  const waitingOrders = (orders || []).filter((o) => o.status === 'menunggu');

  // Filtered activity items
  const activityList = (orders || []).filter((o) => {
    if (activityTab === 'all') return o.status !== 'diambil';
    return o.status === activityTab;
  });

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      await repo.updateStatus(orderId, newStatus, `Tahapan diubah ke ${STATUS_LABEL[newStatus]}`);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengubah status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="stack" style={{ gap: '16px' }}>
      {/* Top Header Row: Clean title & compact Add button */}
      <div className="row between" style={{ alignItems: 'center', gap: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Dashboard Operasional</h1>
        <Link
          to="/admin/orders/new"
          className="btn primary sm"
          style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700 }}
        >
          ➕ Pesanan Baru
        </Link>
      </div>

      {/* Modern Compact 2x2 Metrics Cards on Mobile (4 cols on Desktop) */}
      <div className="dash-metrics-grid">
        <div className="dash-metric-card">
          <div className="icon-label">
            <span>📦</span>
            <span>Pesanan Aktif</span>
          </div>
          <div className="val" style={{ color: 'var(--primary)' }}>
            {activeOrders.length}
          </div>
          <div className="sub">Kapasitas: {settings?.dailyCapacity || 20} unit/hari</div>
        </div>

        <div className="dash-metric-card">
          <div className="icon-label">
            <span>⚡</span>
            <span>Target Hari Ini</span>
          </div>
          <div className="val" style={{ color: todayEst.length > 0 ? '#0284c7' : 'inherit' }}>
            {todayEst.length}
          </div>
          <div className="sub">Perlu selesai hari ini</div>
        </div>

        <div className="dash-metric-card">
          <div className="icon-label">
            <span>⚠️</span>
            <span>Terlambat</span>
          </div>
          <div className="val" style={{ color: lateOrders.length > 0 ? 'var(--danger)' : 'var(--ok)' }}>
            {lateOrders.length}
          </div>
          <div className="sub">Melewati target estimasi</div>
        </div>

        <div className="dash-metric-card">
          <div className="icon-label">
            <span>✅</span>
            <span>Siap Diambil</span>
          </div>
          <div className="val" style={{ color: 'var(--ok)' }}>
            {completedOrders.length}
          </div>
          <div className="sub">Menunggu dijemput</div>
        </div>
      </div>

      {/* Section: Aktivitas & Pengerjaan Hari Ini */}
      <div className="card" style={{ padding: '16px 14px' }}>
        <div className="row between" style={{ marginBottom: '12px', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>📋 Aktivitas Pengerjaan Hari Ini</h3>
            <span className="xs muted">Atur tahapan cuci, jemur, finishing, atau siap diambil</span>
          </div>
          <span className="badge teal">{activityList.length} Barang</span>
        </div>

        {/* Activity Filter Tabs */}
        <div className="tabs" style={{ marginBottom: '14px' }}>
          <button
            type="button"
            className={activityTab === 'all' ? 'active' : ''}
            onClick={() => setActivityTab('all')}
          >
            Semua ({activeOrders.length + completedOrders.length})
          </button>
          <button
            type="button"
            className={activityTab === 'pencucian' ? 'active' : ''}
            onClick={() => setActivityTab('pencucian')}
          >
            🧼 Cuci ({washingOrders.length})
          </button>
          <button
            type="button"
            className={activityTab === 'pengeringan' ? 'active' : ''}
            onClick={() => setActivityTab('pengeringan')}
          >
            💨 Kering ({dryingOrders.length})
          </button>
          <button
            type="button"
            className={activityTab === 'finishing' ? 'active' : ''}
            onClick={() => setActivityTab('finishing')}
          >
            ✨ Finishing ({finishingOrders.length})
          </button>
          <button
            type="button"
            className={activityTab === 'selesai' ? 'active' : ''}
            onClick={() => setActivityTab('selesai')}
          >
            ✅ Siap Ambil ({completedOrders.length})
          </button>
          <button
            type="button"
            className={activityTab === 'menunggu' ? 'active' : ''}
            onClick={() => setActivityTab('menunggu')}
          >
            ⏳ Antrean ({waitingOrders.length})
          </button>
        </div>

        {loading ? (
          <div className="empty">Memuat aktivitas operasional...</div>
        ) : activityList.length === 0 ? (
          <div className="empty" style={{ padding: '24px 16px' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: '6px' }}>🎉</div>
            <strong>Tidak ada barang dalam tahap ini.</strong>
            <p className="small muted" style={{ margin: '4px 0 12px' }}>
              Semua sepatu di tahapan ini telah selesai diproses.
            </p>
            <Link to="/admin/orders/new" className="btn sm primary">
              ➕ Input Pesanan Baru
            </Link>
          </div>
        ) : (
          <div className="stack" style={{ gap: '10px' }}>
            {activityList.map((o) => {
              const late = isLate(o, now) && o.status !== 'diambil';
              const waUrl = whatsappLink(o.customerPhone, `Halo Kak ${o.customerName}, info pengerjaan pesanan Anda di Soleful Soaks!`);
              const isUpdating = updatingId === o.id;

              return (
                <div
                  key={o.id}
                  className="mobile-order-card"
                  style={{
                    padding: '12px 14px',
                    borderLeft: `4px solid ${
                      o.status === 'selesai'
                        ? '#16a34a'
                        : o.status === 'pencucian'
                        ? '#0284c7'
                        : o.status === 'pengeringan'
                        ? '#f59e0b'
                        : o.status === 'finishing'
                        ? '#8b5cf6'
                        : '#0f766e'
                    }`,
                  }}
                >
                  {/* Row 1: Customer Name, WhatsApp Link, and Received Date */}
                  <div className="row between" style={{ alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '1rem', color: 'var(--ink)' }}>
                        {o.customerName}
                      </strong>
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn wa sm"
                          style={{ padding: '2px 8px', fontSize: '0.72rem', borderRadius: '6px' }}
                          title="Chat WhatsApp Pelanggan"
                        >
                          💬 WA
                        </a>
                      )}
                    </div>
                    <span className="xs muted">{fmtDateTime(o.receivedAt)}</span>
                  </div>

                  {/* Row 2: Item & Services */}
                  <div style={{ margin: '4px 0' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                      👟 {o.itemType}: {o.brand} {o.model} {o.color ? `(${o.color})` : ''}
                    </div>
                    <div className="small muted" style={{ marginTop: '2px' }}>
                      🏷️ {o.services.map((s) => s.name).join(', ')}
                      {o.fragranceName ? ` • Aroma: ${o.fragranceName}` : ''}
                    </div>
                    {o.conditionNotes && (
                      <div className="xs" style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', color: '#475569', marginTop: '4px' }}>
                        📝 {o.conditionNotes}
                      </div>
                    )}
                  </div>

                  {/* Row 3: Target Estimation Date */}
                  <div className="row between small" style={{ borderTop: '1px dashed var(--line)', paddingTop: '6px' }}>
                    <span className="muted">Estimasi Selesai:</span>
                    <strong className={late ? 'badge danger' : ''}>
                      {o.estimatedAt ? fmtDateTime(o.estimatedAt) : '-'}
                    </strong>
                  </div>

                  {/* Row 4: Status Stage Selector & Detail Button (No Confusion, 1-Click Control) */}
                  <div style={{ borderTop: '1px solid var(--line)', paddingTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1.6 }}>
                      <select
                        value={o.status}
                        onChange={(e) => void handleStatusChange(o.id, e.target.value as OrderStatus)}
                        disabled={isUpdating}
                        style={{
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          background:
                            o.status === 'selesai'
                              ? '#dcfce7'
                              : o.status === 'pencucian'
                              ? '#e0f2fe'
                              : o.status === 'pengeringan'
                              ? '#fef3c7'
                              : o.status === 'finishing'
                              ? '#ede9fe'
                              : '#f0fdfa',
                          borderColor:
                            o.status === 'selesai'
                              ? '#86efac'
                              : o.status === 'pencucian'
                              ? '#7dd3fc'
                              : o.status === 'pengeringan'
                              ? '#fde68a'
                              : o.status === 'finishing'
                              ? '#ddd6fe'
                              : '#99f6e4',
                          color:
                            o.status === 'selesai'
                              ? '#166534'
                              : o.status === 'pencucian'
                              ? '#0369a1'
                              : o.status === 'pengeringan'
                              ? '#92400e'
                              : o.status === 'finishing'
                              ? '#5b21b6'
                              : '#115e59',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="menunggu">⏳ Menunggu Antrean</option>
                        <option value="pencucian">🧼 Sedang Dicuci</option>
                        <option value="pengeringan">💨 Pengeringan</option>
                        <option value="finishing">✨ Finishing & QC</option>
                        <option value="selesai">✅ Siap Diambil</option>
                        <option value="diambil">📦 Sudah Diambil</option>
                      </select>
                    </div>
                    <Link
                      to={`/admin/orders/${o.id}`}
                      className="btn secondary sm"
                      style={{ flex: 1, padding: '8px 10px', fontSize: '0.82rem', textAlign: 'center', justifyContent: 'center' }}
                    >
                      Detail ✏️
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shortcut Card to Full Orders Management */}
      <div
        className="card flat"
        style={{
          border: '1px solid var(--line)',
          padding: '14px 16px',
          background: '#ffffff',
          borderRadius: '14px',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="row between" style={{ alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div>
            <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: '2px' }}>
              📦 Kelola & Daftar Semua Pesanan
            </strong>
            <div className="xs muted">
              Buka menu pencarian lengkap, nota, dan riwayat ({orders?.length || 0} pesanan).
            </div>
          </div>
          <Link
            to="/admin/orders"
            className="btn secondary sm"
            style={{ padding: '8px 14px', fontWeight: 600, fontSize: '0.82rem' }}
          >
            Buka Kelola Pesanan →
          </Link>
        </div>
      </div>
    </div>
  );
};
