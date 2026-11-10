import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { isLate } from '../../lib/estimation';
import {
  PinIcon,
  RefreshIcon,
  CheckIcon,
  ArrowDownIcon,
  UsersIcon,
  StarIcon,
  SiluetSelfServiceIcon,
  SiluetPickupIcon,
  SiluetQueueIcon,
  SiluetProcessIcon,
  SiluetReadyPickupIcon,
  SiluetDeliveryIcon,
} from '../common/Icons';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { data: orders } = useAsync(() => repo.listOrders(), []);

  const now = new Date();

  // Bilas top tabs: 'KEUANGAN' or 'TRANSAKSI' (Screenshot 1 & 2)
  const [activeCardTab, setActiveCardTab] = useState<'TRANSAKSI' | 'KEUANGAN'>('TRANSAKSI');

  const activeOrders = (orders || []).filter((o) => o.status !== 'selesai' && o.status !== 'diambil');
  const completedOrders = (orders || []).filter((o) => o.status === 'selesai');
  const lateOrders = (orders || []).filter((o) => isLate(o, now) && o.status !== 'diambil');

  // Breakdown by activity status
  const washingOrders = (orders || []).filter((o) => o.status === 'pencucian');
  const dryingOrders = (orders || []).filter((o) => o.status === 'pengeringan');
  const finishingOrders = (orders || []).filter((o) => o.status === 'finishing');
  const waitingOrders = (orders || []).filter((o) => o.status === 'menunggu');

  // Financial aggregates for Bilas KEUANGAN tab (Screenshot 1)
  const { totalOmset, totalPaid, totalUnpaid, totalProducts } = useMemo(() => {
    let omset = 0;
    let paid = 0;
    let unpaid = 0;
    let products = 0;

    (orders || []).forEach((o) => {
      const price = o.total || 0;
      omset += price;
      const isPaid = o.payment?.status === 'lunas';
      if (isPaid) {
        paid += price;
      } else {
        unpaid += price;
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
    };
  }, [orders]);

  return (
    <div className="stack" style={{ gap: '14px' }}>
      {/* 1. Header Sapaan Persis Screenshot Bilas: Hai, [Nama] \n Selamat datang kembali + QR Scanner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px', marginBottom: '4px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Hai, {user?.name || 'coba'}
          </h1>
          <span style={{ fontSize: '0.84rem', color: '#64748b' }}>Selamat datang kembali</span>
        </div>
        <button
          type="button"
          onClick={() => alert('Fitur kamera scanner QR siap digunakan')}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '6px',
            cursor: 'pointer',
            color: '#001b3a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Scan QR Transaksi"
          aria-label="Scan QR Transaksi"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#001b3a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
            <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
            <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
            <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
          </svg>
        </button>
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
                Omzet <span style={{ fontSize: '0.74rem', opacity: 0.85 }}>ⓘ</span>
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

            <Link
              to="/admin/orders?tab=antrian"
              className="bilas-liquid-tx-item"
              title="Pesanan Masuk"
            >
              <div className="bilas-liquid-tx-circle">
                <ArrowDownIcon size={18} color="#ffffff" />
              </div>
              <span className="bilas-liquid-tx-label">{waitingOrders.length} Masuk</span>
            </Link>

            <Link
              to="/admin/orders?tab=proses"
              className="bilas-liquid-tx-item"
              title="Harus Selesai"
            >
              <div className="bilas-liquid-tx-circle">
                <PinIcon size={18} color="#ffffff" />
              </div>
              <span className="bilas-liquid-tx-label">{activeOrders.length} Harus Selesai</span>
            </Link>

            <Link
              to="/admin/orders?tab=terlambat"
              className="bilas-liquid-tx-item"
              title="Terlambat"
            >
              <div className="bilas-liquid-tx-circle">
                <RefreshIcon size={18} color="#ffffff" />
              </div>
              <span className="bilas-liquid-tx-label">{lateOrders.length} Terlambat</span>
            </Link>

            <Link
              to="/admin/orders"
              className="bilas-liquid-tx-item"
              title="Total Pesanan"
            >
              <div className="bilas-liquid-tx-circle">
                <CheckIcon size={18} color="#ffffff" />
              </div>
              <span className="bilas-liquid-tx-label">{(orders || []).length} Total</span>
            </Link>

            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', padding: '0 4px', userSelect: 'none' }}>›</span>
          </div>
        )}
      </div>

      {/* 3. Content Below Card When TRANSAKSI (Screenshot 2) */}
      {activeCardTab === 'TRANSAKSI' && (
        <div>
          {/* 6-Item Grid Solecare Siluet Icons */}
          <div className="bilas-grid-6">
            <Link
              to="/admin/orders?tab=self_service"
              className="bilas-grid-6-item"
              style={{ textDecoration: 'none' }}
            >
              <div className="bilas-grid-6-icon-wrap" style={{ background: '#fdf2f2', borderRadius: '14px' }}>
                <SiluetSelfServiceIcon size={26} color="#bf2f3b" />
                <span className="bilas-grid-6-badge">0</span>
              </div>
              <span className="bilas-grid-6-title">Self Service</span>
            </Link>

            <Link
              to="/admin/orders?tab=penjemputan"
              className="bilas-grid-6-item"
              style={{ textDecoration: 'none' }}
            >
              <div className="bilas-grid-6-icon-wrap" style={{ background: '#f0f4f9', borderRadius: '14px' }}>
                <SiluetPickupIcon size={26} color="#001b3a" />
                <span className="bilas-grid-6-badge">0</span>
              </div>
              <span className="bilas-grid-6-title">Penjemputan</span>
            </Link>

            <Link
              to="/admin/orders?tab=antrian"
              className="bilas-grid-6-item"
              style={{ textDecoration: 'none' }}
            >
              <div className="bilas-grid-6-icon-wrap" style={{ background: '#fdf2f2', borderRadius: '14px' }}>
                <SiluetQueueIcon size={26} color="#bf2f3b" />
                <span className="bilas-grid-6-badge">{waitingOrders.length}</span>
              </div>
              <span className="bilas-grid-6-title">Antrian</span>
            </Link>

            <Link
              to="/admin/orders?tab=proses"
              className="bilas-grid-6-item"
              style={{ textDecoration: 'none' }}
            >
              <div className="bilas-grid-6-icon-wrap" style={{ background: '#f0f4f9', borderRadius: '14px' }}>
                <SiluetProcessIcon size={26} color="#001b3a" />
                <span className="bilas-grid-6-badge">{washingOrders.length + dryingOrders.length + finishingOrders.length}</span>
              </div>
              <span className="bilas-grid-6-title">Proses</span>
            </Link>

            <Link
              to="/admin/orders?tab=siap_ambil"
              className="bilas-grid-6-item"
              style={{ textDecoration: 'none' }}
            >
              <div className="bilas-grid-6-icon-wrap" style={{ background: '#fdf2f2', borderRadius: '14px' }}>
                <SiluetReadyPickupIcon size={26} color="#bf2f3b" />
                <span className="bilas-grid-6-badge">{completedOrders.length}</span>
              </div>
              <span className="bilas-grid-6-title">Siap Ambil</span>
            </Link>

            <Link
              to="/admin/orders?tab=siap_antar"
              className="bilas-grid-6-item"
              style={{ textDecoration: 'none' }}
            >
              <div className="bilas-grid-6-icon-wrap" style={{ background: '#f0f4f9', borderRadius: '14px' }}>
                <SiluetDeliveryIcon size={26} color="#001b3a" />
                <span className="bilas-grid-6-badge">0</span>
              </div>
              <span className="bilas-grid-6-title">Siap Antar</span>
            </Link>
          </div>

          {/* Seksi Pintasan Persis Bilas Screenshot 2 */}
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
              Pintasan
            </h3>
            <div className="bilas-shortcut-list">
              <Link to="/admin/services" className="bilas-shortcut-item">
                <div className="bilas-shortcut-icon">
                  <img src="/bilas_icons/icon_lap_mesin.webp" alt="Aktivitas Mesin" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                </div>
                <div className="bilas-shortcut-info">
                  <strong>Aktivitas Mesin</strong>
                  <span>Status & jumlah load cycle per mesin</span>
                </div>
                <span className="bilas-shortcut-arrow">›</span>
              </Link>

              <Link to="/admin/customers" className="bilas-shortcut-item">
                <div className="bilas-shortcut-icon">
                  <UsersIcon size={20} color="#001b3a" />
                </div>
                <div className="bilas-shortcut-info">
                  <strong>Top Pelanggan</strong>
                  <span>Pelanggan dengan transaksi terbanyak</span>
                </div>
                <span className="bilas-shortcut-arrow">›</span>
              </Link>

              <Link to="/admin/services" className="bilas-shortcut-item">
                <div className="bilas-shortcut-icon">
                  <StarIcon size={18} color="#bf2f3b" />
                </div>
                <div className="bilas-shortcut-info">
                  <strong>Top Layanan</strong>
                  <span>Layanan paling sering dipesan</span>
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
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#001b3a' }} /> Omzet
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} /> Pendapatan
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#bf2f3b' }} /> Pengeluaran
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b' }} /> Self Service
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
                  stroke="#001b3a"
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
              <span>Total Omzet</span>
              <strong>{totalOmset.toLocaleString('id-ID')}</strong>
            </div>
            <div className="bilas-finance-breakdown-row">
              <span>Pendapatan Transaksi</span>
              <strong>{totalPaid.toLocaleString('id-ID')}</strong>
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
    </div>
  );
};
