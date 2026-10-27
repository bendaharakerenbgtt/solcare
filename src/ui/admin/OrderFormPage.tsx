import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAsync, toLocalInput, fromLocalInput } from '../hooks';
import { repo } from '../../data';
import type { OrderServiceLine, OrderProductLine } from '../../data/types';
import type { OrderInput } from '../../data/repo';
import { estimateCompletion, type WorkLine } from '../../lib/estimation';
import { lineFromService, computeTotal, validateServiceLines } from '../../lib/pricing';
import { rupiah, fmtDateTime } from '../../lib/format';
import { dateKey, isOpenDay, atTime } from '../../lib/dates';

export const OrderFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: services } = useAsync(() => repo.listServices(false), []);
  const { data: productsCatalog } = useAsync(() => repo.listProducts(false), []);
  const { data: fragrances } = useAsync(() => repo.listFragrances(false), []);
  const { data: settings } = useAsync(() => repo.getSettings(), []);
  const { data: existingOrders } = useAsync(() => repo.listOrders(), []);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [itemType, setItemType] = useState('Sepatu');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [conditionNotes, setConditionNotes] = useState('');
  const [selectedServices, setSelectedServices] = useState<OrderServiceLine[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<OrderProductLine[]>([]);
  const [fragranceId, setFragranceId] = useState<string>('');
  const [receivedAt, setReceivedAt] = useState<string>(toLocalInput(new Date().toISOString()));

  // Estimate state
  const [estimateMode, setEstimateMode] = useState<'auto' | 'manual'>('auto');
  const [autoEstimatedAt, setAutoEstimatedAt] = useState<string | null>(null);
  const [autoEarliestAt, setAutoEarliestAt] = useState<string | null>(null);
  const [manualEstimatedAt, setManualEstimatedAt] = useState<string>('');
  const [manualReason, setManualReason] = useState<string>('');
  const [estimateWarnings, setEstimateWarnings] = useState<string[]>([]);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [formCalMonth, setFormCalMonth] = useState(() => new Date());

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'tunai' | 'qris'>('qris');
  const [paymentStatus, setPaymentStatus] = useState<'lunas' | 'belum_lunas'>('lunas');
  const [paymentConfirmed, setPaymentConfirmed] = useState<boolean>(true);
  const [internalNotes, setInternalNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load existing order if edit mode
  useEffect(() => {
    if (isEdit && id) {
      void repo.getOrder(id).then((ord) => {
        if (!ord) return;
        setCustomerName(ord.customerName);
        setCustomerPhone(ord.customerPhone);
        setItemType(ord.itemType);
        setBrand(ord.brand);
        setModel(ord.model);
        setColor(ord.color);
        setConditionNotes(ord.conditionNotes);
        setSelectedServices(ord.services);
        setSelectedProducts(ord.products);
        setFragranceId(ord.fragranceId || '');
        setReceivedAt(toLocalInput(ord.receivedAt));
        setEstimateMode(ord.estimateSource);
        if (ord.estimatedAt) {
          setManualEstimatedAt(toLocalInput(ord.estimatedAt));
        }
        setPaymentMethod(ord.payment.method);
        setPaymentStatus(ord.payment.status);
        setPaymentConfirmed(ord.payment.status === 'lunas');
        setInternalNotes(ord.internalNotes);
      });
    }
  }, [isEdit, id]);

  // Recalculate automatic completion estimate
  useEffect(() => {
    if (!settings || !selectedServices.length) {
      setAutoEstimatedAt(null);
      setAutoEarliestAt(null);
      setEstimateWarnings([]);
      setEstimateError(null);
      return;
    }

    const recDate = receivedAt ? new Date(fromLocalInput(receivedAt) || new Date()) : new Date();
    const workLines: WorkLine[] = selectedServices.map((s) => ({
      category: s.category,
      workloadWeight: s.workloadWeight,
      durationMinDays: s.durationMinDays,
      durationMaxDays: s.durationMaxDays,
      expressHours: s.expressHours,
    }));

    const queueOrders = (existingOrders || []).map((o) => ({
      id: o.id,
      receivedAt: o.receivedAt,
      status: o.status,
      services: o.services,
    }));

    const est = estimateCompletion(workLines, queueOrders, settings, recDate, id);
    if (est.ok) {
      setAutoEstimatedAt(est.estimatedAt);
      setAutoEarliestAt(est.earliestAt);
      setEstimateWarnings(est.warnings);
      setEstimateError(null);
    } else {
      setAutoEstimatedAt(null);
      setAutoEarliestAt(null);
      setEstimateError(est.reason);
      setEstimateWarnings(est.warnings);
    }
  }, [selectedServices, settings, receivedAt, existingOrders, id]);

  // Handle service selection
  const toggleService = (svcId: string) => {
    const s = services?.find((x) => x.id === svcId);
    if (!s) return;
    const exists = selectedServices.find((x) => x.serviceId === svcId);
    if (exists) {
      setSelectedServices(selectedServices.filter((x) => x.serviceId !== svcId));
    } else {
      setSelectedServices([...selectedServices, lineFromService(s)]);
    }
  };

  const updateServicePrice = (index: number, newPrice: number) => {
    const next = [...selectedServices];
    next[index] = { ...next[index], price: newPrice };
    setSelectedServices(next);
  };

  // Handle product addition
  const addProduct = (prodId: string) => {
    const p = productsCatalog?.find((x) => x.id === prodId);
    if (!p) return;
    const existing = selectedProducts.find((x) => x.productId === prodId);
    if (existing) {
      setSelectedProducts(
        selectedProducts.map((x) => (x.productId === prodId ? { ...x, qty: x.qty + 1, subtotal: (x.qty + 1) * x.unitPrice } : x))
      );
    } else {
      setSelectedProducts([
        ...selectedProducts,
        { productId: p.id, name: p.name, unitPrice: p.price, qty: 1, subtotal: p.price },
      ]);
    }
  };

  const updateProductQty = (index: number, qty: number) => {
    if (qty <= 0) {
      setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
    } else {
      const next = [...selectedProducts];
      next[index] = { ...next[index], qty, subtotal: qty * next[index].unitPrice };
      setSelectedProducts(next);
    }
  };

  const currentTotal = computeTotal(selectedServices, selectedProducts);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Business validation
    const lineValidation = validateServiceLines(selectedServices, services || []);
    if (lineValidation.errors.length) {
      setFormError(lineValidation.errors.join(' '));
      return;
    }

    if (estimateMode === 'manual' && !manualEstimatedAt) {
      setFormError('Tanggal estimasi manual wajib diisi.');
      return;
    }

    if (estimateMode === 'auto' && !autoEstimatedAt) {
      setFormError('Estimasi otomatis tidak dapat dihitung karena antrean penuh atau kalender tutup. Harap gunakan penyesuaian manual.');
      return;
    }

    setSaving(true);
    try {
      const targetEstimate =
        estimateMode === 'manual'
          ? fromLocalInput(manualEstimatedAt)
          : autoEstimatedAt;

      const orderInput: OrderInput = {
        customer: { name: customerName, phone: customerPhone },
        itemType,
        brand,
        model,
        color,
        conditionNotes,
        services: selectedServices,
        products: selectedProducts,
        fragranceId: fragranceId || null,
        receivedAt: fromLocalInput(receivedAt) || new Date().toISOString(),
        estimate: {
          earliestAt: estimateMode === 'manual' ? null : autoEarliestAt,
          estimatedAt: targetEstimate,
          source: estimateMode,
          autoAt: autoEstimatedAt,
          reason: manualReason,
        },
        payment: {
          method: paymentMethod,
          status: paymentStatus,
          paidAt: paymentStatus === 'lunas' ? new Date().toISOString() : null,
          confirmed: paymentConfirmed,
        },
        internalNotes,
      };

      if (isEdit && id) {
        await repo.updateOrder(id, orderInput);
        navigate(`/admin/orders/${id}`);
      } else {
        const created = await repo.createOrder(orderInput);
        navigate(`/admin/orders/${created.id}`);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan pesanan.');
    } finally {
      setSaving(false);
    }
  };

  const currentTargetEstimate =
    estimateMode === 'manual'
      ? fromLocalInput(manualEstimatedAt)
      : autoEstimatedAt;

  const fYear = formCalMonth.getFullYear();
  const fMonth = formCalMonth.getMonth();
  const fFirstDayIdx = new Date(fYear, fMonth, 1).getDay();
  const fTotalDays = new Date(fYear, fMonth + 1, 0).getDate();

  const formCalDays: { key: string; dayNum: number; inMonth: boolean }[] = [];
  const fPrevMonthTotal = new Date(fYear, fMonth, 0).getDate();
  for (let i = fFirstDayIdx - 1; i >= 0; i--) {
    const dNum = fPrevMonthTotal - i;
    const prevD = new Date(fYear, fMonth - 1, dNum);
    formCalDays.push({ key: dateKey(prevD), dayNum: dNum, inMonth: false });
  }
  for (let i = 1; i <= fTotalDays; i++) {
    const curD = new Date(fYear, fMonth, i);
    formCalDays.push({ key: dateKey(curD), dayNum: i, inMonth: true });
  }
  let fNextPad = 1;
  while (formCalDays.length % 7 !== 0) {
    const nextD = new Date(fYear, fMonth + 1, fNextPad);
    formCalDays.push({ key: dateKey(nextD), dayNum: fNextPad, inMonth: false });
    fNextPad++;
  }

  const recDateKey = receivedAt ? dateKey(new Date(fromLocalInput(receivedAt) || new Date())) : '';
  const targetDateKey = currentTargetEstimate ? dateKey(new Date(currentTargetEstimate)) : '';

  const handleSelectCalDate = (k: string) => {
    const targetDt = atTime(k, settings?.closeTime || '18:00');
    setManualEstimatedAt(toLocalInput(targetDt.toISOString()));
    setEstimateMode('manual');
    if (!manualReason) {
      setManualReason('Dipilih dari kalender visual estimasi');
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="admin-top">
        <div>
          <h1>{isEdit ? 'Edit Data Pesanan' : 'Input Pesanan Baru'}</h1>
          <p className="small muted">
            Pencatatan langsung di toko. Pelanggan membayar penuh di tempat.
          </p>
        </div>
      </div>

      {formError && (
        <div className="alert error" style={{ marginBottom: '16px' }}>
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="stack" style={{ gap: '24px' }}>
        {/* Customer Data */}
        <div className="card">
          <h3>1. Data Pelanggan</h3>
          <div className="grid grid-2" style={{ marginTop: '12px' }}>
            <label className="field">
              <span>Nama Pelanggan *</span>
              <input
                type="text"
                placeholder="Contoh: Budi Pratama"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>No. WhatsApp *</span>
              <input
                type="tel"
                placeholder="081234567890"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
              />
            </label>
          </div>
        </div>

        {/* Item Data */}
        <div className="card">
          <h3>2. Barang yang Diterima</h3>
          <div className="grid grid-2" style={{ marginTop: '12px' }}>
            <label className="field">
              <span>Jenis Barang *</span>
              <select value={itemType} onChange={(e) => setItemType(e.target.value)}>
                <option value="Sepatu">Sepatu</option>
                <option value="Tas">Tas</option>
                <option value="Topi">Topi</option>
                <option value="Helm">Helm</option>
                <option value="Sandal / Wedges">Sandal / Wedges</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </label>
            <label className="field">
              <span>Merek (Brand)</span>
              <input
                type="text"
                placeholder="Nike, Adidas, Converse, dll."
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Model / Seri</span>
              <input
                type="text"
                placeholder="Air Jordan 1, Chuck 70, dll."
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Warna Dominan</span>
              <input
                type="text"
                placeholder="Putih / Hitam / Navy"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
          </div>
          <div style={{ marginTop: '12px' }}>
            <label className="field">
              <span>Catatan Kondisi Barang (Noda / Kerusakan)</span>
              <textarea
                placeholder="Contoh: Ada noda oli di bagian tumit, midsole menguning, sol kanan terbuka sedikit."
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* Services & Pricing Snapshot */}
        <div className="card">
          <div className="row between" style={{ marginBottom: '12px' }}>
            <h3>3. Layanan & Penentuan Harga Final</h3>
            <span className="small muted">Pilih minimal 1 layanan</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {services?.map((svc) => {
              const active = selectedServices.some((x) => x.serviceId === svc.id);
              return (
                <button
                  type="button"
                  key={svc.id}
                  onClick={() => toggleService(svc.id)}
                  className={`btn sm ${active ? '' : 'secondary'}`}
                >
                  {active ? '✓ ' : '+ '} {svc.name}
                </button>
              );
            })}
          </div>

          {selectedServices.length === 0 ? (
            <div className="empty" style={{ border: '1px dashed var(--line)', borderRadius: '8px' }}>
              Belum ada layanan dipilih. Silakan klik tombol layanan di atas.
            </div>
          ) : (
            <div className="stack" style={{ gap: '8px' }}>
              <div className="small muted" style={{ marginBottom: '4px' }}>
                Atur harga final yang disepakati (misal untuk layanan dengan rentang harga atau tingkat kotoran):
              </div>
              {selectedServices.map((l, idx) => (
                <div key={idx} className="line-row">
                  <div>
                    <strong>{l.name}</strong>
                    <div className="xs muted">
                      Kategori: {l.category} • Beban: {l.workloadWeight} unit
                      {l.priceMax ? ` (Rentang: ${rupiah(l.priceMin)} - ${rupiah(l.priceMax)})` : ''}
                    </div>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={l.price}
                      onChange={(e) => updateServicePrice(idx, Number(e.target.value))}
                      style={{ textAlign: 'right' }}
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      className="btn danger sm"
                      onClick={() => setSelectedServices(selectedServices.filter((_, i) => i !== idx))}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Products & Fragrance */}
        <div className="card">
          <h3>4. Produk Tambahan & Pewangi</h3>
          <div className="grid grid-2" style={{ marginTop: '12px', marginBottom: '16px' }}>
            <label className="field">
              <span>Pilihan Pewangi / Deodorant</span>
              <select value={fragranceId} onChange={(e) => setFragranceId(e.target.value)}>
                <option value="">-- Tanpa Pewangi Khusus --</option>
                {fragrances?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Tambah Produk (Tali, Parfum, dll.)</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addProduct(e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">+ Pilih Produk untuk Ditambahkan</option>
                {productsCatalog?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({rupiah(p.price)})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedProducts.length > 0 && (
            <div className="stack" style={{ gap: '8px' }}>
              {selectedProducts.map((p, idx) => (
                <div key={idx} className="line-row prod">
                  <strong>{p.name}</strong>
                  <div className="small">{rupiah(p.unitPrice)}</div>
                  <input
                    type="number"
                    min={1}
                    value={p.qty}
                    onChange={(e) => updateProductQty(idx, Number(e.target.value))}
                  />
                  <div className="small right"><strong>{rupiah(p.subtotal)}</strong></div>
                  <button
                    type="button"
                    className="btn danger sm"
                    onClick={() => updateProductQty(idx, 0)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Capacity-based Estimation */}
        <div className="card">
          <h3>5. Estimasi Selesai (Kapasitas & Beban Kerja)</h3>
          <div className="grid grid-2" style={{ marginTop: '12px' }}>
            <label className="field">
              <span>Tanggal Masuk Pesanan</span>
              <input
                type="datetime-local"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Metode Penentuan Estimasi</span>
              <select
                value={estimateMode}
                onChange={(e) => setEstimateMode(e.target.value as 'auto' | 'manual')}
              >
                <option value="auto">Kalkulasi Otomatis (Antrean & Beban)</option>
                <option value="manual">Penyesuaian Manual Pegawai</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: '16px' }}>
            {estimateError && (
              <div className="alert error" style={{ marginBottom: '12px' }}>
                ⚠️ {estimateError}
              </div>
            )}

            {estimateWarnings.map((w, idx) => (
              <div key={idx} className="alert warn small" style={{ marginBottom: '8px' }}>
                ℹ️ {w}
              </div>
            ))}

            {estimateMode === 'auto' ? (
              <div className="alert info">
                <div>Estimasi Otomatis Berdasarkan Antrean:</div>
                <strong style={{ fontSize: '1.1rem' }}>
                  {autoEstimatedAt ? fmtDateTime(autoEstimatedAt) : 'Belum dapat dihitung'}
                </strong>
                {autoEarliestAt && autoEarliestAt !== autoEstimatedAt && (
                  <div className="xs muted">Rentang pengerjaan paling awal: {fmtDateTime(autoEarliestAt)}</div>
                )}
              </div>
            ) : (
              <div className="stack" style={{ gap: '12px' }}>
                <label className="field">
                  <span>Target Tanggal & Jam Selesai Manual *</span>
                  <input
                    type="datetime-local"
                    value={manualEstimatedAt}
                    onChange={(e) => setManualEstimatedAt(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Alasan Penyesuaian Manual</span>
                  <input
                    type="text"
                    placeholder="Contoh: Sepatu sangat kotor butuh double wash / permintaan khusus pelanggan"
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                  />
                </label>
              </div>
            )}

            {/* Visual Mini Calendar for Delivery Estimation */}
            <div className="mini-cal-card" style={{ marginTop: '16px', border: '1px solid var(--line)' }}>
              <div className="mini-cal-header">
                <div>
                  <strong style={{ fontSize: '0.92rem' }}>
                    📅 Visual Kalender: Target Selesai
                  </strong>
                  <div className="xs muted">
                    Klik tanggal pada kalender untuk menetapkan target selesai secara manual
                  </div>
                </div>
                <div className="mini-cal-nav row" style={{ gap: '6px' }}>
                  <button
                    type="button"
                    className="btn secondary sm"
                    style={{ padding: '3px 8px' }}
                    onClick={() => setFormCalMonth(new Date(formCalMonth.getFullYear(), formCalMonth.getMonth() - 1, 1))}
                  >
                    ←
                  </button>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', minWidth: '90px', textAlign: 'center' }}>
                    {formCalMonth.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    className="btn secondary sm"
                    style={{ padding: '3px 8px' }}
                    onClick={() => setFormCalMonth(new Date(formCalMonth.getFullYear(), formCalMonth.getMonth() + 1, 1))}
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="mini-cal-grid">
                <div className="mini-cal-dow">Min</div>
                <div className="mini-cal-dow">Sen</div>
                <div className="mini-cal-dow">Sel</div>
                <div className="mini-cal-dow">Rab</div>
                <div className="mini-cal-dow">Kam</div>
                <div className="mini-cal-dow">Jum</div>
                <div className="mini-cal-dow">Sab</div>

                {formCalDays.map((d) => {
                  const isRec = d.key === recDateKey;
                  const isTarget = d.key === targetDateKey;
                  const isToday = d.key === dateKey(new Date());
                  const open = settings ? isOpenDay(d.key, settings) : true;

                  return (
                    <div
                      key={d.key}
                      onClick={() => handleSelectCalDate(d.key)}
                      className={`mini-cal-day ${!d.inMonth ? 'out' : ''} ${!open ? 'closed' : ''} ${isToday ? 'today' : ''} ${isRec ? 'received-day' : ''} ${isTarget ? 'estimated-day' : ''}`}
                      title={`${d.key} ${isRec ? '(Tanggal Masuk)' : isTarget ? '(Target Selesai)' : ''}`}
                    >
                      <span>{d.dayNum}</span>
                      {isRec && <span className="mini-cal-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>Masuk</span>}
                      {isTarget && <span className="mini-cal-badge" style={{ background: '#ccfbf1', color: '#0f766e' }}>Selesai</span>}
                    </div>
                  );
                })}
              </div>

              <div className="row between small" style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed var(--line)', gap: '8px', flexWrap: 'wrap' }}>
                <div className="row" style={{ gap: '10px' }}>
                  <span className="row" style={{ gap: '4px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#dbeafe', border: '1px solid #93c5fd' }} />
                    <span className="xs">📥 Masuk ({recDateKey || '-'})</span>
                  </span>
                  <span className="row" style={{ gap: '4px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#ccfbf1', border: '1px solid #14b8a6' }} />
                    <span className="xs">✨ Target Selesai ({targetDateKey || '-'})</span>
                  </span>
                </div>
                <span className="xs muted">
                  Kapasitas: {settings?.dailyCapacity || 20} unit/hari
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment & Confirmation */}
        <div className="card">
          <h3>6. Pembayaran di Tempat & Catatan Internal</h3>
          <div className="totals" style={{ marginBottom: '16px', color: 'var(--primary)' }}>
            <span>Total Tagihan Final:</span>
            <span>{rupiah(currentTotal)}</span>
          </div>

          <div className="grid grid-2">
            <label className="field">
              <span>Metode Pembayaran</span>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'tunai' | 'qris')}
              >
                <option value="qris">QRIS (Langsung di Kasir)</option>
                <option value="tunai">Tunai (Cash)</option>
              </select>
            </label>
            <label className="field">
              <span>Status Pembayaran</span>
              <select
                value={paymentStatus}
                onChange={(e) => {
                  const val = e.target.value as 'lunas' | 'belum_lunas';
                  setPaymentStatus(val);
                  setPaymentConfirmed(val === 'lunas');
                }}
              >
                <option value="lunas">Lunas (Default saat drop-off)</option>
                <option value="belum_lunas">Belum Lunas (Koreksi Administrasi)</option>
              </select>
            </label>
          </div>

          {paymentStatus === 'lunas' && (
            <div style={{ marginTop: '14px' }}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={paymentConfirmed}
                  onChange={(e) => setPaymentConfirmed(e.target.checked)}
                  required
                />
                <span>
                  <strong>Konfirmasi Pegawai:</strong> Saya mengonfirmasi bahwa pelanggan telah membayar penuh sebesar {rupiah(currentTotal)} via {paymentMethod.toUpperCase()}.
                </span>
              </label>
            </div>
          )}

          <div style={{ marginTop: '16px' }}>
            <label className="field">
              <span>Catatan Khusus Internal (Hanya dilihat oleh pegawai)</span>
              <textarea
                placeholder="Catatan pengerjaan tim teknis, nomor rak penyimpanan, dll."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="row" style={{ justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            className="btn secondary"
            onClick={() => navigate('/admin/orders')}
          >
            Batal
          </button>
          <button type="submit" className="btn lg" disabled={saving}>
            {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Catat & Cetak Nota'}
          </button>
        </div>
      </form>
    </div>
  );
};
