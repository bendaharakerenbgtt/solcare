import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { repo } from '../../data';
import type { Order, OrderPhoto, StatusHistoryEntry, EstimateHistoryEntry } from '../../data/types';
import { ORDER_STATUSES, type OrderStatus } from '../../data/types';
import { fmtDateTime, rupiah, STATUS_LABEL, displayCode, whatsappLink } from '../../lib/format';
import { buildCollage, validateInputFile } from '../../lib/collage';
import { toLocalInput, fromLocalInput } from '../hooks';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [photos, setPhotos] = useState<OrderPhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [estimateHistory, setEstimateHistory] = useState<EstimateHistoryEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status update modal / form
  const [targetStatus, setTargetStatus] = useState<OrderStatus>('menunggu');
  const [statusNote, setStatusNote] = useState('');
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
  const [collageCaption, setCollageCaption] = useState('Dokumentasi Soleful Soaks!');
  const [uploadingCollage, setUploadingCollage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [ord, phs, sHist, eHist] = await Promise.all([
        repo.getOrder(id),
        repo.listPhotos(id),
        repo.statusHistory(id),
        repo.estimateHistory(id),
      ]);

      if (!ord) throw new Error('Pesanan tidak ditemukan.');
      setOrder(ord);
      setTargetStatus(ord.status);
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
  }, [id]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !order) return;
    setUpdatingStatus(true);
    try {
      await repo.updateStatus(id, targetStatus, statusNote);
      setStatusNote('');
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengubah status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAdjustEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newEstimateAt) return;
    setAdjustingEstimate(true);
    try {
      await repo.adjustEstimate(id, {
        estimatedAt: fromLocalInput(newEstimateAt) || new Date().toISOString(),
        reason: estimateReason,
      });
      setEstimateReason('');
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal memperbarui estimasi');
    } finally {
      setAdjustingEstimate(false);
    }
  };

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
        footer: `Soleful Soaks! Shoes Care • Pesanan ${displayCode(order.code)} • ${order.brand} ${order.model}`,
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
      await repo.deletePhoto(photoId, 'Dihapus manual oleh staf dari halaman detail');
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal menghapus');
    }
  };

  if (loading) return <div className="empty">Memuat detail pesanan...</div>;
  if (error || !order) return <div className="card alert error">{error || 'Pesanan tidak ditemukan'}</div>;

  const waCustomer = order.customerPhone
    ? whatsappLink(
        order.customerPhone,
        `Halo Kak ${order.customerName}, kami dari Soleful Soaks! menginfokan tentang pesanan ${displayCode(
          order.code
        )}.`
      )
    : null;

  return (
    <div className="stack" style={{ gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Top Header */}
      <div className="admin-top">
        <div>
          <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
            <span className="badge teal" style={{ fontSize: '1rem' }}>
              {displayCode(order.code)}
            </span>
            <span className={`badge ${order.status === 'selesai' ? 'ok' : 'blue'}`}>
              {STATUS_LABEL[order.status]}
            </span>
            <span className={`badge ${order.payment.status === 'lunas' ? 'ok' : 'warn'}`}>
              {order.payment.status === 'lunas' ? 'Lunas' : 'Belum Lunas'}
            </span>
          </div>
          <h1 style={{ marginTop: '6px' }}>
            {order.itemType}: {order.brand} {order.model}
          </h1>
        </div>
        <div className="spacer" />
        <div className="row" style={{ gap: '8px' }}>
          {waCustomer && (
            <a href={waCustomer} target="_blank" rel="noreferrer" className="btn wa sm">
              💬 WA Pelanggan
            </a>
          )}
          <Link to={`/admin/orders/${order.id}/edit`} className="btn secondary sm">
            ✏️ Edit Pesanan
          </Link>
          <Link to={`/cek-pesanan?code=${order.code}`} target="_blank" className="btn secondary sm">
            Tampilan Publik ↗
          </Link>
        </div>
      </div>

      {/* Main Grid Detail */}
      <div className="grid grid-2">
        {/* Customer & Item Info */}
        <div className="card">
          <h3>Informasi Pelanggan & Barang</h3>
          <dl className="kv" style={{ marginTop: '12px' }}>
            <dt>Pelanggan</dt>
            <dd><strong>{order.customerName}</strong></dd>
            <dt>WhatsApp</dt>
            <dd>{order.customerPhone}</dd>
            <dt>Jenis Barang</dt>
            <dd>{order.itemType}</dd>
            <dt>Merek & Model</dt>
            <dd>{order.brand} {order.model}</dd>
            <dt>Warna</dt>
            <dd>{order.color || '-'}</dd>
            <dt>Pewangi</dt>
            <dd>{order.fragranceName || 'Standar'}</dd>
            <dt>Kondisi Barang</dt>
            <dd>{order.conditionNotes || '-'}</dd>
            <dt>Catatan Internal</dt>
            <dd style={{ color: 'var(--warn)' }}>{order.internalNotes || '-'}</dd>
          </dl>
        </div>

        {/* Status & Estimate Controls */}
        <div className="card">
          <h3>Ubah Status Pengerjaan</h3>
          <form onSubmit={handleUpdateStatus} className="stack" style={{ marginTop: '12px', gap: '10px' }}>
            <label className="field">
              <span>Status Sekarang:</span>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as OrderStatus)}
              >
                {ORDER_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {STATUS_LABEL[st]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Catatan Pembaruan (Opsional)</span>
              <input
                type="text"
                placeholder="Misal: Sudah direndam / pengerjaan ulang"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
              />
            </label>
            <button type="submit" className="btn sm" disabled={updatingStatus || targetStatus === order.status}>
              {updatingStatus ? 'Menyimpan...' : 'Perbarui Status'}
            </button>
          </form>

          <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '16px 0' }} />

          <h3>Penyesuaian Estimasi Selesai</h3>
          <form onSubmit={handleAdjustEstimate} className="stack" style={{ marginTop: '12px', gap: '10px' }}>
            <label className="field">
              <span>Target Selesai Baru</span>
              <input
                type="datetime-local"
                value={newEstimateAt}
                onChange={(e) => setNewEstimateAt(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Alasan Perubahan Estimasi *</span>
              <input
                type="text"
                placeholder="Contoh: Antrean cuci membludak / butuh pengeringan ekstra"
                value={estimateReason}
                onChange={(e) => setEstimateReason(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="btn secondary sm" disabled={adjustingEstimate}>
              {adjustingEstimate ? 'Menyimpan...' : 'Simpan Penyesuaian Estimasi'}
            </button>
          </form>
        </div>
      </div>

      {/* Services and Bill Detail */}
      <div className="card">
        <h3>Rincian Layanan & Pembayaran</h3>

        {order.items && order.items.length > 1 && (
          <div style={{ marginTop: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '8px', color: '#334155' }}>
              Daftar Rincian {order.items.length} Barang:
            </span>
            <div className="grid grid-2" style={{ gap: '10px' }}>
              {order.items.map((it, idx) => (
                <div key={it.id || idx} style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '10px 12px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.88rem' }}>Barang {idx + 1}: {it.itemType}</strong>
                    {it.color && <span className="badge sm">{it.color}</span>}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--ink)', marginTop: '2px' }}>
                    {it.brand} {it.model}
                  </div>
                  {it.conditionNotes && (
                    <div className="xs muted" style={{ marginTop: '4px' }}>
                      Catatan: {it.conditionNotes}
                    </div>
                  )}
                  <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed var(--line)' }}>
                    {it.services.map((s, sIdx) => (
                      <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '1px 0' }}>
                        <span>• {s.name}</span>
                        <strong style={{ color: 'var(--primary)' }}>{rupiah(s.price)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="table-scroll-hint" style={{ marginTop: '8px' }}>👉 Geser ke samping untuk melihat detail</div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Layanan / Produk</th>
                <th>Kategori</th>
                <th>Beban</th>
                <th className="right">Harga Saat Transaksi</th>
              </tr>
            </thead>
            <tbody>
              {order.services.map((s, idx) => (
                <tr key={idx}>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.category}</td>
                  <td>{s.workloadWeight} unit</td>
                  <td className="right">{rupiah(s.price)}</td>
                </tr>
              ))}
              {order.products.map((p, idx) => (
                <tr key={idx}>
                  <td><strong>{p.name}</strong> (x{p.qty})</td>
                  <td>Produk Tambahan</td>
                  <td>-</td>
                  <td className="right">{rupiah(p.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="totals" style={{ padding: '16px 8px 0', borderTop: '2px solid var(--line)' }}>
          <span>Total Pembayaran</span>
          <span style={{ color: 'var(--primary)' }}>{rupiah(order.total)}</span>
        </div>
        <div className="row between small muted" style={{ padding: '4px 8px' }}>
          <div>
            Metode: <strong style={{ textTransform: 'uppercase' }}>{order.payment.method}</strong> • Dicatat oleh: {order.payment.recordedByName || 'Staff'}
          </div>
          <div>
            {order.payment.paidAt ? `Dibayar pada: ${fmtDateTime(order.payment.paidAt)}` : 'Belum ada bukti bayar'}
          </div>
        </div>
      </div>

      {/* Photo Documentation & 2x2 Collage */}
      <div className="card">
        <div className="row between" style={{ marginBottom: '12px' }}>
          <div>
            <h3>Dokumentasi Foto & Kolase 2×2</h3>
            <p className="small muted">
              Unggah 4 foto (sebelum & sesudah). Sistem browser akan otomatis memotong, mengompres, dan menggabungkannya menjadi 1 file kolase 2×2.
            </p>
          </div>
          <div>
            <span className="badge">{repo.photoIntegration().label}</span>
          </div>
        </div>

        {/* Existing uploaded photos */}
        {photos.length > 0 && (
          <div className="stack" style={{ gap: '16px', marginBottom: '24px' }}>
            {photos.map((p) => (
              <div key={p.id} className="card flat" style={{ border: '1px solid var(--line)', padding: '16px' }}>
                <div className="row between" style={{ marginBottom: '12px' }}>
                  <div>
                    <strong>Kolase Dokumentasi ({p.status === 'active' ? 'Aktif' : 'Kedaluwarsa/Dihapus'})</strong>
                    <div className="xs muted">
                      Diupload: {fmtDateTime(p.uploadedAt)} oleh {p.uploadedByName} • Ukuran: {Math.round(p.sizeBytes / 1024)} KB
                    </div>
                  </div>
                  {p.status === 'active' && (
                    <button
                      type="button"
                      className="btn danger sm"
                      onClick={() => void handleDeletePhoto(p.id)}
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>

                {photoUrls[p.id] ? (
                  <div style={{ textAlign: 'center', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                    <img
                      src={photoUrls[p.id]}
                      alt="Kolase"
                      style={{ maxHeight: '480px', margin: '0 auto' }}
                    />
                  </div>
                ) : (
                  <div className="empty">Foto tidak lagi tersedia di penyimpanan lokal atau telah kedaluwarsa.</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleUploadCollage} className="stack" style={{ gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
          <h4>+ Buat Kolase 4 Foto Baru</h4>
          {uploadError && <div className="alert error">{uploadError}</div>}

          <div className="photo-slots">
            {[0, 1, 2, 3].map((slotIdx) => (
              <div key={slotIdx} className="stack" style={{ gap: '4px' }}>
                <div className="photo-slot">
                  {uploadFiles[slotIdx] ? (
                    <img
                      src={URL.createObjectURL(uploadFiles[slotIdx]!)}
                      alt={`Slot ${slotIdx + 1}`}
                    />
                  ) : (
                    <div className="small muted center">
                      📷 Klik untuk pilih
                      <br />
                      <strong>Foto {slotIdx + 1}</strong>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(slotIdx, e)}
                  />
                </div>
                <input
                  type="text"
                  placeholder={`Label Foto ${slotIdx + 1}`}
                  value={uploadLabels[slotIdx]}
                  onChange={(e) => {
                    const next = [...uploadLabels];
                    next[slotIdx] = e.target.value;
                    setUploadLabels(next);
                  }}
                  className="xs"
                />
              </div>
            ))}
          </div>

          <label className="field">
            <span>Keterangan / Judul Kolase</span>
            <input
              type="text"
              value={collageCaption}
              onChange={(e) => setCollageCaption(e.target.value)}
            />
          </label>

          <button
            type="submit"
            className="btn"
            disabled={uploadingCollage || uploadFiles.filter(Boolean).length !== 4}
          >
            {uploadingCollage ? 'Mengompres & Menggabungkan...' : 'Gabungkan Menjadi Kolase 2×2 & Simpan'}
          </button>
        </form>
      </div>

      {/* History Timelines */}
      <div className="grid grid-2">
        <div className="card">
          <h3>Riwayat Perubahan Status</h3>
          <div style={{ marginTop: '12px' }}>
            <ul className="timeline">
              {statusHistory.map((sh) => (
                <li key={sh.id} className="done">
                  <div className="dot">✓</div>
                  <div>
                    <strong>{STATUS_LABEL[sh.to]}</strong>
                    {sh.note && <div className="small">{sh.note}</div>}
                    <div className="xs muted">
                      {fmtDateTime(sh.at)} oleh {sh.byName}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card">
          <h3>Riwayat Penyesuaian Estimasi</h3>
          <div style={{ marginTop: '12px' }}>
            {estimateHistory.length === 0 ? (
              <div className="empty">Belum ada perubahan estimasi.</div>
            ) : (
              <ul className="timeline">
                {estimateHistory.map((eh) => (
                  <li key={eh.id} className="done">
                    <div className="dot">⏱️</div>
                    <div>
                      <strong>
                        {eh.newAt ? fmtDateTime(eh.newAt) : 'Belum diatur'}
                      </strong>
                      <div className="xs muted">
                        Sumber: {eh.source === 'auto' ? 'Otomatis' : 'Manual'} • Sebelumnya: {eh.previousAt ? fmtDateTime(eh.previousAt) : '-'}
                      </div>
                      {eh.reason && <div className="small">{eh.reason}</div>}
                      <div className="xs muted">
                        {fmtDateTime(eh.at)} oleh {eh.byName}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
