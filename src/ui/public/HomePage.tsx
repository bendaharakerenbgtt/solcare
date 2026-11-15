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
  CashIcon,
  ClockIcon,
  ChevronRightIcon,
  SneakerIllustration,
  BagIllustration,
  CapIllustration,
  HelmetIllustration,
  SparklesIllustration,
  SiluetQueueIcon,
  SiluetProcessIcon,
  SiluetPickupIcon,
  SiluetReadyPickupIcon,
  SiluetDeliveryIcon,
  SiluetSelfServiceIcon,
  WhatsAppIcon,
} from '../common/Icons';

type CatalogItem = {
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
    sub: 'Langsung antar & konsultasi di workshop Solecare',
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
    fee: '+Rp 10rb',
    badgeBg: '#fef2f2',
    badgeColor: '#bf2f3b',
  },
  {
    title: 'Antar Jemput (+Rp 20.000)',
    sub: 'Jarak > 3KM / area jangkauan lanjutan',
    fee: '+Rp 20rb',
    badgeBg: '#f0f4f9',
    badgeColor: '#001b3a',
  },
];

const PARFUMS = [
  { name: 'Vanilla Sweet Shoes', note: 'Manis hangat lembut' },
  { name: 'Fresh Apple Mint', note: 'Segar dingin bersih' },
  { name: 'Bubblegum Fresh', note: 'Ceria tahan lama' },
  { name: 'Tanpa Parfum', note: 'Netral tanpa aroma' },
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

function cleanTrackingInput(raw: string): string {
  return raw.trim().replace(/^trx\s*\/\s*/i, '');
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [heroTab, setHeroTab] = useState<'CEK' | 'INFO'>('CEK');
  const [searchCode, setSearchCode] = useState('');
  const [selectedCat, setSelectedCat] = useState<ServiceCategory | 'all'>('all');
  const [deliveryExpanded, setDeliveryExpanded] = useState(true);

  const { data: dbServices } = useAsync(() => repo.listServices(false), []);
  const { data: announcements } = useAsync(() => repo.listPublicAnnouncements(), []);
  const { data: settings } = useAsync(() => repo.getSettings(), []);

  const services: CatalogItem[] = useMemo(() => {
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
    const base = selectedCat === 'all' ? services : services.filter((s) => s.category === selectedCat);
    return base.slice(0, 6);
  }, [services, selectedCat]);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = cleanTrackingInput(searchCode);
    if (cleaned) {
      navigate(`/cek-pesanan?code=${encodeURIComponent(cleaned)}`);
    } else {
      navigate('/cek-pesanan');
    }
  };

  const hoursText =
    settings?.publicHoursText?.trim() ||
    `${settings?.openTime || '09:00'} - ${settings?.closeTime || '18:00'} WIB`;

  const waPickupUrl = settings?.whatsappNumber
    ? whatsappLink(
        settings.whatsappNumber,
        'Halo Soleful Soaks!, saya ingin konsultasi layanan & jadwalkan antar jemput sepatu.'
      )
    : null;

  return (
    <div className="public-container home-desktop">
      <div className="stack" style={{ gap: '14px' }}>
        {/* 1. Greeting Header (Mirrors Admin DashboardPage) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            marginTop: '2px',
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.02em',
              }}
            >
              Hai, Sobat Solecare!
            </h1>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Perawatan sepatu, tas, topi &amp; helm profesional
            </span>
          </div>
          <Link
            to="/kontak"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '6px 10px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            <ClockIcon size={14} color="#bf2f3b" />
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#001b3a' }}>
              {hoursText}
            </span>
          </Link>
        </div>

        {/* 2. Top 2-Column Responsive Block (1-Col on HP, 2-Col on Desktop) */}
        <div className="public-desktop-2col">
          {/* LEFT COLUMN: Liquid Card + 6-Grid Quick Menu */}
          <div className="stack" style={{ gap: '14px' }}>
            {/* Bilas Signature Liquid Maroon Card */}
            <div className="bilas-liquid-card" style={{ marginBottom: 0 }}>
              <div className="bilas-liquid-tabs">
                <button
                  type="button"
                  className={`bilas-liquid-tab ${heroTab === 'CEK' ? 'active' : ''}`}
                  onClick={() => setHeroTab('CEK')}
                >
                  CEK PESANAN
                </button>
                <button
                  type="button"
                  className={`bilas-liquid-tab ${heroTab === 'INFO' ? 'active' : ''}`}
                  onClick={() => setHeroTab('INFO')}
                >
                  INFO LAYANAN
                </button>
              </div>

              {heroTab === 'CEK' ? (
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)', marginBottom: '10px', fontWeight: 500 }}>
                    Masukkan kode dari nota penerimaan (tanpa login) untuk melihat progres real-time:
                  </div>

                  <form
                    onSubmit={handleTrackSubmit}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#ffffff',
                      borderRadius: '14px',
                      padding: '5px 5px 5px 12px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                    }}
                  >
                    <SearchIcon size={18} color="#94a3b8" style={{ flexShrink: 0 }} />
                    <input
                      type="text"
                      placeholder="Contoh: SS-7K3QX-9MPRA"
                      value={searchCode}
                      onChange={(e) => setSearchCode(e.target.value)}
                      className="mono"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      aria-label="Kode Pesanan"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        padding: '6px 0',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        minWidth: 0,
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        background: '#001b3a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '9px 16px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      Lacak
                    </button>
                  </form>

                  {/* Demo Chips */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginTop: '12px',
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                      Coba demo:
                    </span>
                    {[
                      { code: 'SS-7K3QX-9MPRA', label: 'Jordan 1' },
                      { code: 'SS-28YBN-4VCFW', label: 'Chuck 70' },
                      { code: 'SS-5MDPE-73KZ6', label: 'Tas Kanken' },
                    ].map((demo) => (
                      <button
                        key={demo.code}
                        type="button"
                        onClick={() => navigate(`/cek-pesanan?code=${encodeURIComponent(demo.code)}`)}
                        style={{
                          background: 'rgba(255,255,255,0.16)',
                          border: '1px solid rgba(255,255,255,0.32)',
                          color: '#ffffff',
                          borderRadius: '999px',
                          padding: '3px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {demo.label} ({demo.code})
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bilas-liquid-tx-carousel">
                  <Link to="/layanan?cat=main" className="bilas-liquid-tx-item" style={{ textDecoration: 'none' }}>
                    <div className="bilas-liquid-tx-circle">
                      <ClockIcon size={18} color="#ffffff" />
                    </div>
                    <span className="bilas-liquid-tx-label">2–4 Hari</span>
                    <span style={{ fontSize: '0.64rem', opacity: 0.8 }}>Reguler</span>
                  </Link>

                  <Link to="/layanan?cat=express" className="bilas-liquid-tx-item" style={{ textDecoration: 'none' }}>
                    <div className="bilas-liquid-tx-circle">
                      <SparklesIllustration size={18} color="#ffffff" />
                    </div>
                    <span className="bilas-liquid-tx-label">24 Jam</span>
                    <span style={{ fontSize: '0.64rem', opacity: 0.8 }}>Express</span>
                  </Link>

                  <a href="#antar-jemput" className="bilas-liquid-tx-item" style={{ textDecoration: 'none' }}>
                    <div className="bilas-liquid-tx-circle">
                      <TruckIcon size={18} color="#ffffff" />
                    </div>
                    <span className="bilas-liquid-tx-label">Maks 3KM</span>
                    <span style={{ fontSize: '0.64rem', opacity: 0.8 }}>Gratis ≥2</span>
                  </a>

                  <Link to="/layanan" className="bilas-liquid-tx-item" style={{ textDecoration: 'none' }}>
                    <div className="bilas-liquid-tx-circle">
                      <CashIcon size={18} color="#ffffff" />
                    </div>
                    <span className="bilas-liquid-tx-label">Tunai</span>
                    <span style={{ fontSize: '0.64rem', opacity: 0.8 }}>Cash Only</span>
                  </Link>
                </div>
              )}
            </div>

            {/* 6-Item Quick Menu Silhouette Grid (Mirrors Admin DashboardPage) */}
            <div className="bilas-grid-6" style={{ marginBottom: 0 }}>
              <Link to="/layanan?cat=main" className="bilas-grid-6-item" style={{ textDecoration: 'none' }}>
                <div className="bilas-grid-6-icon-wrap" style={{ background: '#fdf2f2', borderRadius: '14px' }}>
                  <SiluetQueueIcon size={26} color="#bf2f3b" />
                </div>
                <span className="bilas-grid-6-title">Main Clean</span>
              </Link>

              <Link to="/layanan?cat=express" className="bilas-grid-6-item" style={{ textDecoration: 'none' }}>
                <div className="bilas-grid-6-icon-wrap" style={{ background: '#f0f4f9', borderRadius: '14px' }}>
                  <SiluetProcessIcon size={26} color="#001b3a" />
                </div>
                <span className="bilas-grid-6-title">Express 24J</span>
              </Link>

              <Link to="/layanan?cat=additional" className="bilas-grid-6-item" style={{ textDecoration: 'none' }}>
                <div className="bilas-grid-6-icon-wrap" style={{ background: '#fdf2f2', borderRadius: '14px' }}>
                  <SiluetPickupIcon size={26} color="#bf2f3b" />
                </div>
                <span className="bilas-grid-6-title">Treatment</span>
              </Link>

              <Link to="/layanan?cat=other" className="bilas-grid-6-item" style={{ textDecoration: 'none' }}>
                <div className="bilas-grid-6-icon-wrap" style={{ background: '#f0f4f9', borderRadius: '14px' }}>
                  <SiluetReadyPickupIcon size={26} color="#001b3a" />
                </div>
                <span className="bilas-grid-6-title">Tas &amp; Helm</span>
              </Link>

              <a href="#antar-jemput" className="bilas-grid-6-item" style={{ textDecoration: 'none' }}>
                <div className="bilas-grid-6-icon-wrap" style={{ background: '#fdf2f2', borderRadius: '14px' }}>
                  <SiluetDeliveryIcon size={26} color="#bf2f3b" />
                </div>
                <span className="bilas-grid-6-title">Antar Jemput</span>
              </a>

              <Link to="/cek-pesanan" className="bilas-grid-6-item" style={{ textDecoration: 'none' }}>
                <div className="bilas-grid-6-icon-wrap" style={{ background: '#f0f4f9', borderRadius: '14px' }}>
                  <SiluetSelfServiceIcon size={26} color="#001b3a" />
                </div>
                <span className="bilas-grid-6-title">Cek Status</span>
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: 4-Tier Antar Jemput + Parfum + Announcements */}
          <div className="stack" style={{ gap: '14px' }}>
            {/* Layanan Antar Jemput 4-Tier Card */}
            <div id="antar-jemput" className="public-card">
              <button
                type="button"
                onClick={() => setDeliveryExpanded((prev) => !prev)}
                aria-expanded={deliveryExpanded}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TruckIcon size={20} color="#001b3a" />
                  <div>
                    <strong style={{ fontSize: '0.94rem', color: '#0f172a', display: 'block' }}>
                      Layanan Antar Jemput
                    </strong>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      4 pilihan pengantaran fleksibel &amp; transparan
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    color: '#94a3b8',
                    transform: deliveryExpanded ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                    fontSize: '0.95rem',
                  }}
                >
                  ▾
                </span>
              </button>

              {deliveryExpanded && (
                <div className="stack" style={{ gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  {DELIVERY_TIERS.map((tier) => (
                    <div
                      key={tier.title}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        padding: '9px 11px',
                        background: '#f8fafc',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: '0.84rem', color: '#0f172a', display: 'block' }}>
                          {tier.title}
                        </strong>
                        <span style={{ fontSize: '0.73rem', color: '#64748b', display: 'block' }}>
                          {tier.sub}
                        </span>
                      </div>
                      <span
                        style={{
                          background: tier.badgeBg,
                          color: tier.badgeColor,
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: '999px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {tier.fee}
                      </span>
                    </div>
                  ))}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <Link
                      to="/layanan"
                      style={{
                        flex: 1,
                        background: '#001b3a',
                        color: '#ffffff',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        textAlign: 'center',
                      }}
                    >
                      Simulasi Biaya
                    </Link>
                    {waPickupUrl && (
                      <a
                        href={waPickupUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          flex: 1,
                          background: '#16a34a',
                          color: '#ffffff',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <WhatsAppIcon size={15} color="#ffffff" />
                        <span>Pesan Jemput</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Parfum Gratis Preview */}
            <div className="public-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SparklesIllustration size={18} color="#bf2f3b" />
                  <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>Pilihan Parfum Sepatu</strong>
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: '#fef2f2',
                    color: '#bf2f3b',
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}
                >
                  Gratis Pilih
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                {PARFUMS.map((p) => (
                  <div
                    key={p.name}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '8px 10px',
                    }}
                  >
                    <strong style={{ fontSize: '0.78rem', color: '#001b3a', display: 'block' }}>
                      {p.name}
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{p.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Katalog Layanan Populer (Bilas Item Cards with SVG Illustrations) */}
        <div className="public-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '8px' }}>
            <div>
              <strong style={{ fontSize: '1rem', color: '#0f172a', display: 'block' }}>
                Katalog Layanan Populer
              </strong>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                Harga transparan • Pembayaran Tunai (Cash)
              </span>
            </div>
            <Link
              to="/layanan"
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#bf2f3b',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                whiteSpace: 'nowrap',
              }}
            >
              Semua ({services.length}) <ChevronRightIcon size={15} color="#bf2f3b" />
            </Link>
          </div>

          {/* Bilas Pill Category Tabs */}
          <div className="orders-filter-grid" style={{ marginBottom: '12px' }}>
            {[
              { id: 'all' as const, label: `Semua (${services.length})` },
              { id: 'main' as const, label: 'Main Services' },
              { id: 'express' as const, label: 'Express' },
              { id: 'additional' as const, label: 'Additional' },
              { id: 'other' as const, label: 'Tas, Helm & Topi' },
            ].map((tab) => {
              const active = selectedCat === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCat(tab.id)}
                  className="activity-filter-btn"
                  style={{
                    background: active ? '#001b3a' : '#f8fafc',
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

          {/* Service Item Rows (Responsive 1-col on HP, 2-col on Desktop) */}
          <div className="grid grid-2" style={{ gap: '10px' }}>
            {filteredServices.map((svc) => (
              <Link
                key={svc.id}
                to={`/layanan?highlight=${encodeURIComponent(svc.id)}&cat=${svc.category}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '11px 12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {renderServiceIcon(svc.category, svc.name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong
                      style={{
                        display: 'block',
                        fontSize: '0.88rem',
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {svc.name}
                    </strong>
                    <span style={{ fontSize: '0.73rem', color: '#64748b', display: 'block' }}>
                      {durationLabel(svc) || '2 Hari'} • {svc.description}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <strong className="price" style={{ fontSize: '0.88rem', color: '#bf2f3b', display: 'block' }}>
                    {priceLabel(svc)}
                  </strong>
                  <span style={{ fontSize: '0.68rem', color: '#001b3a', fontWeight: 700 }}>
                    Pilih →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 4. Alur Pengerjaan 4-Tahap Bilas (Matches OrderDetailPage 1-2-3-✓ bar) */}
        <div className="public-card">
          <div style={{ marginBottom: '12px' }}>
            <strong style={{ fontSize: '0.96rem', color: '#0f172a', display: 'block' }}>
              Alur Pengerjaan Real-time
            </strong>
            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
              Pantau 4 tahap pengerjaan lewat halaman Cek Pesanan tanpa login
            </span>
          </div>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '12px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '8px',
            }}
          >
            {[
              { step: '1', bg: '#001b3a', title: 'Antrian', desc: 'Cek bahan & foto awal' },
              { step: '2', bg: '#bf2f3b', title: 'Proses Cuci', desc: 'Sabun & sikat aman' },
              { step: '3', bg: '#bf2f3b', title: 'Proses Kering', desc: 'Alami + UV higienis' },
              { step: '✓', bg: '#16a34a', title: 'Siap Ambil', desc: 'QC, parfum & nota PDF' },
            ].map((item) => (
              <div key={item.title} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: item.bg,
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    marginBottom: '6px',
                  }}
                >
                  {item.step}
                </div>
                <strong style={{ fontSize: '0.78rem', color: '#0f172a', display: 'block' }}>
                  {item.title}
                </strong>
                <span style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.25, display: 'block' }}>
                  {item.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Pengumuman Terbaru (if any) */}
        {announcements && announcements.length > 0 && (
          <div className="public-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="pulse-indicator" />
                <strong style={{ fontSize: '0.94rem', color: '#0f172a' }}>Pengumuman Terbaru</strong>
              </div>
              <Link to="/pengumuman" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#bf2f3b', textDecoration: 'none' }}>
                Lihat Semua →
              </Link>
            </div>
            <div className="stack" style={{ gap: '8px' }}>
              {announcements.slice(0, 2).map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: a.important ? '#fef2f2' : '#f8fafc',
                    border: a.important ? '1px solid #fecaca' : '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span className={`badge ${a.important ? 'primary' : 'teal'}`} style={{ fontSize: '0.7rem' }}>
                      {ANNOUNCEMENT_CATEGORY_LABEL[a.category]}
                    </span>
                    <span className="xs muted">
                      {new Date(a.publishAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <strong style={{ fontSize: '0.86rem', color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                    {a.title}
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
                    {a.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
