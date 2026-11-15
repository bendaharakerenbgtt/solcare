import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { whatsappLink } from '../../lib/format';
import { SearchIcon, UserIcon, WhatsAppIcon } from '../common/Icons';

export const PublicLayout: React.FC = () => {
  const location = useLocation();
  const { data: settings } = useAsync(() => repo.getSettings(), []);
  const { data: announcements } = useAsync(() => repo.listPublicAnnouncements(), []);

  const waUrl = settings?.whatsappNumber
    ? whatsappLink(settings.whatsappNumber, 'Halo Soleful Soaks! Shoes Care, saya ingin bertanya tentang layanan.')
    : null;

  const importantBanner = (announcements || []).find((a) => a.important) || null;

  const isHome = location.pathname === '/';
  const isServices = location.pathname.startsWith('/layanan');
  const isTrack = location.pathname.startsWith('/cek-pesanan');
  const isAnnouncements = location.pathname.startsWith('/pengumuman');
  const isContact = location.pathname.startsWith('/kontak');

  const hoursBadge = settings?.openTime && settings?.closeTime
    ? `${settings.openTime}–${settings.closeTime}`
    : '09:00–18:00';

  return (
    <div className="public-app-shell">
      {/* Announcement Banner Alert (only when an important announcement is active) */}
      {importantBanner && (
        <Link to="/pengumuman" className="public-top-banner-alert">
          <span
            style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              flexShrink: 0,
            }}
          >
            INFO PENTING
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {importantBanner.title}
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      )}

      {/* Mobile Top App Bar (Mirrors AdminLayout.admin-mobile-bar) */}
      <header className="public-mobile-bar">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <img
            src="/logo-color.jpg"
            alt="Solecare Logo"
            style={{ width: '28px', height: '28px', borderRadius: '7px', objectFit: 'cover' }}
          />
          <span style={{ fontWeight: 800, fontSize: '1.28rem', color: '#001b3a', letterSpacing: '-0.03em' }}>
            solecare
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '4px 9px',
              borderRadius: '999px',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#16a34a',
                display: 'inline-block',
              }}
            />
            Buka {hoursBadge}
          </span>

          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              title="Chat WhatsApp CS"
              aria-label="Chat WhatsApp Customer Service"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: '#f0fdf4',
                border: '1px solid #dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              <WhatsAppIcon size={18} color="#16a34a" />
            </a>
          )}

          <Link
            to="/admin/login"
            title="Staff Portal"
            aria-label="Masuk Staff Portal"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#001b3a',
              textDecoration: 'none',
            }}
          >
            <UserIcon size={17} color="#001b3a" />
          </Link>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="site-header public-desktop-header">
        <div className="container">
          <Link to="/" className="brand">
            <div className="brand-mark">
              <img src="/solecare_logo.jpg" alt="Solecare Logo" />
            </div>
            <div>
              Soleful Soaks!
              <small>Shoe Care &amp; Laundry</small>
            </div>
          </Link>

          <nav className="site-nav" aria-label="Navigasi Utama">
            <Link to="/" className={isHome ? 'active' : ''}>
              Beranda
            </Link>
            <Link to="/layanan" className={isServices ? 'active' : ''}>
              Layanan &amp; Harga
            </Link>
            <Link to="/cek-pesanan" className={isTrack ? 'active' : ''}>
              Cek Pesanan
            </Link>
            <Link to="/pengumuman" className={isAnnouncements ? 'active' : ''}>
              Pengumuman
            </Link>
            <Link to="/kontak" className={isContact ? 'active' : ''}>
              Kontak &amp; Lokasi
            </Link>
            <Link to="/admin/login" className="btn secondary sm staff-portal-btn">
              Staff Portal
            </Link>
          </nav>
        </div>
      </header>

      <main className="public-main">
        <Outlet />
      </main>

      {/* Desktop Footer (Hidden on mobile so bottom nav stays clean like Admin App) */}
      <footer className="site-footer public-desktop-footer">
        <div className="container">
          <div className="grid grid-3" style={{ marginBottom: '24px' }}>
            <div>
              <h3 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '8px' }}>
                Soleful Soaks!
              </h3>
              <p className="small muted">
                {settings?.tagline || 'Jasa perawatan & pembersihan sepatu, tas, topi, dan helm profesional.'}
              </p>
              {settings?.address && (
                <p className="small" style={{ marginTop: '8px', color: '#cbd5e1' }}>
                  {settings.address}
                </p>
              )}
            </div>
            <div>
              <h4 style={{ color: '#fff', marginBottom: '12px' }}>Navigasi</h4>
              <div className="stack small" style={{ gap: '6px' }}>
                <Link to="/layanan">Layanan &amp; Harga</Link>
                <Link to="/cek-pesanan">Lacak Status Pesanan</Link>
                <Link to="/pengumuman">Pengumuman &amp; Promo</Link>
                <Link to="/kontak">Hubungi Customer Service</Link>
              </div>
            </div>
            <div>
              <h4 style={{ color: '#fff', marginBottom: '12px' }}>Hubungi Kami</h4>
              <p className="small muted">
                Drop-off langsung atau pesan layanan antar jemput area sekitar workshop.
              </p>
              <div className="row" style={{ marginTop: '12px' }}>
                {waUrl && (
                  <a href={waUrl} target="_blank" rel="noreferrer" className="btn wa sm">
                    WhatsApp CS
                  </a>
                )}
                {settings?.instagramUrl && (
                  <a
                    href={settings.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn secondary sm"
                  >
                    Instagram
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="footer-bottom-row small muted">
            <div>© {new Date().getFullYear()} Soleful Soaks! Shoes Care. All rights reserved.</div>
            <div>Drop-off &amp; Antar Jemput • Pembayaran Tunai (Cash Only)</div>
          </div>
        </div>
      </footer>

      {/* Bilas-Style Mobile Bottom Navigation Bar */}
      <nav className="bilas-bottom-nav" aria-label="Menu Navigasi Bawah Pengunjung">
        <Link to="/" className={`bilas-nav-item ${isHome ? 'active' : ''}`}>
          <img
            src={isHome ? '/bilas_icons/icon_menu_home.webp' : '/bilas_icons/icon_menu_home_disable.webp'}
            alt=""
            className="bilas-nav-icon"
          />
          <span className="bilas-nav-label">Beranda</span>
        </Link>

        <Link to="/layanan" className={`bilas-nav-item ${isServices ? 'active' : ''}`}>
          <img
            src={isServices ? '/bilas_icons/icon_menu_pesanan.webp' : '/bilas_icons/icon_menu_pesanan_disable.webp'}
            alt=""
            className="bilas-nav-icon"
          />
          <span className="bilas-nav-label">Layanan</span>
        </Link>

        <Link
          to="/cek-pesanan"
          className={`bilas-nav-fab ${isTrack ? 'active' : ''}`}
          aria-label="Cek Status Pesanan"
          title="Cek Status Pesanan"
        >
          <div className="bilas-nav-fab-circle">
            <SearchIcon size={22} color="#ffffff" />
          </div>
        </Link>

        <Link to="/pengumuman" className={`bilas-nav-item ${isAnnouncements ? 'active' : ''}`}>
          <img
            src={isAnnouncements ? '/bilas_icons/icon_menu_laporan.webp' : '/bilas_icons/icon_menu_laporan_disable.webp'}
            alt=""
            className="bilas-nav-icon"
          />
          <span className="bilas-nav-label">Info</span>
        </Link>

        <Link to="/kontak" className={`bilas-nav-item ${isContact ? 'active' : ''}`}>
          <img
            src={isContact ? '/bilas_icons/icon_menu_akun.webp' : '/bilas_icons/icon_menu_akun_disable.webp'}
            alt=""
            className="bilas-nav-icon"
          />
          <span className="bilas-nav-label">Kontak</span>
        </Link>
      </nav>
    </div>
  );
};
