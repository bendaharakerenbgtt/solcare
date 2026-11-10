import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import type { Order } from '../../data/types';
import { InvoiceModal } from '../common/InvoiceModal';

interface SelectedServiceItem {
  id: string;
  serviceId: string;
  category: string; // 'Sepatu' | 'Tas' | 'Topi' | 'Helm' | 'Perawatan Khusus'
  name: string;
  price: number;
  durationDays: number;
  qty: number;
  notes: string;
}

interface ServiceDef {
  id: string;
  category: string;
  name: string;
  price: number;
  days: number;
  icon: string;
}

const SneakerThumb: React.FC = () => (
  <svg width="34" height="22" viewBox="0 0 100 65" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 52C25 52 75 52 90 52C93 52 95 49 93 46L86 32C84 28 80 25 75 25H55L45 10C42 5 35 5 30 8L15 18C10 22 8 28 8 34V48C8 50.2 8.9 52 10 52Z" fill="#0284c7" />
    <path d="M5 52H95C96.5 52 98 54 98 56C98 58 96.5 60 95 60H5C3.5 60 2 58 2 56C2 54 3.5 52 5 52Z" fill="#e2e8f0" />
    <path d="M8 58H92V61C92 62.5 90.5 64 89 64H11C9.5 64 8 62.5 8 61V58Z" fill="#cbd5e1" />
    <path d="M15 52C12 45 15 35 22 30L32 23C36 20 42 22 44 26L48 35C45 42 35 48 25 52H15Z" fill="#fed7aa" />
    <path d="M40 32L65 42M48 28L73 38" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const SOLECARE_SERVICES: ServiceDef[] = [
  // 1. Sepatu
  { id: 'sc-deep-clean', category: 'Sepatu', name: 'Deep Clean', price: 35000, days: 3, icon: '👟' },
  { id: 'sc-fast-clean', category: 'Sepatu', name: 'Fast Clean', price: 25000, days: 2, icon: '👟' },
  { id: 'sc-leather-suede', category: 'Sepatu', name: 'Leather & Suede Clean', price: 45000, days: 3, icon: '👟' },
  { id: 'sc-white-canvas', category: 'Sepatu', name: 'White Canvas Treatment', price: 50000, days: 3, icon: '👟' },
  { id: 'sc-heavy-clean', category: 'Sepatu', name: 'Heavy Clean (Lumpur/Noda)', price: 65000, days: 4, icon: '👟' },

  // 2. Tas
  { id: 'sc-tas-kecil', category: 'Tas', name: 'Tas Kecil / Slingbag', price: 35000, days: 3, icon: '👜' },
  { id: 'sc-tas-sedang', category: 'Tas', name: 'Tas Sedang / Backpack', price: 50000, days: 3, icon: '🎒' },
  { id: 'sc-tas-kulit', category: 'Tas', name: 'Tas Kulit / Leather Bag', price: 75000, days: 4, icon: '💼' },

  // 3. Topi
  { id: 'sc-topi-snapback', category: 'Topi', name: 'Topi Baseball / Snapback', price: 25000, days: 2, icon: '🧢' },
  { id: 'sc-topi-bucket', category: 'Topi', name: 'Bucket Hat / Fedora', price: 25000, days: 2, icon: '👒' },

  // 4. Helm
  { id: 'sc-helm-half', category: 'Helm', name: 'Helm Half Face', price: 30000, days: 2, icon: '🪖' },
  { id: 'sc-helm-full', category: 'Helm', name: 'Helm Full Face', price: 45000, days: 3, icon: '🪖' },

  // 5. Perawatan Khusus
  { id: 'sc-unyellowing', category: 'Perawatan Khusus', name: 'Unyellowing Midsole', price: 70000, days: 3, icon: '✨' },
  { id: 'sc-reglue', category: 'Perawatan Khusus', name: 'Reglue Sole', price: 30000, days: 2, icon: '🔧' },
  { id: 'sc-repaint', category: 'Perawatan Khusus', name: 'Repaint Upper / Midsole', price: 135000, days: 7, icon: '🎨' },
];

const CATEGORIES = [
  { name: 'Sepatu', sub: 'Cuci • Kering' },
  { name: 'Tas', sub: 'Cuci • Kering' },
  { name: 'Topi', sub: 'Cuci • Kering' },
  { name: 'Helm', sub: 'Cuci • Kering' },
  { name: 'Perawatan Khusus', sub: 'Restorasi & Repaint' },
];

export const OrderFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const customerId = searchParams.get('customerId') || null;
  const initialCustName = searchParams.get('name') || 'ojan';
  const initialCustPhone = searchParams.get('phone') || '+6285972535329';

  const { data: dbServices } = useAsync(() => repo.listServices(false), []);
  const { data: settings } = useAsync(() => repo.getSettings(), []);

  // Screen mode: 'catalog' (Image 1, 3) vs 'confirm' (Image 7)
  const [screenMode, setScreenMode] = useState<'catalog' | 'confirm'>('catalog');

  // Search & expanded category state
  const [search, setSearch] = useState('');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    Sepatu: true,
    Tas: false,
    Topi: false,
    Helm: false,
    'Perawatan Khusus': false,
  });

  // Selected services in basket
  const [selectedItems, setSelectedItems] = useState<SelectedServiceItem[]>([]);

  // Modal 1: Tambah Layanan Satuan (Image 2)
  const [activeModalSvc, setActiveModalSvc] = useState<ServiceDef | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [modalNotes, setModalNotes] = useState('');

  // Confirmation screen options (Image 7)
  const [pickupOption, setPickupOption] = useState<'dropoff' | 'pickup'>('dropoff');
  const [isPriority, setIsPriority] = useState(false);
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [selectedParfum, setSelectedParfum] = useState<string>('Tanpa Parfum');
  const [extraNotes, setExtraNotes] = useState('');

  // Post-submit success modal (Image 5)
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Toggle category accordion
  const toggleCat = (catName: string) => {
    setExpandedCats((prev) => ({ ...prev, [catName]: !prev[catName] }));
  };

  // Open modal Tambah Layanan Satuan (Image 2)
  const handleOpenAddModal = (svc: ServiceDef) => {
    const existing = selectedItems.find((x) => x.serviceId === svc.id);
    setActiveModalSvc(svc);
    setModalQty(existing ? existing.qty : 1);
    setModalNotes(existing ? existing.notes : '');
  };

  // Save from Tambah Layanan Satuan modal into basket
  const handleSaveModalItem = () => {
    if (!activeModalSvc) return;

    if (modalQty <= 0) {
      // Remove if qty is 0
      setSelectedItems((prev) => prev.filter((x) => x.serviceId !== activeModalSvc.id));
    } else {
      setSelectedItems((prev) => {
        const idx = prev.findIndex((x) => x.serviceId === activeModalSvc.id);
        const item: SelectedServiceItem = {
          id: activeModalSvc.id,
          serviceId: activeModalSvc.id,
          category: activeModalSvc.category,
          name: activeModalSvc.name,
          price: activeModalSvc.price,
          durationDays: activeModalSvc.days,
          qty: modalQty,
          notes: modalNotes,
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = item;
          return next;
        }
        return [...prev, item];
      });
    }

    setActiveModalSvc(null);
  };

  // Delete from modal
  const handleDeleteModalItem = () => {
    if (!activeModalSvc) return;
    setSelectedItems((prev) => prev.filter((x) => x.serviceId !== activeModalSvc.id));
    setActiveModalSvc(null);
  };

  // Adjust qty directly from confirmation screen
  const handleUpdateItemQty = (serviceId: string, delta: number) => {
    setSelectedItems((prev) => {
      return prev
        .map((it) => {
          if (it.serviceId === serviceId) {
            const nextQty = it.qty + delta;
            return nextQty > 0 ? { ...it, qty: nextQty } : null;
          }
          return it;
        })
        .filter(Boolean) as SelectedServiceItem[];
    });
  };

  // Total quantity and total amount
  const totalQty = selectedItems.reduce((acc, it) => acc + it.qty, 0);
  const totalAmount = useMemo(() => {
    let sum = selectedItems.reduce((acc, it) => acc + it.price * it.qty, 0);
    if (pickupOption === 'pickup') sum += 15000;
    return sum;
  }, [selectedItems, pickupOption]);

  // Handle final order creation (Image 5)
  const handleCreateTransaction = async () => {
    if (selectedItems.length === 0) {
      alert('Pilih minimal 1 layanan sebelum membuat transaksi');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date();
      // Calculate completion date based on maximum duration
      const maxDays = Math.max(...selectedItems.map((s) => s.durationDays), 2);
      const estDate = new Date(now.getTime() + maxDays * 24 * 3600 * 1000);

      // Map selected items to OrderServiceLine
      const serviceLines = selectedItems.map((s) => {
        const matched = dbServices?.find((db) => db.name.toLowerCase().includes(s.name.toLowerCase()));
        return {
          serviceId: matched?.id || s.serviceId,
          name: `${s.category} ${s.name}`,
          price: s.price * s.qty,
          priceMin: s.price,
          priceMax: null,
          category: s.category === 'Perawatan Khusus' ? ('additional' as const) : ('main' as const),
          workloadWeight: 1,
          durationMinDays: s.durationDays,
          durationMaxDays: s.durationDays,
          expressHours: null,
        };
      });

      const firstItem = selectedItems[0];
      const created = await repo.createOrder({
        customer: {
          id: customerId,
          name: initialCustName,
          phone: initialCustPhone,
        },
        items: selectedItems.map((s, idx) => ({
          id: `item-${idx + 1}`,
          itemType: s.category,
          brand: 'Solecare Customer Item',
          model: s.name,
          color: '',
          conditionNotes: s.notes || extraNotes,
          services: [
            {
              serviceId: s.serviceId,
              name: s.name,
              price: s.price * s.qty,
              priceMin: s.price,
              priceMax: null,
              category: 'main' as const,
              workloadWeight: 1,
              durationMinDays: s.durationDays,
              durationMaxDays: s.durationDays,
              expressHours: null,
            },
          ],
        })),
        itemType: firstItem.category,
        brand: 'Solecare Item',
        model: selectedItems.map((s) => s.name).join(', '),
        color: '',
        conditionNotes: extraNotes || 'Kondisi standar',
        services: serviceLines,
        products: [],
        fragranceId: null,
        receivedAt: now.toISOString(),
        estimate: {
          earliestAt: estDate.toISOString(),
          estimatedAt: estDate.toISOString(),
          source: isPriority ? 'manual' : 'auto',
          autoAt: estDate.toISOString(),
          reason: isPriority ? 'Pesanan Prioritas Pelanggan' : 'Standar pengerjaan',
        },
        payment: {
          method: 'qris',
          status: 'belum_lunas',
          paidAt: null,
          confirmed: false,
        },
        internalNotes: `Parfum: ${selectedParfum} | Layanan: ${pickupOption === 'pickup' ? 'Antar-Jemput' : 'Drop-off'}`,
      });

      setCreatedOrder(created);
      setSuccessModalOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal membuat transaksi');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered catalog services
  const filteredCatalog = useMemo(() => {
    if (!search.trim()) return SOLECARE_SERVICES;
    const q = search.toLowerCase();
    return SOLECARE_SERVICES.filter(
      (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '90px' }}>
      {/* ======================================================== */}
      {/* SCREEN 1: PILIH LAYANAN (Persis Foto Bilas 1, 2, 3)      */}
      {/* ======================================================== */}
      {screenMode === 'catalog' && (
        <div className="stack" style={{ gap: '14px' }}>
          {/* Top Bar: Back & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px' }}>
            <button
              type="button"
              onClick={() => {
                if (customerId) {
                  navigate(`/admin/customers?selectedId=${customerId}`);
                } else {
                  navigate('/admin/orders');
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.4rem',
                color: '#0f172a',
                cursor: 'pointer',
                padding: '0 4px',
                fontWeight: 800,
              }}
            >
              ←
            </button>
            <h1 style={{ margin: 0, fontSize: '1.22rem', fontWeight: 800, color: '#0f172a' }}>
              Pilih Layanan
            </h1>
          </div>

          {/* Search Bar Persis Foto 1 */}
          <div className="order-search-wrap" style={{ margin: 0, borderRadius: '999px', border: '1px solid #cbd5e1' }}>
            <svg className="order-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="order-search-field"
              placeholder="Pencarian"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent' }}
            />
            {search && (
              <button
                type="button"
                className="order-search-clear"
                onClick={() => setSearch('')}
              >
                ×
              </button>
            )}
          </div>

          {/* Category Accordion List Persis Foto 1 */}
          <div className="stack" style={{ gap: '4px' }}>
            {CATEGORIES.map((cat) => {
              const isExpanded = expandedCats[cat.name] || search.trim().length > 0;
              const catServices = filteredCatalog.filter((s) => s.category === cat.name);

              if (search.trim() && catServices.length === 0) return null;

              return (
                <div key={cat.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {/* Category Header Row */}
                  <div
                    onClick={() => toggleCat(cat.name)}
                    style={{
                      padding: '12px 4px 6px',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
                      {cat.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{cat.sub}</div>
                  </div>

                  {/* Expanded Service Items */}
                  {isExpanded && (
                    <div className="stack" style={{ gap: '10px', padding: '10px 0 16px' }}>
                      {catServices.map((svc) => {
                        const existing = selectedItems.find((x) => x.serviceId === svc.id);
                        return (
                          <div
                            key={svc.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 14px',
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '16px',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                            }}
                          >
                            {/* Left: Thumbnail & Details */}
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
                                  fontSize: '1.4rem',
                                  flexShrink: 0,
                                }}
                              >
                                {svc.category === 'Sepatu' ? <SneakerThumb /> : svc.icon}
                              </div>
                              <div>
                                <strong style={{ display: 'block', fontSize: '0.94rem', color: '#0f172a' }}>
                                  {svc.name}
                                </strong>
                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#001b3a', margin: '2px 0' }}>
                                  {svc.price.toLocaleString('id-ID')}
                                </div>
                                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                  {svc.days} Hari • Satuan
                                </span>
                              </div>
                            </div>

                            {/* Right: Tambah Button or Item Count Pill (Persis Foto 1 & 3) */}
                            <div>
                              {existing ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddModal(svc)}
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '50%',
                                      background: '#0284c7',
                                      color: '#ffffff',
                                      border: 'none',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '1.1rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    +
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddModal(svc)}
                                    style={{
                                      background: '#f97316',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '999px',
                                      padding: '6px 14px',
                                      fontSize: '0.8rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {existing.qty} items
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddModal(svc)}
                                  style={{
                                    background: '#0284c7',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '999px',
                                    padding: '7px 18px',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Tambah
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sticky Bottom Bar: Lanjutkan X Layanan (Persis Foto 3) */}
          {totalQty > 0 && (
            <div
              style={{
                position: 'fixed',
                bottom: 'calc(65px + env(safe-area-inset-bottom, 0px))',
                left: 0,
                right: 0,
                padding: '0 16px',
                zIndex: 35,
              }}
            >
              <button
                type="button"
                onClick={() => setScreenMode('confirm')}
                style={{
                  width: '100%',
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '13px',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                  cursor: 'pointer',
                }}
              >
                Lanjutkan {totalQty} Layanan
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: TAMBAH LAYANAN SATUAN (Persis Foto Bilas 2)       */}
      {/* ======================================================== */}
      {activeModalSvc && (
        <div className="modal-backdrop" onClick={() => setActiveModalSvc(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px', borderRadius: '18px', padding: '18px' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
                Tambah Layanan Satuan
              </h3>
              <button
                type="button"
                onClick={() => setActiveModalSvc(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', color: '#f97316', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Service Title & Counter Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.92rem', textTransform: 'uppercase', color: '#0f172a' }}>
                  {activeModalSvc.category} {activeModalSvc.name}
                </strong>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {activeModalSvc.price.toLocaleString('id-ID')}
                </span>
              </div>

              {/* Counter Pill */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  border: '1.5px solid #0284c7',
                  borderRadius: '999px',
                  padding: '2px 10px',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                  style={{ background: 'transparent', border: 'none', color: '#0284c7', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  —
                </button>
                <span style={{ fontWeight: 800, fontSize: '0.92rem', minWidth: '16px', textAlign: 'center' }}>
                  {modalQty}
                </span>
                <button
                  type="button"
                  onClick={() => setModalQty(modalQty + 1)}
                  style={{ background: 'transparent', border: 'none', color: '#0284c7', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Field: Keterangan */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Keterangan
              </label>
              <input
                type="text"
                placeholder="Misalnya : Upper kotor pekat, insole kuning"
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  fontSize: '0.86rem',
                }}
              />
            </div>

            {/* Total Harga */}
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a', marginBottom: '18px' }}>
              Total Harga : {(activeModalSvc.price * modalQty).toLocaleString('id-ID')}
            </div>

            {/* Bottom Actions: Trash & Simpan */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleDeleteModalItem}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#fee2e2',
                  border: 'none',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                title="Hapus Layanan"
              >
                🗑️
              </button>
              <button
                type="button"
                onClick={handleSaveModalItem}
                style={{
                  flex: 1,
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREEN 2: KONFIRMASI PESANAN (Persis Foto Bilas 6, 7)     */}
      {/* ======================================================== */}
      {screenMode === 'confirm' && (
        <div className="stack" style={{ gap: '12px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
            <button
              type="button"
              onClick={() => setScreenMode('catalog')}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.4rem',
                color: '#0f172a',
                cursor: 'pointer',
                padding: '0 4px',
                fontWeight: 800,
              }}
            >
              ←
            </button>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0284c7', letterSpacing: '-0.03em' }}>
              solecare
            </span>
            <div style={{ width: '24px' }} />
          </div>

          <h1 style={{ margin: '0 0 4px', fontSize: '1.18rem', fontWeight: 800, color: '#0f172a' }}>
            Konfirmasi Pesanan
          </h1>

          {/* Customer Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            }}
          >
            <strong style={{ display: 'block', fontSize: '0.98rem', color: '#0f172a' }}>
              {initialCustName}
            </strong>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              {initialCustPhone}
            </span>
          </div>

          {/* 1. Layanan Antar Jemput */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.3rem' }}>🚚</span>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>Layanan Antar Jemput</strong>
              </div>
              <select
                value={pickupOption}
                onChange={(e) => setPickupOption(e.target.value as any)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#334155',
                  width: 'auto',
                }}
              >
                <option value="dropoff">Diantar Sendiri (Drop-off)</option>
                <option value="pickup">Jemput ke Rumah (+Rp 15.000)</option>
              </select>
            </div>
          </div>

          {/* 2. Jadikan Prioritas with toggle switch */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: '#6d28d9',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                }}
              >
                ★
              </span>
              <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>Jadikan Prioritas</strong>
              <button
                type="button"
                onClick={() => setPriorityModalOpen(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  padding: '0 2px',
                }}
              >
                ⓘ
              </button>
            </div>

            {/* Switch Toggle */}
            <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isPriority}
                onChange={(e) => setIsPriority(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: isPriority ? '#0284c7' : '#cbd5e1',
                  borderRadius: '999px',
                  transition: '0.2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: isPriority ? '22px' : '2px',
                    top: '2px',
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                    transition: '0.2s',
                  }}
                />
              </span>
            </label>
          </div>

          {/* 3. Detail Pesanan */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
              Detail Pesanan
            </div>

            <div className="stack" style={{ gap: '10px' }}>
              {selectedItems.map((it) => (
                <div
                  key={it.serviceId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {it.category === 'Sepatu' ? <SneakerThumb /> : <span>📦</span>}
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.9rem', color: '#0f172a' }}>
                        {it.category} {it.name}
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {it.price.toLocaleString('id-ID')} • {it.durationDays} Hari
                      </span>
                    </div>
                  </div>

                  {/* Counter */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '999px', padding: '1px 8px', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleUpdateItemQty(it.serviceId, -1)}
                      style={{ background: 'transparent', border: 'none', color: '#0284c7', fontWeight: 800, cursor: 'pointer' }}
                    >
                      —
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{it.qty}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateItemQty(it.serviceId, 1)}
                      style={{ background: 'transparent', border: 'none', color: '#0284c7', fontWeight: 800, cursor: 'pointer' }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* + Layanan Button */}
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setScreenMode('catalog')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#0284c7',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                + Layanan
              </button>
            </div>
          </div>

          {/* 4. Pilihan Parfum */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              Pilihan Parfum
            </div>

            <div className="stack" style={{ gap: '8px' }}>
              {['Tanpa Parfum', 'Vanilla Sweet Shoes', 'Fresh Apple Mint', 'Bubblegum Fresh'].map((p) => (
                <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="parfum"
                    checked={selectedParfum === p}
                    onChange={() => setSelectedParfum(p)}
                    style={{ accentColor: '#f97316' }}
                  />
                  <span>{p}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 5. Informasi Tambahan */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              Informasi Tambahan
            </div>
            <input
              type="text"
              placeholder="Misalnya : Upper kotor pekat, jangan disikat kawat"
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              style={{
                width: '100%',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '0.85rem',
              }}
            />
          </div>

          {/* 6. Pilih Promo */}
          <div
            onClick={() => alert('Tidak ada voucher promo aktif')}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏷️</span>
              <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Pilih Promo</strong>
            </div>
            <span style={{ color: '#94a3b8' }}>›</span>
          </div>

          {/* 7. Informasi Tagihan */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              Informasi Tagihan
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>TOTAL</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#001b3a' }}>
                {totalAmount.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Sticky Bottom Bar: Total Tagihan & Buat Transaksi (Persis Foto 7) */}
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              padding: '10px 16px max(10px, env(safe-area-inset-bottom, 10px))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
              zIndex: 35,
            }}
          >
            <div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Total Tagihan</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b91c1c' }}>
                {totalAmount.toLocaleString('id-ID')}
              </div>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleCreateTransaction}
              style={{
                background: '#f97316',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 28px',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.35)',
              }}
            >
              {submitting ? 'Memproses...' : 'Buat Transaksi'}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: PESANAN PRIORITAS (Persis Foto Bilas 6)           */}
      {/* ======================================================== */}
      {priorityModalOpen && (
        <div className="modal-backdrop" onClick={() => setPriorityModalOpen(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '360px', borderRadius: '18px', padding: '20px', textAlign: 'center' }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Pesanan Prioritas
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 18px' }}>
              Pesanan prioritas akan diletakkan di daftar teratas antrian agar mendapatkan perhatian khusus dari pegawai
            </p>
            <button
              type="button"
              onClick={() => setPriorityModalOpen(false)}
              style={{
                width: '100%',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '11px',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: TRANSAKSI BERHASIL DISIMPAN (Persis Foto Bilas 5) */}
      {/* ======================================================== */}
      {successModalOpen && createdOrder && (
        <div className="modal-backdrop">
          <div
            className="modal"
            style={{ maxWidth: '420px', borderRadius: '20px', padding: '24px 20px', textAlign: 'center' }}
          >
            {/* Green Checkmark Circle */}
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: '#22c55e',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.2rem',
                margin: '0 auto 16px',
                boxShadow: '0 6px 16px rgba(34, 197, 94, 0.35)',
              }}
            >
              ✓
            </div>

            <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Transaksi berhasil disimpan.
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 20px' }}>
              Pilih aksi selanjutnya!
            </p>

            {/* 3 Action Buttons Persis Foto 5 */}
            <div className="stack" style={{ gap: '10px' }}>
              {/* 1. Lihat Detail Transaksi */}
              <button
                type="button"
                onClick={() => navigate(`/admin/orders/${createdOrder.id}`)}
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '13px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                <span>🔍</span>
                <span>Lihat Detail Transaksi</span>
              </button>

              {/* 2. Lihat / Cetak Nota */}
              <button
                type="button"
                onClick={() => setInvoiceModalOpen(true)}
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '13px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                <span>🖨️</span>
                <span>Lihat / Cetak Nota</span>
              </button>

              {/* 3. Bayar Sekarang */}
              <button
                type="button"
                onClick={async () => {
                  await repo.recordPayment(createdOrder.id, {
                    method: 'qris',
                    status: 'lunas',
                    paidAt: new Date().toISOString(),
                    confirmed: true,
                  });
                  alert('Pembayaran berhasil dicatat LUNAS!');
                  navigate(`/admin/orders/${createdOrder.id}`);
                }}
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '13px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                <span>💳</span>
                <span>Bayar Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Receipt Modal */}
      {invoiceModalOpen && createdOrder && (
        <InvoiceModal
          order={createdOrder}
          settings={settings || null}
          cashierName="Admin Solecare"
          onClose={() => {
            setInvoiceModalOpen(false);
            navigate(`/admin/orders/${createdOrder.id}`);
          }}
        />
      )}
    </div>
  );
};
