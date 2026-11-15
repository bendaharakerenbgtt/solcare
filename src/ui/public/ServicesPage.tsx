import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { SEED_SERVICES } from '../../data/seed';
import type { ServiceCategory } from '../../data/types';
import { whatsappLink } from '../../lib/format';
import { ModalPortal } from '../common/ModalPortal';
import { useToast } from '../common/Toast';
import {
  SearchIcon,
  CloseIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  TruckIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SneakerIllustration,
  BagIllustration,
  CapIllustration,
  HelmetIllustration,
  SparklesIllustration,
  WhatsAppIcon,
} from '../common/Icons';

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
  terms?: string;
  expressEligible?: boolean;
}

interface SelectedServiceItem {
  serviceId: string;
  category: string;
  rawCategory: ServiceCategory;
  name: string;
  price: number;
  durationDays: number;
  expressHours?: number | null;
  qty: number;
  itemBrand: string;
  notes: string;
}

type DeliveryOptionKey = 'dropoff' | 'free_pickup_min2' | 'pickup_10k' | 'pickup_20k';

const CAT_MAP: Record<ServiceCategory, string> = {
  main: 'Main Services',
  express: 'Express Services',
  additional: 'Additional Services',
  other: 'Other Services',
};

const CATEGORIES: { key: ServiceCategory; name: string; sub: string }[] = [
  { key: 'main', name: 'Main Services', sub: 'Basic Clean • Deep Clean • Heavy Clean • Premium' },
  { key: 'express', name: 'Express Services', sub: 'Express 24 Hours (+20K) • Express 48 Hours (+10K)' },
  { key: 'additional', name: 'Additional Services', sub: 'Unyellowing • Reglue • Water Repellent • Anti Stain • Repaint' },
  { key: 'other', name: 'Other Services', sub: 'Kids Shoes • Sandals/Wedges • Hat • Helmet • Bag' },
];

const DELIVERY_OPTIONS: {
  key: DeliveryOptionKey;
  title: string;
  sub?: string;
  extraFee: number;
  minShoes?: number;
}[] = [
  {
    key: 'dropoff',
    title: 'Diantar Sendiri (Drop-off)',
    sub: 'Langsung ke workshop Solecare',
    extraFee: 0,
  },
  {
    key: 'free_pickup_min2',
    title: 'Free Antar Jemput (Maks. 3KM)',
    sub: 'Khusus pesanan minimal 2 sepatu',
    extraFee: 0,
    minShoes: 2,
  },
  {
    key: 'pickup_10k',
    title: 'Antar Jemput (+Rp 10.000)',
    sub: 'Maks. 3KM, 1 Sepatu',
    extraFee: 10000,
  },
  {
    key: 'pickup_20k',
    title: 'Antar Jemput (+Rp 20.000)',
    sub: 'Area jangkauan > 3KM',
    extraFee: 20000,
  },
];

const PARFUMS = ['Tanpa Parfum', 'Vanilla Sweet Shoes', 'Fresh Apple Mint', 'Bubblegum Fresh'];

function renderCategoryIcon(catName: string, svcName?: string) {
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
}

function formatSvcPrice(svc: ServiceDef) {
  const prefix = svc.rawCategory === 'express' ? '+' : '';
  if (svc.priceMax && svc.priceMax > svc.price) {
    return `${prefix}Rp ${svc.price.toLocaleString('id-ID')} - ${svc.priceMax.toLocaleString('id-ID')}`;
  }
  return `${prefix}Rp ${svc.price.toLocaleString('id-ID')}`;
}

function formatSvcDuration(svc: ServiceDef) {
  if (svc.expressHours) {
    return `${svc.expressHours} Jam • Express`;
  }
  if (svc.daysMax && svc.daysMax > svc.days) {
    return `${svc.days}–${svc.daysMax} Hari • Satuan`;
  }
  if (svc.days === 0) {
    return 'Tambahan • Satuan';
  }
  return `${svc.days} Hari • Satuan`;
}

export const ServicesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const catParam = searchParams.get('cat') as ServiceCategory | null;
  const highlightParam = searchParams.get('highlight');

  const { data: dbServices, loading } = useAsync(() => repo.listServices(false), []);
  const { data: settings } = useAsync(() => repo.getSettings(), []);

  const [screenMode, setScreenMode] = useState<'catalog' | 'confirm'>('catalog');
  const [search, setSearch] = useState('');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    'Main Services': true,
    'Express Services': true,
    'Additional Services': false,
    'Other Services': false,
  });

  // Simulation basket
  const [selectedItems, setSelectedItems] = useState<SelectedServiceItem[]>([]);

  // Modal Tambah Layanan Satuan (mirrors OrderFormPage)
  const [activeModalSvc, setActiveModalSvc] = useState<ServiceDef | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [modalItemBrand, setModalItemBrand] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [generalShoeName, setGeneralShoeName] = useState('');

  // Simulation confirmation controls
  const [pickupOption, setPickupOption] = useState<DeliveryOptionKey>('dropoff');
  const [pickupDropdownOpen, setPickupDropdownOpen] = useState(false);
  const [selectedParfum, setSelectedParfum] = useState<string>('Tanpa Parfum');
  const [extraNotes, setExtraNotes] = useState('');

  const catalogServices = useMemo<ServiceDef[]>(() => {
    const source = dbServices && dbServices.length > 0 ? dbServices : SEED_SERVICES;
    return source.map((s, idx) => ({
      id: 'id' in s && typeof s.id === 'string' ? s.id : `seed-${idx}`,
      category: CAT_MAP[s.category] || 'Main Services',
      rawCategory: s.category,
      name: s.name,
      price: s.priceMin,
      priceMax: s.priceMax,
      days: s.durationMinDays ?? 2,
      daysMax: s.durationMaxDays ?? s.durationMinDays ?? 2,
      expressHours: s.expressHours,
      description: s.description,
      terms: s.terms,
      expressEligible: s.expressEligible,
    }));
  }, [dbServices]);

  // Expand category requested via query param (?cat=...)
  useEffect(() => {
    if (catParam && CAT_MAP[catParam]) {
      const targetName = CAT_MAP[catParam];
      setExpandedCats({
        'Main Services': targetName === 'Main Services',
        'Express Services': targetName === 'Express Services',
        'Additional Services': targetName === 'Additional Services',
        'Other Services': targetName === 'Other Services',
      });
    }
  }, [catParam]);

  // Auto-open highlighted service modal once if navigated with ?highlight=...
  const handledHighlightRef = useRef<string | null>(null);
  useEffect(() => {
    if (!highlightParam || handledHighlightRef.current === highlightParam) return;
    const found = catalogServices.find((s) => s.id === highlightParam);
    if (found) {
      handledHighlightRef.current = highlightParam;
      setActiveModalSvc(found);
      setModalQty(1);
    }
  }, [highlightParam, catalogServices]);

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

  const totalQty = selectedItems.reduce((acc, it) => acc + it.qty, 0);

  // Auto-fallback if currently selected delivery requires >= 2 shoes but totalQty < 2
  useEffect(() => {
    if (pickupOption === 'free_pickup_min2' && totalQty < 2) {
      setPickupOption('dropoff');
    }
  }, [totalQty, pickupOption]);

  const activeDelivery = DELIVERY_OPTIONS.find((d) => d.key === pickupOption) || DELIVERY_OPTIONS[0];

  const totalAmount = useMemo(() => {
    const svcSum = selectedItems.reduce((acc, it) => acc + it.price * it.qty, 0);
    return svcSum + activeDelivery.extraFee;
  }, [selectedItems, activeDelivery]);

  const toggleCat = (catName: string) => {
    setExpandedCats((prev) => ({ ...prev, [catName]: !prev[catName] }));
  };

  const handleOpenAddModal = (svc: ServiceDef) => {
    const existing = selectedItems.find((x) => x.serviceId === svc.id);
    setActiveModalSvc(svc);
    setModalQty(existing ? existing.qty : 1);
    setModalItemBrand(existing?.itemBrand || generalShoeName || '');
    setModalNotes(existing ? existing.notes : '');
  };

  const handleSaveModalItem = () => {
    if (!activeModalSvc) return;

    if (modalItemBrand.trim() && !generalShoeName.trim()) {
      setGeneralShoeName(modalItemBrand.trim());
    }

    setSelectedItems((prev) => {
      const idx = prev.findIndex((x) => x.serviceId === activeModalSvc.id);
      const item: SelectedServiceItem = {
        serviceId: activeModalSvc.id,
        category: activeModalSvc.category,
        rawCategory: activeModalSvc.rawCategory,
        name: activeModalSvc.name,
        price: activeModalSvc.price,
        durationDays: activeModalSvc.days,
        expressHours: activeModalSvc.expressHours,
        qty: modalQty,
        itemBrand: modalItemBrand.trim(),
        notes: modalNotes.trim(),
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item];
    });

    setActiveModalSvc(null);
  };

  const handleDeleteModalItem = () => {
    if (!activeModalSvc) return;
    setSelectedItems((prev) => prev.filter((x) => x.serviceId !== activeModalSvc.id));
    setActiveModalSvc(null);
  };

  const handleUpdateItemQty = (serviceId: string, delta: number) => {
    setSelectedItems((prev) =>
      prev
        .map((it) => {
          if (it.serviceId === serviceId) {
            const nextQty = it.qty + delta;
            return nextQty > 0 ? { ...it, qty: nextQty } : null;
          }
          return it;
        })
        .filter(Boolean) as SelectedServiceItem[]
    );
  };

  const buildOrderSummaryText = () => {
    const lines = [
      'Halo Soleful Soaks! Saya mau pesan / konsultasi perawatan dengan estimasi berikut:',
      '',
      ...selectedItems.map((it, idx) => {
        const brandPart = it.itemBrand ? ` (${it.itemBrand})` : '';
        const notePart = it.notes ? ` — Catatan: ${it.notes}` : '';
        return `${idx + 1}. ${it.name}${brandPart} x${it.qty} = Rp ${(it.price * it.qty).toLocaleString('id-ID')}${notePart}`;
      }),
      '',
      `Pengantaran: ${activeDelivery.title}${activeDelivery.extraFee > 0 ? ` (+Rp ${activeDelivery.extraFee.toLocaleString('id-ID')})` : ''}`,
      `Pilihan Parfum: ${selectedParfum}`,
      ...(generalShoeName.trim() ? [`Merk/Barang: ${generalShoeName.trim()}`] : []),
      ...(extraNotes.trim() ? [`Catatan Tambahan: ${extraNotes.trim()}`] : []),
      `Estimasi Total: Rp ${totalAmount.toLocaleString('id-ID')}`,
    ];
    return lines.join('\n');
  };

  const waOrderUrl = settings?.whatsappNumber
    ? whatsappLink(settings.whatsappNumber, buildOrderSummaryText())
    : null;

  const handleSendSimulation = async () => {
    if (waOrderUrl) {
      window.open(waOrderUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      await navigator.clipboard.writeText(buildOrderSummaryText());
      showToast({
        title: 'Ringkasan Disalin',
        message: 'Nomor WhatsApp admin belum diisi. Rincian pesanan sudah disalin ke clipboard.',
        type: 'info',
      });
    } catch {
      showToast({
        title: 'Info Toko',
        message: 'Silakan tunjukkan pilihan layanan ini langsung ke admin di workshop.',
        type: 'info',
      });
    }
  };

  return (
    <div
      className="public-container"
      style={{
        paddingBottom: totalQty > 0 ? '165px' : undefined,
      }}
    >
      {/* ======================================================== */}
      {/* SCREEN 1: KATALOG PILIH LAYANAN (Mirrors OrderFormPage) */}
      {/* ======================================================== */}
      {screenMode === 'catalog' && (
        <div className="stack" style={{ gap: '14px' }}>
          {/* Top Title Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '2px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.24rem', fontWeight: 800, color: '#0f172a' }}>
                Katalog Layanan &amp; Harga
              </h1>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Pilih layanan untuk simulasi total biaya &amp; pesan via WhatsApp
              </span>
            </div>
            {totalQty > 0 && (
              <button
                type="button"
                onClick={() => setScreenMode('confirm')}
                style={{
                  background: '#bf2f3b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '6px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {totalQty} dipilih
              </button>
            )}
          </div>

          {/* Search Bar (Mirrors OrderFormPage pill search) */}
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
              placeholder="Cari layanan (mis. Deep Clean, Repaint, Tas)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cari layanan"
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem', padding: 0 }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Hapus pencarian"
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                <CloseIcon size={16} />
              </button>
            )}
          </div>

          {/* Quick Category Pills */}
          <div className="orders-filter-grid">
            {CATEGORIES.map((cat) => {
              const isExpanded = expandedCats[cat.name];
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() =>
                    setExpandedCats({
                      'Main Services': cat.name === 'Main Services',
                      'Express Services': cat.name === 'Express Services',
                      'Additional Services': cat.name === 'Additional Services',
                      'Other Services': cat.name === 'Other Services',
                    })
                  }
                  className="activity-filter-btn"
                  style={{
                    background: isExpanded ? '#001b3a' : '#ffffff',
                    color: isExpanded ? '#ffffff' : '#475569',
                    border: isExpanded ? '1px solid #001b3a' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Category Accordion List */}
          {loading ? (
            <div className="empty">Memuat katalog layanan...</div>
          ) : (
            <div className="stack" style={{ gap: '6px' }}>
              {CATEGORIES.map((cat) => {
                const isExpanded = expandedCats[cat.name] || search.trim().length > 0;
                const catServices = filteredCatalog.filter((s) => s.category === cat.name);

                if (search.trim() && catServices.length === 0) return null;

                return (
                  <div key={cat.name} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <button
                      type="button"
                      onClick={() => toggleCat(cat.name)}
                      aria-expanded={isExpanded}
                      style={{
                        width: '100%',
                        padding: '12px 4px 8px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        background: 'transparent',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
                          {cat.name}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{cat.sub}</div>
                      </div>
                      <span
                        style={{
                          color: '#64748b',
                          transform: isExpanded ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s',
                          marginLeft: '8px',
                        }}
                      >
                        ▾
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="stack" style={{ gap: '10px', padding: '8px 0 16px' }}>
                        {catServices.map((svc) => {
                          const existing = selectedItems.find((x) => x.serviceId === svc.id);
                          return (
                            <div
                              key={svc.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                                padding: '12px 14px',
                                background: '#ffffff',
                                border: existing ? '1.5px solid #bf2f3b' : '1px solid #e2e8f0',
                                borderRadius: '16px',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                              }}
                            >
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
                                  {renderCategoryIcon(svc.category, svc.name)}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <strong style={{ display: 'block', fontSize: '0.92rem', color: '#0f172a' }}>
                                    {svc.name}
                                  </strong>
                                  <div className="price" style={{ fontSize: '0.88rem', fontWeight: 800, color: '#bf2f3b', margin: '2px 0' }}>
                                    {formatSvcPrice(svc)}
                                  </div>
                                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>
                                    {formatSvcDuration(svc)}
                                  </span>
                                  {svc.description && (
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                                      {svc.description}
                                    </span>
                                  )}
                                  {svc.terms && (
                                    <span style={{ fontSize: '0.7rem', color: '#b45309', display: 'block', marginTop: '2px', fontWeight: 600 }}>
                                      * {svc.terms}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div style={{ flexShrink: 0 }}>
                                {existing ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddModal(svc)}
                                    style={{
                                      background: '#bf2f3b',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '999px',
                                      padding: '7px 14px',
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 8px rgba(191, 47, 59, 0.25)',
                                    }}
                                  >
                                    {existing.qty} item
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddModal(svc)}
                                    style={{
                                      background: '#001b3a',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '999px',
                                      padding: '7px 16px',
                                      fontSize: '0.8rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 8px rgba(0, 27, 58, 0.2)',
                                    }}
                                  >
                                    Pilih
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
          )}

          {/* Price Disclaimer */}
          <div
            className="public-card"
            style={{ background: '#f0f4f9', borderColor: '#cbd5e1', fontSize: '0.8rem', color: '#001b3a' }}
          >
            <strong style={{ display: 'block', marginBottom: '4px' }}>Catatan Harga</strong>
            <p style={{ margin: 0, lineHeight: 1.45, color: '#334155' }}>
              {settings?.priceDisclaimer ||
                'Harga merupakan referensi. Harga akhir dapat berubah berdasarkan kondisi barang setelah pengecekan di toko.'}
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREEN 2: SIMULASI & KONFIRMASI (Mirrors OrderFormPage) */}
      {/* ======================================================== */}
      {screenMode === 'confirm' && (
        <div className="stack" style={{ gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
            <button
              type="button"
              onClick={() => setScreenMode('catalog')}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.25rem',
                color: '#0f172a',
                cursor: 'pointer',
                padding: '2px 6px',
                fontWeight: 800,
              }}
              aria-label="Kembali ke katalog"
            >
              ← Kembali
            </button>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#001b3a' }}>
              Simulasi Order
            </span>
            <div style={{ width: '56px' }} />
          </div>

          {/* 1. Layanan Antar Jemput Custom Selector */}
          <div className="public-card" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <TruckIcon size={20} color="#001b3a" />
                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>Layanan Antar Jemput</strong>
              </div>

              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setPickupDropdownOpen((prev) => !prev)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#f8fafc',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div>{activeDelivery.title}</div>
                    {activeDelivery.sub && (
                      <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, marginTop: '1px' }}>
                        {activeDelivery.sub}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      display: 'flex',
                      transform: pickupDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease',
                      color: '#64748b',
                      marginLeft: '8px',
                      flexShrink: 0,
                    }}
                  >
                    <ChevronDownIcon size={16} />
                  </span>
                </button>

                {pickupDropdownOpen && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                      onClick={() => setPickupDropdownOpen(false)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        right: 0,
                        background: '#ffffff',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 8px 24px rgba(0, 27, 58, 0.12)',
                        padding: '6px',
                        zIndex: 50,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      {DELIVERY_OPTIONS.map((opt) => {
                        const isSelected = pickupOption === opt.key;
                        const isDisabled = opt.minShoes ? totalQty < opt.minShoes : false;

                        return (
                          <button
                            key={opt.key}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              if (!isDisabled) {
                                setPickupOption(opt.key);
                                setPickupDropdownOpen(false);
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              border: 'none',
                              background: isSelected ? '#fee2e2' : isDisabled ? '#f8fafc' : 'transparent',
                              color: isSelected ? '#9e242e' : isDisabled ? '#94a3b8' : '#334155',
                              fontSize: '0.86rem',
                              fontWeight: isSelected ? 700 : 500,
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                              textAlign: 'left',
                              opacity: isDisabled ? 0.65 : 1,
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span>{opt.title}</span>
                                {isDisabled && (
                                  <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: '#e2e8f0', color: '#64748b', fontWeight: 600 }}>
                                    Min. 2 Sepatu
                                  </span>
                                )}
                              </div>
                              {opt.sub && (
                                <div style={{ fontSize: '0.73rem', color: isSelected ? '#b91c1c' : '#64748b', marginTop: '2px' }}>
                                  {opt.sub}
                                </div>
                              )}
                            </div>

                            {isSelected && (
                              <span
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  background: '#bf2f3b',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  marginLeft: '8px',
                                }}
                              >
                                <CheckIcon size={10} color="#ffffff" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 2. Detail Layanan Dipilih */}
          <div className="public-card">
            <strong style={{ display: 'block', fontSize: '0.92rem', color: '#0f172a', marginBottom: '12px' }}>
              Detail Layanan ({totalQty} Item)
            </strong>

            <div className="stack" style={{ gap: '12px' }}>
              {selectedItems.map((it) => (
                <div
                  key={it.serviceId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    paddingBottom: '10px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {renderCategoryIcon(it.category, it.name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: '0.88rem', color: '#0f172a' }}>
                        {it.name}
                      </strong>
                      {it.itemBrand && (
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#bf2f3b', display: 'block' }}>
                          {it.itemBrand}
                        </span>
                      )}
                      <span className="price" style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Rp {(it.price * it.qty).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      border: '1.5px solid #001b3a',
                      borderRadius: '999px',
                      padding: '2px 8px',
                      gap: '8px',
                      flexShrink: 0,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleUpdateItemQty(it.serviceId, -1)}
                      aria-label={`Kurangi ${it.name}`}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
                    >
                      <MinusIcon size={12} color="#001b3a" />
                    </button>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', minWidth: '14px', textAlign: 'center', color: '#001b3a' }}>
                      {it.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateItemQty(it.serviceId, 1)}
                      aria-label={`Tambah ${it.name}`}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
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
                fontSize: '0.84rem',
                fontWeight: 700,
                marginTop: '10px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
              }}
            >
              <PlusIcon size={14} color="#001b3a" /> Tambah Layanan Lain
            </button>
          </div>

          {/* 3. Merk Sepatu / Barang */}
          <div className="public-card">
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              Nama / Merk Sepatu atau Barang
            </label>
            <input
              type="text"
              placeholder="Misal: Nike Air Force 1 / Tas Kanken"
              value={generalShoeName}
              onChange={(e) => setGeneralShoeName(e.target.value)}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '0.86rem',
                fontWeight: 600,
              }}
            />
          </div>

          {/* 4. Pilihan Parfum Gratis */}
          <div className="public-card">
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
              Pilihan Parfum Sepatu (Gratis)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
              {PARFUMS.map((p) => {
                const active = selectedParfum === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedParfum(p)}
                    style={{
                      padding: '9px 10px',
                      borderRadius: '10px',
                      border: active ? '1.5px solid #bf2f3b' : '1px solid #e2e8f0',
                      background: active ? '#fef2f2' : '#f8fafc',
                      color: active ? '#bf2f3b' : '#334155',
                      fontSize: '0.8rem',
                      fontWeight: active ? 700 : 600,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Catatan Tambahan */}
          <div className="public-card">
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              Catatan Tambahan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Misal: Noda kopi di upper kanan, sol agak menguning"
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '0.86rem',
              }}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STICKY BOTTOM BAR (Positioned cleanly above bottom nav)  */}
      {/* ======================================================== */}
      {totalQty > 0 && (
        <div className="public-services-sticky-bar">
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
              Estimasi ({totalQty} item • {activeDelivery.extraFee > 0 ? `+${activeDelivery.extraFee / 1000}rb` : 'Drop-off/Gratis'})
            </span>
            <strong className="price" style={{ fontSize: '1.08rem', fontWeight: 800, color: '#001b3a' }}>
              Rp {totalAmount.toLocaleString('id-ID')}
            </strong>
          </div>

          {screenMode === 'catalog' ? (
            <button
              type="button"
              onClick={() => setScreenMode('confirm')}
              style={{
                background: '#001b3a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 16px',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>Lanjutkan ({totalQty})</span>
              <ChevronRightIcon size={16} color="#ffffff" />
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                to="/kontak"
                style={{
                  background: '#f1f5f9',
                  color: '#001b3a',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Lokasi
              </Link>
              <button
                type="button"
                onClick={() => void handleSendSimulation()}
                style={{
                  background: '#bf2f3b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(191, 47, 59, 0.3)',
                }}
              >
                <WhatsAppIcon size={16} color="#ffffff" />
                <span>Pesan via WA</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL TAMBAH LAYANAN SATUAN (Mirrors OrderFormPage)      */}
      {/* ======================================================== */}
      {activeModalSvc && (
        <ModalPortal>
          <div className="modal-backdrop" onClick={() => setActiveModalSvc(null)} style={{ zIndex: 9000 }}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '390px', width: '92%', borderRadius: '20px', padding: '20px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
                  Detail &amp; Simulasi Layanan
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveModalSvc(null)}
                  aria-label="Tutup"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                  <CloseIcon size={18} color="#bf2f3b" />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.92rem', color: '#0f172a' }}>
                    {activeModalSvc.name}
                  </strong>
                  <span className="price" style={{ fontSize: '0.84rem', color: '#bf2f3b', fontWeight: 700 }}>
                    {formatSvcPrice(activeModalSvc)}
                  </span>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    border: '1.5px solid #001b3a',
                    borderRadius: '999px',
                    padding: '2px 10px',
                    gap: '12px',
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                    aria-label="Kurangi jumlah"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
                  >
                    <MinusIcon size={14} color="#001b3a" />
                  </button>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', minWidth: '16px', textAlign: 'center', color: '#001b3a' }}>
                    {modalQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalQty(modalQty + 1)}
                    aria-label="Tambah jumlah"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
                  >
                    <PlusIcon size={14} color="#001b3a" />
                  </button>
                </div>
              </div>

              {activeModalSvc.description && (
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 12px', lineHeight: 1.45 }}>
                  {activeModalSvc.description} ({formatSvcDuration(activeModalSvc)})
                </p>
              )}

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#001b3a', marginBottom: '4px' }}>
                  Nama / Merk Sepatu atau Barang
                </label>
                <input
                  type="text"
                  placeholder="Misal: Nike Air Jordan 1 / Vans Old Skool"
                  value={modalItemBrand}
                  onChange={(e) => setModalItemBrand(e.target.value)}
                  style={{
                    background: '#f8fafc',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Catatan Kondisi (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Misal: Suede lembut, ada noda di midsole"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    fontSize: '0.86rem',
                  }}
                />
              </div>

              <div className="price" style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
                Subtotal : Rp {(activeModalSvc.price * modalQty).toLocaleString('id-ID')}
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleDeleteModalItem}
                  aria-label="Hapus layanan dari simulasi"
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
                  Tambahkan ke Simulasi
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
