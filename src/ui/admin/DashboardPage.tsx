import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { fmtDateTime, STATUS_LABEL, displayCode, whatsappLink } from '../../lib/format';
import { isLate } from '../../lib/estimation';
import { dateKey } from '../../lib/dates';
import type { Order, OrderStatus } from '../../data/types';

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  menunggu: 'pencucian',
  pencucian: 'pengeringan',
  pengeringan: 'finishing',
  finishing: 'selesai',
  selesai: 'diambil',
  diambil: null,
};

const NEXT_STATUS_BTN: Record<OrderStatus, string> = {
  menunggu: 'Mulai Cuci 🧼',
  pencucian: 'Lanjut Keringkan 💨',
  pengeringan: 'Lanjut Finishing ✨',
  finishing: 'Siap Diambil ✅',
  selesai: 'Tandai Diambil 📦',
  diambil: '',
};

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

  const handleAdvanceStatus = async (order: Order) => {
    const nextSt = NEXT_STATUS[order.status];
    if (!nextSt) return;
    setUpdatingId(order.id);
    try {
      await repo.updateStatus(order.id, nextSt, `Diperbarui langsung dari dashboard aktivitas (${STATUS_LABEL[nextSt]})`);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengubah status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="stack" style={{ gap: '18px' }}>
      {/* Top Header Row: Clean title & compact Add button */}
      <div className="row between" style={{ alignItems: 'center', gap: '12px' }}>
        <h1 style={{ margin: 0, fontSize: '1.45rem' }}>Dashboard Operasional</h1>
        <Link
          to="/admin/orders/new"
          className="btn primary sm"
          style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem' }}
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
      <div className="card" style={{ padding: '18px 16px' }}>
        <div className="row between" style={{ marginBottom: '14px', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>📋 Aktivitas Pengerjaan Hari Ini</h3>
            <span className="small muted">Pantau sepatu yang sedang dicuci, dikeringkan, atau siap diambil</span>
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
            Semua Aktif ({activeOrders.length + completedOrders.length})
          </button>
          <button
            type="button"
            className={activityTab === 'pencucian' ? 'active' : ''}
            onClick={() => setActivityTab('pencucian')}
          >
            🧼 Sedang Dicuci ({washingOrders.length})
          </button>
          <button
            type="button"
            className={activityTab === 'pengeringan' ? 'active' : ''}
            onClick={() => setActivityTab('pengeringan')}
          >
            💨 Pengeringan ({dryingOrders.length})
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
            ✅ Siap Diambil ({completedOrders.length})
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
          <div className="empty" style={{ padding: '28px 16px' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🎉</div>
            <strong>Tidak ada barang dalam tahap ini.</strong>
            <p className="small muted" style={{ margin: '4px 0 12px' }}>
              Semua sepatu di tahapan ini telah selesai diproses.
            </p>
            <Link to="/admin/orders/new" className="btn sm primary">
              ➕ Input Pesanan Baru
            </Link>
          </div>
        ) : (
          <div className="stack" style={{ gap: '12px' }}>
            {activityList.map((o) => {
              const late = isLate(o, now) && o.status !== 'diambil';
              const nextAction = NEXT_STATUS_BTN[o.status];
              const waUrl = whatsappLink(o.customerPhone, `Halo Kak ${o.customerName}, info pengerjaan ${displayCode(o.code)} di Soleful Soaks!`);
              const isUpdating = updatingId === o.id;

              return (
                <div
                  key={o.id}
                  className="mobile-order-card"
                  style={{ borderLeft: `4px solid ${o.status === 'selesai' ? '#16a34a' : o.status === 'pencucian' ? '#0284c7' : '#0f766e'}` }}
                >
                  <div className="mobile-order-card-top">
                    <div>
                      <strong className="mono" style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>
                        {displayCode(o.code)}
                      </strong>
                      <div className="xs muted">{fmtDateTime(o.receivedAt)}</div>
                    </div>
                    <div className="row" style={{ gap: '4px' }}>
                      <span className={`badge ${o.status === 'selesai' ? 'ok' : o.status === 'diambil' ? '' : 'teal'}`}>
                        {STATUS_LABEL[o.status]}
                      </span>
                      <span className={`badge ${o.payment.status === 'lunas' ? 'ok' : 'warn'}`}>
                        {o.payment.status === 'lunas' ? 'Lunas' : 'Belum'}
                      </span>
                    </div>
                  </div>

                  <div className="mobile-order-card-body">
                    <div>
                      <strong>👟 {o.itemType}: {o.brand} {o.model}</strong>
                      {o.color && <span className="xs muted" style={{ marginLeft: '6px' }}>({o.color})</span>}
                    </div>
                    <div className="small">
                      🏷️ <strong>Treatment:</strong> {o.services.map((s) => s.name).join(', ')}
                      {o.fragranceName ? ` • Aroma: ${o.fragranceName}` : ''}
                    </div>
                    <div className="small muted">
                      👤 Pelanggan: <strong>{o.customerName}</strong> ({o.customerPhone})
                    </div>
                    {o.conditionNotes && (
                      <div className="xs" style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', color: '#475569' }}>
                        📝 Catatan: {o.conditionNotes}
                      </div>
                    )}
                    <div className="row between small" style={{ marginTop: '2px' }}>
                      <span>Target Estimasi:</span>
                      <strong className={late ? 'badge danger' : ''}>
                        {o.estimatedAt ? fmtDateTime(o.estimatedAt) : '-'}
                      </strong>
                    </div>
                  </div>

                  <div className="mobile-order-card-actions">
                    {/* Quick 1-tap status advance button */}
                    {nextAction && (
                      <button
                        type="button"
                        onClick={() => void handleAdvanceStatus(o)}
                        disabled={isUpdating}
                        className="btn primary"
                        style={{ flex: 1.2, padding: '8px 10px', fontSize: '0.82rem' }}
                      >
                        {isUpdating ? 'Menyimpan...' : nextAction}
                      </button>
                    )}
                    <Link
                      to={`/admin/orders/${o.id}`}
                      className="btn secondary"
                      style={{ flex: 1, padding: '8px 10px', fontSize: '0.82rem' }}
                    >
                      ✏️ Detail
                    </Link>
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn wa"
                        style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                      >
                        💬 WA
                      </a>
                    )}
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
          padding: '16px 18px',
          background: '#ffffff',
          borderRadius: '14px',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="row between" style={{ alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '2px' }}>
              📦 Kelola & Daftar Semua Pesanan
            </strong>
            <div className="xs muted">
              Buka menu untuk pencarian kode, filter status lengkap, nota, dan riwayat ({orders?.length || 0} pesanan tercatat).
            </div>
          </div>
          <Link
            to="/admin/orders"
            className="btn secondary sm"
            style={{ padding: '8px 16px', fontWeight: 600, fontSize: '0.85rem' }}
          >
            Buka Kelola Pesanan →
          </Link>
        </div>
      </div>
    </div>
  );
};
