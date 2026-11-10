import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { SEED_SERVICES } from '../../data/seed';
import type { Order, ServiceCategory } from '../../data/types';
import { InvoiceModal } from '../common/InvoiceModal';
import {
  TruckIcon,
  StarIcon,
  TagIcon,
  TrashIcon,
  SearchIcon,
  PrinterIcon,
  CreditCardIcon,
  CheckIcon,
  CloseIcon,
  PlusIcon,
  MinusIcon,
  SneakerIllustration,
  BagIllustration,
  CapIllustration,
  HelmetIllustration,
  SparklesIllustration,
  ChevronRightIcon,
} from '../common/Icons';

interface SelectedServiceItem {
  id: string;
  serviceId: string;
  category: string; // 'Main Services' | 'Express Services' | 'Additional Services' | 'Other Services'
  rawCategory: ServiceCategory;
  name: string;
  price: number;
  durationDays: number;
  expressHours?: number | null;
  qty: number;
  notes: string;
}

interface ServiceDef {
  id: string;
  category: string;
  rawCategory: ServiceCategory;
  name: string;
  price: number;
  priceMax?: number | null;
  days: number;
  daysMax?: number;
  expressHours?: number | null;
  description?: string;
}

const CAT_MAP: Record<ServiceCategory, string> = {
  main: 'Main Services',
  express: 'Express Services',
  additional: 'Additional Services',
  other: 'Other Services',
};

const CATEGORIES = [
  { name: 'Main Services', sub: 'Basic Clean • Deep Clean • Heavy Clean • Premium' },
  { name: 'Express Services', sub: 'Express 24 Hours (+20K) • Express 48 Hours (+10K)' },
  { name: 'Additional Services', sub: 'Unyellowing • Reglue • Water Repellent • Anti Stain • Repaint' },
  { name: 'Other Services', sub: 'Kids Shoes • Sandals/Wedges • Hat • Helmet • Bag' },
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
    'Main Services': true,
    'Express Services': false,
    'Additional Services': false,
    'Other Services': false,
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
          rawCategory: activeModalSvc.rawCategory,
          name: activeModalSvc.name,
          price: activeModalSvc.price,
          durationDays: activeModalSvc.days,
          expressHours: activeModalSvc.expressHours,
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
        const matched = dbServices?.find((db) => db.id === s.serviceId || db.name.toLowerCase() === s.name.toLowerCase());
        return {
          serviceId: matched?.id || s.serviceId,
          name: s.name,
          price: s.price * s.qty,
          priceMin: s.price,
          priceMax: matched?.priceMax ?? null,
          category: s.rawCategory,
          workloadWeight: matched?.workloadWeight ?? 1,
          durationMinDays: s.durationDays,
          durationMaxDays: matched?.durationMaxDays ?? s.durationDays,
          expressHours: s.expressHours ?? null,
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
              category: s.rawCategory,
              workloadWeight: 1,
              durationMinDays: s.durationDays,
              durationMaxDays: s.durationDays,
              expressHours: s.expressHours ?? null,
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

  // Dynamic catalog synchronized with ServicesAdminPage (dbServices) & SEED_SERVICES fallback
  const catalogServices = useMemo<ServiceDef[]>(() => {
    const source = dbServices && dbServices.length > 0 ? dbServices : SEED_SERVICES;
    return source.map((s, idx) => ({
      id: 'id' in s && typeof s.id === 'string' ? s.id : `seed-${idx}`,
      category: CAT_MAP[s.category] || 'Main Services',
      rawCategory: s.category,
      name: s.name,
      price: s.priceMin,
      priceMax: s.priceMax,
      days: s.durationMinDays || 2,
      daysMax: s.durationMaxDays || s.durationMinDays || 2,
      expressHours: s.expressHours,
      description: s.description,
    }));
  }, [dbServices]);

  // Filtered catalog services
  const filteredCatalog = useMemo(() => {
    if (!search.trim()) return catalogServices;
    const q = search.toLowerCase();
    return catalogServices.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [search, catalogServices]);

  const renderCategoryIcon = (catName: string, svcName?: string) => {
    const lower = (svcName || '').toLowerCase();
    if (lower.includes('bag') || lower.includes('tas')) {
      return <BagIllustration size={22} color="#001b3a" />;
    }
    if (lower.includes('hat') || lower.includes('topi')) {
      return <CapIllustration size={22} color="#001b3a" />;
    }
    if (lower.includes('helmet') || lower.includes('helm')) {
      return <HelmetIllustration size={22} color="#001b3a" />;
    }
    if (catName === 'Express Services' || catName === 'Additional Services') {
      return <SparklesIllustration size={22} color="#bf2f3b" />;
    }
    return <SneakerIllustration width={38} height={24} />;
  };

  const formatSvcPrice = (svc: ServiceDef) => {
    const prefix = svc.rawCategory === 'express' ? '+' : '';
    if (svc.priceMax && svc.priceMax > svc.price) {
      return `${prefix}${svc.price.toLocaleString('id-ID')} - ${svc.priceMax.toLocaleString('id-ID')}`;
    }
    return `${prefix}${svc.price.toLocaleString('id-ID')}`;
  };

  const formatSvcDuration = (svc: ServiceDef) => {
    if (svc.expressHours) {
      return `${svc.expressHours} Jam • Express`;
    }
    if (svc.daysMax && svc.daysMax > svc.days) {
      return `${svc.days}–${svc.daysMax} Hari • Satuan`;
    }
    return `${svc.days} Hari • Satuan`;
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh', padding: '12px 16px 130px' }}>
      {/* ======================================================== */}
      {/* SCREEN 1: PILIH LAYANAN (Persis Foto Bilas 1, 2, 3)      */}
      {/* ======================================================== */}
      {screenMode === 'catalog' && (
        <div className="stack" style={{ gap: '14px' }}>
          {/* Top Bar: Back & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
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
            <h1 style={{ margin: 0, fontSize: '1.24rem', fontWeight: 800, color: '#0f172a' }}>
              Pilih Layanan
            </h1>
          </div>

          {/* Search Bar Persis Foto 1 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#ffffff',
              borderRadius: '999px',
              border: '1px solid #cbd5e1',
              padding: '8px 16px',
            }}
          >
            <SearchIcon size={18} color="#94a3b8" />
            <input
              type="text"
              placeholder="Pencarian"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                <CloseIcon size={16} />
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
                                  flexShrink: 0,
                                }}
                              >
                                {renderCategoryIcon(svc.category, svc.name)}
                              </div>
                              <div>
                                <strong style={{ display: 'block', fontSize: '0.94rem', color: '#0f172a' }}>
                                  {svc.name}
                                </strong>
                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#001b3a', margin: '2px 0' }}>
                                  {formatSvcPrice(svc)}
                                </div>
                                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                  {formatSvcDuration(svc)}
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
                                      background: '#001b3a',
                                      color: '#ffffff',
                                      border: 'none',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <PlusIcon size={14} color="#ffffff" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddModal(svc)}
                                    style={{
                                      background: '#bf2f3b',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '999px',
                                      padding: '6px 14px',
                                      fontSize: '0.8rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 8px rgba(191, 47, 59, 0.25)',
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
                                    background: '#001b3a',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '999px',
                                    padding: '7px 18px',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(0, 27, 58, 0.2)',
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
                bottom: 0,
                left: 0,
                right: 0,
                padding: '12px 16px max(12px, env(safe-area-inset-bottom, 12px))',
                background: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
                zIndex: 100,
                maxWidth: '480px',
                margin: '0 auto',
              }}
            >
              <button
                type="button"
                onClick={() => setScreenMode('confirm')}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #001b3a 0%, #0a2548 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px',
                  fontSize: '0.98rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0, 27, 58, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>Lanjutkan {totalQty} Layanan</span>
                <ChevronRightIcon size={18} color="#ffffff" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: TAMBAH LAYANAN SATUAN (Persis Foto Bilas 2)     */}
      {/* ======================================================== */}
      {activeModalSvc && (
        <div className="modal-backdrop" onClick={() => setActiveModalSvc(null)} style={{ zIndex: 120 }}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '380px', width: '92%', borderRadius: '20px', padding: '20px' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
                Tambah Layanan Satuan
              </h3>
              <button
                type="button"
                onClick={() => setActiveModalSvc(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <CloseIcon size={18} color="#bf2f3b" />
              </button>
            </div>

            {/* Service Title & Counter Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.92rem', textTransform: 'uppercase', color: '#0f172a' }}>
                  {activeModalSvc.name}
                </strong>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {formatSvcPrice(activeModalSvc)}
                </span>
              </div>

              {/* Counter Pill */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  border: '1.5px solid #001b3a',
                  borderRadius: '999px',
                  padding: '2px 10px',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <MinusIcon size={14} color="#001b3a" />
                </button>
                <span style={{ fontWeight: 800, fontSize: '0.92rem', minWidth: '16px', textAlign: 'center', color: '#001b3a' }}>
                  {modalQty}
                </span>
                <button
                  type="button"
                  onClick={() => setModalQty(modalQty + 1)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <PlusIcon size={14} color="#001b3a" />
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
                  background: '#fef2f2',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                title="Hapus Layanan"
              >
                <TrashIcon size={20} color="#bf2f3b" />
              </button>
              <button
                type="button"
                onClick={handleSaveModalItem}
                style={{
                  flex: 1,
                  background: '#001b3a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 27, 58, 0.25)',
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
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#001b3a', letterSpacing: '-0.03em' }}>
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
                <TruckIcon size={22} color="#001b3a" />
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
                  background: '#bf2f3b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(191, 47, 59, 0.3)',
                }}
              >
                <StarIcon size={14} color="#ffffff" />
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
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: isPriority ? '#bf2f3b' : '#cbd5e1',
                  borderRadius: '24px',
                  transition: '0.2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: isPriority ? '22px' : '3px',
                    bottom: '3px',
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
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {renderCategoryIcon(it.category, it.name)}
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.9rem', color: '#0f172a' }}>
                        {it.name}
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {it.price.toLocaleString('id-ID')} • {it.expressHours ? `${it.expressHours} Jam` : `${it.durationDays} Hari`}
                      </span>
                    </div>
                  </div>

                  {/* Counter Pill */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      border: '1.5px solid #001b3a',
                      borderRadius: '999px',
                      padding: '2px 8px',
                      gap: '8px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleUpdateItemQty(it.serviceId, -1)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                    >
                      <MinusIcon size={12} color="#001b3a" />
                    </button>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', minWidth: '14px', textAlign: 'center', color: '#001b3a' }}>
                      {it.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateItemQty(it.serviceId, 1)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                    >
                      <PlusIcon size={12} color="#001b3a" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setScreenMode('catalog')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#001b3a',
                fontSize: '0.85rem',
                fontWeight: 700,
                marginTop: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
              }}
            >
              <PlusIcon size={14} color="#001b3a" /> Layanan
            </button>
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
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
              Pilihan Parfum
            </div>
            <div className="stack" style={{ gap: '8px', fontSize: '0.85rem' }}>
              {['Tanpa Parfum', 'Vanilla Sweet Shoes', 'Fresh Apple Mint', 'Bubblegum Fresh'].map((p) => (
                <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="parfum"
                    value={p}
                    checked={selectedParfum === p}
                    onChange={(e) => setSelectedParfum(e.target.value)}
                    style={{ accentColor: '#bf2f3b' }}
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
              placeholder="Misalnya : Upper kotor pekat, jangan disikat kasar"
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
              <TagIcon size={18} color="#bf2f3b" />
              <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Pilih Promo</strong>
            </div>
            <span style={{ color: '#94a3b8', fontSize: '1.2rem' }}>›</span>
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
              padding: '12px 16px max(12px, env(safe-area-inset-bottom, 12px))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.12)',
              zIndex: 100,
              maxWidth: '480px',
              margin: '0 auto',
            }}
          >
            <div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Total Tagihan</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#bf2f3b', letterSpacing: '-0.3px' }}>
                {totalAmount.toLocaleString('id-ID')}
              </div>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleCreateTransaction}
              style={{
                background: '#bf2f3b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '13px 28px',
                fontSize: '0.96rem',
                fontWeight: 800,
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(191, 47, 59, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
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
        <div className="modal-backdrop" onClick={() => setPriorityModalOpen(false)} style={{ zIndex: 120 }}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '360px', width: '90%', borderRadius: '18px', padding: '20px', textAlign: 'center' }}
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
                background: '#001b3a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '11px',
                fontWeight: 800,
                fontSize: '0.92rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 27, 58, 0.25)',
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
        <div className="modal-backdrop" style={{ zIndex: 125 }}>
          <div
            className="modal"
            style={{
              maxWidth: '380px',
              width: '92%',
              borderRadius: '24px',
              padding: '24px 20px',
              textAlign: 'center',
            }}
          >
            {/* Big Green Circle with Checkmark */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#22c55e',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 6px 16px rgba(34, 197, 94, 0.35)',
              }}
            >
              <CheckIcon size={32} color="#ffffff" />
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
                <SearchIcon size={20} color="#001b3a" />
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
                <PrinterIcon size={20} color="#001b3a" />
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
                  background: '#fef2f2',
                  border: '1px solid #fee2e2',
                  borderRadius: '12px',
                  padding: '13px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: '#bf2f3b',
                  cursor: 'pointer',
                }}
              >
                <CreditCardIcon size={20} color="#bf2f3b" />
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
