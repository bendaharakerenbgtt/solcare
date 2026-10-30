import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAsync, toLocalInput, fromLocalInput } from '../hooks';
import { repo } from '../../data';
import type { OrderServiceLine, OrderProductLine, OrderItem } from '../../data/types';
import type { OrderInput } from '../../data/repo';
import { estimateCompletion, isLate, countOrderItems, getQueueSlaStatus, type WorkLine } from '../../lib/estimation';
import { lineFromService, computeTotal, validateServiceLines } from '../../lib/pricing';
import { rupiah, fmtDateTime } from '../../lib/format';
import { dateKey, isOpenDay, atTime } from '../../lib/dates';
import { getNationalHolidayName } from '../../lib/holidays';

const STANDARD_ITEM_TYPES = ['Sepatu', 'Tas', 'Topi', 'Helm', 'Sandal / Wedges'];

const parseProductDisplay = (p: { name: string; description?: string }) => {
  const name = p.name || '';

  if (name.includes(' - ')) {
    const parts = name.split(' - ');
    const first = parts[0].trim();
    const second = parts.slice(1).join(' - ').trim();

    if (/ml|parfum|botol/i.test(first) && !/ml/i.test(second)) {
      return {
        title: second,
        subtitle: first,
      };
    }
    if (/ml|botol/i.test(second) && !/ml/i.test(first)) {
      return {
        title: first,
        subtitle: second,
      };
    }
    return {
      title: second,
      subtitle: first,
    };
  }

  const mlMatch = name.match(/^(.*?)\s*(\(?\d+\s*ml\)?)(.*)$/i);
  if (mlMatch) {
    const cleanTitle = `${mlMatch[1]} ${mlMatch[3]}`.trim();
    const ml = mlMatch[2].replace(/[()]/g, '').trim();
    return {
      title: cleanTitle || name,
      subtitle: ml,
    };
  }

  return {
    title: name,
    subtitle: p.description || null,
  };
};

export interface FormOrderItem {
  id: string;
  itemTypeSelect: string;
  customItemType: string;
  brand: string;
  model: string;
  color: string;
  conditionNotes: string;
  selectedServices: OrderServiceLine[];
}

const createDefaultItem = (id?: string): FormOrderItem => ({
  id: id || 'item-' + Math.random().toString(36).slice(2, 9),
  itemTypeSelect: 'Sepatu',
  customItemType: '',
  brand: '',
  model: '',
  color: '',
  conditionNotes: '',
  selectedServices: [],
});

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
  const [items, setItems] = useState<FormOrderItem[]>([createDefaultItem('item-1')]);
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
  const [svcCatFilter, setSvcCatFilter] = useState<'all' | 'main' | 'express' | 'additional' | 'other'>('all');

  const allServices = items.flatMap((it) => it.selectedServices);
  const hasExpressSelected = allServices.some((s) => s.category === 'express');

  const nowDate = new Date();
  const otherOrders = (existingOrders || []).filter((o) => o.id !== id);
  const lateOrdersCount = otherOrders.filter((o) => isLate(o, nowDate) && o.status !== 'diambil').length;
  const activeItemsCount = countOrderItems(otherOrders);
  const slaInfo = getQueueSlaStatus(activeItemsCount, lateOrdersCount, settings?.dailyCapacity ?? 8.5);

  const updateItem = (index: number, patch: Partial<FormOrderItem>) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, createDefaultItem()]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toggleItemService = (itemIndex: number, svcId: string) => {
    const s = services?.find((x) => x.id === svcId);
    if (!s) return;
    const currentItem = items[itemIndex];
    const exists = currentItem.selectedServices.find((x) => x.serviceId === svcId);
    let nextServices: OrderServiceLine[];
    if (exists) {
      nextServices = currentItem.selectedServices.filter((x) => x.serviceId !== svcId);
    } else {
      nextServices = [...currentItem.selectedServices, lineFromService(s)];
    }
    updateItem(itemIndex, { selectedServices: nextServices });
  };

  const updateItemServicePrice = (itemIndex: number, svcIndex: number, newPrice: number) => {
    const currentItem = items[itemIndex];
    const nextServices = [...currentItem.selectedServices];
    nextServices[svcIndex] = { ...nextServices[svcIndex], price: newPrice };
    updateItem(itemIndex, { selectedServices: nextServices });
  };

  // Load existing order if edit mode
  useEffect(() => {
    if (isEdit && id) {
      void repo.getOrder(id).then((ord) => {
        if (!ord) return;
        setCustomerName(ord.customerName);
        setCustomerPhone(ord.customerPhone);
        if (ord.items && ord.items.length > 0) {
          setItems(
            ord.items.map((it) => ({
              id: it.id,
              itemTypeSelect: STANDARD_ITEM_TYPES.includes(it.itemType) ? it.itemType : 'Lainnya',
              customItemType: STANDARD_ITEM_TYPES.includes(it.itemType) ? '' : it.itemType,
              brand: it.brand,
              model: it.model,
              color: it.color,
              conditionNotes: it.conditionNotes,
              selectedServices: it.services,
            }))
          );
        } else {
          setItems([
            {
              id: 'item-1',
              itemTypeSelect: STANDARD_ITEM_TYPES.includes(ord.itemType) ? ord.itemType : 'Lainnya',
              customItemType: STANDARD_ITEM_TYPES.includes(ord.itemType) ? '' : ord.itemType,
              brand: ord.brand,
              model: ord.model,
              color: ord.color,
              conditionNotes: ord.conditionNotes,
              selectedServices: ord.services,
            },
          ]);
        }
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
    if (!settings || !allServices.length) {
      setAutoEstimatedAt(null);
      setAutoEarliestAt(null);
      setEstimateWarnings([]);
      setEstimateError(null);
      return;
    }

    const recDate = receivedAt ? new Date(fromLocalInput(receivedAt) || new Date()) : new Date();
    const workLines: WorkLine[] = allServices.map((s) => ({
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
  }, [allServices, settings, receivedAt, existingOrders, id]);

  // Handle product addition & quantity modification
  const getProductQty = (prodId: string) => {
    const item = selectedProducts.find((x) => x.productId === prodId);
    return item ? item.qty : 0;
  };

  const setProductQty = (prodId: string, newQty: number) => {
    const p = productsCatalog?.find((x) => x.id === prodId);
    if (!p) return;

    if (newQty <= 0) {
      setSelectedProducts(selectedProducts.filter((x) => x.productId !== prodId));
    } else {
      const existing = selectedProducts.find((x) => x.productId === prodId);
      if (existing) {
        setSelectedProducts(
          selectedProducts.map((x) =>
            x.productId === prodId ? { ...x, qty: newQty, subtotal: newQty * x.unitPrice } : x
          )
        );
      } else {
        setSelectedProducts([
          ...selectedProducts,
          { productId: p.id, name: p.name, unitPrice: p.price, qty: newQty, subtotal: newQty * p.price },
        ]);
      }
    }
  };

  const currentTotal = computeTotal(allServices, selectedProducts);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Business validation
    if (!items.length) {
      setFormError('Minimal harus ada 1 barang.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.itemTypeSelect === 'Lainnya' && !it.customItemType.trim()) {
        setFormError(`Silakan masukkan nama jenis barang custom untuk Barang ${i + 1}.`);
        return;
      }
      if (it.selectedServices.length === 0) {
        setFormError(`Barang ${i + 1} (${it.brand || it.itemTypeSelect}) belum memiliki layanan treatment yang dipilih.`);
        return;
      }
      const lineVal = validateServiceLines(it.selectedServices, services || []);
      if (lineVal.errors.length) {
        setFormError(`Barang ${i + 1}: ` + lineVal.errors.join(' '));
        return;
      }
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

      const resolvedItems: OrderItem[] = items.map((it) => ({
        id: it.id,
        itemType: it.itemTypeSelect === 'Lainnya' ? it.customItemType.trim() : it.itemTypeSelect,
        brand: it.brand.trim(),
        model: it.model.trim(),
        color: it.color.trim(),
        conditionNotes: it.conditionNotes.trim(),
        services: it.selectedServices,
      }));

      const first = resolvedItems[0];
      const summaryType = resolvedItems.length === 1 ? first.itemType : `${resolvedItems.length} Barang`;
      const summaryBrand = resolvedItems.length === 1 ? first.brand : resolvedItems.map((i) => i.brand).filter(Boolean).join(', ');
      const summaryModel = resolvedItems.length === 1 ? first.model : resolvedItems.map((i) => i.model).filter(Boolean).join(', ');
      const summaryColor = resolvedItems.length === 1 ? first.color : resolvedItems.map((i) => i.color).filter(Boolean).join(', ');
      const summaryNotes = resolvedItems.length === 1
        ? first.conditionNotes
        : resolvedItems.map((it, idx) => `[Barang ${idx + 1} - ${it.itemType} ${it.brand} ${it.model}]: ${it.conditionNotes || '-'}`).join('\n');

      const orderInput: OrderInput = {
        customer: { name: customerName, phone: customerPhone },
        items: resolvedItems,
        itemType: summaryType,
        brand: summaryBrand,
        model: summaryModel,
        color: summaryColor,
        conditionNotes: summaryNotes,
        services: allServices,
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
      <div className="admin-page-header">
        <h1>{isEdit ? 'Edit Data Pesanan' : 'Input Pesanan Baru'}</h1>
        <Link to="/admin/orders" className="admin-back-btn">
          ← Kembali
        </Link>
      </div>

      {formError && (
        <div className="alert error" style={{ marginBottom: '16px' }}>
          {formError}
        </div>
      )}

      {/* Panduan Kapasitas Antrean & Janji Pelanggan Saat Kasir Menerima Sepatu */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: '16px', borderLeft: `4px solid ${slaInfo.color}` }}>
        <div className="row between" style={{ alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div>
            <strong style={{ fontSize: '0.92rem', display: 'block', color: 'var(--ink)' }}>
              Panduan Kasir: Antrean Rak Saat Ini ({slaInfo.activeItemsCount} / {slaInfo.maxWipLimit} sepatu)
            </strong>
            <span className="xs muted">{slaInfo.adviceText}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span
              className="badge"
              style={{
                background: slaInfo.bg,
                color: slaInfo.color,
                border: `1px solid ${slaInfo.border}`,
                fontWeight: 700,
              }}
            >
              Janjikan: {slaInfo.recommendedPromise}
            </span>
            <span
              className="badge"
              style={{
                background: slaInfo.expressAllowed ? '#f0fdf4' : '#fef2f2',
                color: slaInfo.expressAllowed ? '#15803d' : '#bf2f3b',
                border: `1px solid ${slaInfo.expressAllowed ? '#bbf7d0' : '#fecaca'}`,
                fontWeight: 700,
              }}
            >
              {slaInfo.expressAllowed ? 'Express: Aman' : 'Express: Tolak'}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="stack" style={{ gap: '16px' }}>
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

        {/* Items and Services */}
        {items.map((item, itemIdx) => (
          <div key={item.id} className="card" style={{ border: items.length > 1 ? '1.5px solid #cbd5e1' : undefined }}>
            <div className="row between" style={{ alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--line)', paddingBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>
                  {items.length > 1
                    ? `Barang ${itemIdx + 1}${item.brand || item.model ? `: ${item.brand} ${item.model}` : ` (${item.itemTypeSelect})`}`
                    : '2. Barang & Layanan Treatment'}
                </h3>
                {item.selectedServices.length > 0 && (
                  <span className="badge ok" style={{ fontSize: '0.75rem' }}>
                    {item.selectedServices.length} layanan ({rupiah(item.selectedServices.reduce((sum, s) => sum + s.price, 0))})
                  </span>
                )}
              </div>

              {items.length > 1 && (
                <button
                  type="button"
                  className="btn danger sm"
                  onClick={() => removeItem(itemIdx)}
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  Hapus Barang {itemIdx + 1}
                </button>
              )}
            </div>

            {/* Detail Barang */}
            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>
                Jenis Barang *
              </span>
              <div className="item-type-grid">
                {['Sepatu', 'Tas', 'Topi', 'Helm', 'Sandal / Wedges', 'Lainnya'].map((type) => {
                  const isSelected = item.itemTypeSelect === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      className={`item-type-chip ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        updateItem(itemIdx, {
                          itemTypeSelect: type,
                          customItemType: type === 'Lainnya' ? item.customItemType : '',
                        });
                      }}
                    >
                      {isSelected ? '✓ ' : ''}{type === 'Lainnya' ? 'Lainnya (Custom)' : type}
                    </button>
                  );
                })}
              </div>
            </div>

            {item.itemTypeSelect === 'Lainnya' && (
              <div style={{ marginBottom: '14px' }}>
                <label className="field">
                  <span>Nama Jenis Barang (Custom) *</span>
                  <input
                    type="text"
                    placeholder="Contoh: Jaket Kulit, Koper, Stroller, dll."
                    value={item.customItemType}
                    onChange={(e) => updateItem(itemIdx, { customItemType: e.target.value })}
                    required
                  />
                </label>
              </div>
            )}

            <div className="grid grid-3" style={{ marginTop: '12px' }}>
              <label className="field">
                <span>Merek (Brand)</span>
                <input
                  type="text"
                  placeholder="Nike, Adidas, Converse, dll."
                  value={item.brand}
                  onChange={(e) => updateItem(itemIdx, { brand: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Model / Seri</span>
                <input
                  type="text"
                  placeholder="Air Jordan 1, Chuck 70, dll."
                  value={item.model}
                  onChange={(e) => updateItem(itemIdx, { model: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Warna Dominan</span>
                <input
                  type="text"
                  placeholder="Putih / Hitam / Navy"
                  value={item.color}
                  onChange={(e) => updateItem(itemIdx, { color: e.target.value })}
                />
              </label>
            </div>

            <div style={{ marginTop: '12px', marginBottom: '16px' }}>
              <label className="field">
                <span>Catatan Kondisi Barang (Noda / Kerusakan)</span>
                <textarea
                  placeholder="Contoh: Ada noda oli di tumit, midsole menguning, sol kanan terbuka sedikit."
                  value={item.conditionNotes}
                  onChange={(e) => updateItem(itemIdx, { conditionNotes: e.target.value })}
                />
              </label>
            </div>

            {/* Service Selection for this item */}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
              <div className="row between" style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink)' }}>
                  Pilih Layanan untuk {items.length > 1 ? `Barang ${itemIdx + 1}` : 'Barang Ini'} *
                </span>
                <span className="xs muted">Pilih minimal 1 layanan</span>
              </div>

              {/* Filter Kategori Layanan agar mudah dipilih di HP */}
              <div className="services-filter-pills" style={{ marginBottom: '10px' }}>
                <button
                  type="button"
                  className={`activity-filter-btn filter-all ${svcCatFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setSvcCatFilter('all')}
                >
                  Semua ({services?.length || 0})
                </button>
                <button
                  type="button"
                  className={`activity-filter-btn filter-main ${svcCatFilter === 'main' ? 'active' : ''}`}
                  onClick={() => setSvcCatFilter('main')}
                >
                  Main ({services?.filter((s) => s.category === 'main').length || 0})
                </button>
                <button
                  type="button"
                  className={`activity-filter-btn filter-express ${svcCatFilter === 'express' ? 'active' : ''}`}
                  onClick={() => setSvcCatFilter('express')}
                >
                  Express ({services?.filter((s) => s.category === 'express').length || 0})
                </button>
                <button
                  type="button"
                  className={`activity-filter-btn filter-additional ${svcCatFilter === 'additional' ? 'active' : ''}`}
                  onClick={() => setSvcCatFilter('additional')}
                >
                  Additional ({services?.filter((s) => s.category === 'additional').length || 0})
                </button>
                <button
                  type="button"
                  className={`activity-filter-btn filter-other ${svcCatFilter === 'other' ? 'active' : ''}`}
                  onClick={() => setSvcCatFilter('other')}
                >
                  Other ({services?.filter((s) => s.category === 'other').length || 0})
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                {services
                  ?.filter((svc) => svcCatFilter === 'all' || svc.category === svcCatFilter)
                  .map((svc) => {
                    const active = item.selectedServices.some((x) => x.serviceId === svc.id);
                    return (
                      <button
                        type="button"
                        key={svc.id}
                        onClick={() => toggleItemService(itemIdx, svc.id)}
                        className={`btn sm ${active ? '' : 'secondary'}`}
                        style={{ padding: '7px 11px', fontSize: '0.8rem' }}
                      >
                        {active ? '✓ ' : '+ '} {svc.name}
                      </button>
                    );
                  })}
              </div>

              {item.selectedServices.length === 0 ? (
                <div className="empty" style={{ border: '1px dashed var(--line)', borderRadius: '8px', padding: '12px' }}>
                  Belum ada layanan dipilih untuk barang ini. Silakan klik tombol layanan di atas.
                </div>
              ) : (
                <div className="stack" style={{ gap: '8px' }}>
                  <div className="xs muted">
                    Atur harga final yang disepakati jika terdapat tingkat kotoran khusus:
                  </div>
                  {item.selectedServices.map((l, sIdx) => (
                    <div key={sIdx} className="service-line-card">
                      <div className="service-line-info">
                        <strong>{l.name}</strong>
                        <div className="xs muted">
                          Kategori: {l.category} • Beban: {l.workloadWeight} unit
                          {l.priceMax ? ` (Rentang: ${rupiah(l.priceMin)} - ${rupiah(l.priceMax)})` : ''}
                        </div>
                      </div>
                      <div className="service-line-controls">
                        <input
                          type="number"
                          value={l.price}
                          onChange={(e) => updateItemServicePrice(itemIdx, sIdx, Number(e.target.value))}
                          className="service-line-price-input"
                        />
                        <button
                          type="button"
                          className="btn danger sm"
                          onClick={() => {
                            const next = item.selectedServices.filter((_, i) => i !== sIdx);
                            updateItem(itemIdx, { selectedServices: next });
                          }}
                          title="Hapus layanan"
                          style={{ padding: '7px 10px' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add Another Item Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-8px', marginBottom: '8px' }}>
          <button
            type="button"
            className="btn"
            onClick={addItem}
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '12px 20px',
              fontWeight: 700,
              fontSize: '0.88rem',
              background: '#f8fafc',
              border: '2px dashed var(--primary)',
              color: 'var(--primary)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            + Tambah Barang Lagi (Sepatu / Tas Kedua)
          </button>
        </div>

        {/* Fragrance & Products */}
        <div className="card">
          <div className="row between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
            <h3 style={{ margin: 0 }}>3. Aroma Parfum Finishing & Produk Tambahan</h3>
            <span className="badge ok">Gratis Termasuk Cuci</span>
          </div>

          {/* Modern Fragrance Picker Grid */}
          <div style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '8px', color: '#334155' }}>
              Pilihan Aroma Parfum Finishing:
            </span>
            <div className="fragrance-picker-grid">
              <button
                type="button"
                className={`fragrance-card-btn ${!fragranceId ? 'active' : ''}`}
                onClick={() => setFragranceId('')}
              >
                <div className="fragrance-card-header">
                  <span className="fragrance-card-name">Tanpa Parfum</span>
                  {!fragranceId && <span className="fragrance-card-check">Dipilih</span>}
                </div>
                <div className="fragrance-card-desc">Khusus pelanggan sensitif aroma wangi</div>
              </button>

              {fragrances?.map((f) => {
                const isSelected = fragranceId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`fragrance-card-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => setFragranceId(f.id)}
                  >
                    <div className="fragrance-card-header">
                      <span className="fragrance-card-name">{f.name}</span>
                      {isSelected && <span className="fragrance-card-check">Dipilih</span>}
                    </div>
                    <div className="fragrance-card-desc">{f.description || 'Aroma parfum pilihan untuk sepatu'}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Retail Products to Buy (Modern Visual Cards with Stepper, No Dropdown) */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, display: 'block', color: '#1e293b' }}>
                  Beli Produk Tambahan (Opsional)
                </span>
              </div>
              {selectedProducts.length > 0 && (
                <span className="badge ok" style={{ fontSize: '0.75rem' }}>
                  {selectedProducts.reduce((sum, p) => sum + p.qty, 0)} item dipilih (
                  {rupiah(selectedProducts.reduce((sum, p) => sum + p.subtotal, 0))})
                </span>
              )}
            </div>

            <div className="product-compact-list">
              {productsCatalog?.map((p) => {
                const qty = getProductQty(p.id);
                const display = parseProductDisplay(p);
                return (
                  <div key={p.id} className={`product-compact-row ${qty > 0 ? 'selected' : ''}`}>
                    <div className="product-compact-info">
                      <div className="product-compact-title-row">
                        <span className="product-compact-name">{display.title}</span>
                        <span className="product-compact-price">{rupiah(p.price)}</span>
                      </div>
                      {display.subtitle && (
                        <div className="product-compact-sub">
                          <span>{display.subtitle}</span>
                          {p.description && p.description !== display.subtitle && !display.subtitle.includes(p.description) && (
                            <span className="product-compact-desc">• {p.description}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="product-card-action">
                      {qty === 0 ? (
                        <button
                          type="button"
                          className="product-btn-add"
                          onClick={() => setProductQty(p.id, 1)}
                        >
                          + Beli
                        </button>
                      ) : (
                        <div className="product-stepper">
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => setProductQty(p.id, qty - 1)}
                            title="Kurangi"
                          >
                            −
                          </button>
                          <span className="stepper-val">{qty}</span>
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => setProductQty(p.id, qty + 1)}
                            title="Tambah"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Capacity-based Estimation */}
        <div className="card">
          <h3>4. Estimasi Selesai</h3>
          <div className="grid grid-2" style={{ marginTop: '12px' }}>
            <label className="field">
              <span>Tanggal Masuk Pesanan</span>
              <input
                type="datetime-local"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
              />
            </label>
            <div className="field">
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Metode Penentuan Estimasi
              </span>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-btn ${estimateMode === 'auto' ? 'active' : ''}`}
                  onClick={() => setEstimateMode('auto')}
                >
                  Kalkulasi Otomatis
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${estimateMode === 'manual' ? 'active' : ''}`}
                  onClick={() => setEstimateMode('manual')}
                >
                  Penyesuaian Manual
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            {hasExpressSelected && !slaInfo.expressAllowed && (
              <div className="alert error" style={{ marginBottom: '12px' }}>
                <strong>Peringatan Kebijakan Express:</strong> {slaInfo.expressStatusText}. Disarankan menolak layanan Express saat ini agar pesanan reguler tidak terbengkalai.
              </div>
            )}

            {estimateError && (
              <div className="alert error" style={{ marginBottom: '12px' }}>
                {estimateError}
              </div>
            )}

            {estimateWarnings.map((w, idx) => (
              <div key={idx} className="alert warn small" style={{ marginBottom: '8px' }}>
                {w}
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
                    Visual Kalender: Target Selesai
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
                <div className="mini-cal-dow" style={{ color: '#bf2f3b' }}>Min</div>
                <div className="mini-cal-dow">Sen</div>
                <div className="mini-cal-dow">Sel</div>
                <div className="mini-cal-dow">Rab</div>
                <div className="mini-cal-dow">Kam</div>
                <div className="mini-cal-dow">Jum</div>
                <div className="mini-cal-dow">Sab</div>

                {formCalDays.map((d, dIdx) => {
                  const isRec = d.key === recDateKey;
                  const isTarget = d.key === targetDateKey;
                  const isToday = d.key === dateKey(new Date());
                  const open = settings ? isOpenDay(d.key, settings) : true;
                  const isSunday = dIdx % 7 === 0;
                  const holidayName = getNationalHolidayName(d.key);
                  const isRedDate = isSunday || !!holidayName;

                  return (
                    <div
                      key={d.key}
                      onClick={() => handleSelectCalDate(d.key)}
                      className={`mini-cal-day ${!d.inMonth ? 'out' : ''} ${!open ? 'closed' : ''} ${isToday ? 'today' : ''} ${isRec ? 'received-day' : ''} ${isTarget ? 'estimated-day' : ''}`}
                      title={`${d.key}${holidayName ? ` (${holidayName})` : ''} ${isRec ? '(Tanggal Masuk)' : isTarget ? '(Target Selesai)' : ''}`}
                    >
                      <span style={{ color: isRedDate && d.inMonth ? '#bf2f3b' : undefined, fontWeight: isRedDate ? 800 : undefined }}>
                        {d.dayNum}
                      </span>
                      {isRec && <span className="mini-cal-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>Masuk</span>}
                      {isTarget && <span className="mini-cal-badge" style={{ background: '#fee2e2', color: '#bf2f3b' }}>Selesai</span>}
                    </div>
                  );
                })}
              </div>

              <div className="row between small" style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed var(--line)', gap: '8px', flexWrap: 'wrap' }}>
                <div className="row" style={{ gap: '10px' }}>
                  <span className="row" style={{ gap: '4px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#dbeafe', border: '1px solid #93c5fd' }} />
                    <span className="xs">Masuk: {recDateKey || '-'}</span>
                  </span>
                  <span className="row" style={{ gap: '4px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#fee2e2', border: '1px solid #bf2f3b' }} />
                    <span className="xs">Target Selesai: {targetDateKey || '-'}</span>
                  </span>
                </div>
                <span className="xs muted">
                  Kapasitas: {settings?.dailyCapacity ?? 8.5} unit/hari
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment & Confirmation */}
        <div className="card">
          <h3>5. Pembayaran di Tempat & Catatan Internal</h3>
          <div className="totals" style={{ marginBottom: '16px', color: 'var(--primary)' }}>
            <span>Total Tagihan Final:</span>
            <span>{rupiah(currentTotal)}</span>
          </div>

          <div className="grid grid-2">
            <div className="field">
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Metode Pembayaran
              </span>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-btn ${paymentMethod === 'qris' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('qris')}
                >
                  QRIS (Kasir)
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${paymentMethod === 'tunai' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('tunai')}
                >
                  Tunai (Cash)
                </button>
              </div>
            </div>

            <div className="field">
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Status Pembayaran
              </span>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-btn lunas ${paymentStatus === 'lunas' ? 'active' : ''}`}
                  onClick={() => {
                    setPaymentStatus('lunas');
                    setPaymentConfirmed(true);
                  }}
                >
                  Lunas
                </button>
                <button
                  type="button"
                  className={`segmented-btn belum-lunas ${paymentStatus === 'belum_lunas' ? 'active' : ''}`}
                  onClick={() => {
                    setPaymentStatus('belum_lunas');
                    setPaymentConfirmed(false);
                  }}
                >
                  Belum Lunas
                </button>
              </div>
            </div>
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
        <div className="form-submit-bar">
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
