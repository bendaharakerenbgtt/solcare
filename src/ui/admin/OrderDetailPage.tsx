import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { repo } from '../../data';
import type { Order, StatusHistoryEntry, EstimateHistoryEntry, Settings, OrderStatus } from '../../data/types';
import { rupiah, displayCode, whatsappLink } from '../../lib/format';
import { toLocalInput, fromLocalInput } from '../hooks';
import { InvoiceModal } from '../common/InvoiceModal';
import { ModalPortal } from '../common/ModalPortal';
import {
  PhoneIcon,
  TruckIcon,
  PencilIcon,
  CheckIcon,
  CloseIcon,
  CashIcon,
  ClockIcon,
  PrinterIcon,
  DocumentIcon,
  SneakerIllustration,
} from '../common/Icons';

function formatBilasDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

const BILAS_STAGE_LABEL: Record<OrderStatus, string> = {
  menunggu: 'Antrian',
  pencucian: 'Proses Cuci',
  pengeringan: 'Proses Kering',
  finishing: 'Finishing & QC',
  selesai: 'Siap Ambil',
  diambil: 'Selesai (Diambil)',
};

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [estimateHistory, setEstimateHistory] = useState<EstimateHistoryEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  // Modals & accordions
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [deliveryExpanded, setDeliveryExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);

  // Status updating
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Estimate adjust form
  const [newEstimateAt, setNewEstimateAt] = useState('');
  const [estimateReason, setEstimateReason] = useState('');
  const [adjustingEstimate, setAdjustingEstimate] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [ord, sHist, eHist, sets] = await Promise.all([
        repo.getOrder(id),
        repo.statusHistory(id),
        repo.estimateHistory(id),
        repo.getSettings().catch(() => null),
      ]);

      if (!ord) throw new Error('Pesanan tidak ditemukan.');
      setOrder(ord);
      setSettings(sets);
      setStatusHistory(sHist);
      setEstimateHistory(eHist);
      if (ord.estimatedAt) {
        setNewEstimateAt(toLocalInput(ord.estimatedAt));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat detail pesanan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    if (searchParams.get('invoice') === '1') {
      setInvoiceOpen(true);
    }
  }, [id, searchParams]);

  // Advance to next process stage
  const handleAdvanceStatus = async () => {
    if (!id || !order) return;
    const nextMap: Record<OrderStatus, OrderStatus | null> = {
      menunggu: 'pencucian',
      pencucian: 'pengeringan',
      pengeringan: 'finishing',
      finishing: 'selesai',
      selesai: 'diambil',
      diambil: null,
    };
    const next = nextMap[order.status];
    if (!next) {
      alert('Pesanan sudah selesai sepenuhnya.');
      return;
    }

    setUpdatingStatus(true);
    try {
      await repo.updateStatus(id, next, `Diperbarui via Selesaikan Proses`);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal memperbarui status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Cancel order execution
  const executeCancelOrder = async () => {
    if (!id || !order) return;
    setUpdatingStatus(true);
    try {
      await repo.updateStatus(id, 'diambil', 'Dibatalkan oleh pelanggan/admin');
      setCancelModalOpen(false);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal membatalkan transaksi');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Adjust estimate
  const handleAdjustEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newEstimateAt) return;
    setAdjustingEstimate(true);
    try {
      await repo.adjustEstimate(id, {
        estimatedAt: fromLocalInput(newEstimateAt) || new Date().toISOString(),
        reason: estimateReason || 'Penyesuaian jadwal',
      });
      setAdjustModalOpen(false);
      setEstimateReason('');
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal memperbarui estimasi');
    } finally {
      setAdjustingEstimate(false);
    }
  };

  // Quick payment
  const handleRecordPayment = async (method: 'qris' | 'tunai') => {
    if (!id || !order) return;
    try {
      await repo.recordPayment(id, {
        method,
        status: 'lunas',
        paidAt: new Date().toISOString(),
        confirmed: true,
      });
      setPayModalOpen(false);
      alert(`Pembayaran LUNAS via ${method.toUpperCase()} berhasil dicatat!`);
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal mencatat pembayaran');
    }
  };

  if (loading) return <div className="empty">Memuat detail pesanan...</div>;
  if (error || !order) return <div className="card alert error">{error || 'Pesanan tidak ditemukan'}</div>;

  const trackUrl = `${window.location.origin}/cek-pesanan?code=${order.code}`;
  const waMessage =
    order.status === 'selesai'
      ? `Halo Kak ${order.customerName}, pesanan ${order.itemType} (${order.brand} ${order.model}) dengan kode TRX/${displayCode(order.code)} di Solecare SUDAH SELESAI dan siap diambil. Total tagihan: ${rupiah(order.total)} (${order.payment.status === 'lunas' ? 'LUNAS' : 'Belum Lunas'}). Cek nota & detail di: ${trackUrl}`
      : `Halo Kak ${order.customerName}, terima kasih telah mempercayakan perawatan di Solecare! Kode pesanan Anda: TRX/${displayCode(order.code)} (Status: ${BILAS_STAGE_LABEL[order.status]}). Pantau progres di: ${trackUrl}`;

  const waCustomer = order.customerPhone ? whatsappLink(order.customerPhone, waMessage) : null;
  const isLunas = order.payment.status === 'lunas';

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        // Ruang untuk bar aksi fixed di bawah agar card terakhir tidak tertutup.
        paddingBottom: 'calc(92px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* ======================================================== */}
      {/* 1. TOP HEADER (Persis Foto Bilas Image 4)                */}
      {/* ======================================================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#ffffff',
          borderBottom: '1px solid #f1f5f9',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate('/admin/orders')}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '1.3rem',
            fontWeight: 800,
            color: '#0f172a',
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          ←
        </button>

        {/* Center Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/logo-color.jpg"
            alt="Solecare Logo"
            style={{ width: '24px', height: '24px', borderRadius: '6px', objectFit: 'cover' }}
          />
          <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#001b3a', letterSpacing: '-0.3px' }}>
            solecare
          </span>
        </div>

        {/* Right Action Icons: Nota & Print */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Nota View Icon */}
          <button
            type="button"
            onClick={() => setInvoiceOpen(true)}
            title="Lihat Nota"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
              color: '#001b3a',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <DocumentIcon size={22} color="#001b3a" />
          </button>

          {/* Print Icon */}
          <button
            type="button"
            onClick={() => {
              setInvoiceOpen(true);
              setTimeout(() => window.print(), 350);
            }}
            title="Cetak Nota"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
              color: '#001b3a',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <PrinterIcon size={22} color="#001b3a" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. STATUS HEADLINE & CODE (Persis Foto Bilas Image 4)   */}
      {/* ======================================================== */}
      <div style={{ padding: '16px 18px 8px' }}>
        <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
          {BILAS_STAGE_LABEL[order.status] || 'Antrian'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px' }}>
          <strong style={{ fontSize: '0.92rem', color: '#0f172a', letterSpacing: '-0.2px' }}>
            TRX/{displayCode(order.code)}
          </strong>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#bf2f3b' }}>
            {formatBilasDateTime(order.receivedAt)}
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. CUSTOMER CARD (Persis Foto Bilas Image 4)             */}
      {/* ======================================================== */}
      <div
        style={{
          margin: '8px 16px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/bilas_icons/img_avatar.webp"
            alt="Avatar"
            style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <strong style={{ fontSize: '0.94rem', color: '#0f172a', display: 'block' }}>
              {order.customerName}
            </strong>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              {order.customerPhone || '-'}
            </span>
          </div>
        </div>

        {/* WhatsApp & Call Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {waCustomer && (
            <a
              href={waCustomer}
              target="_blank"
              rel="noreferrer"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
              }}
              title="Chat WhatsApp"
            >
              <img
                src="/bilas_icons/img_whatsapp.webp"
                alt="WA"
                style={{ width: '20px', height: '20px' }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </a>
          )}
          {order.customerPhone && (
            <a
              href={`tel:${order.customerPhone}`}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
              }}
              title="Panggil Telepon"
            >
              <PhoneIcon size={16} color="#64748b" />
            </a>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. INFORMASI ANTAR/JEMPUT ACCORDION (Persis Foto Image 4)*/}
      {/* ======================================================== */}
      <div
        style={{
          margin: '8px 16px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '14px 16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div
          onClick={() => setDeliveryExpanded(!deliveryExpanded)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TruckIcon size={20} color="#001b3a" />
            <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Informasi Antar/Jemput</strong>
          </div>
          <span style={{ color: '#94a3b8', transform: deliveryExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            ▾
          </span>
        </div>

        {deliveryExpanded && (
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.84rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#64748b' }}>Metode</span>
              <strong>{order.internalNotes?.includes('Antar-Jemput') ? 'Layanan Antar-Jemput' : 'Drop-off di Outlet'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Catatan</span>
              <strong>{order.internalNotes || 'Standar'}</strong>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 5. BLUE BANNER CARD: TAGIHAN & EST. SELESAI              */}
      {/* ======================================================== */}
      <div
        style={{
          margin: '12px 16px 6px',
          background: 'linear-gradient(135deg, #001b3a 0%, #0a2548 100%)',
          borderRadius: '18px',
          padding: '16px 20px',
          color: '#ffffff',
          boxShadow: '0 4px 14px rgba(0, 27, 58, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.82rem', opacity: 0.9, fontWeight: 600 }}>Tagihan</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '2px' }}>
              {order.total.toLocaleString('id-ID')}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* DETAIL button */}
            <button
              type="button"
              onClick={() => setDetailModalOpen(true)}
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: '1.5px solid rgba(255,255,255,0.45)',
                color: '#ffffff',
                fontSize: '0.76rem',
                fontWeight: 800,
                padding: '6px 14px',
                borderRadius: '20px',
                cursor: 'pointer',
              }}
            >
              DETAIL
            </button>

            {/* BAYAR button */}
            <button
              type="button"
              onClick={() => {
                if (isLunas) {
                  alert('Tagihan ini sudah tercatat LUNAS.');
                } else {
                  setPayModalOpen(true);
                }
              }}
              style={{
                background: isLunas ? '#16a34a' : '#bf2f3b',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.76rem',
                fontWeight: 800,
                padding: '6px 16px',
                borderRadius: '20px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(191, 47, 59, 0.3)',
              }}
            >
              {isLunas ? 'LUNAS' : 'BAYAR'}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-info: Est. Selesai */}
      <div style={{ textAlign: 'center', margin: '10px 16px 14px' }}>
        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Est. Selesai</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '2px' }}>
          <strong style={{ fontSize: '0.98rem', color: '#0f172a' }}>
            {formatBilasDateTime(order.estimatedAt || order.receivedAt)}
          </strong>
          <button
            type="button"
            onClick={() => setAdjustModalOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.78rem',
              color: '#bf2f3b',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
            title="Ubah Estimasi"
          >
            <PencilIcon size={14} color="#bf2f3b" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 6. DETAIL PESANAN CARD (Persis Foto Bilas Image 4)       */}
      {/* ======================================================== */}
      <div
        style={{
          margin: '8px 16px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>Detail Pesanan</strong>
          <Link
            to={`/admin/orders/${order.id}/edit`}
            style={{ fontSize: '0.82rem', fontWeight: 700, color: '#bf2f3b', textDecoration: 'none' }}
          >
            Edit
          </Link>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '14px' }}>
          Pilih Parfum <span style={{ color: '#001b3a', fontWeight: 600 }}>{order.fragranceName || 'Tanpa Parfum'}</span>
        </div>

        {/* Item Rows */}
        <div className="stack" style={{ gap: '14px' }}>
          {order.services.map((svc, idx) => (
            <div key={idx} style={{ paddingBottom: '12px', borderBottom: idx < order.services.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                    <SneakerIllustration width={38} height={24} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>
                      {svc.name}
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      1.0 Satuan
                    </span>
                  </div>
                </div>

                <div style={{ color: '#94a3b8', fontSize: '1.2rem', padding: '0 4px', cursor: 'pointer' }}>
                  •••
                </div>
              </div>

              {/* Workflow Station Icons with Stage Label & Riwayat Pill */}
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
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: order.status === 'menunggu' ? '#001b3a' : '#e2e8f0',
                        color: order.status === 'menunggu' ? '#ffffff' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                      }}
                      title="Antrian Masuk"
                    >
                      1
                    </span>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: order.status === 'pencucian' ? '#bf2f3b' : '#e2e8f0',
                        color: order.status === 'pencucian' ? '#ffffff' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                      }}
                      title="Cuci"
                    >
                      2
                    </span>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: order.status === 'pengeringan' ? '#bf2f3b' : '#e2e8f0',
                        color: order.status === 'pengeringan' ? '#ffffff' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                      }}
                      title="Kering"
                    >
                      3
                    </span>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: order.status === 'finishing' || order.status === 'selesai' || order.status === 'diambil' ? '#16a34a' : '#e2e8f0',
                        color: order.status === 'finishing' || order.status === 'selesai' || order.status === 'diambil' ? '#ffffff' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                      }}
                      title="Finishing / Selesai"
                    >
                      ✓
                    </span>
                  </div>

                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#001b3a' }}>
                    {BILAS_STAGE_LABEL[order.status] || 'Antrian'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setHistoryExpanded(true)}
                  style={{
                    background: '#cbd5e1',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    borderRadius: '14px',
                    padding: '4px 12px',
                    cursor: 'pointer',
                  }}
                >
                  Riwayat
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 7. INFORMASI TAMBAHAN CARD (Persis Foto Bilas Image 4)   */}
      {/* ======================================================== */}
      <div
        style={{
          margin: '8px 16px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
          Informasi Tambahan
        </strong>
        <span style={{ fontSize: '0.84rem', color: '#64748b' }}>
          {order.conditionNotes || order.internalNotes || 'Tidak Ada'}
        </span>
      </div>

      {/* ======================================================== */}
      {/* 8. HISTORI PESANAN ACCORDION (Persis Foto Bilas Image 4) */}
      {/* ======================================================== */}
      <div
        style={{
          margin: '8px 16px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div
          onClick={() => setHistoryExpanded(!historyExpanded)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>Histori Pesanan</strong>
          <span style={{ color: '#94a3b8', transform: historyExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            ▾
          </span>
        </div>

        {historyExpanded && (
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            <div className="stack" style={{ gap: '12px' }}>
              {/* Event 1: Pesanan Dibuat */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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
                    }}
                  >
                    <CheckIcon size={12} color="#ffffff" />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block' }}>
                      Pesanan Dibuat
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Oleh : Admin
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                  {formatBilasDateTime(order.receivedAt)}
                </span>
              </div>

              {/* Status history log items */}
              {statusHistory.map((sh) => (
                <div key={sh.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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
                      }}
                    >
                      <CheckIcon size={12} color="#ffffff" />
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block' }}>
                        {BILAS_STAGE_LABEL[sh.to]}
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Oleh : {sh.byName}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    {formatBilasDateTime(sh.at)}
                  </span>
                </div>
              ))}

              {/* Estimate adjustments log items */}
              {estimateHistory.map((eh) => (
                <div key={eh.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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
                      }}
                    >
                      <ClockIcon size={12} color="#ffffff" />
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block' }}>
                        Estimasi Diubah: {eh.newAt ? formatBilasDateTime(eh.newAt) : '-'}
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {eh.reason || 'Penyesuaian'} • Oleh : {eh.byName}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    {formatBilasDateTime(eh.at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 10. STICKY BOTTOM ACTIONS (Persis Foto Bilas Image 4)    */}
      {/* ======================================================== */}
      <div className="order-detail-action-bar">
        {/* BATAL BUTTON */}
        <button
          type="button"
          onClick={() => setCancelModalOpen(true)}
          disabled={updatingStatus || order.status === 'diambil'}
          className="order-detail-action-btn"
          style={{
            flex: 1,
            background: '#ffffff',
            border: '1.5px solid #bf2f3b',
            color: '#bf2f3b',
          }}
        >
          BATAL
        </button>

        {/* SELESAIKAN PROSES BUTTON */}
        <button
          type="button"
          onClick={() => void handleAdvanceStatus()}
          disabled={updatingStatus || order.status === 'diambil'}
          className="order-detail-action-btn"
          style={{
            flex: 2,
            background: order.status === 'diambil' ? '#94a3b8' : '#001b3a',
            border: 'none',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(0, 27, 58, 0.25)',
          }}
        >
          {updatingStatus ? 'Menyimpan...' : order.status === 'diambil' ? 'PESANAN SELESAI' : 'SELESAIKAN PROSES'}
        </button>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: RINCIAN TAGIHAN (DETAIL BUTTON)                 */}
      {/* ======================================================== */}
      {detailModalOpen && (
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
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <CloseIcon size={18} color="#94a3b8" />
              </button>
            </div>

            <div className="stack" style={{ gap: '10px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Kode Transaksi</span>
                <strong>TRX/{displayCode(order.code)}</strong>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                {order.services.map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>{s.name}</span>
                    <strong>{rupiah(s.price)}</strong>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1.5px dashed #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem' }}>
                <strong>Total Tagihan</strong>
                <strong style={{ color: '#001b3a' }}>{rupiah(order.total)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ color: '#64748b' }}>Status Pembayaran</span>
                <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800, background: isLunas ? '#dcfce7' : '#fee2e2', color: isLunas ? '#15803d' : '#b91c1c' }}>
                  {isLunas ? 'LUNAS' : 'BELUM LUNAS'}
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
      {/* MODAL 2: CATAT PEMBAYARAN (BAYAR BUTTON)                 */}
      {/* ======================================================== */}
      {payModalOpen && (
        <ModalPortal>
        <div className="modal-backdrop" onClick={() => setPayModalOpen(false)} style={{ zIndex: 9000 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '380px', width: '92%', borderRadius: '20px', padding: '20px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>Catat Pembayaran</strong>
              <button
                type="button"
                onClick={() => setPayModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <CloseIcon size={18} color="#94a3b8" />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 16px 0' }}>
              Konfirmasi penerimaan pembayaran tunai (cash) untuk melunasi tagihan sebesar <strong>{rupiah(order.total)}</strong>:
            </p>

            <div className="stack" style={{ gap: '10px' }}>
              <button
                type="button"
                onClick={() => void handleRecordPayment('tunai')}
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '13px',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                }}
              >
                <CashIcon size={20} color="#ffffff" />
                <span>Terima Pembayaran Tunai (Lunas)</span>
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: PENYESUAIAN ESTIMASI                            */}
      {/* ======================================================== */}
      {adjustModalOpen && (
        <ModalPortal>
        <div className="modal-backdrop" onClick={() => setAdjustModalOpen(false)} style={{ zIndex: 9000 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px', width: '92%', borderRadius: '20px', padding: '20px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>Ubah Estimasi Selesai</strong>
              <button
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <CloseIcon size={18} color="#94a3b8" />
              </button>
            </div>

            <form onSubmit={handleAdjustEstimate} className="stack" style={{ gap: '12px' }}>
              <label className="field">
                <span>Tanggal & Jam Selesai Baru</span>
                <input
                  type="datetime-local"
                  value={newEstimateAt}
                  onChange={(e) => setNewEstimateAt(e.target.value)}
                  required
                />
              </label>

              <label className="field">
                <span>Alasan Penyesuaian</span>
                <input
                  type="text"
                  placeholder="Misal: Butuh pengeringan ekstra"
                  value={estimateReason}
                  onChange={(e) => setEstimateReason(e.target.value)}
                />
              </label>

              <button
                type="submit"
                disabled={adjustingEstimate}
                style={{
                  background: '#001b3a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                {adjustingEstimate ? 'Menyimpan...' : 'Simpan Estimasi'}
              </button>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: KONFIRMASI BATAL TRANSAKSI                      */}
      {/* ======================================================== */}
      {cancelModalOpen && (
        <ModalPortal>
          <div className="modal-backdrop" onClick={() => setCancelModalOpen(false)} style={{ zIndex: 9000 }}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '380px', width: '92%', borderRadius: '20px', padding: '24px 20px', textAlign: 'center' }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                  color: '#bf2f3b',
                }}
              >
                <CloseIcon size={26} color="#bf2f3b" />
              </div>

              <strong style={{ fontSize: '1.08rem', color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                Batalkan Transaksi?
              </strong>
              <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
                Apakah Anda yakin ingin membatalkan transaksi kode <strong>{displayCode(order.code)}</strong> ({order.customerName})?
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  style={{
                    flex: 1,
                    background: '#f1f5f9',
                    border: 'none',
                    color: '#475569',
                    borderRadius: '12px',
                    padding: '12px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  Kembali
                </button>
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => void executeCancelOrder()}
                  style={{
                    flex: 1,
                    background: '#bf2f3b',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '12px',
                    padding: '12px',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: updatingStatus ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(191, 47, 59, 0.3)',
                  }}
                >
                  {updatingStatus ? 'Membatalkan...' : 'Ya, Batalkan'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ======================================================== */}
      {/* NOTA PRINT MODAL                                         */}
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
