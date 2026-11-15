import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { repo } from '../../data';
import type { OrderStatus, PublicOrderView, ServiceCategory } from '../../data/types';
import { displayCode, rupiah, whatsappLink } from '../../lib/format';
import { useAsync } from '../hooks';
import { InvoiceModal } from '../common/InvoiceModal';
import { ModalPortal } from '../common/ModalPortal';
import {
  SearchIcon,
  CloseIcon,
  TruckIcon,
  CheckIcon,
  ClockIcon,
  DocumentIcon,
  CashIcon,
  SneakerIllustration,
  BagIllustration,
  CapIllustration,
  HelmetIllustration,
  SparklesIllustration,
  EmptyStateIllustration,
} from '../common/Icons';

const BILAS_STAGE_LABEL: Record<OrderStatus, string> = {
  menunggu: 'Antrian',
  pencucian: 'Proses Cuci',
  pengeringan: 'Proses Kering',
  finishing: 'Finishing & QC',
  selesai: 'Siap Ambil',
  diambil: 'Selesai (Diambil)',
};

function formatBilasDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function cleanTrackingInput(raw: string): string {
  return raw.trim().replace(/^trx\s*\/\s*/i, '');
}

function renderItemVisual(category: ServiceCategory, label: string) {
  const lower = label.toLowerCase();
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

const STAGE_ORDER: Record<OrderStatus, number> = {
  menunggu: 1,
  pencucian: 2,
  pengeringan: 3,
  finishing: 4,
  selesai: 5,
  diambil: 6,
};

interface StageProgressBarProps {
  currentRank: number;
  status: OrderStatus;
  onShowHistory: () => void;
}

const StageProgressBar: React.FC<StageProgressBarProps> = ({ currentRank, status, onShowHistory }) => {
  const steps = [
    { num: '1', minRank: 1, activeBg: '#001b3a', title: 'Antrian Masuk' },
    { num: '2', minRank: 2, activeBg: '#bf2f3b', title: 'Cuci' },
    { num: '3', minRank: 3, activeBg: '#bf2f3b', title: 'Kering' },
    { num: '✓', minRank: 4, activeBg: '#16a34a', title: 'Finishing / Selesai' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '12px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '8px 12px',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {steps.map((st) => {
            const done = currentRank >= st.minRank;
            return (
              <span
                key={st.title}
                title={st.title}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: done ? st.activeBg : '#e2e8f0',
                  color: done ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                }}
              >
                {st.num}
              </span>
            );
          })}
        </div>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#001b3a' }}>
          {BILAS_STAGE_LABEL[status] || 'Antrian'}
        </span>
      </div>

      <button
        type="button"
        onClick={onShowHistory}
        style={{
          background: '#e2e8f0',
          border: 'none',
          color: '#001b3a',
          fontSize: '0.72rem',
          fontWeight: 700,
          borderRadius: '14px',
          padding: '4px 11px',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Riwayat
      </button>
    </div>
  );
};

export const TrackOrderPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [code, setCode] = useState(initialCode);
  const [phoneSuffix, setPhoneSuffix] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [order, setOrder] = useState<PublicOrderView | null>(null);

  const [deliveryExpanded, setDeliveryExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const historyRef = useRef<HTMLDivElement>(null);
  const { data: settings } = useAsync(() => repo.getSettings(), []);

  const doTrack = async (searchTarget: string, suffixTarget: string) => {
    const cleaned = cleanTrackingInput(searchTarget);
    if (!cleaned) return;
    setLoading(true);
    setErrorMsg(null);
    setOrder(null);

    try {
      const res = await repo.trackOrder(cleaned, suffixTarget.trim());
      if (res.ok) {
        setOrder(res.order);
      } else {
        setErrorMsg(res.message);
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      void doTrack(initialCode, '');
    }
  }, [initialCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = cleanTrackingInput(code);
    setSearchParams(cleaned ? { code: cleaned } : {});
    void doTrack(cleaned, phoneSuffix);
  };

  const triggerDemoTrack = (demoCode: string) => {
    setCode(demoCode);
    setSearchParams({ code: demoCode });
    void doTrack(demoCode, '');
  };

  const waUrl =
    settings?.whatsappNumber && order
      ? whatsappLink(
          settings.whatsappNumber,
          (settings.whatsappTemplate || 'Halo CS Soleful Soaks!, tanya pesanan {kode}').replace(
            '{kode}',
            displayCode(order.code)
          )
        )
      : null;

  const isLunas = order?.paymentStatus === 'lunas';
  const currentRank = order ? STAGE_ORDER[order.status] : 1;
  const isOverdue =
    Boolean(order?.estimatedAt) &&
    order?.status !== 'selesai' &&
    order?.status !== 'diambil' &&
    new Date(order!.estimatedAt!).getTime() < Date.now();

  const conditionNotesList = (order?.items || [])
    .map((it) => it.conditionNotes?.trim())
    .filter((n): n is string => Boolean(n));

  return (
    <div className="public-container" style={{ maxWidth: '480px', paddingBottom: '40px' }}>
      {/* ======================================================== */}
      {/* 1. SEARCH & DEMO KODE BAR                                */}
      {/* ======================================================== */}
      <div className="public-card" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Cek Status Pesanan
            </h1>
            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
              Masukkan kode tanda terima (mis. SS-7K3QX-9MPRA)
            </span>
          </div>
          {order && (
            <button
              type="button"
              onClick={() => setInvoiceOpen(true)}
              title="Lihat & Unduh Nota PDF"
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '6px 10px',
                cursor: 'pointer',
                color: '#001b3a',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.74rem',
                fontWeight: 700,
              }}
            >
              <DocumentIcon size={16} color="#001b3a" />
              <span>Nota PDF</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="stack" style={{ gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f8fafc',
              borderRadius: '999px',
              border: '1.5px solid #cbd5e1',
              padding: '4px 5px 4px 14px',
            }}
          >
            <SearchIcon size={17} color="#94a3b8" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Contoh: SS-7K3QX-9MPRA"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mono"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              aria-label="Kode Pesanan"
              required
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                padding: '6px 0',
                fontSize: '0.88rem',
                fontWeight: 700,
                minWidth: 0,
              }}
            />
            {code && (
              <button
                type="button"
                onClick={() => setCode('')}
                aria-label="Bersihkan kode"
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <CloseIcon size={15} />
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: '#001b3a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '999px',
                padding: '8px 16px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {loading ? '...' : 'Lacak'}
            </button>
          </div>

          {settings?.trackingRequirePhoneSuffix && (
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="4 Digit Akhir No. WA (mis. 7890)"
              value={phoneSuffix}
              onChange={(e) => setPhoneSuffix(e.target.value)}
              aria-label="4 Digit Akhir Nomor WhatsApp"
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '0.84rem',
              }}
            />
          )}
        </form>

        {/* Demo Chips */}
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
            Kode demo siap coba:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {[
              { code: 'SS-7K3QX-9MPRA', label: 'Jordan 1' },
              { code: 'SS-28YBN-4VCFW', label: 'Chuck 70' },
              { code: 'SS-5MDPE-73KZ6', label: 'Tas Kanken' },
            ].map((demo) => {
              const active = cleanTrackingInput(code).toUpperCase() === demo.code;
              return (
                <button
                  key={demo.code}
                  type="button"
                  onClick={() => triggerDemoTrack(demo.code)}
                  style={{
                    background: active ? '#fee2e2' : '#f1f5f9',
                    color: active ? '#bf2f3b' : '#334155',
                    border: active ? '1px solid #fecaca' : '1px solid #e2e8f0',
                    borderRadius: '999px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {demo.label} ({demo.code})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ERROR / EMPTY STATE                                      */}
      {/* ======================================================== */}
      {errorMsg && (
        <div className="public-card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: '12px' }}>
          <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '2px' }}>
            Pesanan Tidak Ditemukan
          </strong>
          <p style={{ margin: 0, fontSize: '0.82rem' }}>{errorMsg}</p>
        </div>
      )}

      {!loading && !errorMsg && !order && (
        <div className="public-card" style={{ textAlign: 'center', padding: '28px 18px' }}>
          <EmptyStateIllustration size={110} />
          <strong style={{ display: 'block', fontSize: '0.98rem', color: '#0f172a', marginBottom: '4px' }}>
            Pantau Sepatu Anda Secara Real-time
          </strong>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
            Masukkan kode pesanan dari nota Anda atau ketuk salah satu kode demo di atas untuk melihat progres cuci, estimasi selesai, dan rincian tagihan.
          </p>
        </div>
      )}

      {/* ======================================================== */}
      {/* ORDER DETAIL VIEW (Exact Bilas/Solecare OrderDetailPage) */}
      {/* ======================================================== */}
      {order && (
        <div className="stack" style={{ gap: '10px' }}>
          {/* 2. Status Headline & TRX Code */}
          <div style={{ padding: '6px 4px 2px' }}>
            <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
              {BILAS_STAGE_LABEL[order.status] || 'Antrian'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', gap: '8px', flexWrap: 'wrap' }}>
              <strong className="mono" style={{ fontSize: '0.9rem', color: '#0f172a', letterSpacing: '-0.2px' }}>
                TRX/{displayCode(order.code)}
              </strong>
              <span className="price" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#bf2f3b' }}>
                Masuk: {formatBilasDateTime(order.receivedAt)}
              </span>
            </div>
          </div>

          {/* 3. Customer Card (Matches OrderDetailPage) */}
          <div
            className="public-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src="/bilas_icons/img_avatar.webp"
                alt="Pelanggan"
                style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div>
                <strong style={{ fontSize: '0.94rem', color: '#0f172a', display: 'block' }}>
                  {order.customerDisplayName}
                </strong>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {order.itemType} • {order.brand} {order.model}
                </span>
              </div>
            </div>

            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                title="Tanya CS via WhatsApp"
                aria-label="Tanya CS via WhatsApp"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  flexShrink: 0,
                }}
              >
                <img
                  src="/bilas_icons/img_whatsapp.webp"
                  alt="WhatsApp"
                  style={{ width: '20px', height: '20px' }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </a>
            )}
          </div>

          {/* 4. Informasi Antar/Jemput & Pembayaran Accordion */}
          <div className="public-card" style={{ padding: '14px 16px' }}>
            <button
              type="button"
              onClick={() => setDeliveryExpanded((prev) => !prev)}
              aria-expanded={deliveryExpanded}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
                padding: 0,
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TruckIcon size={20} color="#001b3a" />
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                  Informasi Pengambilan &amp; Antar/Jemput
                </strong>
              </div>
              <span
                style={{
                  color: '#94a3b8',
                  transform: deliveryExpanded ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              >
                ▾
              </span>
            </button>

            {deliveryExpanded && (
              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '0.82rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ color: '#64748b' }}>Metode Pembayaran</span>
                  <strong style={{ color: '#0f172a', textTransform: 'uppercase' }}>
                    {order.paymentMethod === 'tunai' ? 'TUNAI (CASH)' : order.paymentMethod}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ color: '#64748b' }}>Info Pengantaran</span>
                  <strong style={{ color: '#0f172a', textAlign: 'right' }}>
                    Drop-off / Antar Jemput via CS
                  </strong>
                </div>
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    color: '#475569',
                    lineHeight: 1.45,
                  }}
                >
                  Jika ingin menjadwalkan pengantaran setelah status <strong>Siap Ambil</strong>, hubungi CS kami lewat tombol WhatsApp di atas.
                </div>
              </div>
            )}
          </div>

          {/* 5. Navy Gradient Tagihan Banner (Mirrors OrderDetailPage) */}
          <div className="public-navy-banner">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: 600 }}>Total Tagihan</div>
                <div className="price" style={{ fontSize: '1.7rem', fontWeight: 800, marginTop: '2px', lineHeight: 1.15 }}>
                  Rp {order.total.toLocaleString('id-ID')}
                </div>
                <div style={{ marginTop: '6px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 9px',
                      borderRadius: '999px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      background: isLunas ? 'rgba(22, 163, 74, 0.25)' : 'rgba(191, 47, 59, 0.35)',
                      border: isLunas ? '1px solid rgba(134, 239, 172, 0.5)' : '1px solid rgba(254, 202, 202, 0.45)',
                      color: '#ffffff',
                    }}
                  >
                    {isLunas ? '✓ LUNAS' : 'BELUM LUNAS • BAYAR TUNAI'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(true)}
                  style={{
                    background: 'rgba(255,255,255,0.18)',
                    border: '1.5px solid rgba(255,255,255,0.45)',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '7px 14px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                  }}
                >
                  DETAIL
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceOpen(true)}
                  style={{
                    background: '#bf2f3b',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '7px 14px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(191, 47, 59, 0.35)',
                  }}
                >
                  NOTA PDF
                </button>
              </div>
            </div>
          </div>

          {/* 6. Est. Selesai Centered Display (Mirrors OrderDetailPage) */}
          <div style={{ textAlign: 'center', margin: '4px 0 6px' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Est. Selesai</div>
            <strong className="price" style={{ fontSize: '0.98rem', color: '#0f172a', display: 'block', marginTop: '2px' }}>
              {order.estimatedAt ? formatBilasDateTime(order.estimatedAt) : 'Sedang dijadwalkan'}
            </strong>
            <div style={{ marginTop: '4px' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 9px',
                  borderRadius: '999px',
                  background: order.status === 'selesai' || order.status === 'diambil'
                    ? '#dcfce7'
                    : isOverdue
                    ? '#fef2f2'
                    : '#e0e9f4',
                  color: order.status === 'selesai' || order.status === 'diambil'
                    ? '#15803d'
                    : isOverdue
                    ? '#bf2f3b'
                    : '#001b3a',
                }}
              >
                {order.completedAt
                  ? `Selesai Aktual: ${formatBilasDateTime(order.completedAt)}`
                  : isOverdue
                  ? 'Butuh perhatian • Hubungi CS bila perlu'
                  : 'Sesuai target jadwal pengerjaan'}
              </span>
            </div>
          </div>

          {/* 7. Detail Pesanan Card with 1-2-3-✓ Progress Bar (Mirrors OrderDetailPage) */}
          <div className="public-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>Detail Pesanan</strong>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>
                {order.items && order.items.length > 1 ? `${order.items.length} Barang` : '1 Barang'}
              </span>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '14px' }}>
              Pilih Parfum:{' '}
              <span style={{ color: '#001b3a', fontWeight: 700 }}>
                {order.fragranceName || 'Tanpa Parfum'}
              </span>
            </div>

            <div className="stack" style={{ gap: '14px' }}>
              {order.items && order.items.length > 0
                ? order.items.map((it, idx) => {
                    const primarySvc = it.services[0];
                    const itemTitle = `${it.brand} ${it.model}`.trim() || it.itemType;
                    return (
                      <div
                        key={it.id || idx}
                        style={{
                          paddingBottom: idx < order.items!.length - 1 ? '12px' : 0,
                          borderBottom: idx < order.items!.length - 1 ? '1px solid #f1f5f9' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            <div
                              style={{
                                width: '46px',
                                height: '46px',
                                borderRadius: '12px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {renderItemVisual(primarySvc?.category || 'main', `${it.itemType} ${itemTitle}`)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>
                                {it.services.map((s) => s.name).join(' + ')}
                              </strong>
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#bf2f3b', display: 'block' }}>
                                {itemTitle} {it.color ? `(${it.color})` : ''}
                              </span>
                            </div>
                          </div>
                          <strong className="price" style={{ fontSize: '0.84rem', color: '#001b3a', flexShrink: 0 }}>
                            {rupiah(it.services.reduce((a, s) => a + s.price, 0))}
                          </strong>
                        </div>

                        <StageProgressBar
                          currentRank={currentRank}
                          status={order.status}
                          onShowHistory={() => {
                            setHistoryExpanded(true);
                            historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                        />
                      </div>
                    );
                  })
                : order.services.map((svc, idx) => (
                    <div
                      key={idx}
                      style={{
                        paddingBottom: idx < order.services.length - 1 ? '12px' : 0,
                        borderBottom: idx < order.services.length - 1 ? '1px solid #f1f5f9' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <div
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '12px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {renderItemVisual(svc.category, svc.name)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>
                              {svc.name}
                            </strong>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#bf2f3b' }}>
                              {order.brand} {order.model}
                            </span>
                          </div>
                        </div>
                        <strong className="price" style={{ fontSize: '0.84rem', color: '#001b3a', flexShrink: 0 }}>
                          {rupiah(svc.price)}
                        </strong>
                      </div>

                      <StageProgressBar
                        currentRank={currentRank}
                        status={order.status}
                        onShowHistory={() => {
                          setHistoryExpanded(true);
                          historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      />
                    </div>
                  ))}
            </div>
          </div>

          {/* 8. Informasi Tambahan Card */}
          <div className="public-card" style={{ padding: '16px' }}>
            <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
              Informasi Tambahan
            </strong>
            <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
              {conditionNotesList.length > 0 ? conditionNotesList.join(' • ') : 'Kondisi standar pengerjaan Solecare.'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '8px 10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#001b3a' }}>
              <CashIcon size={16} color="#001b3a" />
              <span>Pembayaran dilakukan secara <strong>Tunai (Cash)</strong> saat pengambilan / pengantaran.</span>
            </div>
          </div>

          {/* 9. Histori Pesanan Accordion (Mirrors OrderDetailPage) */}
          <div ref={historyRef} className="public-card" style={{ padding: '16px' }}>
            <button
              type="button"
              onClick={() => setHistoryExpanded((prev) => !prev)}
              aria-expanded={historyExpanded}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
                padding: 0,
                textAlign: 'left',
              }}
            >
              <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>Histori Pesanan</strong>
              <span
                style={{
                  color: '#94a3b8',
                  transform: historyExpanded ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              >
                ▾
              </span>
            </button>

            {historyExpanded && (
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <div className="stack" style={{ gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#001b3a',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: '2px',
                          flexShrink: 0,
                        }}
                      >
                        <CheckIcon size={12} color="#ffffff" />
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.86rem', color: '#0f172a', display: 'block' }}>
                          Pesanan Diterima Workshop
                        </strong>
                        <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                          TRX/{displayCode(order.code)}
                        </span>
                      </div>
                    </div>
                    <span className="price" style={{ fontSize: '0.74rem', color: '#64748b', flexShrink: 0 }}>
                      {formatBilasDateTime(order.receivedAt)}
                    </span>
                  </div>

                  {order.timeline.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: step.status === 'selesai' || step.status === 'diambil' ? '#16a34a' : '#001b3a',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: '2px',
                            flexShrink: 0,
                          }}
                        >
                          <CheckIcon size={12} color="#ffffff" />
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.86rem', color: '#0f172a', display: 'block' }}>
                            {BILAS_STAGE_LABEL[step.status]}
                          </strong>
                          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                            Status pengerjaan diperbarui
                          </span>
                        </div>
                      </div>
                      <span className="price" style={{ fontSize: '0.74rem', color: '#64748b', flexShrink: 0 }}>
                        {formatBilasDateTime(step.at)}
                      </span>
                    </div>
                  ))}

                  {order.estimatedAt && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: '#bf2f3b',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: '2px',
                            flexShrink: 0,
                          }}
                        >
                          <ClockIcon size={12} color="#ffffff" />
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.86rem', color: '#0f172a', display: 'block' }}>
                            Target Selesai Ditetapkan
                          </strong>
                          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                            Estimasi pengerjaan saat ini
                          </span>
                        </div>
                      </div>
                      <span className="price" style={{ fontSize: '0.74rem', color: '#bf2f3b', fontWeight: 700, flexShrink: 0 }}>
                        {formatBilasDateTime(order.estimatedAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL RINCIAN TAGIHAN (DETAIL BUTTON)                    */}
      {/* ======================================================== */}
      {detailModalOpen && order && (
        <ModalPortal>
          <div className="modal-backdrop" onClick={() => setDetailModalOpen(false)} style={{ zIndex: 9000 }}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '400px', width: '92%', borderRadius: '20px', padding: '20px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>Rincian Tagihan</strong>
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  aria-label="Tutup"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                  <CloseIcon size={18} color="#94a3b8" />
                </button>
              </div>

              <div className="stack" style={{ gap: '10px', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Kode Transaksi</span>
                  <strong className="mono">TRX/{displayCode(order.code)}</strong>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                  {order.services.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span>{s.name}</span>
                      <strong className="price">{rupiah(s.price)}</strong>
                    </div>
                  ))}
                  {order.products.map((p, idx) => (
                    <div key={`p-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span>{p.name} (x{p.qty})</span>
                      <strong className="price">{rupiah(p.subtotal)}</strong>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    borderTop: '1.5px dashed #e2e8f0',
                    paddingTop: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1.05rem',
                  }}
                >
                  <strong>Total Tagihan</strong>
                  <strong className="price" style={{ color: '#001b3a' }}>
                    {rupiah(order.total)}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ color: '#64748b' }}>Status Pembayaran</span>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      background: isLunas ? '#dcfce7' : '#fee2e2',
                      color: isLunas ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {isLunas ? 'LUNAS' : 'BELUM LUNAS (TUNAI)'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                style={{
                  width: '100%',
                  background: '#001b3a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px',
                  fontWeight: 700,
                  marginTop: '18px',
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ======================================================== */}
      {/* NOTA DIGITAL & PDF MODAL                                 */}
      {/* ======================================================== */}
      {invoiceOpen && order && (
        <InvoiceModal
          order={order}
          settings={settings}
          onClose={() => setInvoiceOpen(false)}
        />
      )}
    </div>
  );
};
