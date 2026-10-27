import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { priceLabel, durationLabel } from '../../lib/format';

export const HomePage: React.FC = () => {
  const [searchCode, setSearchCode] = useState('');
  const navigate = useNavigate();

  const { data: services } = useAsync(() => repo.listServices(false), []);
  const { data: announcements } = useAsync(() => repo.listPublicAnnouncements(), []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) {
      navigate(`/cek-pesanan?code=${encodeURIComponent(searchCode.trim())}`);
    }
  };

  const mainServices = (services || []).filter((s) => s.category === 'main').slice(0, 4);

  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div>
              <div className="eyebrow" style={{ marginBottom: '12px' }}>
                Jasa Perawatan Sepatu & Apparel
              </div>
              <h1>
                Kembalikan Kilau & Kebersihan <span>Sepatu Favorit Anda</span>
              </h1>
              <p className="lead" style={{ marginTop: '16px', marginBottom: '24px' }}>
                Perawatan mendalam, unyellowing, recolor hingga pembersihan harian untuk sepatu, tas, helm, dan topi dengan standar pengerjaan profesional.
              </p>
              <div className="hero-cta-row">
                <Link to="/layanan" className="btn lg hero-btn">
                  Lihat Katalog Layanan
                </Link>
                <Link to="/cek-pesanan" className="btn secondary lg hero-btn">
                  Lacak Pesanan
                </Link>
              </div>
            </div>

            <div>
              <div className="hero-card">
                <h3 style={{ marginBottom: '6px' }}>Lacak Status Sepatu Anda</h3>
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
                  💡 Tidak perlu akun/login. Cukup simpan kode tanda terima Anda.
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

      {/* Announcements if any */}
      {announcements && announcements.length > 0 && (
        <section className="container" style={{ marginTop: '32px' }}>
          <div className="stack" style={{ gap: '12px' }}>
            {announcements.slice(0, 2).map((a) => (
              <div key={a.id} className={`card alert ${a.important ? 'warn' : 'info'}`}>
                <div className="row between">
                  <strong>📢 {a.title}</strong>
                  <span className="badge">{a.category}</span>
                </div>
                <p style={{ margin: '8px 0 0' }}>{a.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Highlight Services */}
      <section className="section">
        <div className="container">
          <div className="section-title">
            <div className="eyebrow">Pilihan Terbaik</div>
            <h2>Layanan Utama Kami</h2>
            <p className="muted" style={{ maxWidth: '600px', margin: '0 auto' }}>
              Dikerjakan secara teliti dengan formula sabun khusus & teknik aman untuk berbagai material sepatu Anda.
            </p>
          </div>

          <div className="grid grid-4">
            {mainServices.map((svc) => (
              <div key={svc.id} className="card service-card">
                <h3>{svc.name}</h3>
                <div className="price">{priceLabel(svc)}</div>
                <p className="small muted" style={{ flex: 1, margin: '8px 0' }}>
                  {svc.description}
                </p>
                <div className="small muted">
                  ⏱️ Durasi: {durationLabel(svc) || '2 hari'}
                </div>
                {svc.expressEligible && (
                  <span className="badge teal" style={{ alignSelf: 'flex-start', marginTop: '8px' }}>
                    Tersedia Express
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="center mt" style={{ marginTop: '32px' }}>
            <Link to="/layanan" className="btn secondary">
              Lihat Semua {services?.length || ''} Layanan & Kategori →
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section alt">
        <div className="container">
          <div className="section-title">
            <div className="eyebrow">Alur Pelayanan</div>
            <h2>Mudah & Transparan</h2>
            <p className="muted">Semua proses pencucian dapat Anda pantau secara langsung lewat website ini.</p>
          </div>

          <div className="grid grid-3">
            <div className="card flat" style={{ textAlign: 'center', padding: '28px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🏬</div>
              <h3>1. Drop-off di Toko</h3>
              <p className="small muted">
                Bawa sepatu Anda ke workshop kami. Pegawai akan memeriksa material, noda, serta menentukan estimasi dan pembayaran di tempat.
              </p>
            </div>
            <div className="card flat" style={{ textAlign: 'center', padding: '28px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🧼</div>
              <h3>2. Proses Pengerjaan</h3>
              <p className="small muted">
                Pencucian mendalam, pengeringan higienis, dan detailing. Pantau status pengerjaan secara real-time via kode pesanan.
              </p>
            </div>
            <div className="card flat" style={{ textAlign: 'center', padding: '28px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✨</div>
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
