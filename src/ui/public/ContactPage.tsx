import React from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { whatsappLink } from '../../lib/format';
import {
  ClockIcon,
  PhoneIcon,
  StoreIcon,
  TruckIcon,
  WhatsAppIcon,
  InstagramIcon,
} from '../common/Icons';

const DELIVERY_RULES = [
  {
    title: 'Diantar Sendiri (Drop-off)',
    sub: 'Langsung ke workshop tanpa biaya antar',
    fee: 'Gratis',
    badgeBg: '#dcfce7',
    badgeColor: '#15803d',
  },
  {
    title: 'Free Antar Jemput (Maks. 3KM)',
    sub: 'Khusus pesanan minimal 2 sepatu',
    fee: 'Gratis',
    badgeBg: '#dcfce7',
    badgeColor: '#15803d',
  },
  {
    title: 'Antar Jemput (+Rp 10.000)',
    sub: 'Jarak maks. 3KM, 1 sepatu',
    fee: '+Rp 10rb',
    badgeBg: '#fef2f2',
    badgeColor: '#bf2f3b',
  },
  {
    title: 'Antar Jemput (+Rp 20.000)',
    sub: 'Jarak > 3KM / area luar radius utama',
    fee: '+Rp 20rb',
    badgeBg: '#f0f4f9',
    badgeColor: '#001b3a',
  },
];

export const ContactPage: React.FC = () => {
  const { data: settings } = useAsync(() => repo.getSettings(), []);

  const waUrl = settings?.whatsappNumber
    ? whatsappLink(settings.whatsappNumber, 'Halo Soleful Soaks!, saya ingin bertanya informasi toko, layanan, atau jadwal antar jemput.')
    : null;

  const hoursText =
    settings?.publicHoursText?.trim() ||
    `${settings?.openTime || '09:00'} - ${settings?.closeTime || '18:00'} WIB`;

  const workshopAddress = settings?.address?.trim() || 'Jl. Mampang Prapatan XV No.32 (Konfirmasi via WhatsApp CS)';

  const igUrl =
    settings?.instagramUrl?.trim() ||
    'https://www.instagram.com/soleful.soaks?obrf=MXRsZWc0OTFwanB1bA==';

  return (
    <div className="public-container">
      <div className="stack" style={{ gap: '14px' }}>
        {/* Tombol Kembali ke Beranda */}
        <div>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.84rem',
              fontWeight: 700,
              color: '#001b3a',
              textDecoration: 'none',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '6px 14px',
              borderRadius: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            ← Kembali ke Beranda
          </Link>
        </div>

        {/* Header */}
        <div style={{ marginTop: '2px' }}>
          <h1 style={{ margin: 0, fontSize: '1.24rem', fontWeight: 800, color: '#0f172a' }}>
            Kontak &amp; Lokasi
          </h1>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Konsultasi kondisi noda, drop-off, dan penjemputan langsung
          </span>
        </div>

        {/* 1. Navy Gradient Outlet Hero Card */}
        <div className="public-navy-banner">
          <div style={{ marginBottom: '14px' }}>
            <strong style={{ fontSize: '1.15rem', color: '#ffffff', display: 'block' }}>
              {settings?.businessName || 'Soleful Soaks! Shoes Care'}
            </strong>
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.82)', display: 'block', marginTop: '2px' }}>
              {settings?.tagline || 'Perawatan & pembersihan sepatu profesional'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.35)',
                }}
              >
                <WhatsAppIcon size={17} color="#ffffff" />
                <span>WhatsApp CS</span>
              </a>
            ) : (
              <div
                style={{
                  background: 'rgba(255,255,255,0.14)',
                  border: '1px solid rgba(255,255,255,0.28)',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  fontSize: '0.78rem',
                  color: '#ffffff',
                }}
              >
                WhatsApp CS
              </div>
            )}

            <a
              href={igUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                color: '#ffffff',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '0.84rem',
                fontWeight: 800,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                boxShadow: '0 4px 12px rgba(220, 39, 67, 0.35)',
              }}
            >
              <InstagramIcon size={17} color="#ffffff" />
              <span>Instagram</span>
            </a>
          </div>
        </div>

        {/* 2. Lokasi, Jam Operasional & Embedded Google Maps */}
        <div className="public-card">
          <strong style={{ fontSize: '0.94rem', color: '#0f172a', display: 'block', marginBottom: '12px' }}>
            Informasi Outlet &amp; Operasional
          </strong>

          <div className="stack" style={{ gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: '#f0f4f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <StoreIcon size={17} color="#001b3a" />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>Alamat Toko</span>
                <strong style={{ fontSize: '0.86rem', color: '#0f172a', lineHeight: 1.4 }}>{workshopAddress}</strong>
              </div>
            </div>

            {/* Embedded Google Maps View (Denah Lokasi) */}
            <div
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                position: 'relative',
              }}
            >
              <iframe
                title="Peta Lokasi Soleful Soaks"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(workshopAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                width="100%"
                height="190"
                style={{ border: 0, display: 'block' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div
                style={{
                  padding: '8px 12px',
                  background: '#ffffff',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Buka denah di Google Maps
                </span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(workshopAddress)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#001b3a',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  Buka Maps ↗
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ClockIcon size={17} color="#bf2f3b" />
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>Jam Operasional</span>
                <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>{hoursText}</strong>
              </div>
            </div>

            {settings?.whatsappNumber && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: '#f0fdf4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <PhoneIcon size={17} color="#15803d" />
                </div>
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>Nomor Telepon / WhatsApp</span>
                  <strong className="mono" style={{ fontSize: '0.86rem', color: '#0f172a' }}>
                    {settings.whatsappNumber}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. 4-Tier Layanan Antar Jemput Card */}
        <div className="public-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TruckIcon size={19} color="#001b3a" />
              <strong style={{ fontSize: '0.94rem', color: '#0f172a' }}>Ketentuan Antar Jemput</strong>
            </div>
            <Link to="/layanan" style={{ fontSize: '0.76rem', fontWeight: 700, color: '#bf2f3b', textDecoration: 'none' }}>
              Hitung Estimasi →
            </Link>
          </div>

          <div className="stack" style={{ gap: '8px' }}>
            {DELIVERY_RULES.map((rule) => (
              <div
                key={rule.title}
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
                    {rule.title}
                  </strong>
                  <span style={{ fontSize: '0.73rem', color: '#64748b' }}>{rule.sub}</span>
                </div>
                <span
                  style={{
                    background: rule.badgeBg,
                    color: rule.badgeColor,
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: '999px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {rule.fee}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
