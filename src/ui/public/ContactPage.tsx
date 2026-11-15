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

  return (
    <div className="public-container">
      <div className="stack" style={{ gap: '14px' }}>
        {/* Header */}
        <div style={{ marginTop: '2px' }}>
          <h1 style={{ margin: 0, fontSize: '1.24rem', fontWeight: 800, color: '#0f172a' }}>
            Kontak &amp; Lokasi Workshop
          </h1>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Konsultasi kondisi noda, drop-off, dan penjemputan langsung
          </span>
        </div>

        {/* 1. Navy Gradient Outlet Hero Card */}
        <div className="public-navy-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <img
              src="/solecare_logo.jpg"
              alt="Soleful Soaks Logo"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                objectFit: 'cover',
                border: '2px solid rgba(255,255,255,0.25)',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <strong style={{ fontSize: '1.08rem', color: '#ffffff', display: 'block' }}>
                {settings?.businessName || 'Soleful Soaks! Shoes Care'}
              </strong>
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.82)', display: 'block' }}>
                {settings?.tagline || 'Perawatan & pembersihan sepatu profesional'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1,
                  minWidth: '170px',
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
                <span>Chat WhatsApp CS</span>
              </a>
            ) : (
              <div
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.14)',
                  border: '1px solid rgba(255,255,255,0.28)',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  fontSize: '0.78rem',
                  color: '#ffffff',
                }}
              >
                Nomor WhatsApp CS dapat diatur oleh admin di Pengaturan Toko.
              </div>
            )}

            {settings?.instagramUrl && (
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: 'rgba(255,255,255,0.16)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  color: '#ffffff',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Instagram ↗
              </a>
            )}
          </div>
        </div>

        {/* 2. Lokasi Workshop, Jam Operasional & Pembayaran Card */}
        <div className="public-card">
          <strong style={{ fontSize: '0.94rem', color: '#0f172a', display: 'block', marginBottom: '12px' }}>
            Informasi Workshop &amp; Operasional
          </strong>

          <div className="stack" style={{ gap: '12px' }}>
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
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>Alamat Workshop</span>
                <strong style={{ fontSize: '0.86rem', color: '#0f172a', lineHeight: 1.4 }}>{workshopAddress}</strong>
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
