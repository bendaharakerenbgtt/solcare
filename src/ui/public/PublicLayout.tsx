import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { whatsappLink } from '../../lib/format';

export const PublicLayout: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { data: settings } = useAsync(() => repo.getSettings(), []);

  const waUrl = settings?.whatsappNumber
    ? whatsappLink(settings.whatsappNumber, 'Halo Soleful Soaks! Shoes Care, saya ingin bertanya tentang layanan.')
    : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="site-header">
        <div className="container">
          <Link to="/" className="brand">
            <div className="brand-mark">
              <img src="/solecare_logo.jpg" alt="Solecare Logo" />
            </div>
            <div>
              Soleful Soaks!
              <small>Shoes Care</small>
            </div>
          </Link>

          <button
            className="menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle Menu"
          >
            ☰
          </button>

          <nav className={`site-nav ${menuOpen ? 'open' : ''}`}>
            <Link
              to="/"
              className={location.pathname === '/' ? 'active' : ''}
              onClick={() => setMenuOpen(false)}
            >
              Beranda
            </Link>
            <Link
              to="/layanan"
              className={location.pathname === '/layanan' ? 'active' : ''}
              onClick={() => setMenuOpen(false)}
            >
              Layanan & Harga
            </Link>
            <Link
              to="/cek-pesanan"
              className={location.pathname === '/cek-pesanan' ? 'active' : ''}
              onClick={() => setMenuOpen(false)}
            >
              Cek Pesanan
            </Link>
            <Link
              to="/pengumuman"
              className={location.pathname === '/pengumuman' ? 'active' : ''}
              onClick={() => setMenuOpen(false)}
            >
              Pengumuman
            </Link>
            <Link
              to="/kontak"
              className={location.pathname === '/kontak' ? 'active' : ''}
              onClick={() => setMenuOpen(false)}
            >
              Kontak
            </Link>
            <Link
              to="/admin/login"
              className="btn secondary sm staff-portal-btn"
              onClick={() => setMenuOpen(false)}
            >
              Staff Portal
            </Link>
          </nav>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="grid grid-3" style={{ marginBottom: '24px' }}>
            <div>
              <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '8px' }}>
                Soleful Soaks!
              </h3>
              <p className="small muted">
                {settings?.tagline || 'Jasa perawatan & pembersihan sepatu, tas, topi, dan helm profesional.'}
              </p>
              {settings?.address && (
                <p className="small" style={{ marginTop: '8px' }}>
                  {settings.address}
                </p>
              )}
            </div>
            <div>
              <h4 style={{ color: '#fff', marginBottom: '12px' }}>Navigasi</h4>
              <div className="stack small" style={{ gap: '6px' }}>
                <Link to="/layanan">Layanan & Harga</Link>
                <Link to="/cek-pesanan">Lacak Status Pesanan</Link>
                <Link to="/pengumuman">Pengumuman & Promo</Link>
                <Link to="/kontak">Hubungi Customer Service</Link>
              </div>
            </div>
            <div>
              <h4 style={{ color: '#fff', marginBottom: '12px' }}>Hubungi Kami</h4>
              <p className="small muted">
                Kunjungi toko kami langsung untuk drop-off barang & konsultasi kondisi sepatu.
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
            <div>Pelayanan langsung di tempat • Pembayaran tunai & QRIS</div>
          </div>
        </div>
      </footer>
    </div>
  );
};
