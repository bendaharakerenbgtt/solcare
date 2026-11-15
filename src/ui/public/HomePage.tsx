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
    sub: 'Langsung antar & konsultasi gratis di toko',
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
    sub: 'Jarak maks. 3KM, khusus 1 pasang sepatu',
    fee: '+Rp 10.000',
    badgeBg: '#fef2f2',
    badgeColor: '#bf2f3b',
  },
  {
    title: 'Antar Jemput (+Rp 20.000)',
    sub: 'Jarak > 3KM / area luar radius utama',
    fee: '+Rp 20.000',
    badgeBg: '#f0f4f9',
    badgeColor: '#001b3a',
  },
];

const PARFUMS = [
  { name: 'Vanilla Sweet Shoes', note: 'Manis, lembut & hangat' },
  { name: 'Fresh Apple Mint', note: 'Segar dingin & bersih' },
  { name: 'Bubblegum Fresh', note: 'Aroma ceria & tahan lama' },
  { name: 'Tanpa Parfum', note: 'Netral tanpa aroma tambahan' },
];

function renderServiceIcon(category: ServiceCategory, svcName: string) {
  const lower = svcName.toLowerCase();
  if (lower.includes('bag') || lower.includes('tas')) {
    return <BagIllustration size={22} color="#001b3a" />;
  }
  if (lower.includes('hat') || lower.includes('topi')) {
    return <CapIllustration size={22} color="#001b3a" />;
  }
  if (lower.includes('helmet') || lower.includes('helm')) {
    return <HelmetIllustration size={22} color="#001b3a" />;
  }
  if (category === 'express' || category === 'additional') {
    return <SparklesIllustration size={22} color="#bf2f3b" />;
  }
  return <SneakerIllustration width={38} height={24} />;
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchCode, setSearchCode] = useState('');
  const [selectedCat, setSelectedCat] = useState<ServiceCategory | 'all'>('all');

  const { data: dbServices } = useAsync(() => repo.listServices(false), []);
  const { data: announcements } = useAsync(() => repo.listPublicAnnouncements(), []);
  const { data: settings } = useAsync(() => repo.getSettings(), []);

  const services: ServiceItem[] = useMemo(() => {
    const src = dbServices && dbServices.length > 0 ? dbServices : SEED_SERVICES;
    return src.map((s, idx) => ({
      id: 'id' in s && typeof s.id === 'string' ? s.id : `seed-${idx}`,
      name: s.name,
      category: s.category,
      description: s.description,
      priceMin: s.priceMin,
      priceMax: s.priceMax,
      durationMinDays: s.durationMinDays,
      durationMaxDays: s.durationMaxDays,
      expressHours: s.expressHours,
      expressEligible: s.expressEligible,
    }));
  }, [dbServices]);

  const filteredServices = useMemo(() => {
    if (selectedCat === 'all') return services;
    return services.filter((s) => s.category === selectedCat);
  }, [services, selectedCat]);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = searchCode.trim().replace(/^trx\s*\/\s*/i, '');
    if (cleaned) {
      navigate(`/cek-pesanan?code=${encodeURIComponent(cleaned)}`);
    } else {
      navigate('/cek-pesanan');
    }
  };

  const hoursText =
    settings?.publicHoursText?.trim() ||
    `${settings?.openTime || '09:00'} - ${settings?.closeTime || '18:00'} WIB`;

  const waUrl = settings?.whatsappNumber
    ? whatsappLink(
        settings.whatsappNumber,
        'Halo Soleful Soaks!, saya ingin konsultasi layanan & jadwal antar jemput sepatu.'
      )
    : null;

  return (
    <div className="public-page-wrapper">
      <div className="container" style={{ maxWidth: '960px', padding: '0 16px' }}>
        <div className="stack" style={{ gap: '24px' }}>
          {/* ======================================================== */}
          {/* 1. BAGIAN ATAS: INFORMASI TOKO & HERO                   */}
          {/* ======================================================== */}
          <section className="public-hero-card">
            <div className="public-hero-grid">
              <div>
                <span className="public-badge-open">
                  <span className="public-dot-pulse" /> Buka: {hoursText}
                </span>
                <h1 className="public-hero-heading">
                  Soleful Soaks! <br />
                  <span>Shoes Care &amp; Laundry</span>
                </h1>
                <p className="public-hero-desc">
                  Perawatan mendalam, unyellowing, recolor hingga pembersihan harian untuk sepatu, tas, helm, dan topi dengan pengerjaan higienis dan wangi.
                </p>

                <div className="row" style={{ gap: '10px', marginTop: '16px' }}>
                  <a href="#pricelist" className="btn sm" style={{ background: '#bf2f3b' }}>
                    Lihat Daftar Harga ↓
                  </a>
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn secondary sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <WhatsAppIcon size={16} color="#15803d" /> Konsultasi WA
                    </a>
                  )}
                </div>
              </div>

              {/* Box Cek Pesanan Langsung di Bagian Atas */}
              <div className="public-track-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <SearchIcon size={20} color="#001b3a" />
                  <strong style={{ fontSize: '1rem', color: '#001b3a' }}>Lacak Status Sepatu</strong>
                </div>
                <p className="small muted" style={{ margin: '0 0 14px' }}>
                  Masukkan kode pesanan dari nota Anda untuk memantau progres cuci tanpa perlu login:
                </p>

                <form onSubmit={handleTrackSubmit} style={{ display: 'flex', gap: '8px' }}>
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
                      padding: '10px 12px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      flex: 1,
                      minWidth: 0,
                    }}
                  />
                  <button
                    type="submit"
                    className="btn"
                    style={{ background: '#001b3a', color: '#ffffff', borderRadius: '10px', padding: '10px 18px', whiteSpace: 'nowrap' }}
                  >
                    Cek Pesanan
                  </button>
                </form>

                <div style={{ marginTop: '12px', fontSize: '0.74rem', color: '#64748b' }}>
                  Coba kode demo:
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {[
                      { code: 'SS-7K3QX-9MPRA', label: 'Jordan 1' },
                      { code: 'SS-28YBN-4VCFW', label: 'Chuck 70' },
                      { code: 'SS-5MDPE-73KZ6', label: 'Tas Kanken' },
                    ].map((d) => (
                      <button
                        key={d.code}
                        type="button"
                        onClick={() => navigate(`/cek-pesanan?code=${d.code}`)}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: '#001b3a',
                          cursor: 'pointer',
                        }}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ======================================================== */}
          {/* PENGUMUMAN TOKO (BILA ADA)                               */}
          {/* ======================================================== */}
          {announcements && announcements.length > 0 && (
            <section className="public-card" style={{ borderLeft: '4px solid #bf2f3b' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.96rem', color: '#0f172a' }}>
                  Pengumuman &amp; Info Toko Terkini
                </strong>
                <Link to="/pengumuman" className="small" style={{ fontWeight: 700, color: '#bf2f3b' }}>
                  Lihat Semua ({announcements.length}) →
                </Link>
              </div>
              <div className="stack" style={{ gap: '8px' }}>
                {announcements.slice(0, 2).map((a) => (
                  <div
                    key={a.id}
                    style={{
                      background: a.important ? '#fffbeb' : '#f8fafc',
                      border: a.important ? '1px solid #fde68a' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span className="badge teal" style={{ fontSize: '0.7rem' }}>
                        {ANNOUNCEMENT_CATEGORY_LABEL[a.category]}
                      </span>
                      <span className="xs muted">
                        {new Date(a.publishAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <strong style={{ fontSize: '0.86rem', color: '#0f172a', display: 'block' }}>
                      {a.title}
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
                      {a.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ======================================================== */}
          {/* 2. DAFTAR PRICELIST HARGA (HANYA INFORMASI / TAMPILAN)   */}
          {/* ======================================================== */}
          <section id="pricelist" className="public-card">
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>
                    Daftar Harga Layanan (Pricelist)
                  </h2>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Informasi tarif resmi pengerjaan Soleful Soaks
                  </span>
                </div>
                <span
                  style={{
                    background: '#f0f4f9',
                    color: '#001b3a',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '999px',
                  }}
                >
                  Info Publik
                </span>
              </div>
            </div>

            {/* Filter Tab Kategori */}
            <div className="orders-filter-grid" style={{ marginBottom: '14px' }}>
              {[
                { id: 'all' as const, label: `Semua (${services.length})` },
                { id: 'main' as const, label: 'Main Services' },
                { id: 'express' as const, label: 'Express' },
                { id: 'additional' as const, label: 'Treatment & Repaint' },
                { id: 'other' as const, label: 'Tas, Helm & Topi' },
              ].map((tab) => {
                const active = selectedCat === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedCat(tab.id)}
                    className="activity-filter-btn"
                    style={{
                      background: active ? '#001b3a' : '#ffffff',
                      color: active ? '#ffffff' : '#475569',
                      border: active ? '1px solid #001b3a' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Grid Kartu Harga (Hanya Informasi, Tidak Bisa Dipilih) */}
            {filteredServices.length === 0 ? (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '14px',
                  padding: '24px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '0.86rem',
                }}
              >
                Belum ada layanan pada kategori ini. Silakan pilih tab kategori lain atau hubungi CS kami.
              </div>
            ) : (
              <div className="grid grid-2" style={{ gap: '10px' }}>
                {filteredServices.map((svc) => (
                  <article
                    key={svc.id}
                    className="public-service-card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '12px 14px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      >
                        {renderServiceIcon(svc.category, svc.name)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {svc.name}
                        </h3>
                        <span style={{ fontSize: '0.73rem', color: '#64748b', display: 'block' }}>
                          {durationLabel(svc) || '2 Hari'} • {svc.description}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <strong className="price" style={{ fontSize: '0.92rem', color: '#bf2f3b', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
                        {priceLabel(svc)}
                      </strong>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        per pasang/unit
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
              * Catatan: Harga akhir dapat disesuaikan di workshop bila terdapat tingkat kesulitan atau noda membandel khusus.
            </div>
          </section>

          {/* ======================================================== */}
          {/* TOMBOL LACAK / CEK STATUS PESANAN (SESUAI REQUEST)       */}
          {/* ======================================================== */}
          <section
            style={{
              background: 'linear-gradient(135deg, #001b3a 0%, #0a2548 100%)',
              borderRadius: '18px',
              padding: '20px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              boxShadow: '0 8px 24px rgba(0, 27, 58, 0.18)',
            }}
          >
            <div>
              <strong style={{ fontSize: '1.05rem', display: 'block', marginBottom: '2px' }}>
                Sudah Cuci Sepatu di Soleful Soaks?
              </strong>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.82)' }}>
                Cek status pengerjaan, estimasi selesai, dan unduh nota resmi PDF secara online.
              </span>
            </div>

            <Link
              to="/cek-pesanan"
              style={{
                background: '#bf2f3b',
                color: '#ffffff',
                borderRadius: '12px',
                padding: '11px 22px',
                fontSize: '0.88rem',
                fontWeight: 800,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(191, 47, 59, 0.35)',
              }}
            >
              <SearchIcon size={18} color="#ffffff" />
              <span>Cek Pesanan Sekarang</span>
            </Link>
          </section>

          {/* ======================================================== */}
          {/* 3. LAYANAN JEMPUT & KETENTUAN (TAMPILAN INFORMASI)       */}
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
          {/* 4. PILIHAN PARFUM (ADA LOGONYA / IKON VISUAL)            */}
          {/* ======================================================== */}
          <section className="public-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SparklesIllustration size={22} color="#bf2f3b" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
                    Pilihan Parfum Sepatu (Gratis)
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    Setiap pengerjaan cuci sepatu sudah termasuk semprotan parfum higienis
                  </span>
                </div>
              </div>
              <span
                style={{
                  background: '#fef2f2',
                  color: '#bf2f3b',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '999px',
                }}
              >
                Complimentary
              </span>
            </div>

            <div className="grid grid-2" style={{ gap: '10px' }}>
              {PARFUMS.map((p, idx) => (
                <article
                  key={p.name}
                  className="public-parfum-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    {idx === 0 ? '🍦' : idx === 1 ? '🍏' : idx === 2 ? '🍬' : '✨'}
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
          {/* 5. TERSEDIA JUGA LAYANAN (TAS, TOPI, HELM, REPAINT, DLL) */}
          {/* ======================================================== */}
          <section className="public-card">
            <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#0f172a' }}>
              Tersedia Juga Layanan Khusus
            </h3>
            <p className="small muted" style={{ margin: '0 0 14px' }}>
              Kami juga melayani barang-barang selain sepatu dengan teknik dan sabun yang disesuaikan:
            </p>

            <div className="grid grid-4" style={{ gap: '10px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                <div style={{ margin: '0 auto 6px', display: 'flex', justifyContent: 'center' }}>
                  <BagIllustration size={26} color="#001b3a" />
                </div>
                <strong style={{ fontSize: '0.84rem', color: '#0f172a', display: 'block' }}>Cuci Tas</strong>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Ransel, slingbag, tote</span>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                <div style={{ margin: '0 auto 6px', display: 'flex', justifyContent: 'center' }}>
                  <CapIllustration size={26} color="#001b3a" />
                </div>
                <strong style={{ fontSize: '0.84rem', color: '#0f172a', display: 'block' }}>Cuci Topi</strong>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Snapback, baseball cap</span>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                <div style={{ margin: '0 auto 6px', display: 'flex', justifyContent: 'center' }}>
                  <HelmetIllustration size={26} color="#001b3a" />
                </div>
                <strong style={{ fontSize: '0.84rem', color: '#0f172a', display: 'block' }}>Cuci Helm</strong>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Busa dalam &amp; visor</span>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                <div style={{ margin: '0 auto 6px', display: 'flex', justifyContent: 'center' }}>
                  <SparklesIllustration size={26} color="#bf2f3b" />
                </div>
                <strong style={{ fontSize: '0.84rem', color: '#0f172a', display: 'block' }}>Repaint &amp; Reglue</strong>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Restorasi warna &amp; lem</span>
              </div>
            </div>
          </section>

          {/* ======================================================== */}
          {/* 6. KONTAK & LOKASI SINGKAT                               */}
          {/* ======================================================== */}
          <section className="public-card" style={{ background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <StoreIcon size={20} color="#001b3a" />
                <div>
                  <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>
                    Lokasi Workshop Soleful Soaks
                  </strong>
                  <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    {settings?.address || 'Jl. Mampang Prapatan XV No.32 (Konfirmasi via CS)'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Link to="/kontak" className="btn secondary sm">
                  Detail Kontak
                </Link>
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
