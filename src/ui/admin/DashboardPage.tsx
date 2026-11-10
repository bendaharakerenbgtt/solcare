import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { fmtDate, STATUS_LABEL, whatsappLink, rupiah } from '../../lib/format';
import { isLate, countOrderItems, getQueueSlaStatus } from '../../lib/estimation';
import type { Order, OrderStatus } from '../../data/types';

const STAGE_CONFIG: Record<
  OrderStatus,
  { label: string; shortLabel: string; color: string; bg: string; border: string; desc: string }
> = {
  menunggu: {
    label: 'Menunggu Antrean',
    shortLabel: 'Antrean',
    color: '#001b3a',
    bg: '#f0f4f9',
    border: '#cbd5e1',
    desc: 'Sepatu baru masuk & belum mulai diproses',
  },
  pencucian: {
    label: 'Sedang Dicuci',
    shortLabel: 'Cuci',
    color: '#0369a1',
    bg: '#e0f2fe',
    border: '#7dd3fc',
    desc: 'Pencucian upper, insole, outsole, unyellowing',
  },
  pengeringan: {
    label: 'Pengeringan',
    shortLabel: 'Kering',
    color: '#b45309',
    bg: '#fef3c7',
    border: '#fde68a',
    desc: 'Diangin-anginkan atau proses mesin pengering',
  },
  finishing: {
    label: 'Finishing & QC',
    shortLabel: 'Finishing',
    color: '#6d28d9',
    bg: '#ede9fe',
    border: '#ddd6fe',
    desc: 'Pengecekan kualitas, pewangi, dan packaging',
  },
  selesai: {
    label: 'Siap Diambil',
    shortLabel: 'Siap Ambil',
    color: '#15803d',
    bg: '#dcfce7',
    border: '#86efac',
    desc: 'Selesai & menunggu dijemput pelanggan',
  },
  diambil: {
    label: 'Sudah Diambil',
    shortLabel: 'Diambil',
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

  const [dashboardTab, setDashboardTab] = useState<'transaksi' | 'keuangan' | 'kapasitas'>('transaksi');
  const [activityTab, setActivityTab] = useState<'all' | 'pencucian' | 'pengeringan' | 'finishing' | 'selesai' | 'menunggu'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [stageModalOrder, setStageModalOrder] = useState<Order | null>(null);

  const activeOrders = (orders || []).filter((o) => o.status !== 'selesai' && o.status !== 'diambil');
  const completedOrders = (orders || []).filter((o) => o.status === 'selesai');
  const lateOrders = (orders || []).filter((o) => isLate(o, now) && o.status !== 'diambil');

  const dailyCap = settings?.dailyCapacity ?? 8.5;
  const activeItemsCount = countOrderItems(orders || []);
  const slaInfo = getQueueSlaStatus(activeItemsCount, lateOrders.length, dailyCap);
  const wipPercent = Math.min(100, Math.round((activeItemsCount / slaInfo.maxWipLimit) * 100));

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

  // Financial aggregates for Bilas KEUANGAN tab
  const { totalPaid, totalUnpaid, qrisTotal, cashTotal, unpaidOrders } = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    let qris = 0;
    let cash = 0;
    const unpaidList: Order[] = [];

    (orders || []).forEach((o) => {
      const price = o.total || 0;
      const isPaid = o.payment?.status === 'lunas';
      if (isPaid) {
        paid += price;
      } else {
        unpaid += price;
        unpaidList.push(o);
      }

      if (o.payment?.method === 'qris') {
        qris += price;
      } else if (o.payment?.method === 'tunai') {
        cash += price;
      }
    });

    return {
      totalPaid: paid,
      totalUnpaid: unpaid,
      qrisTotal: qris,
      cashTotal: cash,
      unpaidOrders: unpaidList,
    };
  }, [orders]);

  // Top services & Top customers for Bilas shortcuts
  const { topService, topCustomer } = useMemo(() => {
    const serviceCounts: Record<string, number> = {};
    const customerCounts: Record<string, number> = {};

    (orders || []).forEach((o) => {
      o.services.forEach((s) => {
        serviceCounts[s.name] = (serviceCounts[s.name] || 0) + 1;
      });
      if (o.customerName) {
        customerCounts[o.customerName] = (customerCounts[o.customerName] || 0) + 1;
      }
    });

    let topSName = '-';
    let topSCount = 0;
    Object.entries(serviceCounts).forEach(([name, count]) => {
      if (count > topSCount) {
        topSName = name;
        topSCount = count;
      }
    });

    let topCName = '-';
    let topCCount = 0;
    Object.entries(customerCounts).forEach(([name, count]) => {
      if (count > topCCount) {
        topCName = name;
        topCCount = count;
      }
    });

    return {
      topService: topSCount > 0 ? `${topSName} (${topSCount}x)` : 'Belum ada data',
      topCustomer: topCCount > 0 ? `${topCName} (${topCCount} pesanan)` : 'Belum ada data',
    };
  }, [orders]);

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
      {/* Top Header Row matching Bilas: Hai, Soleful Soaks! + Subtitle + New Order Button */}
      <div className="admin-page-header">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Hai, Soleful Soaks!</h1>
          <span className="xs muted" style={{ display: 'block', marginTop: '2px' }}>
            {new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).format(now)}
          </span>
        </div>
        <Link to="/admin/orders/new" className="btn sm btn-new-order-header">
          + Pesanan
        </Link>
      </div>

      {/* Bilas 3-Tab Card Switcher */}
      <div className="bilas-dash-tabs">
        <button
          type="button"
          className={`bilas-dash-tab ${dashboardTab === 'transaksi' ? 'active' : ''}`}
          onClick={() => setDashboardTab('transaksi')}
        >
          TRANSAKSI
        </button>
        <button
          type="button"
          className={`bilas-dash-tab ${dashboardTab === 'keuangan' ? 'active' : ''}`}
          onClick={() => setDashboardTab('keuangan')}
        >
          KEUANGAN
        </button>
        <button
          type="button"
          className={`bilas-dash-tab ${dashboardTab === 'kapasitas' ? 'active' : ''}`}
          onClick={() => setDashboardTab('kapasitas')}
        >
          KAPASITAS RAK
        </button>
      </div>

      {/* Tab 1: TRANSAKSI */}
      {dashboardTab === 'transaksi' && (
        <div className="stack" style={{ gap: '12px' }}>
          {/* Bilas New Online Transaction Alert */}
          {waitingOrders.length > 0 && (
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                fontSize: '0.82rem',
                color: '#1e40af',
              }}
            >
              <span>Ada <strong>{waitingOrders.length}</strong> transaksi baru yang belum diproses.</span>
              <button
                type="button"
                className="btn xs primary"
                onClick={() => setActivityTab('menunggu')}
                style={{ flexShrink: 0 }}
              >
                Lihat
              </button>
            </div>
          )}

          {/* 4 Bilas Counters */}
          <div className="dash-metrics-grid">
            <div
              className="dash-metric-card"
              onClick={() => setActivityTab('menunggu')}
              style={{ cursor: 'pointer' }}
              title="Klik untuk filter Antrean Masuk"
            >
              <div className="icon-label">
                <span>Antrean Masuk</span>
              </div>
              <div className="val" style={{ color: 'var(--navy)' }}>
                {waitingOrders.length}
              </div>
              <div className="sub">Sepatu baru masuk</div>
            </div>

            <div
              className="dash-metric-card"
              onClick={() => setActivityTab('pencucian')}
              style={{ cursor: 'pointer' }}
              title="Klik untuk filter Sedang Proses"
            >
              <div className="icon-label">
                <span>Sedang Proses</span>
              </div>
              <div className="val" style={{ color: '#0369a1' }}>
                {washingOrders.length + dryingOrders.length}
              </div>
              <div className="sub">Cuci & pengeringan</div>
            </div>

            <div
              className="dash-metric-card"
              onClick={() => setActivityTab('finishing')}
              style={{ cursor: 'pointer' }}
              title="Klik untuk filter Finishing"
            >
              <div className="icon-label">
                <span>Finishing & QC</span>
              </div>
              <div className="val" style={{ color: '#6d28d9' }}>
                {finishingOrders.length}
              </div>
              <div className="sub">Pewangi & packing</div>
            </div>

            <div
              className="dash-metric-card"
              onClick={() => setActivityTab('selesai')}
              style={{ cursor: 'pointer' }}
              title="Klik untuk filter Siap Diambil"
            >
              <div className="icon-label">
                <span>Siap Diambil</span>
              </div>
              <div className="val" style={{ color: '#15803d' }}>
                {completedOrders.length}
              </div>
              <div className="sub">Menunggu pelanggan</div>
            </div>
          </div>

          {/* Bilas Terlambat Alert Banner if any */}
          {lateOrders.length > 0 && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.82rem',
                color: '#b91c1c',
              }}
            >
              <span><strong>Terlambat:</strong> {lateOrders.length} pesanan melewati target estimasi.</span>
              <Link to="/admin/orders" className="btn xs danger" style={{ flexShrink: 0 }}>
                Periksa
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: KEUANGAN */}
      {dashboardTab === 'keuangan' && (
        <div className="stack" style={{ gap: '12px' }}>
          <div className="dash-metrics-grid">
            <div className="dash-metric-card">
              <div className="icon-label">
                <span>Pendapatan Lunas</span>
              </div>
              <div className="val" style={{ color: '#15803d', fontSize: '1.25rem' }}>
                {rupiah(totalPaid)}
              </div>
              <div className="sub">Faktur terbayar lunas</div>
            </div>

            <div className="dash-metric-card">
              <div className="icon-label">
                <span>Faktur Belum Lunas</span>
              </div>
              <div className="val" style={{ color: totalUnpaid > 0 ? '#b91c1c' : '#64748b', fontSize: '1.25rem' }}>
                {rupiah(totalUnpaid)}
              </div>
              <div className="sub">{unpaidOrders.length} faktur piutang</div>
            </div>

            <div className="dash-metric-card">
              <div className="icon-label">
                <span>Non Tunai / QRIS</span>
              </div>
              <div className="val" style={{ color: 'var(--navy)', fontSize: '1.25rem' }}>
                {rupiah(qrisTotal)}
              </div>
              <div className="sub">QRIS & Transfer Bank</div>
            </div>

            <div className="dash-metric-card">
              <div className="icon-label">
                <span>Tunai (Cash)</span>
              </div>
              <div className="val" style={{ color: 'var(--navy)', fontSize: '1.25rem' }}>
                {rupiah(cashTotal)}
              </div>
              <div className="sub">Kasir tunai outlet</div>
            </div>
          </div>

          <div className="card" style={{ padding: '16px 14px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '0.96rem', fontWeight: 700 }}>Ringkasan Faktur & Penagihan</h3>
            <p className="small muted" style={{ margin: '0 0 12px' }}>
              Aturan Bilas: Pembayaran yang diterima kurang dari total tagihan akan otomatis dicatat sebagai pembayaran DP.
            </p>
            <div className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: '0.84rem' }}>
              <span>Total Pesanan Masuk</span>
              <strong>{orders?.length || 0} transaksi</strong>
            </div>
            <div className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: '0.84rem' }}>
              <span>Faktur Sudah Lunas</span>
              <strong style={{ color: '#15803d' }}>{(orders || []).filter((o) => o.payment?.status === 'lunas').length} faktur</strong>
            </div>
            <div className="row between" style={{ padding: '8px 0', fontSize: '0.84rem' }}>
              <span>Faktur Belum Lunas / DP</span>
              <strong style={{ color: totalUnpaid > 0 ? '#b91c1c' : '#64748b' }}>{unpaidOrders.length} faktur ({rupiah(totalUnpaid)})</strong>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: KAPASITAS RAK */}
      {dashboardTab === 'kapasitas' && (
        <div className="card" style={{ padding: '14px 16px', borderLeft: `4px solid ${slaInfo.color}` }}>
          <div className="row between" style={{ alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <div>
              <strong style={{ fontSize: '0.96rem', display: 'block', color: 'var(--ink)' }}>
                Kapasitas Rak & Janji Pelanggan
              </strong>
              <span className="xs muted">
                Kapasitas: {dailyCap} sepatu/hari (~{slaInfo.weeklyCapacity}/minggu)
              </span>
            </div>
            <span
              className="badge"
              style={{
                background: slaInfo.bg,
                color: slaInfo.color,
                border: `1px solid ${slaInfo.border}`,
                fontWeight: 700,
                fontSize: '0.78rem',
                padding: '4px 10px',
              }}
            >
              {slaInfo.zoneLabel} • Janjikan {slaInfo.recommendedPromise}
            </span>
          </div>

          {/* Progress Bar WIP (Maks 50 Sepatu) */}
          <div style={{ marginBottom: '10px' }}>
            <div className="row between xs" style={{ marginBottom: '4px', fontWeight: 600 }}>
              <span>Antrean Aktif di Rak: {activeItemsCount} / {slaInfo.maxWipLimit} unit</span>
              <span style={{ color: slaInfo.color }}>{wipPercent}% terisi</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${wipPercent}%`,
                  height: '100%',
                  background: slaInfo.color,
                  borderRadius: '999px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              paddingTop: '8px',
              borderTop: '1px dashed var(--line)',
              fontSize: '0.8rem',
            }}
          >
            <span className="muted" style={{ flex: 1, minWidth: '180px' }}>
              {slaInfo.adviceText}
            </span>
            <span
              className="badge"
              style={{
                background: slaInfo.expressAllowed ? '#f0fdf4' : '#fef2f2',
                color: slaInfo.expressAllowed ? '#15803d' : '#bf2f3b',
                border: `1px solid ${slaInfo.expressAllowed ? '#bbf7d0' : '#fecaca'}`,
                fontWeight: 700,
                fontSize: '0.75rem',
              }}
            >
              {slaInfo.expressAllowed ? 'Express: Diterima' : 'Express: Tolak Sementara'}
            </span>
          </div>
        </div>
      )}

      {/* Bilas Shortcut Section (Pintasan) matching activity_menu_dashboard.xml */}
      <div className="card" style={{ padding: '16px 14px' }}>
        <h3 style={{ margin: '0 0 10px', fontSize: '0.98rem', fontWeight: 800 }}>Pintasan</h3>
        <div className="bilas-shortcut-list">
          <Link to="/admin/orders" className="bilas-shortcut-item">
            <div className="bilas-shortcut-icon">💳</div>
            <div className="bilas-shortcut-info">
              <strong>Pelunasan Faktur</strong>
              <span>Faktur jatuh tempo atau belum lunas • {unpaidOrders.length} faktur ({rupiah(totalUnpaid)})</span>
            </div>
            <span className="bilas-shortcut-arrow">›</span>
          </Link>

          <div className="bilas-shortcut-item" style={{ cursor: 'default' }}>
            <div className="bilas-shortcut-icon">⭐</div>
            <div className="bilas-shortcut-info">
              <strong>Top Layanan</strong>
              <span>Layanan paling sering dipesan • {topService}</span>
            </div>
          </div>

          <Link to="/admin/customers" className="bilas-shortcut-item">
            <div className="bilas-shortcut-icon">👥</div>
            <div className="bilas-shortcut-info">
              <strong>Top Pelanggan</strong>
              <span>Pelanggan dengan transaksi terbanyak • {topCustomer}</span>
            </div>
            <span className="bilas-shortcut-arrow">›</span>
          </Link>

          <Link to="/admin/products" className="bilas-shortcut-item">
            <div className="bilas-shortcut-icon">📦</div>
            <div className="bilas-shortcut-info">
              <strong>Stok Produk</strong>
              <span>Kelola persediaan bahan, pembersih, & aksesoris</span>
            </div>
            <span className="bilas-shortcut-arrow">›</span>
          </Link>
        </div>
      </div>

      {/* Section: Aktivitas & Pengerjaan Hari Ini */}
      <div className="card" style={{ padding: '16px 14px' }}>
        <div className="row between" style={{ marginBottom: '12px', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Aktivitas Pengerjaan Hari Ini</h3>
            <span className="xs muted">Atur tahapan cuci, jemur, finishing, atau siap diambil</span>
          </div>
          <span className="badge teal">{activityList.length} Barang</span>
        </div>

        {/* Activity Filter Grid - Clean text, no emoji, uniform box size */}
        <div className="activity-filter-grid">
          <button
            type="button"
            className={`activity-filter-btn filter-all ${activityTab === 'all' ? 'active' : ''}`}
            onClick={() => setActivityTab('all')}
          >
            Semua ({activeOrders.length + completedOrders.length})
          </button>
          <button
            type="button"
            className={`activity-filter-btn filter-menunggu ${activityTab === 'menunggu' ? 'active' : ''}`}
            onClick={() => setActivityTab('menunggu')}
          >
            Antrean ({waitingOrders.length})
          </button>
          <button
            type="button"
            className={`activity-filter-btn filter-pencucian ${activityTab === 'pencucian' ? 'active' : ''}`}
            onClick={() => setActivityTab('pencucian')}
          >
            Cuci ({washingOrders.length})
          </button>
          <button
            type="button"
            className={`activity-filter-btn filter-pengeringan ${activityTab === 'pengeringan' ? 'active' : ''}`}
            onClick={() => setActivityTab('pengeringan')}
          >
            Kering ({dryingOrders.length})
          </button>
          <button
            type="button"
            className={`activity-filter-btn filter-finishing ${activityTab === 'finishing' ? 'active' : ''}`}
            onClick={() => setActivityTab('finishing')}
          >
            Finishing ({finishingOrders.length})
          </button>
          <button
            type="button"
            className={`activity-filter-btn filter-selesai ${activityTab === 'selesai' ? 'active' : ''}`}
            onClick={() => setActivityTab('selesai')}
          >
            Siap ({completedOrders.length})
          </button>
        </div>

        {loading ? (
          <div className="empty">Memuat aktivitas operasional...</div>
        ) : activityList.length === 0 ? (
          <div className="empty" style={{ padding: '24px 16px' }}>
            <strong style={{ display: 'block', marginBottom: '4px' }}>Tidak ada barang dalam tahap ini.</strong>
            <p className="small muted" style={{ margin: '4px 0 12px' }}>
              Semua sepatu di tahapan ini telah selesai diproses.
            </p>
            <Link to="/admin/orders/new" className="btn sm primary">
              + Input Pesanan Baru
            </Link>
          </div>
        ) : (
          <div className="stack" style={{ gap: '12px' }}>
            {activityList.map((o) => {
              const late = isLate(o, now) && o.status !== 'diambil';
              const waUrl = whatsappLink(o.customerPhone, `Halo Kak ${o.customerName}, info pengerjaan pesanan Anda di Soleful Soaks!`);
              const isUpdating = updatingId === o.id;
              const stage = STAGE_CONFIG[o.status] || STAGE_CONFIG.menunggu;

              return (
                <div
                  key={o.id}
                  className="order-card-modern"
                  style={{ borderLeftColor: stage.color }}
                >
                  {/* Top Row: Customer Name & Stage Selector */}
                  <div className="order-card-top-row">
                    <div className="order-card-cust-name" title={o.customerName}>
                      {o.customerName}
                    </div>
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
                      <span className="stage-btn-text">{stage.shortLabel}</span>
                      <span className="stage-btn-arrow">▾</span>
                    </button>
                  </div>

                  {/* Middle Box: Shoe Details & Services (Clean, No Emoji) */}
                  <div className="order-card-body-info">
                    <div className="order-card-item-title">
                      {o.brand} {o.model} {o.color ? `(${o.color})` : ''}
                    </div>
                    <div className="order-card-service-desc">
                      Layanan: {o.services.map((s) => s.name).join(', ')}
                    </div>
                  </div>

                  {/* Meta Row: Target Estimate & Received Date */}
                  <div className="order-card-meta-row">
                    {o.estimatedAt ? (
                      <span className={`order-card-est-pill ${late ? 'late' : ''}`}>
                        {late ? 'Terlambat: ' : 'Target: '}
                        {fmtDate(o.estimatedAt)}
                      </span>
                    ) : (
                      <span className="order-card-est-pill">Target: -</span>
                    )}
                    <span className="order-card-received-date">
                      Masuk: {fmtDate(o.receivedAt)}
                    </span>
                  </div>

                  {/* Bottom Action Row: Big Easy Touch WA & Detail Buttons (Uniform Size, No Emoji) */}
                  <div className="order-card-bottom-actions">
                    {waUrl ? (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="order-card-btn-wa"
                        title="Chat WhatsApp Pelanggan"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                        </svg>
                        WhatsApp
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="order-card-btn-wa"
                        style={{ opacity: 0.45, cursor: 'not-allowed' }}
                      >
                        No WA
                      </button>
                    )}
                    <Link
                      to={`/admin/orders/${o.id}`}
                      className="order-card-btn-detail"
                      title="Buka Detail Pesanan"
                    >
                      Detail Pesanan →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* Bottom Sheet / Modal for Selecting Order Stage (Clean, No Emoji) */}
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
