import React, { useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export const AdminLayout: React.FC = () => {
  const { user, ready, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (!ready) {
    return <div className="auth-wrap">Memuat data sesi...</div>;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div>
      <div className="admin-mobile-bar">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle Navigation">
          ☰
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/solecare_logo.jpg"
            alt="Solecare Logo"
            style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }}
          />
          <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>Soleful Staff</span>
        </div>
        <div style={{ width: '38px' }} aria-hidden="true" />
      </div>

      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="admin">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="brand">
            <div className="brand-mark">
              <img src="/solecare_logo.jpg" alt="Solecare Logo" />
            </div>
            <div>
              Soleful Soaks!
              <small>Staff Dashboard</small>
            </div>
          </div>

          <div className="group">Operasional</div>
          <nav>
            <Link
              to="/admin"
              className={location.pathname === '/admin' ? 'active' : ''}
              onClick={closeSidebar}
            >
              📊 Dashboard
            </Link>
            <Link
              to="/admin/orders"
              className={location.pathname.startsWith('/admin/orders') ? 'active' : ''}
              onClick={closeSidebar}
            >
              📦 Pesanan & Antrean
            </Link>
            <Link
              to="/admin/calendar"
              className={location.pathname === '/admin/calendar' ? 'active' : ''}
              onClick={closeSidebar}
            >
              📅 Kalender Jadwal
            </Link>
            <Link
              to="/admin/customers"
              className={location.pathname === '/admin/customers' ? 'active' : ''}
              onClick={closeSidebar}
            >
              👥 Pelanggan
            </Link>
          </nav>

          <div className="group">Katalog & Stok</div>
          <nav>
            <Link
              to="/admin/services"
              className={location.pathname === '/admin/services' ? 'active' : ''}
              onClick={closeSidebar}
            >
              🏷️ Layanan & Harga
            </Link>
            <Link
              to="/admin/products"
              className={location.pathname === '/admin/products' ? 'active' : ''}
              onClick={closeSidebar}
            >
              🧴 Produk & Pewangi
            </Link>
          </nav>

          <div className="group">Sistem & Laporan</div>
          <nav>
            <Link
              to="/admin/reports"
              className={location.pathname === '/admin/reports' ? 'active' : ''}
              onClick={closeSidebar}
            >
              📈 Laporan Bisnis
            </Link>
            <Link
              to="/admin/announcements"
              className={location.pathname === '/admin/announcements' ? 'active' : ''}
              onClick={closeSidebar}
            >
              📢 Pengumuman Web
            </Link>
            <Link
              to="/admin/retention"
              className={location.pathname === '/admin/retention' ? 'active' : ''}
              onClick={closeSidebar}
            >
              🗄️ Retensi Foto
            </Link>
            <Link
              to="/admin/settings"
              className={location.pathname === '/admin/settings' ? 'active' : ''}
              onClick={closeSidebar}
            >
              ⚙️ Pengaturan Toko
            </Link>
            <Link
              to="/admin/staff"
              className={location.pathname === '/admin/staff' ? 'active' : ''}
              onClick={closeSidebar}
            >
              🛡️ Pegawai / Admin
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

      {/* Mobile App Bottom Navigation Bar */}
      <nav className="admin-bottom-nav" aria-label="Menu Navigasi Bawah">
        <Link
          to="/admin"
          className={`bottom-nav-item ${location.pathname === '/admin' ? 'active' : ''}`}
          onClick={closeSidebar}
        >
          <span className="bottom-nav-icon">📊</span>
          <span className="bottom-nav-label">Dashboard</span>
        </Link>

        <Link
          to="/admin/orders"
          className={`bottom-nav-item ${location.pathname === '/admin/orders' ? 'active' : ''}`}
          onClick={closeSidebar}
        >
          <span className="bottom-nav-icon">📦</span>
          <span className="bottom-nav-label">Pesanan</span>
        </Link>

        <Link
          to="/admin/orders/new"
          className={`bottom-nav-fab ${location.pathname === '/admin/orders/new' ? 'active' : ''}`}
          title="Tambah Pesanan Baru"
          onClick={closeSidebar}
        >
          <span className="bottom-nav-fab-icon">+</span>
          <span className="bottom-nav-fab-label">Catat Baru</span>
        </Link>

        <Link
          to="/admin/calendar"
          className={`bottom-nav-item ${location.pathname === '/admin/calendar' ? 'active' : ''}`}
          onClick={closeSidebar}
        >
          <span className="bottom-nav-icon">📅</span>
          <span className="bottom-nav-label">Kalender</span>
        </Link>

        <button
          type="button"
          className={`bottom-nav-item ${sidebarOpen ? 'active' : ''}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Buka Semua Menu"
        >
          <span className="bottom-nav-icon">☰</span>
          <span className="bottom-nav-label">Menu</span>
        </button>
      </nav>
    </div>
  );
};
