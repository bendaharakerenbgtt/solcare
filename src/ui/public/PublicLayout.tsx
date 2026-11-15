import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { UserIcon } from '../common/Icons';

export const PublicLayout: React.FC = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: settings } = useAsync(() => repo.getSettings(), []);
  const { data: announcements } = useAsync(() => repo.listPublicAnnouncements(), []);

  const importantBanner = (announcements || []).find((a) => a.important) || null;

  const isHome = location.pathname === '/';
  const isTrack = location.pathname.startsWith('/cek-pesanan');
  const isAnnouncements = location.pathname.startsWith('/pengumuman');
  const isContact = location.pathname.startsWith('/kontak');

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="public-app-shell">
      {/* 1. Banner Info Penting Marquee (Teks Berjalan) jika ada */}
      {importantBanner && (
        <Link to="/pengumuman" className="public-top-banner-alert" title="Klik untuk lihat detail pengumuman">
          <span className="public-top-banner-badge">
            INFO TOKO
          </span>
          <div className="public-marquee-wrap">
            <div className="public-marquee-track">
              <span>{importantBanner.title} {importantBanner.body ? `— ${importantBanner.body}` : ''}</span>
              <span className="public-marquee-spacer">✦</span>
              <span>{importantBanner.title} {importantBanner.body ? `— ${importantBanner.body}` : ''}</span>
            </div>
          </div>
          <span aria-hidden="true" style={{ opacity: 0.85, flexShrink: 0, fontSize: '0.8rem', paddingLeft: '4px' }}>→</span>
        </Link>
      )}

      {/* 2. Header Web Biasa (Navbar atas dengan brand & navigasi simpel) */}
      <header className="public-simple-header">
        <div className="public-nav-container">
          <Link to="/" className="brand" onClick={closeMenu}>
            <div className="brand-mark">
              <img src="/solecare_logo.jpg" alt="Logo Soleful Soaks" width="36" height="36" />
            </div>
            <div>
              Soleful Soaks!
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="public-desktop-nav" aria-label="Navigasi Web">
            <Link to="/" className={isHome ? 'active' : ''}>
              Beranda &amp; Harga
            </Link>
            <Link to="/cek-pesanan" className={isTrack ? 'active' : ''}>
              Cek Pesanan
            </Link>
            <Link to="/pengumuman" className={isAnnouncements ? 'active' : ''}>
              Pengumuman
            </Link>
            <Link to="/kontak" className={isContact ? 'active' : ''}>
              Kontak
            </Link>
            <Link to="/admin/login" className="btn secondary sm" style={{ marginLeft: '8px' }}>
              Staff Login
            </Link>
          </nav>

          {/* Mobile Right Controls: Burger Toggle Only */}
          <div className="public-mobile-actions">
            <button
              type="button"
              className="public-burger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Tutup navigasi' : 'Buka menu navigasi'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="public-mobile-dropdown">
            <Link to="/" className={isHome ? 'active' : ''} onClick={closeMenu}>
              Beranda &amp; Pricelist
            </Link>
            <Link to="/cek-pesanan" className={isTrack ? 'active' : ''} onClick={closeMenu}>
              Cek Status Pesanan
            </Link>
            <Link to="/pengumuman" className={isAnnouncements ? 'active' : ''} onClick={closeMenu}>
              Pengumuman Toko
            </Link>
            <Link to="/kontak" className={isContact ? 'active' : ''} onClick={closeMenu}>
              Kontak &amp; Lokasi
            </Link>
            <div style={{ paddingTop: '8px', borderTop: '1px solid #e2e8f0', marginTop: '4px' }}>
              <Link to="/admin/login" className="btn secondary sm" style={{ width: '100%', justifyContent: 'center' }} onClick={closeMenu}>
                <UserIcon size={15} color="#001b3a" /> Staff Portal
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 3. Main Body */}
      <main className="public-main" style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* 4. Footer Web Publik */}
      <footer className="public-simple-footer" style={{ marginTop: isAnnouncements ? '64px' : '36px' }}>
        <div className="container">
          <div className="grid grid-2" style={{ marginBottom: '24px', gap: '28px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <img
                  src="/solecare_logo.jpg"
                  alt="Solecare Logo"
                  style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }}
                />
                <div>
                  <h3 style={{ color: '#ffffff', fontSize: '1.1rem', margin: 0 }}>
                    Soleful Soaks!
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Shoe Care &amp; Laundry
                  </span>
                </div>
              </div>
              <p className="small" style={{ color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                {settings?.tagline || 'Jasa perawatan & pembersihan sepatu, tas, topi, dan helm profesional.'}
              </p>
              {settings?.address && (
                <p className="small" style={{ marginTop: '8px', color: '#94a3b8' }}>
                  {settings.address}
                </p>
              )}
            </div>

            <div>
              <h4 style={{ color: '#ffffff', marginBottom: '12px', fontSize: '0.95rem' }}>Akses &amp; Layanan Publik</h4>
              <div className="stack small" style={{ gap: '8px' }}>
                <Link to="/" style={{ color: '#cbd5e1' }}>Beranda &amp; Daftar Harga</Link>
                <Link to="/layanan" style={{ color: '#cbd5e1' }}>Katalog Layanan Lengkap</Link>
                <Link to="/cek-pesanan" style={{ color: '#cbd5e1' }}>Cek Status Pesanan</Link>
                <Link to="/pengumuman" style={{ color: '#cbd5e1' }}>Pengumuman &amp; Jadwal</Link>
                <Link to="/kontak" style={{ color: '#cbd5e1' }}>Kontak &amp; Lokasi</Link>
              </div>
            </div>
          </div>

          <div className="footer-bottom-row small" style={{ color: '#94a3b8', borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
            <div>© {new Date().getFullYear()} Soleful Soaks! Shoes Care. All rights reserved.</div>
            <div>Layanan Drop-off &amp; Antar Jemput Resmi Soleful Soaks</div>
          </div>
        </div>
      </footer>
    </div>
  );
};
