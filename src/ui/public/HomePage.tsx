import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { priceLabel, durationLabel } from '../../lib/format';
import type { ServiceCategory } from '../../data/types';

export const HomePage: React.FC = () => {
  const [searchCode, setSearchCode] = useState('');
  const [selectedCat, setSelectedCat] = useState<ServiceCategory | 'all'>('all');
  const catalogScrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: services } = useAsync(() => repo.listServices(false), []);
  const { data: announcements } = useAsync(() => repo.listPublicAnnouncements(), []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) {
      navigate(`/cek-pesanan?code=${encodeURIComponent(searchCode.trim())}`);
    }
  };

  const filteredServices = (services || []).filter((s) => {
    if (selectedCat === 'all') return true;
    return s.category === selectedCat;
  });

  const scrollCatalog = (dir: 'left' | 'right') => {
    if (catalogScrollRef.current) {
      const scrollAmount = 300;
      catalogScrollRef.current.scrollBy({
        left: dir === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* Hero Section */}
      <section className="hero modern-hero">
        <div className="container">
          <div className="hero-grid">
            <div>
              <h1 className="modern-hero-title">
                Soleful Soaks! <br />
                <span>Shoes Care</span>
              </h1>
              <p className="lead" style={{ marginTop: '14px', marginBottom: '24px' }}>
                Perawatan mendalam, unyellowing, recolor hingga pembersihan harian untuk sepatu, tas, helm, dan topi dengan standar pengerjaan profesional.
              </p>
              <div className="hero-cta-row">
                <Link to="/cek-pesanan" className="btn lg hero-btn">
                  Lacak Pesanan Anda
                </Link>
                <Link to="/layanan" className="btn secondary lg hero-btn">
                  Lihat Katalog Harga
                </Link>
              </div>
            </div>

            <div>
              <div className="hero-card">
                <div className="row" style={{ gap: '8px', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0 }}>Lacak Status Sepatu</h3>
                </div>
                <p className="small muted" style={{ marginBottom: '16px' }}>
                  Masukkan kode pesanan yang tertera pada nota penerimaan Anda.
                </p>
                <form onSubmit={handleSearch} className="stack">
                  <label className="field">
                    <span>Kode Pesanan</span>
                    <input
                      type="text"
                      placeholder="Contoh: SS-7K3QX-9MPRA"
                      value={searchCode}
                      onChange={(e) => setSearchCode(e.target.value)}
                      className="mono"
                      required
                    />
                  </label>
                  <button type="submit" className="btn">
                    Cek Status Sekarang
                  </button>
                </form>
                <div style={{ marginTop: '16px', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px' }} className="small muted">
                  Tidak perlu akun/login. Cukup simpan kode tanda terima Anda.
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--line)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Contoh kode demo: </span>
                    <button
                      type="button"
                      className="btn ghost sm"
                      style={{ padding: '2px 6px', fontSize: '0.78rem' }}
                      onClick={() => setSearchCode('SS-7K3QX-9MPRA')}
                    >
                      SS-7K3QX-9MPRA
                    </button>
                    {' / '}
                    <button
                      type="button"
                      className="btn ghost sm"
                      style={{ padding: '2px 6px', fontSize: '0.78rem' }}
                      onClick={() => setSearchCode('SS-28YBN-4VCFW')}
                    >
                      SS-28YBN-4VCFW
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modern Quick Menu Cards */}
      <section className="container" style={{ marginTop: '-20px', position: 'relative', zIndex: 10 }}>
        <div className="grid grid-3 quick-menu-grid">
          <Link to="/cek-pesanan" className="quick-menu-card">
            <div className="quick-menu-icon" style={{ background: 'var(--primary-100)', color: 'var(--primary)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: 'var(--ink)' }}>Cek Pesanan Saya</h4>
              <p className="small muted" style={{ margin: 0 }}>Pantau timeline cuci, foto kolase & estimasi</p>
            </div>
          </Link>

          <Link to="/layanan" className="quick-menu-card">
            <div className="quick-menu-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: 'var(--ink)' }}>Katalog & Estimasi</h4>
              <p className="small muted" style={{ margin: 0 }}>Daftar harga transparan mulai Rp35.000</p>
            </div>
          </Link>

          <Link to="/kontak" className="quick-menu-card">
            <div className="quick-menu-icon" style={{ background: '#dcfce7', color: '#15803d' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: 'var(--ink)' }}>Konsultasi & WhatsApp</h4>
              <p className="small muted" style={{ margin: 0 }}>Tanya penanganan noda khusus & drop-off</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Modern Announcements Banner / Card */}
      {announcements && announcements.length > 0 && (
        <section className="container" style={{ marginTop: '36px' }}>
          <div className="card modern-announcement-card">
            <div className="row between" style={{ marginBottom: '14px' }}>
              <div className="row" style={{ gap: '8px' }}>
                <span className="pulse-indicator"></span>
                <strong style={{ fontSize: '1rem', color: 'var(--ink)' }}>Papan Informasi & Pengumuman Toko</strong>
              </div>
              <Link to="/pengumuman" className="small" style={{ fontWeight: 600 }}>
                Lihat Semua ({announcements.length}) →
              </Link>
            </div>

            <div className="stack" style={{ gap: '10px' }}>
              {announcements.slice(0, 2).map((a) => (
                <div key={a.id} className={`announcement-bubble ${a.important ? 'important' : ''}`}>
                  <div className="row between" style={{ marginBottom: '4px' }}>
                    <span className="badge teal">{a.category}</span>
                    <span className="xs muted">{new Date(a.publishAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <strong style={{ display: 'block', fontSize: '0.98rem', color: 'var(--ink)', marginBottom: '4px' }}>
                    {a.title}
                  </strong>
                  <p className="small" style={{ margin: 0, color: '#475569', lineHeight: 1.5 }}>
                    {a.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Slide / Carousel Katalog Layanan */}
      <section className="section" style={{ paddingBottom: '32px' }}>
        <div className="container">
          <div className="row between" style={{ marginBottom: '16px' }}>
            <div>
              <div className="eyebrow">Katalog Layanan</div>
              <h2 style={{ fontSize: '1.75rem', margin: '4px 0 0' }}>Pilihan Perawatan Sepatu & Barang</h2>
            </div>
            <div className="carousel-nav-arrows">
              <button
                type="button"
                className="btn secondary sm carousel-arrow-btn"
                onClick={() => scrollCatalog('left')}
                aria-label="Scroll left"
              >
                ←
              </button>
              <button
                type="button"
                className="btn secondary sm carousel-arrow-btn"
                onClick={() => scrollCatalog('right')}
                aria-label="Scroll right"
              >
                →
              </button>
            </div>
          </div>

          {/* Filter Kategori Tabs */}
          <div className="catalog-cat-pills">
            <button
              type="button"
              className={`cat-pill ${selectedCat === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCat('all')}
            >
              Semua ({services?.length || 0})
            </button>
            <button
              type="button"
              className={`cat-pill ${selectedCat === 'main' ? 'active' : ''}`}
              onClick={() => setSelectedCat('main')}
            >
              Main Services
            </button>
            <button
              type="button"
              className={`cat-pill ${selectedCat === 'express' ? 'active' : ''}`}
              onClick={() => setSelectedCat('express')}
            >
              Express (24h/48h)
            </button>
            <button
              type="button"
              className={`cat-pill ${selectedCat === 'additional' ? 'active' : ''}`}
              onClick={() => setSelectedCat('additional')}
            >
              Additional & Repaint
            </button>
            <button
              type="button"
              className={`cat-pill ${selectedCat === 'other' ? 'active' : ''}`}
              onClick={() => setSelectedCat('other')}
            >
              Tas, Helm & Topi
            </button>
          </div>

          {/* Scrollable / Slide Cards */}
          <div className="catalog-slider" ref={catalogScrollRef}>
            {filteredServices.map((svc) => (
              <div key={svc.id} className="catalog-slide-card card">
                <div className="row between" style={{ marginBottom: '8px' }}>
                  <span className="badge teal" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    {svc.category}
                  </span>
                  {svc.expressEligible && (
                    <span className="badge ok" style={{ fontSize: '0.7rem' }}>
                      Bisa Express
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>{svc.name}</h3>
                <div className="price" style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.2rem', marginBottom: '8px' }}>
                  {priceLabel(svc)}
                </div>
                <p className="small muted" style={{ flex: 1, margin: '0 0 12px', lineHeight: 1.45 }}>
                  {svc.description}
                </p>
                <div className="xs muted" style={{ borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
                  Durasi: <strong>{durationLabel(svc) || '2 hari'}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="center mt" style={{ marginTop: '20px' }}>
            <Link to="/layanan" className="btn secondary sm">
              Lihat Katalog & Ketentuan Lengkap →
            </Link>
          </div>
        </div>
      </section>

      {/* Alur Pelayanan Ringkas */}
      <section className="section alt" style={{ marginTop: '24px' }}>
        <div className="container">
          <div className="section-title">
            <div className="eyebrow">Alur Pelayanan</div>
            <h2>Mudah & Transparan</h2>
            <p className="muted">Semua proses pencucian dapat Anda pantau secara langsung lewat website ini.</p>
          </div>

          <div className="grid grid-3">
            <div className="card flat" style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '10px' }}>01</div>
              <h3>1. Drop-off di Toko</h3>
              <p className="small muted">
                Bawa sepatu Anda ke workshop kami. Pegawai memeriksa material, noda, serta menentukan estimasi & pembayaran di tempat.
              </p>
            </div>
            <div className="card flat" style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '10px' }}>02</div>
              <h3>2. Proses Pengerjaan</h3>
              <p className="small muted">
                Pencucian mendalam, pengeringan higienis, dan detailing. Pantau status pengerjaan secara real-time via kode pesanan.
              </p>
            </div>
            <div className="card flat" style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '10px' }}>03</div>
              <h3>3. Selesai & Ambil</h3>
              <p className="small muted">
                Dapatkan notifikasi selesai, lihat foto dokumentasi kolase hasil pembersihan, dan ambil sepatu wangi siap pakai!
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
