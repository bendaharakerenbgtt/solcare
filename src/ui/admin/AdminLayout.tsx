import React, { useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { BilasTransactionSheet } from './BilasTransactionSheet';
import { CloseIcon } from '../common/Icons';

export const AdminLayout: React.FC = () => {
  const { user, ready, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [transactionSheetOpen, setTransactionSheetOpen] = useState(false);
  const location = useLocation();

  if (!ready) {
    return <div className="auth-wrap">Memuat data sesi...</div>;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  const closeSidebar = () => setSidebarOpen(false);

  const isOrderNew = location.pathname === '/admin/orders/new';
  const isOrderDetail = location.pathname.startsWith('/admin/orders/') && !isOrderNew;
  const isCustomerPage = location.pathname === '/admin/customers';
  const isSubPageWithAction = isOrderNew || isOrderDetail;
  const hasCustomerDetailOpen = isCustomerPage && location.search.includes('selectedId=');

  const isBeranda = location.pathname === '/admin';
  const isPesanan = location.pathname.startsWith('/admin/orders') && !isOrderNew;
  const isLaporan = location.pathname === '/admin/reports';
  const isAkun = sidebarOpen || location.pathname === '/admin/settings';

  return (
    <div>
      {!isSubPageWithAction && !isCustomerPage && (
        <div className="admin-mobile-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="mobile-header-icon-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka Menu"
              title="Buka Menu Navigasi"
              style={{ background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#001b3a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <img
                src="/logo-color.jpg"
                alt="Solecare Logo"
                style={{ width: '28px', height: '28px', borderRadius: '7px', objectFit: 'cover' }}
              />
              <span style={{ fontWeight: 800, fontSize: '1.28rem', color: '#001b3a', letterSpacing: '-0.03em' }}>
                solecare
              </span>
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="mobile-header-icon-btn"
              title="Notifikasi"
              onClick={() => alert('Tidak ada notifikasi baru')}
              aria-label="Notifikasi"
              style={{ background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#001b3a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </button>
          </div>
        </div>
      )}

      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="admin">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="brand-mark">
                <img src="/solecare_logo.jpg" alt="Solecare Logo" />
              </div>
              <div>
                Soleful Soaks!
                <small>Staff Dashboard</small>
              </div>
            </div>
            <button
              type="button"
              className="mobile-sidebar-close"
              onClick={closeSidebar}
              aria-label="Tutup Menu"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >
              <CloseIcon size={18} color="#64748b" />
            </button>
          </div>

          {/* Primary Action Button for Desktop & Sidebar */}
          <button
            type="button"
            className="sidebar-create-tx-btn"
            onClick={() => {
              closeSidebar();
              setTransactionSheetOpen(true);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Buat Transaksi Baru</span>
          </button>

          <div className="group">Operasional</div>
          <nav>
            <Link
              to="/admin"
              className={location.pathname === '/admin' ? 'active' : ''}
              onClick={closeSidebar}
            >
              Beranda
            </Link>
            <Link
              to="/admin/orders"
              className={location.pathname.startsWith('/admin/orders') ? 'active' : ''}
              onClick={closeSidebar}
            >
              Pesanan & Antrean
            </Link>
            <Link
              to="/admin/calendar"
              className={location.pathname === '/admin/calendar' ? 'active' : ''}
              onClick={closeSidebar}
            >
              Kalender Jadwal
            </Link>
            <Link
              to="/admin/customers"
              className={location.pathname === '/admin/customers' ? 'active' : ''}
              onClick={closeSidebar}
            >
              Pelanggan
            </Link>
          </nav>

          <div className="group">Katalog & Stok</div>
          <nav>
            <Link
              to="/admin/services"
              className={location.pathname === '/admin/services' ? 'active' : ''}
              onClick={closeSidebar}
            >
              Layanan & Harga
            </Link>
            <Link
              to="/admin/products"
              className={location.pathname === '/admin/products' ? 'active' : ''}
              onClick={closeSidebar}
            >
              Produk & Pewangi
            </Link>
          </nav>

          <div className="group">Sistem & Laporan</div>
          <nav>
            <Link
              to="/admin/reports"
              className={location.pathname === '/admin/reports' ? 'active' : ''}
              onClick={closeSidebar}
            >
              Laporan Bisnis
            </Link>
            <Link
              to="/admin/announcements"
              className={location.pathname === '/admin/announcements' ? 'active' : ''}
              onClick={closeSidebar}
            >
              Pengumuman Web
            </Link>
            <Link
              to="/admin/retention"
              className={location.pathname === '/admin/retention' ? 'active' : ''}
              onClick={closeSidebar}
            >
              Retensi Foto
            </Link>
            <Link
              to="/admin/settings"
              className={location.pathname === '/admin/settings' ? 'active' : ''}
              onClick={closeSidebar}
            >
              Pengaturan Toko
            </Link>
            <Link
              to="/admin/staff"
              className={location.pathname === '/admin/staff' ? 'active' : ''}
              onClick={closeSidebar}
            >
              Pegawai / Admin
            </Link>
          </nav>

          <div style={{ marginTop: 'auto', borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
            <div className="small" style={{ color: '#94a3b8', marginBottom: '8px', padding: '0 8px' }}>
              Logged in: <strong>{user.name}</strong> ({user.role})
            </div>
            <div className="row" style={{ padding: '0 8px', gap: '8px' }}>
              <Link to="/" target="_blank" className="btn secondary sm" style={{ flex: 1 }}>
                Web Publik ↗
              </Link>
              <button
                onClick={() => void signOut()}
                className="btn danger sm"
                style={{ flex: 1 }}
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>

      {/* Bilas-Style Mobile App Bottom Navigation Bar with Floating (+) Button */}
      {!isSubPageWithAction && !hasCustomerDetailOpen && (
        <nav className="bilas-bottom-nav" aria-label="Menu Navigasi Bawah Bilas">
          {/* 1. Beranda */}
          <Link
            to="/admin"
            className={`bilas-nav-item ${isBeranda ? 'active' : ''}`}
            onClick={closeSidebar}
          >
            <img
              src={isBeranda ? '/bilas_icons/icon_menu_home.webp' : '/bilas_icons/icon_menu_home_disable.webp'}
              alt="Beranda"
              className="bilas-nav-icon"
            />
            <span className="bilas-nav-label">Beranda</span>
          </Link>

          {/* 2. Pesanan */}
          <Link
            to="/admin/orders"
            className={`bilas-nav-item ${isPesanan ? 'active' : ''}`}
            onClick={closeSidebar}
          >
            <img
              src={isPesanan ? '/bilas_icons/icon_menu_pesanan.webp' : '/bilas_icons/icon_menu_pesanan_disable.webp'}
              alt="Pesanan"
              className="bilas-nav-icon"
            />
            <span className="bilas-nav-label">Pesanan</span>
          </Link>

          {/* Center Floating (+) Button */}
          <button
            type="button"
            className={`bilas-nav-fab ${transactionSheetOpen ? 'open' : ''}`}
            onClick={() => setTransactionSheetOpen(!transactionSheetOpen)}
            aria-label="Buat Transaksi Baru"
            title="Buat Transaksi"
          >
            <div className="bilas-nav-fab-circle">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: transactionSheetOpen ? 'rotate(45deg)' : 'none',
                  transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
          </button>

          {/* 3. Laporan */}
          <Link
            to="/admin/reports"
            className={`bilas-nav-item ${isLaporan ? 'active' : ''}`}
            onClick={closeSidebar}
          >
            <img
              src={isLaporan ? '/bilas_icons/icon_menu_laporan.webp' : '/bilas_icons/icon_menu_laporan_disable.webp'}
              alt="Laporan"
              className="bilas-nav-icon"
            />
            <span className="bilas-nav-label">Laporan</span>
          </Link>

          {/* 4. Akun */}
          <Link
            to="/admin/settings"
            className={`bilas-nav-item ${isAkun ? 'active' : ''}`}
            onClick={closeSidebar}
            aria-label="Buka Menu Akun & Toko"
          >
            <img
              src={isAkun ? '/bilas_icons/icon_menu_akun.webp' : '/bilas_icons/icon_menu_akun_disable.webp'}
              alt="Akun"
              className="bilas-nav-icon"
            />
            <span className="bilas-nav-label">Akun</span>
          </Link>
        </nav>
      )}

      {/* Transaction Customer Selection Sheet (Pilih pelanggan sebelum melakukan transaksi) */}
      <BilasTransactionSheet
        isOpen={transactionSheetOpen}
        onClose={() => setTransactionSheetOpen(false)}
      />
    </div>
  );
};

