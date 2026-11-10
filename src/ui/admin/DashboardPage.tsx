import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { fmtDate, STATUS_LABEL, whatsappLink, rupiah } from '../../lib/format';
import { isLate } from '../../lib/estimation';
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
  const { user } = useAuth();
  const { data: orders, loading, reload } = useAsync(() => repo.listOrders(), []);

  const now = new Date();

  // Bilas top tabs: 'KEUANGAN' or 'TRANSAKSI' (Screenshot 1 & 2)
  const [activeCardTab, setActiveCardTab] = useState<'TRANSAKSI' | 'KEUANGAN'>('TRANSAKSI');

  // Status filter for orders list
  const [statusFilter, setStatusFilter] = useState<'all' | 'menunggu' | 'proses' | 'selesai' | 'terlambat' | 'self_service' | 'penjemputan' | 'siap_antar'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [stageModalOrder, setStageModalOrder] = useState<Order | null>(null);

  const activeOrders = (orders || []).filter((o) => o.status !== 'selesai' && o.status !== 'diambil');
  const completedOrders = (orders || []).filter((o) => o.status === 'selesai');
  const lateOrders = (orders || []).filter((o) => isLate(o, now) && o.status !== 'diambil');

  // Breakdown by activity status
  const washingOrders = (orders || []).filter((o) => o.status === 'pencucian');
  const dryingOrders = (orders || []).filter((o) => o.status === 'pengeringan');
  const finishingOrders = (orders || []).filter((o) => o.status === 'finishing');
  const waitingOrders = (orders || []).filter((o) => o.status === 'menunggu');

  // Filtered activity items based on Bilas status filter
  const activityList = useMemo(() => {
    return (orders || []).filter((o) => {
      if (statusFilter === 'all') return o.status !== 'diambil';
      if (statusFilter === 'menunggu') return o.status === 'menunggu';
      if (statusFilter === 'proses') return o.status === 'pencucian' || o.status === 'pengeringan' || o.status === 'finishing';
      if (statusFilter === 'selesai') return o.status === 'selesai';
      if (statusFilter === 'terlambat') return isLate(o, now) && o.status !== 'diambil';
      return false;
    });
  }, [orders, statusFilter, now]);

  // Financial aggregates for Bilas KEUANGAN tab (Screenshot 1)
  const { totalOmset, totalPaid, totalUnpaid, totalProducts, unpaidOrders } = useMemo(() => {
    let omset = 0;
    let paid = 0;
    let unpaid = 0;
    let products = 0;
    const unpaidList: Order[] = [];

    (orders || []).forEach((o) => {
      const price = o.total || 0;
      omset += price;
      const isPaid = o.payment?.status === 'lunas';
      if (isPaid) {
        paid += price;
      } else {
        unpaid += price;
        unpaidList.push(o);
      }

      if (o.products && o.products.length > 0) {
        o.products.forEach((p) => {
          products += p.subtotal || 0;
        });
      }
    });

    return {
      totalOmset: omset,
      totalPaid: paid,
      totalUnpaid: unpaid,
      totalProducts: products,
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
    <div className="stack" style={{ gap: '14px' }}>
      {/* 1. Header Sapaan Persis Screenshot Bilas: Hai, [Nama] \n Selamat datang kembali */}
      <div style={{ marginTop: '2px', marginBottom: '4px' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Hai, {user?.name || 'coba'}
        </h1>
        <span style={{ fontSize: '0.84rem', color: '#64748b' }}>Selamat datang kembali</span>
      </div>

      {/* 2. Bilas Signature Liquid Silk Blue Card (img_bg_liquid.webp) */}
      <div className="bilas-liquid-card">
        {/* Card Top Tabs: KEUANGAN ▾ & TRANSAKSI */}
        <div className="bilas-liquid-tabs">
          <button
            type="button"
            className={`bilas-liquid-tab ${activeCardTab === 'KEUANGAN' ? 'active' : ''}`}
            onClick={() => setActiveCardTab('KEUANGAN')}
          >
            KEUANGAN ▾
          </button>
          <button
            type="button"
            className={`bilas-liquid-tab ${activeCardTab === 'TRANSAKSI' ? 'active' : ''}`}
            onClick={() => setActiveCardTab('TRANSAKSI')}
          >
            TRANSAKSI
          </button>
        </div>

        {/* Card Body When KEUANGAN (Screenshot 1) */}
        {activeCardTab === 'KEUANGAN' && (
          <div className="bilas-liquid-finance-grid">
            <div className="bilas-liquid-finance-col">
              <span className="bilas-liquid-finance-label">
                Pendapatan <span style={{ fontSize: '0.74rem', opacity: 0.85 }}>ⓘ</span>
              </span>
              <div className="bilas-liquid-finance-val">
                Rp {totalPaid.toLocaleString('id-ID')}
              </div>
            </div>
            <div className="bilas-liquid-finance-col">
              <span className="bilas-liquid-finance-label">
                Omset <span style={{ fontSize: '0.74rem', opacity: 0.85 }}>ⓘ</span>
              </span>
              <div className="bilas-liquid-finance-val">
                Rp {totalOmset.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        )}

        {/* Card Body When TRANSAKSI (Screenshot 2) */}
        {activeCardTab === 'TRANSAKSI' && (
          <div className="bilas-liquid-tx-carousel">
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', padding: '0 4px', userSelect: 'none' }}>‹</span>

            <button
              type="button"
              className="bilas-liquid-tx-item"
              onClick={() => setStatusFilter(statusFilter === 'menunggu' ? 'all' : 'menunggu')}
              title="Filter Masuk"
            >
              <div className="bilas-liquid-tx-circle">↓</div>
              <span className="bilas-liquid-tx-label">{waitingOrders.length} Masuk</span>
            </button>

            <button
              type="button"
              className="bilas-liquid-tx-item"
              onClick={() => setStatusFilter('all')}
              title="Semua Pesanan Harus Selesai"
            >
              <div className="bilas-liquid-tx-circle">📌</div>
              <span className="bilas-liquid-tx-label">{activeOrders.length} Harus Selesai</span>
            </button>

            <button
              type="button"
              className="bilas-liquid-tx-item"
              onClick={() => setStatusFilter(statusFilter === 'terlambat' ? 'all' : 'terlambat')}
              title="Filter Terlambat"
            >
              <div className="bilas-liquid-tx-circle">↺</div>
              <span className="bilas-liquid-tx-label">{lateOrders.length} Terlambat</span>
            </button>

            <button
              type="button"
              className="bilas-liquid-tx-item"
              onClick={() => setStatusFilter(statusFilter === 'selesai' ? 'all' : 'selesai')}
              title="Filter Siap Diambil"
            >
              <div className="bilas-liquid-tx-circle">✓</div>
              <span className="bilas-liquid-tx-label">{completedOrders.length} Total</span>
            </button>

            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', padding: '0 4px', userSelect: 'none' }}>›</span>
          </div>
        )}
      </div>

      {/* 3. Content Below Card When TRANSAKSI (Screenshot 2) */}
      {activeCardTab === 'TRANSAKSI' && (
        <div>
          {/* 6-Item Grid Persis Bilas Screenshot 2 */}
          <div className="bilas-grid-6">
            <div
              className={`bilas-grid-6-item ${statusFilter === 'self_service' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'self_service' ? 'all' : 'self_service')}
            >
              <div className="bilas-grid-6-icon-wrap">
                <img src="/bilas_icons/icon_dashboard1.webp" alt="Self Service" className="bilas-grid-6-img" />
                <span className="bilas-grid-6-badge">0</span>
              </div>
              <span className="bilas-grid-6-title">Self Service</span>
            </div>

            <div
              className={`bilas-grid-6-item ${statusFilter === 'penjemputan' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'penjemputan' ? 'all' : 'penjemputan')}
            >
              <div className="bilas-grid-6-icon-wrap">
                <img src="/bilas_icons/icon_dashboard2.webp" alt="Penjemputan" className="bilas-grid-6-img" />
                <span className="bilas-grid-6-badge">0</span>
              </div>
              <span className="bilas-grid-6-title">Penjemputan</span>
            </div>

            <div
              className={`bilas-grid-6-item ${statusFilter === 'menunggu' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'menunggu' ? 'all' : 'menunggu')}
            >
              <div className="bilas-grid-6-icon-wrap">
                <img src="/bilas_icons/icon_dashboard3.webp" alt="Antrian" className="bilas-grid-6-img" />
                <span className="bilas-grid-6-badge">{waitingOrders.length}</span>
              </div>
              <span className="bilas-grid-6-title">Antrian</span>
            </div>

            <div
              className={`bilas-grid-6-item ${statusFilter === 'proses' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'proses' ? 'all' : 'proses')}
            >
              <div className="bilas-grid-6-icon-wrap">
                <img src="/bilas_icons/icon_dashboard4.webp" alt="Proses" className="bilas-grid-6-img" />
                <span className="bilas-grid-6-badge">{washingOrders.length + dryingOrders.length}</span>
              </div>
              <span className="bilas-grid-6-title">Proses</span>
            </div>

            <div
              className={`bilas-grid-6-item ${statusFilter === 'selesai' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'selesai' ? 'all' : 'selesai')}
            >
              <div className="bilas-grid-6-icon-wrap">
                <img src="/bilas_icons/icon_dashboard5.webp" alt="Siap Ambil" className="bilas-grid-6-img" />
                <span className="bilas-grid-6-badge">{completedOrders.length}</span>
              </div>
              <span className="bilas-grid-6-title">Siap Ambil</span>
            </div>

            <div
              className={`bilas-grid-6-item ${statusFilter === 'siap_antar' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'siap_antar' ? 'all' : 'siap_antar')}
            >
              <div className="bilas-grid-6-icon-wrap">
                <img src="/bilas_icons/icon_dashboard6.webp" alt="Siap Antar" className="bilas-grid-6-img" />
                <span className="bilas-grid-6-badge">0</span>
              </div>
              <span className="bilas-grid-6-title">Siap Antar</span>
            </div>
          </div>

          {/* Seksi Pintasan Persis Bilas Screenshot 2 */}
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
              Pintasan
            </h3>
            <div className="bilas-shortcut-list">
              <div
                className="bilas-shortcut-item"
                style={{ cursor: 'pointer' }}
                onClick={() => setStatusFilter('all')}
              >
                <div className="bilas-shortcut-icon">
                  <img src="/bilas_icons/icon_lap_mesin.webp" alt="Aktivitas Mesin" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                </div>
                <div className="bilas-shortcut-info">
                  <strong>Aktivitas Mesin</strong>
                  <span>Status & kapasitas rak / pengerjaan sepatu</span>
                </div>
                <span className="bilas-shortcut-arrow">›</span>
              </div>

              <Link to="/admin/customers" className="bilas-shortcut-item">
                <div className="bilas-shortcut-icon">👥</div>
                <div className="bilas-shortcut-info">
                  <strong>Top Pelanggan</strong>
                  <span>Pelanggan dengan transaksi terbanyak • {topCustomer}</span>
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

              <Link to="/admin/orders" className="bilas-shortcut-item">
                <div className="bilas-shortcut-icon">💳</div>
                <div className="bilas-shortcut-info">
                  <strong>Pelunasan Faktur</strong>
                  <span>Faktur jatuh tempo atau belum lunas • {unpaidOrders.length} faktur ({rupiah(totalUnpaid)})</span>
                </div>
                <span className="bilas-shortcut-arrow">›</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 4. Content Below Card When KEUANGAN (Screenshot 1) */}
      {activeCardTab === 'KEUANGAN' && (
        <div style={{ marginBottom: '20px' }}>
          {/* Ringkasan Header & Filter Dropdown */}
          <div className="row between" style={{ alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Ringkasan</h3>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              Hari Ini ▾
            </span>
          </div>

          {/* Chart Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
            {/* Chart Legend Persis Screenshot 1 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.73rem', marginBottom: '16px', color: '#64748b' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284c7' }} /> Omset
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} /> Pendapatan
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} /> Pengeluaran
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06b6d4' }} /> Self Service
              </span>
            </div>

            {/* SVG Line Chart Persis Screenshot 1 */}
            <div style={{ width: '100%', height: '140px', position: 'relative' }}>
              <svg width="100%" height="100%" viewBox="0 0 340 120" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                {/* Horizontal grid line */}
                <line x1="24" y1="15" x2="330" y2="15" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="24" y1="85" x2="330" y2="85" stroke="#cbd5e1" strokeWidth="1" />
                
                {/* Y-axis labels */}
                <text x="8" y="18" fill="#94a3b8" fontSize="10" textAnchor="start">1</text>
                <text x="8" y="88" fill="#94a3b8" fontSize="10" textAnchor="start">0</text>
                
                {/* Chart Baseline */}
                <polyline
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2"
                  points="24,85 70,85 120,85 170,85 220,85 270,85 320,85"
                />
              </svg>

              {/* X-axis Timeline Labels Persis Screenshot 1 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '20px', fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
                <span>00-01</span>
                <span>04-05</span>
                <span>08-09</span>
                <span>12-13</span>
                <span>16-17</span>
                <span>20-21</span>
                <span>Jam</span>
              </div>
            </div>
          </div>

          {/* Rincian Finansial Tabel Persis Screenshot 1 */}
          <div className="bilas-finance-breakdown-table">
            <div className="bilas-finance-breakdown-row">
              <span>Total Omset</span>
              <strong>{totalOmset.toLocaleString('id-ID')}</strong>
            </div>
            <div className="bilas-finance-breakdown-row">
              <span>Pendapatan Transaksi</span>
              <strong>{totalPaid.toLocaleString('id-ID')}</strong>
            </div>
            <div className="bilas-finance-breakdown-row">
              <span>Pendapatan TopUp Paket</span>
              <strong>0</strong>
            </div>
            <div className="bilas-finance-breakdown-row">
              <span>Pendapatan TopUp Deposit</span>
              <strong>0</strong>
            </div>
            <div className="bilas-finance-breakdown-row">
              <span>Pendapatan Jual Produk</span>
              <strong>{totalProducts.toLocaleString('id-ID')}</strong>
            </div>
            <div className="bilas-finance-breakdown-row">
              <span>Pendapatan Self Service</span>
              <strong>0</strong>
            </div>
            <div className="bilas-finance-breakdown-row">
              <span>Pendapatan Lain</span>
              <strong>0</strong>
            </div>
            <div className="bilas-finance-breakdown-row">
              <span>Pengeluaran</span>
              <strong>0</strong>
            </div>
            <div className="bilas-finance-breakdown-row">
              <span>Kasbon</span>
              <strong>0</strong>
            </div>
            <div className="bilas-finance-breakdown-row">
              <span>Laba Rugi</span>
              <strong>{totalPaid.toLocaleString('id-ID')}</strong>
            </div>
            <div className="bilas-finance-breakdown-row">
              <span>Piutang</span>
              <strong style={{ color: totalUnpaid > 0 ? '#b91c1c' : 'inherit' }}>{totalUnpaid.toLocaleString('id-ID')}</strong>
            </div>
            <div className="bilas-finance-breakdown-row">
              <span>Pembulatan</span>
              <strong>0</strong>
            </div>
            <div className="bilas-finance-breakdown-row">
              <span>Biaya Merchant</span>
              <strong>0</strong>
            </div>
            <div className="bilas-finance-breakdown-row">
              <span>Transaksi Masuk</span>
              <strong>{orders?.length || 0} Transaksi</strong>
            </div>
          </div>
        </div>
      )}

      {/* 5. Daftar Transaksi / Aktivitas Pengerjaan Sepatu (Saat di tab TRANSAKSI) */}
      {activeCardTab === 'TRANSAKSI' && (
        <div className="card" style={{ padding: '16px 14px' }}>
          <div className="row between" style={{ marginBottom: '12px', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800 }}>Daftar Transaksi Aktif</h3>
              <span className="xs muted">Atur tahapan cuci, jemur, finishing, atau siap diambil</span>
            </div>
            <span className="badge teal">{activityList.length} Barang</span>
          </div>

        {/* Activity Filter Grid */}
        <div className="activity-filter-grid">
          <button
            type="button"
            className={`activity-filter-btn filter-all ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Semua ({activeOrders.length + completedOrders.length})
          </button>
          <button
            type="button"
            className={`activity-filter-btn filter-menunggu ${statusFilter === 'menunggu' ? 'active' : ''}`}
            onClick={() => setStatusFilter('menunggu')}
          >
            Antrean ({waitingOrders.length})
          </button>
          <button
            type="button"
            className={`activity-filter-btn filter-pencucian ${statusFilter === 'proses' ? 'active' : ''}`}
            onClick={() => setStatusFilter('proses')}
          >
            Proses ({washingOrders.length + dryingOrders.length + finishingOrders.length})
          </button>
          <button
            type="button"
            className={`activity-filter-btn filter-selesai ${statusFilter === 'selesai' ? 'active' : ''}`}
            onClick={() => setStatusFilter('selesai')}
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
      )}


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
