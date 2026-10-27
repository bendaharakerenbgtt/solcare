import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { fmtDateTime, STATUS_LABEL, whatsappLink } from '../../lib/format';
import { isLate } from '../../lib/estimation';
import { dateKey } from '../../lib/dates';
import type { Order, OrderStatus } from '../../data/types';

const STAGE_CONFIG: Record<
  OrderStatus,
  { label: string; shortLabel: string; icon: string; color: string; bg: string; border: string; desc: string }
> = {
  menunggu: {
    label: 'Menunggu Antrean',
    shortLabel: 'Antrean',
    icon: '⏳',
    color: '#0f766e',
    bg: '#f0fdfa',
    border: '#99f6e4',
    desc: 'Sepatu baru masuk & belum mulai diproses',
  },
  pencucian: {
    label: 'Sedang Dicuci',
    shortLabel: 'Cuci',
    icon: '🧼',
    color: '#0369a1',
    bg: '#e0f2fe',
    border: '#7dd3fc',
    desc: 'Pencucian upper, insole, outsole, unyellowing',
  },
  pengeringan: {
    label: 'Pengeringan',
    shortLabel: 'Kering',
    icon: '💨',
    color: '#b45309',
    bg: '#fef3c7',
    border: '#fde68a',
    desc: 'Diangin-anginkan atau proses mesin pengering',
  },
  finishing: {
    label: 'Finishing & QC',
    shortLabel: 'Finishing',
    icon: '✨',
    color: '#6d28d9',
    bg: '#ede9fe',
    border: '#ddd6fe',
    desc: 'Quality control, parfum sepatu, dan packaging',
  },
  selesai: {
    label: 'Siap Diambil',
    shortLabel: 'Siap Ambil',
    icon: '✅',
    color: '#15803d',
    bg: '#dcfce7',
    border: '#86efac',
    desc: 'Selesai & menunggu dijemput pelanggan',
  },
  diambil: {
    label: 'Sudah Diambil',
    shortLabel: 'Diambil',
    icon: '📦',
    color: '#475569',
    bg: '#f1f5f9',
    border: '#cbd5e1',
    desc: 'Sepatu telah diserahkan ke pelanggan',
  },
};

export const DashboardPage: React.FC = () => {
  const { data: orders, loading, reload } = useAsync(() => repo.listOrders(), []);
  const { data: settings } = useAsync(() => repo.getSettings(), []);

  const now = new Date();
  const todayStr = dateKey(now);

  const [activityTab, setActivityTab] = useState<'all' | 'pencucian' | 'pengeringan' | 'finishing' | 'selesai' | 'menunggu'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [stageModalOrder, setStageModalOrder] = useState<Order | null>(null);

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
      setStageModalOrder(null);
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
          <div className="stack" style={{ gap: '8px' }}>
            {activityList.map((o) => {
              const late = isLate(o, now) && o.status !== 'diambil';
              const waUrl = whatsappLink(o.customerPhone, `Halo Kak ${o.customerName}, info pengerjaan pesanan Anda di Soleful Soaks!`);
              const isUpdating = updatingId === o.id;
              const stage = STAGE_CONFIG[o.status] || STAGE_CONFIG.menunggu;

              return (
                <div
                  key={o.id}
                  className="activity-card-compact"
                  style={{ borderLeftColor: stage.color }}
                >
                  {/* Left: Customer Info, Shoe & Services */}
                  <div className="activity-card-left">
                    <div className="activity-card-header">
                      <span className="activity-cust-name">{o.customerName}</span>
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="activity-wa-pill"
                          title="Chat WhatsApp Pelanggan"
                        >
                          💬 WA
                        </a>
                      )}
                      <span className="activity-received-time">{fmtDateTime(o.receivedAt)}</span>
                    </div>

                    <div className="activity-card-item">
                      <span className="activity-shoe-info">
                        👟 {o.brand} {o.model} {o.color ? `(${o.color})` : ''}
                      </span>
                      <span className="activity-service-info">
                        🏷️ {o.services.map((s) => s.name).join(', ')}
                      </span>
                    </div>

                    {o.estimatedAt && (
                      <div className="activity-card-footer">
                        <span className={`activity-est-badge ${late ? 'late' : ''}`}>
                          {late ? '⚠️ Terlambat: ' : '🎯 Est: '}
                          {fmtDateTime(o.estimatedAt)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Stage Dropdown Trigger & Detail Link */}
                  <div className="activity-card-right">
                    <button
                      type="button"
                      className="stage-select-btn"
                      style={{
                        background: stage.bg,
                        color: stage.color,
                        borderColor: stage.border,
                      }}
                      onClick={() => setStageModalOrder(o)}
                      disabled={isUpdating}
                      title="Klik untuk memilih tahapan pengerjaan"
                    >
                      <span className="stage-btn-icon">{stage.icon}</span>
                      <span className="stage-btn-text">{stage.shortLabel}</span>
                      <span className="stage-btn-arrow">▾</span>
                    </button>

                    <Link
                      to={`/admin/orders/${o.id}`}
                      className="activity-detail-link"
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

      {/* Bottom Sheet / Modal for Selecting Order Stage */}
      {stageModalOrder && (
        <div className="modal-backdrop" onClick={() => setStageModalOrder(null)}>
          <div
            className="stage-picker-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="stage-sheet-header">
              <div>
                <div className="stage-sheet-title">Pilih Tahapan Pesanan</div>
                <div className="stage-sheet-sub">
                  <strong>{stageModalOrder.customerName}</strong> • {stageModalOrder.brand} {stageModalOrder.model}
                </div>
              </div>
              <button
                type="button"
                className="stage-sheet-close"
                onClick={() => setStageModalOrder(null)}
                title="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="stage-sheet-body">
              {(Object.keys(STAGE_CONFIG) as OrderStatus[]).map((st) => {
                const cfg = STAGE_CONFIG[st];
                const isCurrent = stageModalOrder.status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    className={`stage-option-row ${isCurrent ? 'current' : ''}`}
                    style={{
                      borderColor: isCurrent ? cfg.color : 'var(--line)',
                      background: isCurrent ? cfg.bg : '#ffffff',
                    }}
                    onClick={() => void handleStatusChange(stageModalOrder.id, st)}
                    disabled={updatingId === stageModalOrder.id}
                  >
                    <span className="stage-option-icon">{cfg.icon}</span>
                    <div className="stage-option-text">
                      <div className="stage-option-title" style={{ color: isCurrent ? cfg.color : 'var(--ink)' }}>
                        {cfg.label}
                        {isCurrent && <span className="stage-current-tag">Sedang Berlangsung</span>}
                      </div>
                      <div className="stage-option-desc">{cfg.desc}</div>
                    </div>
                    <div className="stage-option-check">
                      {isCurrent ? '✓' : '→'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
