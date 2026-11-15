import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { SEED_SERVICES } from '../../data/seed';
import type { ServiceCategory } from '../../data/types';
import { durationLabel, priceLabel } from '../../lib/format';
import {
  SearchIcon,
  CloseIcon,
  TruckIcon,
  SneakerIllustration,
  BagIllustration,
  CapIllustration,
  HelmetIllustration,
  SparklesIllustration,
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
  terms?: string;
};

const CATEGORIES: { key: ServiceCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'main', label: 'Main Services' },
  { key: 'express', label: 'Express' },
  { key: 'additional', label: 'Treatment & Repaint' },
  { key: 'other', label: 'Tas, Topi & Helm' },
];

const DELIVERY_TIERS = [
  {
    title: 'Diantar Sendiri (Drop-off)',
    sub: 'Langsung antar ke workshop',
    fee: 'Gratis',
    badgeBg: '#dcfce7',
    badgeColor: '#15803d',
  },
  {
    title: 'Free Antar Jemput (Maks. 3KM)',
    sub: 'Min. 2 pasang sepatu',
    fee: 'Gratis',
    badgeBg: '#dcfce7',
    badgeColor: '#15803d',
  },
  {
    title: 'Antar Jemput (+Rp 10.000)',
    sub: 'Maks. 3KM untuk 1 pasang',
    fee: '+10.000',
    badgeBg: '#fee2e2',
    badgeColor: '#b91c1c',
  },
  {
    title: 'Antar Jemput (+Rp 20.000)',
    sub: 'Radius di atas 3KM',
    fee: '+20.000',
    badgeBg: '#fee2e2',
    badgeColor: '#b91c1c',
  },
];

export const ServicesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = (searchParams.get('cat') as ServiceCategory | 'all') || 'all';
  const [selectedCat, setSelectedCat] = useState<ServiceCategory | 'all'>(initialCat);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: dbServices, loading } = useAsync(() => repo.listServices(), []);

  const services = useMemo<ServiceItem[]>(() => {
    const list = dbServices && dbServices.length > 0 ? dbServices : SEED_SERVICES;
    return list.map((s, idx) => ({
      id: 'id' in s ? (s as { id: string }).id : `seed-${idx}`,
      name: s.name,
      category: s.category,
      description: s.description || 'Pembersihan mendalam dan perawatan profesional.',
      priceMin: s.priceMin,
      priceMax: s.priceMax ?? null,
      durationMinDays: s.durationMinDays,
      durationMaxDays: s.durationMaxDays,
      expressHours: s.expressHours ?? null,
      expressEligible: Boolean(s.expressEligible),
      terms: 'terms' in s ? (s as { terms?: string }).terms : '',
    }));
  }, [dbServices]);

  // Featured / Hot services for horizontal rail (like Shopee "Flash / Populer")
  const hotServices = useMemo(() => {
    return services.filter((s) => s.category === 'main' || s.expressEligible).slice(0, 5);
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchCat = selectedCat === 'all' || s.category === selectedCat;
      const matchQuery =
        !searchQuery.trim() ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [services, selectedCat, searchQuery]);

  const handleSelectTab = (key: ServiceCategory | 'all') => {
    setSelectedCat(key);
    if (key === 'all') {
      searchParams.delete('cat');
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ cat: key }, { replace: true });
    }
  };

  const renderServiceVisual = (category: ServiceCategory, name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('tas') || lower.includes('bag')) {
      return (
        <div style={{ width: '100%', height: '86px', background: '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BagIllustration size={32} color="#001b3a" />
        </div>
      );
    }
    if (lower.includes('topi') || lower.includes('cap')) {
      return (
        <div style={{ width: '100%', height: '86px', background: '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CapIllustration size={32} color="#001b3a" />
        </div>
      );
    }
    if (lower.includes('helm') || lower.includes('helmet')) {
      return (
        <div style={{ width: '100%', height: '86px', background: '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HelmetIllustration size={32} color="#001b3a" />
        </div>
      );
    }
    if (category === 'additional' || lower.includes('repaint') || lower.includes('reglue') || lower.includes('unyellowing')) {
      return (
        <div style={{ width: '100%', height: '86px', background: '#fef2f2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SparklesIllustration size={32} color="#bf2f3b" />
        </div>
      );
    }
    return (
      <div style={{ width: '100%', height: '86px', background: '#f0f4f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <SneakerIllustration width={48} height={28} />
      </div>
    );
  };

  return (
    <div className="public-page-wrapper">
      <div className="container" style={{ maxWidth: '960px', padding: '0 16px' }}>
        <div className="stack" style={{ gap: '16px' }}>

          {/* Navigasi Breadcrumb Terpisah & Bersih (Tidak Nyatu dalam Card) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
            <Link
              to="/"
              style={{
                color: '#001b3a',
                fontSize: '0.84rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '6px 14px',
                borderRadius: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              ← Beranda
            </Link>

            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Total <strong>{services.length}</strong> Layanan
            </span>
          </div>

          {/* Search Bar Kompak */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Cari layanan (contoh: Deep Clean, Unyellowing, Helm)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '14px',
                padding: '10px 40px 10px 14px',
                fontSize: '0.88rem',
                boxShadow: '0 1px 4px rgba(0, 27, 58, 0.03)',
              }}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                }}
              >
                <CloseIcon size={16} />
              </button>
            ) : (
              <span
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                }}
              >
                <SearchIcon size={16} />
              </span>
            )}
          </div>

          {/* 1. Shopee-Style: Layanan Pilihan / Populer (Scroll ke samping) */}
          {!searchQuery && (
            <section className="public-card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <strong style={{ fontSize: '0.94rem', color: '#0f172a' }}>
                  🔥 Paling Sering Dipesan
                </strong>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Geser samping →
                </span>
              </div>

              <div className="public-services-scroll-rail">
                {hotServices.map((svc) => (
                  <article key={`hot-${svc.id}`} className="public-service-card-horizontal">
                    <div>
                      {renderServiceVisual(svc.category, svc.name)}
                      <h4
                        style={{
                          margin: '8px 0 2px',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          lineHeight: 1.3,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          minHeight: '2.2em',
                        }}
                      >
                        {svc.name}
                      </h4>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                        ⏱ {durationLabel(svc) || '2 Hari'}
                      </span>
                    </div>

                    <div style={{ paddingTop: '8px', borderTop: '1px dashed #e2e8f0', marginTop: '6px' }}>
                      <strong className="price" style={{ fontSize: '0.94rem', color: '#bf2f3b', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
                        {priceLabel(svc)}
                      </strong>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* 2. Shopee-Style: Filter Kategori & Grid Katalog Lengkap (Scroll ke Bawah) */}
          <section className="public-card" style={{ padding: '14px 16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '0.98rem', color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                Katalog Layanan Lengkap
              </strong>

              {/* Category Filter Pills (Scrollable) */}
              <div className="public-category-scroll" style={{ marginBottom: 0, paddingBottom: 2 }}>
                {CATEGORIES.map((cat) => {
                  const active = selectedCat === cat.key;
                  const count =
                    cat.key === 'all'
                      ? services.length
                      : services.filter((s) => s.category === cat.key).length;

                  return (
                    <button
                      key={cat.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleSelectTab(cat.key)}
                      className="public-category-btn"
                      style={{
                        background: active ? '#001b3a' : '#f1f5f9',
                        color: active ? '#ffffff' : '#334155',
                        border: active ? '1px solid #001b3a' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                      }}
                    >
                      {cat.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                Memuat katalog layanan...
              </div>
            ) : filteredServices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
                Tidak ada layanan yang cocok dengan pencarian Anda.
              </div>
            ) : (
              /* Shopee-style 2-Column Product Grid */
              <div className="public-services-shopee-grid">
                {filteredServices.map((svc) => (
                  <article key={svc.id} className="public-service-shopee-card">
                    <div>
                      {renderServiceVisual(svc.category, svc.name)}

                      <h3
                        style={{
                          margin: '10px 0 4px',
                          fontSize: '0.86rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          lineHeight: 1.3,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          minHeight: '2.3em',
                        }}
                      >
                        {svc.name}
                      </h3>

                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                        ⏱ {durationLabel(svc) || '2 Hari'}
                      </span>

                      <p
                        style={{
                          margin: '0 0 8px',
                          fontSize: '0.72rem',
                          color: '#64748b',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {svc.description}
                      </p>
                    </div>

                    <div style={{ paddingTop: '8px', borderTop: '1px dashed #e2e8f0', marginTop: '6px' }}>
                      <span style={{ fontSize: '0.62rem', color: '#94a3b8', display: 'block' }}>Tarif</span>
                      <strong className="price" style={{ fontSize: '0.98rem', color: '#bf2f3b', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
                        {priceLabel(svc)}
                      </strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* 3. Ketentuan Antar Jemput Singkat */}
          <section className="public-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <TruckIcon size={18} color="#001b3a" />
              <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>Ketentuan Antar Jemput</strong>
            </div>

            <div className="grid grid-2" style={{ gap: '8px' }}>
              {DELIVERY_TIERS.map((tier) => (
                <div
                  key={tier.title}
                  style={{
                    background: '#f8fafc',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: '0.78rem', color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tier.title}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>{tier.sub}</span>
                  </div>
                  <span
                    style={{
                      background: tier.badgeBg,
                      color: tier.badgeColor,
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tier.fee}
                  </span>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
