import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { SEED_SERVICES } from '../../data/seed';
import type { ServiceCategory } from '../../data/types';
import { durationLabel, priceLabel, whatsappLink } from '../../lib/format';
import {
  SearchIcon,
  CloseIcon,
  TruckIcon,
  SneakerIllustration,
  BagIllustration,
  CapIllustration,
  HelmetIllustration,
  SparklesIllustration,
  WhatsAppIcon,
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

const CATEGORIES: { key: ServiceCategory | 'all'; label: string; badge: string }[] = [
  { key: 'all', label: 'Semua Layanan', badge: 'Lengkap' },
  { key: 'main', label: 'Main Services', badge: 'Cuci Utama' },
  { key: 'express', label: 'Express Services', badge: 'Cepat' },
  { key: 'additional', label: 'Treatment & Repaint', badge: 'Restorasi' },
  { key: 'other', label: 'Tas, Helm & Topi', badge: 'Apparel' },
];

const DELIVERY_TIERS = [
  {
    title: 'Diantar Sendiri (Drop-off)',
    sub: 'Langsung antar & konsultasi gratis di workshop Soleful Soaks',
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

export const ServicesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = (searchParams.get('cat') as ServiceCategory | 'all') || 'all';
  const [selectedCat, setSelectedCat] = useState<ServiceCategory | 'all'>(initialCat);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: dbServices, loading } = useAsync(() => repo.listServices(), []);
  const { data: settings } = useAsync(() => repo.getSettings(), []);

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

  const waUrl = settings?.whatsappNumber
    ? whatsappLink(
        settings.whatsappNumber,
        'Halo Soleful Soaks!, saya ingin konsultasi harga layanan dan jadwalkan pengerjaan.'
      )
    : null;

  const renderServiceIcon = (category: ServiceCategory, name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('tas') || lower.includes('bag')) return <BagIllustration size={26} color="#001b3a" />;
    if (lower.includes('topi') || lower.includes('cap')) return <CapIllustration size={26} color="#001b3a" />;
    if (lower.includes('helm') || lower.includes('helmet')) return <HelmetIllustration size={26} color="#001b3a" />;
    if (category === 'additional' || lower.includes('repaint') || lower.includes('reglue')) {
      return <SparklesIllustration size={26} color="#bf2f3b" />;
    }
    return <SneakerIllustration width={38} height={22} />;
  };

  return (
    <div className="public-page-wrapper">
      <div className="container" style={{ maxWidth: '960px', padding: '0 16px' }}>
        <div className="stack" style={{ gap: '20px' }}>

          {/* Header Banner Page */}
          <div
            className="public-card"
            style={{
              background: 'linear-gradient(135deg, #001b3a 0%, #0a2548 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '24px 20px',
              borderRadius: '20px',
              boxShadow: '0 8px 24px rgba(0, 27, 58, 0.18)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <Link
                  to="/"
                  style={{
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: '0.8rem',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '8px',
                  }}
                >
                  ← Kembali ke Beranda
                </Link>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 4px', color: '#ffffff' }}>
                  Katalog Layanan &amp; Pricelist Lengkap
                </h1>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'rgba(255,255,255,0.85)', maxWidth: '520px', lineHeight: 1.5 }}>
                  Daftar tarif resmi pencucian, unyellowing, recolor hingga perawatan apparel di Soleful Soaks.
                </p>
              </div>

              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn"
                  style={{
                    background: '#bf2f3b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(191, 47, 59, 0.35)',
                  }}
                >
                  <WhatsAppIcon size={16} color="#ffffff" />
                  Konsultasi / Booking CS
                </a>
              )}
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="public-card" style={{ padding: '16px' }}>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Cari layanan (contoh: Deep Clean, Unyellowing, Helm)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '10px 38px 10px 14px',
                  fontSize: '0.88rem',
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

            {/* Category Filter Pills (Scrollable on Mobile) */}
            <div className="public-category-scroll" style={{ marginBottom: 0, paddingBottom: 0 }}>
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

          {/* Service Cards Grid (Visual & Informative, Display Only) */}
          <div className="stack" style={{ gap: '12px' }}>
            {loading ? (
              <div className="public-card" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                Memuat katalog layanan...
              </div>
            ) : filteredServices.length === 0 ? (
              <div
                className="public-card"
                style={{
                  textAlign: 'center',
                  padding: '36px 20px',
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                }}
              >
                <strong style={{ fontSize: '1rem', color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                  Layanan tidak ditemukan
                </strong>
                <p style={{ margin: '0 0 12px', fontSize: '0.84rem', color: '#64748b' }}>
                  Tidak ada layanan yang cocok dengan kata kunci &quot;{searchQuery}&quot;.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCat('all');
                  }}
                  className="btn secondary sm"
                >
                  Tampilkan Semua Layanan
                </button>
              </div>
            ) : (
              <div className="grid grid-2" style={{ gap: '12px' }}>
                {filteredServices.map((svc) => (
                  <article
                    key={svc.id}
                    className="public-service-card"
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 4px rgba(0, 27, 58, 0.03)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '14px',
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
                          <div>
                            <h2 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                              {svc.name}
                            </h2>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '0.72rem',
                                color: '#64748b',
                                marginTop: '2px',
                              }}
                            >
                              Estimasi: <strong style={{ color: '#001b3a' }}>{durationLabel(svc) || '2 Hari'}</strong>
                            </span>
                          </div>
                        </div>

                        <span
                          style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {svc.category.toUpperCase()}
                        </span>
                      </div>

                      <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                        {svc.description}
                      </p>

                      {svc.terms && (
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: '#b45309',
                            background: '#fffbeb',
                            border: '1px solid #fef3c7',
                            padding: '6px 8px',
                            borderRadius: '8px',
                            marginBottom: '10px',
                            lineHeight: 1.4,
                          }}
                        >
                          ℹ {svc.terms}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        paddingTop: '12px',
                        borderTop: '1px dashed #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Tarif Layanan</span>
                        <strong className="price" style={{ fontSize: '1.08rem', color: '#bf2f3b', fontVariantNumeric: 'tabular-nums' }}>
                          {priceLabel(svc)}
                        </strong>
                      </div>

                      {settings?.whatsappNumber && (
                        <a
                          href={whatsappLink(
                            settings.whatsappNumber,
                            `Halo Soleful Soaks!, saya berminat dengan layanan ${svc.name}. Boleh minta info pengerjaannya?`
                          ) || undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="btn secondary sm"
                          style={{ fontSize: '0.76rem', padding: '6px 12px' }}
                        >
                          Tanya via WA
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Delivery Rules Info */}
          <section className="public-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <TruckIcon size={20} color="#001b3a" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
                  Ketentuan Layanan Antar Jemput
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Pilihan penjemputan dan pengantaran sepatu ke lokasi Anda
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
          </section>

          {/* Bottom CTA to Home / Order Tracking */}
          <div className="public-card" style={{ background: '#f8fafc', textAlign: 'center', padding: '24px 16px' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: '#0f172a' }}>
              Sudah Pernah Masukkan Sepatu di Workshop Kami?
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.84rem', color: '#64748b' }}>
              Lacak status pengerjaan sepatu Anda secara online tanpa perlu login akun.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <Link to="/cek-pesanan" className="btn" style={{ background: '#001b3a', color: '#ffffff' }}>
                Lacak Status Pesanan →
              </Link>
              <Link to="/" className="btn secondary">
                Kembali ke Beranda
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
