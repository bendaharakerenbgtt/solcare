import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { repo } from '../../data';
import type { Order, OrderPhoto, StatusHistoryEntry, EstimateHistoryEntry, Settings, OrderStatus } from '../../data/types';
import { fmtDateTime, rupiah, displayCode, whatsappLink } from '../../lib/format';
import { buildCollage, validateInputFile } from '../../lib/collage';
import { toLocalInput, fromLocalInput } from '../hooks';
import { InvoiceModal } from '../common/InvoiceModal';
import {
  PhoneIcon,
  TruckIcon,
  PencilIcon,
  CheckIcon,
  CameraIcon,
  CloseIcon,
  QrisIcon,
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
  const [photos, setPhotos] = useState<OrderPhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [estimateHistory, setEstimateHistory] = useState<EstimateHistoryEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  // Modals & accordions
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [deliveryExpanded, setDeliveryExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [collageExpanded, setCollageExpanded] = useState(false);

  // Status updating
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Estimate adjust form
  const [newEstimateAt, setNewEstimateAt] = useState('');
  const [estimateReason, setEstimateReason] = useState('');
  const [adjustingEstimate, setAdjustingEstimate] = useState(false);

  // Photo Collage Upload
  const [uploadFiles, setUploadFiles] = useState<(File | null)[]>([null, null, null, null]);
  const [uploadLabels, setUploadLabels] = useState<string[]>([
    'Sebelum (Depan)',
    'Sebelum (Samping)',
    'Sesudah (Depan)',
    'Sesudah (Samping)',
  ]);
  const [collageCaption, setCollageCaption] = useState('Dokumentasi Solecare!');
  const [uploadingCollage, setUploadingCollage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [ord, phs, sHist, eHist, sets] = await Promise.all([
        repo.getOrder(id),
        repo.listPhotos(id),
        repo.statusHistory(id),
        repo.estimateHistory(id),
        repo.getSettings().catch(() => null),
      ]);

      if (!ord) throw new Error('Pesanan tidak ditemukan.');
      setOrder(ord);
      setSettings(sets);
      setPhotos(phs);
      setStatusHistory(sHist);
      setEstimateHistory(eHist);
      if (ord.estimatedAt) {
        setNewEstimateAt(toLocalInput(ord.estimatedAt));
      }

      // Load active photo URLs
      const urls: Record<string, string> = {};
      for (const p of phs) {
        if (p.status === 'active') {
          const u = await repo.photoUrl(p.id);
          if (u) urls[p.id] = u;
        }
      }
      setPhotoUrls(urls);
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

  // Cancel order
  const handleCancelOrder = async () => {
    if (!id || !order) return;
    if (!confirm(`Batalkan transaksi ${displayCode(order.code)}?`)) return;
    setUpdatingStatus(true);
    try {
      await repo.updateStatus(id, 'diambil', 'Dibatalkan oleh pelanggan/admin');
      alert('Transaksi berhasil dibatalkan.');
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

  // Photo handlers
  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const err = validateInputFile(file);
      if (err) {
        alert(err);
        return;
      }
      const next = [...uploadFiles];
      next[index] = file;
      setUploadFiles(next);
    }
  };

  const handleUploadCollage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !order) return;
    const filled = uploadFiles.filter(Boolean) as File[];
    if (filled.length !== 4) {
      setUploadError('Wajib memilih tepat 4 foto untuk kolase 2×2.');
      return;
    }

    setUploadingCollage(true);
    setUploadError(null);
    try {
      const { blob, width, height } = await buildCollage(filled, {
        labels: uploadLabels,
        caption: collageCaption,
        footer: `Solecare Care • Pesanan TRX/${displayCode(order.code)} • ${order.brand} ${order.model}`,
      });

      await repo.uploadCollage(id, blob, {
        labels: uploadLabels,
        caption: collageCaption,
        width,
        height,
      });

      setUploadFiles([null, null, null, null]);
      await loadData();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal membuat/mengunggah kolase');
    } finally {
      setUploadingCollage(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Yakin ingin menghapus foto dokumentasi ini?')) return;
    try {
      await repo.deletePhoto(photoId, 'Dihapus manual dari halaman detail');
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal menghapus');
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
    <div style={{ maxWidth: '480px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh', paddingBottom: '90px' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <img
            src="/bilas_icons/img_logo.webp"
            alt="Logo"
            style={{ height: '24px', objectFit: 'contain' }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0052cc', letterSpacing: '-0.3px' }}>
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
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <DocumentIcon size={22} color="#0284c7" />
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
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <PrinterIcon size={22} color="#0284c7" />
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
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0284c7' }}>
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
            <TruckIcon size={20} color="#0284c7" />
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
          background: 'linear-gradient(135deg, #0284c7 0%, #0052cc 100%)',
          borderRadius: '18px',
          padding: '16px 20px',
          color: '#ffffff',
          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)',
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
                background: isLunas ? '#16a34a' : '#f59e0b',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.76rem',
                fontWeight: 800,
                padding: '6px 16px',
                borderRadius: '20px',
                cursor: 'pointer',
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
              color: '#0284c7',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
            title="Ubah Estimasi"
          >
            <PencilIcon size={14} color="#0284c7" />
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
            style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0284c7', textDecoration: 'none' }}
          >
            Edit
          </Link>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '14px' }}>
          Pilih Parfum <span style={{ color: '#0284c7', fontWeight: 600 }}>{order.fragranceName || 'Tanpa Parfum'}</span>
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

              {/* Workflow Station Icons & Riwayat Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img
                    src="/bilas_icons/proses_diterima.webp"
                    alt="Terima"
                    style={{ width: '26px', height: '26px', opacity: order.status === 'menunggu' ? 1 : 0.6 }}
                    title="Diterima"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <img
                    src="/bilas_icons/proses_cuci.webp"
                    alt="Cuci"
                    style={{ width: '26px', height: '26px', opacity: order.status === 'pencucian' ? 1 : 0.6 }}
                    title="Pencucian"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <img
                    src="/bilas_icons/proses_kering.webp"
                    alt="Kering"
                    style={{ width: '26px', height: '26px', opacity: order.status === 'pengeringan' ? 1 : 0.6 }}
                    title="Pengeringan"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <img
                    src="/bilas_icons/proses_packing.webp"
                    alt="Packing"
                    style={{ width: '26px', height: '26px', opacity: order.status === 'finishing' || order.status === 'selesai' ? 1 : 0.6 }}
                    title="Finishing"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
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
                    padding: '4px 14px',
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
                      background: '#0284c7',
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
                        background: '#0284c7',
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
                        background: '#6366f1',
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
      {/* 9. DOKUMENTASI FOTO & KOLASE 2x2 ACCORDION               */}
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
          onClick={() => setCollageExpanded(!collageExpanded)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CameraIcon size={20} color="#0284c7" />
            <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>Dokumentasi Foto & Kolase 2×2</strong>
          </div>
          <span style={{ color: '#94a3b8', transform: collageExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            ▾
          </span>
        </div>

        {collageExpanded && (
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            {/* Existing photos */}
            {photos.length > 0 ? (
              <div className="stack" style={{ gap: '12px', marginBottom: '16px' }}>
                {photos.map((p) => (
                  <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Kolase 2×2 ({fmtDateTime(p.uploadedAt)})</span>
                      {p.status === 'active' && (
                        <button
                          type="button"
                          className="btn danger sm"
                          onClick={() => void handleDeletePhoto(p.id)}
                          style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                    {photoUrls[p.id] ? (
                      <img src={photoUrls[p.id]} alt="Kolase" style={{ width: '100%', borderRadius: '8px' }} />
                    ) : (
                      <div className="empty" style={{ fontSize: '0.8rem' }}>Foto tidak tersedia</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 12px 0' }}>
                Belum ada foto dokumentasi. Unggah 4 foto untuk digabungkan menjadi kolase 2×2.
              </p>
            )}

            {/* Collage upload form */}
            <form onSubmit={handleUploadCollage} className="stack" style={{ gap: '10px' }}>
              {uploadError && <div className="alert error">{uploadError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[0, 1, 2, 3].map((slotIdx) => (
                  <div key={slotIdx} style={{ border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '8px', textAlign: 'center', background: '#f8fafc' }}>
                    {uploadFiles[slotIdx] ? (
                      <img
                        src={URL.createObjectURL(uploadFiles[slotIdx]!)}
                        alt={`Slot ${slotIdx + 1}`}
                        style={{ width: '100%', height: '70px', objectFit: 'cover', borderRadius: '6px' }}
                      />
                    ) : (
                      <label style={{ display: 'block', cursor: 'pointer', padding: '12px 0', fontSize: '0.74rem', color: '#64748b' }}>
                        + Foto {slotIdx + 1}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleFileChange(slotIdx, e)}
                        />
                      </label>
                    )}
                    <input
                      type="text"
                      value={uploadLabels[slotIdx]}
                      onChange={(e) => {
                        const next = [...uploadLabels];
                        next[slotIdx] = e.target.value;
                        setUploadLabels(next);
                      }}
                      style={{ width: '100%', fontSize: '0.72rem', padding: '3px 6px', marginTop: '4px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                    />
                  </div>
                ))}
              </div>

              <input
                type="text"
                value={collageCaption}
                onChange={(e) => setCollageCaption(e.target.value)}
                placeholder="Judul Kolase"
                style={{ width: '100%', fontSize: '0.82rem', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />

              <button
                type="submit"
                disabled={uploadingCollage || uploadFiles.filter(Boolean).length !== 4}
                style={{
                  background: '#001b3a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  opacity: uploadingCollage || uploadFiles.filter(Boolean).length !== 4 ? 0.6 : 1,
                }}
              >
                {uploadingCollage ? 'Memproses Kolase...' : 'Gabungkan Jadi Kolase 2×2'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 10. STICKY BOTTOM ACTIONS (Persis Foto Bilas Image 4)    */}
      {/* ======================================================== */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 40,
          maxWidth: '480px',
          margin: '0 auto',
        }}
      >
        {/* BATAL BUTTON */}
        <button
          type="button"
          onClick={() => void handleCancelOrder()}
          disabled={updatingStatus || order.status === 'diambil'}
          style={{
            flex: 1,
            background: '#ffffff',
            border: '1.5px solid #991b1b',
            color: '#991b1b',
            fontWeight: 800,
            fontSize: '0.88rem',
            padding: '12px',
            borderRadius: '24px',
            cursor: 'pointer',
          }}
        >
          BATAL
        </button>

        {/* SELESAIKAN PROSES BUTTON */}
        <button
          type="button"
          onClick={() => void handleAdvanceStatus()}
          disabled={updatingStatus || order.status === 'diambil'}
          style={{
            flex: 2,
            background: order.status === 'diambil' ? '#94a3b8' : '#0052cc',
            border: 'none',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.88rem',
            padding: '12px',
            borderRadius: '24px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 82, 204, 0.25)',
          }}
        >
          {updatingStatus ? 'Menyimpan...' : order.status === 'diambil' ? 'PESANAN SELESAI' : 'SELESAIKAN PROSES'}
        </button>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: RINCIAN TAGIHAN (DETAIL BUTTON)                 */}
      {/* ======================================================== */}
      {detailModalOpen && (
        <div className="modal-backdrop" onClick={() => setDetailModalOpen(false)} style={{ zIndex: 120 }}>
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
                <strong style={{ color: '#0052cc' }}>{rupiah(order.total)}</strong>
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
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CATAT PEMBAYARAN (BAYAR BUTTON)                 */}
      {/* ======================================================== */}
      {payModalOpen && (
        <div className="modal-backdrop" onClick={() => setPayModalOpen(false)} style={{ zIndex: 120 }}>
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
              Pilih metode pembayaran untuk melunasi tagihan sebesar <strong>{rupiah(order.total)}</strong>:
            </p>

            <div className="stack" style={{ gap: '10px' }}>
              <button
                type="button"
                onClick={() => void handleRecordPayment('qris')}
                style={{
                  background: '#0052cc',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <QrisIcon size={18} color="#ffffff" />
                <span>QRIS (Lunas Langsung)</span>
              </button>

              <button
                type="button"
                onClick={() => void handleRecordPayment('tunai')}
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <CashIcon size={18} color="#ffffff" />
                <span>Tunai / Cash (Lunas Langsung)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: PENYESUAIAN ESTIMASI                            */}
      {/* ======================================================== */}
      {adjustModalOpen && (
        <div className="modal-backdrop" onClick={() => setAdjustModalOpen(false)} style={{ zIndex: 120 }}>
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
                  background: '#0052cc',
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
