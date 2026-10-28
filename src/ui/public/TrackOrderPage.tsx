import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { repo } from '../../data';
import type { PublicOrderView } from '../../data/types';
import { fmtDateTime, rupiah, STATUS_LABEL, whatsappLink, displayCode } from '../../lib/format';
import { useAsync } from '../hooks';

export const TrackOrderPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [code, setCode] = useState(initialCode);
  const [phoneSuffix, setPhoneSuffix] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [order, setOrder] = useState<PublicOrderView | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  const { data: settings } = useAsync(() => repo.getSettings(), []);

  const doTrack = async (searchTarget: string, suffixTarget: string) => {
    if (!searchTarget.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setOrder(null);
    setSelectedPhotoUrl(null);

    try {
      const res = await repo.trackOrder(searchTarget.trim(), suffixTarget.trim());
      if (res.ok) {
        setOrder(res.order);
        // auto-load first available photo if present
        if (res.order.photos.length > 0 && res.order.photos[0].available) {
          void loadPhoto(res.order.code, res.order.photos[0].id, suffixTarget.trim());
        }
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
      void doTrack(initialCode, '');
    }
  }, [initialCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ code });
    void doTrack(code, phoneSuffix);
  };

  const loadPhoto = async (orderCode: string, photoId: string, suffix: string) => {
    try {
      const url = await repo.publicPhotoUrl(orderCode, photoId, suffix);
      setSelectedPhotoUrl(url);
    } catch {
      setSelectedPhotoUrl(null);
    }
  };

  const waUrl = settings?.whatsappNumber && order
    ? whatsappLink(
        settings.whatsappNumber,
        (settings.whatsappTemplate || 'Halo CS Soleful Soaks!, tanya pesanan {kode}').replace(
          '{kode}',
          displayCode(order.code)
        )
      )
    : null;

  return (
    <div className="container" style={{ padding: '40px 20px 60px', maxWidth: '800px' }}>
      <div className="section-title">
        <div className="eyebrow">Pelacakan Real-time</div>
        <h2>Cek Status Pesanan Saya</h2>
        <p className="muted">
          Pantau progres pencucian, estimasi selesai, rincian biaya, dan dokumentasi foto sepatu Anda.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '28px' }}>
        <form onSubmit={handleSubmit} className="stack">
          <div className="track-form-grid">
            <div className="track-input-wrap">
              <label className="field">
                <span>Kode Pesanan *</span>
                <input
                  type="text"
                  placeholder="Contoh: SS-7K3QX-9MPRA"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mono"
                  required
                />
              </label>
            </div>
            {settings?.trackingRequirePhoneSuffix && (
              <div className="track-phone-wrap">
                <label className="field">
                  <span>4 Digit Akhir No. WA</span>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="Contoh: 7890"
                    value={phoneSuffix}
                    onChange={(e) => setPhoneSuffix(e.target.value)}
                  />
                </label>
              </div>
            )}
            <div className="track-btn-wrap">
              <button type="submit" className="btn track-submit-btn" disabled={loading}>
                {loading ? 'Mencari...' : 'Lacak'}
              </button>
            </div>
          </div>
        </form>

        {/* Quick Demo Templates */}
        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px dashed var(--line)' }}>
          <div className="small" style={{ fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
            Coba Kode Contoh / Template Demo (Klik untuk langsung melihat tampilannya):
          </div>
          <div className="demo-chips-wrap">
            <button
              type="button"
              className="btn secondary sm demo-chip"
              onClick={() => {
                setCode('SS-7K3QX-9MPRA');
                void doTrack('SS-7K3QX-9MPRA', '');
              }}
            >
              Jordan 1 (SS-7K3QX-9MPRA)
            </button>
            <button
              type="button"
              className="btn secondary sm demo-chip"
              onClick={() => {
                setCode('SS-28YBN-4VCFW');
                void doTrack('SS-28YBN-4VCFW', '');
              }}
            >
              Chuck 70 (SS-28YBN-4VCFW)
            </button>
            <button
              type="button"
              className="btn secondary sm demo-chip"
              onClick={() => {
                setCode('SS-5MDPE-73KZ6');
                void doTrack('SS-5MDPE-73KZ6', '');
              }}
            >
              Tas Kanken (SS-5MDPE-73KZ6)
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="card alert error" style={{ marginBottom: '24px' }}>
          <strong>Gagal Menemukan Pesanan</strong>
          <p style={{ margin: '4px 0 0' }}>{errorMsg}</p>
        </div>
      )}

      {order && (
        <div className="stack" style={{ gap: '24px' }}>
          {/* Main Info Card */}
          <div className="card">
            <div className="order-header-row" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div>
                <span className="badge teal" style={{ fontSize: '0.85rem' }}>
                  {displayCode(order.code)}
                </span>
                <h3 style={{ margin: '8px 0 0', fontSize: '1.4rem' }}>
                  {order.itemType}: {order.brand} {order.model} {order.color ? `(${order.color})` : ''}
                </h3>
                <div className="small muted">Atas Nama: {order.customerDisplayName}</div>
              </div>
              <div className="order-status-badge-wrap">
                <span className="badge ok" style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
                  {STATUS_LABEL[order.status]}
                </span>
              </div>
            </div>

            <div className="grid grid-2" style={{ gap: '16px' }}>
              <div>
                <div className="small muted">Tanggal Diterima:</div>
                <strong>{fmtDateTime(order.receivedAt)}</strong>
              </div>
              <div>
                <div className="small muted">Estimasi Selesai:</div>
                <strong style={{ color: 'var(--primary)' }}>
                  {order.estimatedAt ? fmtDateTime(order.estimatedAt) : 'Sedang dijadwalkan'}
                </strong>
                {order.estimatedEarliestAt && order.estimatedEarliestAt !== order.estimatedAt && (
                  <div className="xs muted">Paling cepat: {fmtDateTime(order.estimatedEarliestAt)}</div>
                )}
              </div>
              {order.completedAt && (
                <div>
                  <div className="small muted">Selesai Aktual:</div>
                  <strong>{fmtDateTime(order.completedAt)}</strong>
                </div>
              )}
              {order.fragranceName && (
                <div>
                  <div className="small muted">Pewangi / Deodorant:</div>
                  <strong>{order.fragranceName}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Progres */}
          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>Riwayat Pengerjaan</h3>
            <ul className="timeline">
              {order.timeline.map((item, idx) => (
                <li key={idx} className="done">
                  <div className="dot">✓</div>
                  <div>
                    <strong>{STATUS_LABEL[item.status]}</strong>
                    <div className="xs muted">{fmtDateTime(item.at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Rincian Layanan & Biaya */}
          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>Rincian Biaya & Pembayaran</h3>

            {order.items && order.items.length > 1 ? (
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '8px', color: '#334155' }}>
                  Rincian {order.items.length} Barang:
                </span>
                <div className="stack" style={{ gap: '10px' }}>
                  {order.items.map((it, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', border: '1px solid var(--line)', borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>Barang {idx + 1}: {it.itemType} {it.brand} {it.model}</strong>
                        {it.color && <span className="badge sm">{it.color}</span>}
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        {it.services.map((s, sIdx) => (
                          <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '2px 0' }}>
                            <span>• {s.name}</span>
                            <strong>{rupiah(s.price)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {order.products.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '6px', color: '#334155' }}>
                      Produk Tambahan:
                    </span>
                    {order.products.map((p, idx) => (
                      <div key={idx} className="price-item">
                        <span>{p.name} (x{p.qty})</span>
                        <span className="price">{rupiah(p.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="price-list" style={{ marginBottom: '16px' }}>
                {order.services.map((s, idx) => (
                  <div key={idx} className="price-item">
                    <span>{s.name}</span>
                    <span className="price">{rupiah(s.price)}</span>
                  </div>
                ))}
                {order.products.map((p, idx) => (
                  <div key={idx} className="price-item">
                    <span>
                      {p.name} (x{p.qty})
                    </span>
                    <span className="price">{rupiah(p.subtotal)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="totals" style={{ borderTop: '2px solid var(--line)', paddingTop: '12px' }}>
              <span>Total Biaya</span>
              <span style={{ color: 'var(--primary)' }}>{rupiah(order.total)}</span>
            </div>

            <div className="row between" style={{ marginTop: '12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
              <div className="small">
                Metode Pembayaran: <strong style={{ textTransform: 'uppercase' }}>{order.paymentMethod}</strong>
              </div>
              <div>
                <span className={`badge ${order.paymentStatus === 'lunas' ? 'ok' : 'warn'}`}>
                  {order.paymentStatus === 'lunas' ? 'Lunas' : 'Belum Lunas'}
                </span>
              </div>
            </div>
          </div>

          {/* Foto Dokumentasi Kolase */}
          {order.photos && order.photos.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '12px' }}>Dokumentasi Foto Pengerjaan (Kolase 2×2)</h3>
              <p className="small muted" style={{ marginBottom: '16px' }}>
                Foto dokumentasi pengerjaan sebelum dan sesudah perawatan. Disimpan otomatis sesuai kebijakan privasi kami.
              </p>
              {selectedPhotoUrl ? (
                <div style={{ textAlign: 'center', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
                  <img
                    src={selectedPhotoUrl}
                    alt="Dokumentasi Kolase"
                    style={{ margin: '0 auto', maxHeight: '550px', width: 'auto' }}
                  />
                </div>
              ) : (
                <div className="empty">Foto dokumentasi telah kedaluwarsa atau belum diunggah.</div>
              )}
            </div>
          )}

          {/* WhatsApp CS Assistance */}
          {waUrl && (
            <div className="card alert info" style={{ textAlign: 'center' }}>
              <h4>Butuh Bantuan atau Pengantaran?</h4>
              <p className="small" style={{ margin: '6px 0 16px' }}>
                Hubungi customer service kami melalui WhatsApp untuk konfirmasi pengambilan atau pertanyaan lainnya.
              </p>
              <a href={waUrl} target="_blank" rel="noreferrer" className="btn wa">
                Hubungi CS via WhatsApp
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
