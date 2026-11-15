import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { SEED_SERVICES } from '../../data/seed';
import {
  ANNOUNCEMENT_CATEGORY_LABEL,
  durationLabel,
  priceLabel,
  whatsappLink,
} from '../../lib/format';
import type { ServiceCategory } from '../../data/types';
import {
  SearchIcon,
  TruckIcon,
  SneakerIllustration,
  BagIllustration,
  CapIllustration,
  HelmetIllustration,
  SparklesIllustration,
  WhatsAppIcon,
  StoreIcon,
  PerfumeBottleIllustration,
} from '../common/Icons';

type ServiceItem = {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  priceMin: number;
  priceMax: number | null;
  durationMinDays: number;
  durationMaxDays: number;
  expressHours: number | null;
  expressEligible: boolean;
};

const DELIVERY_TIERS = [
  {
    title: 'Diantar Sendiri (Drop-off)',
    sub: 'Langsung antar & serahkan di workshop Soleful Soaks',
    fee: 'Gratis',
    badgeBg: '#dcfce7',
    badgeColor: '#15803d',
  },
  {
    title: 'Free Antar Jemput (Maks. 3KM)',
    sub: 'Khusus pesanan minimal 2 pasang sepatu',
    fee: 'Gratis',
    badgeBg: '#dcfce7',
    badgeColor: '#15803d',
  },
  {
    title: 'Antar Jemput (+Rp 10.000)',
    sub: 'Radius maksimal 3KM untuk 1 pasang sepatu',
    fee: '+Rp 10.000',
    badgeBg: '#fee2e2',
    badgeColor: '#b91c1c',
  },
  {
    title: 'Antar Jemput (+Rp 20.000)',
    sub: 'Radius di atas 3KM (konfirmasi via WhatsApp)',
    fee: '+Rp 20.000',
    badgeBg: '#fee2e2',
    badgeColor: '#b91c1c',
  },
];

const PARFUMS = [
  {
    name: 'Vanilla Milk',
    note: 'Manis lembut & tahan lama',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z" />
        <path d="M19 12a7 7 0 0 0-14 0" />
        <path d="M12 3v2" />
        <path d="M12 8c.5-1 1.5-1 2 0" />
      </svg>
    ),
    bg: '#fef3c7',
  },
  {
    name: 'Apple Mint',
    note: 'Segar dingin & fruity',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20.94c1.88-1.12 3.14-2.73 3.68-4.59.56-1.92.36-3.88-.51-5.63A7.99 7.99 0 0 0 4.1 6.54c-1.74 2.89-1.94 6.33-.51 9.4 1.43 3.06 4.3 5 8.41 5Z" />
        <path d="M12 3c1 2 2 3.5 3 4" />
        <path d="M9 13c1.5 1 3.5 1 5 0" />
      </svg>
    ),
    bg: '#dcfce7',
  },
  {
    name: 'Bubblegum',
    note: 'Manis permen ceria',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="7" />
        <path d="M12 5v-3" />
        <path d="M9 10a3 3 0 0 1 3-3" />
        <circle cx="17.5" cy="8.5" r="2.5" />
      </svg>
    ),
    bg: '#fce7f3',
  },
  {
    name: 'Tanpa Parfum',
    note: 'Original bersih netral',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ),
    bg: '#f1f5f9',
  },
];

function checkStoreOpen(openTimeStr?: string, closeTimeStr?: string): { isOpen: boolean; label: string } {
  const open = openTimeStr || '09:00';
  const close = closeTimeStr || '18:00';
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [oH, oM] = open.split(':').map((v) => parseInt(v, 10) || 0);
  const [cH, cM] = close.split(':').map((v) => parseInt(v, 10) || 0);
  const openMinutes = oH * 60 + oM;
  const closeMinutes = cH * 60 + cM;

  if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
    return {
      isOpen: true,
      label: `Buka Hari Ini • Sampai ${close} WIB`,
    };
  } else {
    return {
      isOpen: false,
      label: `Tutup Sekarang • Buka besok ${open} WIB`,
    };
  }
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchCode, setSearchCode] = useState('');

  const { data: settings } = useAsync(() => repo.getSettings(), []);
  const { data: announcements } = useAsync(() => repo.listPublicAnnouncements(), []);
  const { data: dbServices } = useAsync(() => repo.listServices(), []);

  const services = useMemo<ServiceItem[]>(() => {
    const list = dbServices && dbServices.length > 0 ? dbServices : SEED_SERVICES;
    return list.map((s, idx) => ({
      id: 'id' in s ? (s as { id: string }).id : `seed-${idx}`,
      name: s.name,
      category: s.category,
      description: s.description || 'Pembersihan mendalam sepatu.',
      priceMin: s.priceMin,
      priceMax: s.priceMax ?? null,
      durationMinDays: s.durationMinDays,
      durationMaxDays: s.durationMaxDays,
      expressHours: s.expressHours ?? null,
      expressEligible: Boolean(s.expressEligible),
    }));
  }, [dbServices]);

  // Featured popular preview items
  const previewServices = useMemo(() => {
    const prioritized = ['Basic Clean', 'Deep Clean', 'Heavy Clean', 'Unyellowing', 'Fast Clean', 'Repaint'];
    const matched = services.filter((s) =>
      prioritized.some((p) => s.name.toLowerCase().includes(p.toLowerCase()))
    );
    return matched.length >= 4 ? matched.slice(0, 6) : services.slice(0, 6);
  }, [services]);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = searchCode.trim().replace(/^trx\s*\/\s*/i, '');
    if (cleaned) {
      navigate(`/cek-pesanan?code=${encodeURIComponent(cleaned)}`);
    } else {
      navigate('/cek-pesanan');
    }
  };

  const storeStatus = checkStoreOpen(settings?.openTime, settings?.closeTime);

  const waUrl = settings?.whatsappNumber
    ? whatsappLink(
        settings.whatsappNumber,
        'Halo Soleful Soaks!, saya ingin konsultasi perawatan sepatu & jadwal antar jemput.'
      )
    : null;

  const mapsUrl = settings?.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Soleful Soaks ${settings.address}`)}`
    : 'https://maps.google.com';

  const renderServiceIcon = (category: ServiceCategory, name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('tas') || lower.includes('bag')) return <BagIllustration size={22} color="#001b3a" />;
    if (lower.includes('topi') || lower.includes('cap')) return <CapIllustration size={22} color="#001b3a" />;
    if (lower.includes('helm') || lower.includes('helmet')) return <HelmetIllustration size={22} color="#001b3a" />;
    if (category === 'additional' || lower.includes('repaint') || lower.includes('reglue')) {
      return <SparklesIllustration size={22} color="#bf2f3b" />;
    }
    return <SneakerIllustration width={34} height={20} />;
  };

  return (
    <div className="public-page-wrapper">
      <div className="container" style={{ maxWidth: '960px', padding: '0 16px' }}>
        <div className="stack" style={{ gap: '22px' }}>

          {/* ======================================================== */}
          {/* 1. HERO CARD BERSIH: TANPA TOMBOL ATAS, SLOGAN TIPOGRAFI */}
          {/* ======================================================== */}
          <section className="public-hero-card">
            <div className="public-hero-grid">
              <div>
                <h1 className="public-hero-heading" style={{ marginBottom: '6px' }}>
                  Soleful Soaks! <br />
                  <span>Shoes Care &amp; Laundry</span>
                </h1>

                {/* Slogan Text Stylized (Ketik Ulang tanpa gambar tempelan) */}
                <div
                  style={{
                    display: 'inline-block',
                    margin: '4px 0 12px',
                    padding: '4px 10px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px dashed #cbd5e1',
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    color: '#0f172a',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
                  }}
                >
                  &ldquo;LET US CLEAN UR <span style={{ textDecoration: 'line-through', opacity: 0.55 }}>SOUL</span> <span style={{ color: '#bf2f3b' }}>SOLE</span>&rdquo;
                </div>

                <p className="public-hero-desc">
                  Perawatan mendalam, unyellowing, recolor hingga pembersihan harian untuk sepatu, tas, helm, dan topi dengan pengerjaan higienis dan wangi.
                </p>

                {/* Status Buka/Tutup Rapi di Bawah Deskripsi */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: storeStatus.isOpen ? '#16a34a' : '#94a3b8',
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                    {storeStatus.label}
                  </span>
                </div>
              </div>

              {/* Box Cek Pesanan Proporsional & Konsisten */}
              <div className="public-track-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <SearchIcon size={18} color="#001b3a" />
                  <strong style={{ fontSize: '0.94rem', color: '#001b3a' }}>Lacak Status Sepatu</strong>
                </div>
                <p className="small muted" style={{ margin: '0 0 12px', lineHeight: 1.45, fontSize: '0.78rem' }}>
                  Masukkan kode pesanan dari nota untuk memantau progres cuci:
                </p>

                <form onSubmit={handleTrackSubmit} style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                  <input
                    type="text"
                    id="track-order-input"
                    name="orderCode"
                    autoComplete="off"
                    placeholder="Contoh: SS-7K3QX-9MPRA"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    className="mono"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label="Kode Pesanan Sepatu"
                    style={{
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      flex: 1,
                      minWidth: 0,
                      height: '40px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="submit"
                    className="btn"
                    style={{
                      background: '#001b3a',
                      color: '#ffffff',
                      borderRadius: '10px',
                      padding: '0 16px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      height: '40px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    Lacak
                  </button>
                </form>

                <div style={{ marginTop: '8px', fontSize: '0.72rem', color: '#64748b' }}>
                  Belum punya kode? Kunjungi workshop atau kirim sepatu via antar-jemput.
                </div>
              </div>
            </div>
          </section>

          {/* ======================================================== */}
          {/* 2. PENGUMUMAN TERKINI (JIKA ADA)                         */}
          {/* ======================================================== */}
          {announcements && announcements.length > 0 && (
            <section className="public-card" style={{ borderLeft: '4px solid #bf2f3b' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <strong style={{ fontSize: '0.94rem', color: '#0f172a' }}>
                  Pengumuman Toko
                </strong>
                <Link to="/pengumuman" className="small" style={{ color: '#bf2f3b', fontWeight: 700, textDecoration: 'none' }}>
                  Lihat Semua →
                </Link>
              </div>
              <div className="stack" style={{ gap: '8px' }}>
                {announcements.slice(0, 2).map((a) => (
                  <div key={a.id} style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.45 }}>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        background: '#f1f5f9',
                        color: '#475569',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        marginRight: '6px',
                      }}
                    >
                      {ANNOUNCEMENT_CATEGORY_LABEL[a.category] || 'Info'}
                    </span>
                    <strong>{a.title}</strong> — {a.body}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ======================================================== */}
          {/* 3. ALUR / CARA KERJA (3 LANGKAH SIMPEL)                  */}
          {/* ======================================================== */}
          <section className="public-card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
              Cara Cuci Sepatu di Soleful Soaks
            </h2>
            <p className="small muted" style={{ margin: '0 0 14px' }}>
              Alur pengerjaan jelas, transparan, dan dapat dipantau langsung dari HP Anda:
            </p>

            <div className="public-steps-grid">
              <div className="public-step-item">
                <div className="public-step-num">1</div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                    Antar atau Dijemput
                  </strong>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4, display: 'block' }}>
                    Bawa langsung ke workshop kami atau minta kurir jemput ke lokasi Anda.
                  </span>
                </div>
              </div>

              <div className="public-step-item">
                <div className="public-step-num">2</div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                    Proses Cuci &amp; QC
                  </strong>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4, display: 'block' }}>
                    Dibersihkan teliti sesuai material, pengeringan higienis, dan semprotan parfum.
                  </span>
                </div>
              </div>

              <div className="public-step-item">
                <div className="public-step-num">3</div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                    Ambil / Diantar Kembali
                  </strong>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4, display: 'block' }}>
                    Cek nota di web saat status Siap Ambil, sepatu bersih siap dipakai kembali!
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ======================================================== */}
          {/* 4. PREVIEW LAYANAN POPULER DENGAN SHOPEE-STYLE SCROLL    */}
          {/* ======================================================== */}
          <section id="pricelist" className="public-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>
                  Layanan Terfavorit
                </h2>
                <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                  Geser ke samping untuk melihat pilihan pencucian terpopuler
                </span>
              </div>
            </div>

            {/* Shopee-style Horizontal Scroll Rail */}
            <div className="public-services-scroll-rail">
              {previewServices.map((svc) => (
                <article
                  key={svc.id}
                  className="public-service-card-horizontal"
                >
                  <div>
                    <div
                      style={{
                        width: '100%',
                        height: '76px',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '10px',
                      }}
                      aria-hidden="true"
                    >
                      {renderServiceIcon(svc.category, svc.name)}
                    </div>

                    <h3
                      style={{
                        margin: '0 0 4px',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        lineHeight: 1.3,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: '2.4em',
                      }}
                    >
                      {svc.name}
                    </h3>

                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '8px' }}>
                      ⏱ {durationLabel(svc) || '2 Hari'}
                    </span>
                  </div>

                  <div style={{ paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                    <span style={{ fontSize: '0.64rem', color: '#94a3b8', display: 'block' }}>Mulai dari</span>
                    <strong className="price" style={{ fontSize: '0.96rem', color: '#bf2f3b', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
                      {priceLabel(svc)}
                    </strong>
                  </div>
                </article>
              ))}
            </div>

            {/* Satu Tombol Utama ke Katalog Lengkap di Bawah Preview */}
            <div
              style={{
                marginTop: '12px',
                padding: '12px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '0.78rem', color: '#475569' }}>
                Tersedia juga Tas, Helm, Topi, Unyellowing, Repaint &amp; Reglue lengkap.
              </span>
              <Link
                to="/layanan"
                className="btn sm"
                style={{
                  background: '#001b3a',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '10px',
                  padding: '8px 16px',
                }}
              >
                Lihat Semua Layanan ({services.length}) →
              </Link>
            </div>
          </section>

          {/* ======================================================== */}
          {/* 5. KETENTUAN LAYANAN ANTAR JEMPUT                        */}
          {/* ======================================================== */}
          <section className="public-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <TruckIcon size={20} color="#001b3a" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
                  Ketentuan Layanan Antar Jemput
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Pilihan fleksibel bagi Anda yang tidak sempat datang ke workshop
                </span>
              </div>
            </div>

            <div className="stack" style={{ gap: '8px' }}>
              {DELIVERY_TIERS.map((tier) => (
                <div
                  key={tier.title}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.86rem', color: '#0f172a', display: 'block' }}>
                      {tier.title}
                    </strong>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{tier.sub}</span>
                  </div>
                  <span
                    style={{
                      background: tier.badgeBg,
                      color: tier.badgeColor,
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '999px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tier.fee}
                  </span>
                </div>
              ))}
            </div>

            {waUrl && (
              <div style={{ marginTop: '12px', textAlign: 'right' }}>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="small"
                  style={{ color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <WhatsAppIcon size={14} color="#15803d" /> Hubungi CS untuk jadwal penjemputan →
                </a>
              </div>
            )}
          </section>

          {/* ======================================================== */}
          {/* 6. PILIHAN PARFUM SEPATU (GRATIS, IKON ELEGAN TANPA SPARKLE) */}
          {/* ======================================================== */}
          <section className="public-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <PerfumeBottleIllustration size={22} color="#bf2f3b" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
                  Pilihan Parfum Sepatu (Gratis)
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Setiap pengerjaan cuci sepatu sudah termasuk semprotan parfum higienis
                </span>
              </div>
            </div>

            <div className="grid grid-2" style={{ gap: '10px' }}>
              {PARFUMS.map((p) => (
                <article
                  key={p.name}
                  className="public-parfum-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: p.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    {p.icon}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#001b3a' }}>
                      {p.name}
                    </h4>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{p.note}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* ======================================================== */}
          {/* 7. LOKASI WORKSHOP & GOOGLE MAPS                         */}
          {/* ======================================================== */}
          <section className="public-card" style={{ background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <StoreIcon size={22} color="#001b3a" />
                <div>
                  <strong style={{ fontSize: '0.94rem', color: '#0f172a', display: 'block' }}>
                    Workshop Soleful Soaks!
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {settings?.address || 'Jl. Mampang Prapatan XV No.32 (Konfirmasi via CS)'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn secondary sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  Buka Google Maps ↗
                </a>
                {waUrl && (
                  <a href={waUrl} target="_blank" rel="noreferrer" className="btn wa sm">
                    Chat WhatsApp
                  </a>
                )}
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
