import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import type { Customer, Order } from '../../data/types';
import { fmtDateTime, rupiah, whatsappLink } from '../../lib/format';
import { MapsPickerModal } from '../common/MapsPickerModal';
import {
  WhatsAppIcon,
  PhoneIcon,
  PencilIcon,
  UserIcon,
  WalletIcon,
  ReceiptIcon,
  BoxIcon,
  PinIcon,
  CloseIcon,
  DocumentIcon,
  ChevronDownIcon,
  IndonesiaFlagIcon,
  EmptyStateIllustration,
} from '../common/Icons';

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: customers, loading, reload } = useAsync(() => repo.listCustomers(), []);
  const { data: orders } = useAsync(() => repo.listOrders(), []);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'semua' | 'offline' | 'online'>('semua');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    searchParams.get('selectedId') || null
  );

  // Form state for Tambah / Edit Pelanggan
  const [modalOpen, setModalOpen] = useState(false);
  const [mapsModalOpen, setMapsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [noPhone, setNoPhone] = useState(false);
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'laki' | 'perempuan'>('laki');
  const [address, setAddress] = useState('');

  // Accordions in Detail Pelanggan
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>('profil');
  const [showTxOptions, setShowTxOptions] = useState(false);

  const selectedCustomer = (customers || []).find((c) => c.id === selectedCustomerId);

  const openNew = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setNoPhone(false);
    setEmail('');
    setBirthDate('');
    setGender('laki');
    setAddress('');
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone === '-' ? '' : c.phone);
    setNoPhone(c.phone === '-');

    let parsedAddr = '';
    let parsedEmail = '';
    let parsedDOB = '';
    let parsedGender: 'laki' | 'perempuan' = 'laki';

    if (c.notes) {
      const parts = c.notes.split(' | ');
      parts.forEach((p) => {
        if (p.startsWith('Alamat: ')) parsedAddr = p.replace('Alamat: ', '');
        else if (p.startsWith('Email: ')) parsedEmail = p.replace('Email: ', '');
        else if (p.startsWith('Lahir: ')) parsedDOB = p.replace('Lahir: ', '');
        else if (p.startsWith('Gender: ')) parsedGender = (p.replace('Gender: ', '') as any) || 'laki';
        else if (!parsedAddr) parsedAddr = p;
      });
    }

    setAddress(parsedAddr);
    setEmail(parsedEmail);
    setBirthDate(parsedDOB);
    setGender(parsedGender || 'laki');
    setModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama pelanggan wajib diisi');
      return;
    }
    const finalPhone = noPhone ? '-' : phone.trim();
    if (!noPhone && !finalPhone) {
      alert('Nomor telepon wajib diisi atau centang Tanpa nomor telepon');
      return;
    }

    try {
      const fullNotes = [
        address ? `Alamat: ${address}` : '',
        email ? `Email: ${email}` : '',
        birthDate ? `Lahir: ${birthDate}` : '',
        gender ? `Gender: ${gender}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const saved = await repo.saveCustomer({
        id: editingCustomer?.id,
        name: name.trim(),
        phone: finalPhone,
        notes: fullNotes,
      });

      setModalOpen(false);
      await reload();
      setSelectedCustomerId(saved.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan data');
    }
  };

  const handleExportXLS = () => {
    if (!customers || customers.length === 0) {
      alert('Belum ada data pelanggan untuk diekspor.');
      return;
    }
    const headers = ['Nama', 'Nomor Telepon', 'Catatan / Alamat', 'Terdaftar Pada'];
    const rows = customers.map((c) => [
      `"${c.name}"`,
      `"${c.phone}"`,
      `"${c.notes || ''}"`,
      new Date(c.createdAt).toLocaleDateString('id-ID'),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pelanggan_solecare_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCustomers = (customers || []).filter((c) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.phone.includes(q)) return false;
    }
    return true;
  });

  // Customer orders for detail view
  const customerOrders: Order[] = selectedCustomer
    ? (orders || []).filter(
        (o) => o.customerPhone === selectedCustomer.phone || o.customerName === selectedCustomer.name
      )
    : [];

  return (
    <div className="stack" style={{ gap: '14px', maxWidth: '640px', margin: '0 auto', paddingBottom: '90px' }}>
      {/* ======================================================== */}
      {/* DETAIL PELANGGAN VIEW (Persis Bilas Screenshot 3 & 4)   */}
      {/* ======================================================== */}
      {selectedCustomer ? (
        <div className="stack" style={{ gap: '14px' }}>
          {/* Top Bar Detail */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => setSelectedCustomerId(null)}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '1rem',
                fontWeight: 800,
                color: '#0f172a',
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>←</span> Detail Pelanggan
            </button>
          </div>

          {/* Customer Header Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              border: '1px solid #e2e8f0',
              padding: '18px 16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #bf2f3b 0%, #001b3a 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {selectedCustomer.name.slice(0, 1).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: '1.1rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedCustomer.name}
                </strong>
                <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'block', margin: '2px 0 8px' }}>
                  {selectedCustomer.phone || 'Tanpa nomor telepon'}
                </span>

                {/* Action Buttons: Chat WA, Panggil, & Edit Profil */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedCustomer.phone && selectedCustomer.phone !== '-' ? (
                    <a
                      href={whatsappLink(selectedCustomer.phone, `Halo Kak ${selectedCustomer.name}, dari Soleful Soaks!`) || undefined}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#22c55e',
                        color: '#ffffff',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      <WhatsAppIcon size={14} color="#ffffff" />
                      <span>Chat WA</span>
                    </a>
                  ) : null}

                  {selectedCustomer.phone && selectedCustomer.phone !== '-' ? (
                    <a
                      href={`tel:${selectedCustomer.phone}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#f1f5f9',
                        color: '#334155',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      <PhoneIcon size={13} color="#334155" />
                      <span>Panggil</span>
                    </a>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => openEdit(selectedCustomer)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#001b3a',
                      color: '#ffffff',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <PencilIcon size={13} color="#ffffff" />
                    <span>Edit Profil</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Accordions Persis Bilas Screenshot */}
          <div className="stack" style={{ gap: '10px' }}>
            {/* 1. Profil & Kontak */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '14px 16px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setExpandedAccordion(expandedAccordion === 'profil' ? null : 'profil')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <UserIcon size={18} color="#001b3a" />
                  <strong style={{ fontSize: '0.94rem' }}>Profil & Kontak</strong>
                </div>
                <span style={{ color: '#94a3b8', transform: expandedAccordion === 'profil' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                  ›
                </span>
              </div>

              {expandedAccordion === 'profil' && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '0.84rem' }}>
                  <div className="bilas-finance-breakdown-table">
                    <div className="bilas-finance-breakdown-row">
                      <span>Nomor Telepon</span>
                      <strong>{selectedCustomer.phone}</strong>
                    </div>
                    <div className="bilas-finance-breakdown-row">
                      <span>Catatan / Alamat</span>
                      <strong>{selectedCustomer.notes || 'Belum diisi'}</strong>
                    </div>
                    <div className="bilas-finance-breakdown-row">
                      <span>Terdaftar Sejak</span>
                      <strong>{new Date(selectedCustomer.createdAt).toLocaleDateString('id-ID')}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Data Keuangan */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '14px 16px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setExpandedAccordion(expandedAccordion === 'keuangan' ? null : 'keuangan')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <WalletIcon size={18} color="#001b3a" />
                  <strong style={{ fontSize: '0.94rem' }}>Data Keuangan</strong>
                </div>
                <span style={{ color: '#94a3b8', transform: expandedAccordion === 'keuangan' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                  ›
                </span>
              </div>

              {expandedAccordion === 'keuangan' && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '0.84rem' }}>
                  <div className="bilas-finance-breakdown-table">
                    <div className="bilas-finance-breakdown-row">
                      <span>Deposit Saldo</span>
                      <strong>Rp 0</strong>
                    </div>
                    <div className="bilas-finance-breakdown-row">
                      <span>Kasbon</span>
                      <strong>Rp 0</strong>
                    </div>
                    <div className="bilas-finance-breakdown-row">
                      <span>Piutang / Tagihan Belum Lunas</span>
                      <strong>Rp 0</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Data Transaksi */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '14px 16px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setExpandedAccordion(expandedAccordion === 'transaksi' ? null : 'transaksi')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ReceiptIcon size={18} color="#001b3a" />
                  <strong style={{ fontSize: '0.94rem' }}>Data Transaksi ({customerOrders.length})</strong>
                </div>
                <span style={{ color: '#94a3b8', transform: expandedAccordion === 'transaksi' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                  ›
                </span>
              </div>

              {expandedAccordion === 'transaksi' && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '0.84rem' }}>
                  {customerOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
                      Belum ada riwayat transaksi untuk pelanggan ini
                    </div>
                  ) : (
                    <div className="stack" style={{ gap: '8px' }}>
                      {customerOrders.map((o) => (
                        <div key={o.id} style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong>{o.brand} {o.model}</strong>
                            <div className="xs muted">{fmtDateTime(o.receivedAt)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <strong style={{ color: '#001b3a' }}>{rupiah(o.total)}</strong>
                            <div className="xs" style={{ color: o.payment.status === 'lunas' ? '#15803d' : '#b45309' }}>
                              {o.payment.status === 'lunas' ? 'LUNAS' : 'BELUM LUNAS'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. Data Paket */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '14px 16px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setExpandedAccordion(expandedAccordion === 'paket' ? null : 'paket')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <BoxIcon size={18} color="#001b3a" />
                  <strong style={{ fontSize: '0.94rem' }}>Data Paket</strong>
                </div>
                <span style={{ color: '#94a3b8', transform: expandedAccordion === 'paket' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                  ›
                </span>
              </div>

              {expandedAccordion === 'paket' && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '0.84rem' }}>
                  <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
                    Pelanggan belum memiliki paket langganan aktif
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Action: BUAT TRANSAKSI Persis Bilas Screenshot */}
          <div
            style={{
              position: 'fixed',
              bottom: 'calc(65px + env(safe-area-inset-bottom, 0px))',
              left: 0,
              right: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '0 16px',
              zIndex: 35,
              pointerEvents: 'none',
            }}
          >
            {/* Expanded Carousel options when tapped */}
            {showTxOptions && (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  background: '#ffffff',
                  padding: '10px 14px',
                  borderRadius: '16px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                  border: '1px solid #e2e8f0',
                  marginBottom: '10px',
                  pointerEvents: 'auto',
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/admin/orders/new?customerId=${selectedCustomer.id}&name=${encodeURIComponent(
                        selectedCustomer.name
                      )}&phone=${encodeURIComponent(selectedCustomer.phone)}`
                    )
                  }
                  style={{
                    background: '#001b3a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Reguler
                </button>
                <button
                  type="button"
                  onClick={() => alert('Fitur Paket Cuci siap')}
                  style={{
                    background: '#f1f5f9',
                    color: '#334155',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Paket
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowTxOptions(!showTxOptions)}
              style={{
                background: '#bf2f3b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '999px',
                padding: '12px 28px',
                fontSize: '0.94rem',
                fontWeight: 800,
                boxShadow: '0 4px 16px rgba(191, 47, 59, 0.4)',
                cursor: 'pointer',
                pointerEvents: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>BUAT TRANSAKSI</span>
              {showTxOptions ? <CloseIcon size={14} color="#ffffff" /> : <ChevronDownIcon size={14} color="#ffffff" />}
            </button>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* CUSTOMER LIST VIEW (Persis Bilas Screenshot 3)           */
        /* ======================================================== */
        <div className="stack" style={{ gap: '12px' }}>
          {/* Top Bar: Back, solecare, XLS */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
            <Link
              to="/admin"
              style={{
                color: '#0f172a',
                fontSize: '1.4rem',
                textDecoration: 'none',
                fontWeight: 800,
                padding: '0 4px',
              }}
            >
              ←
            </Link>

            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#001b3a', letterSpacing: '-0.03em' }}>
              solecare
            </span>

            <button
              type="button"
              onClick={handleExportXLS}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#001b3a',
                cursor: 'pointer',
              }}
              title="Export ke XLS/Excel"
            >
              <DocumentIcon size={14} color="#001b3a" />
              <span>XLS</span>
            </button>
          </div>

          {/* Subheader: Pelanggan (X) & Search Field */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, color: '#0f172a' }}>
                Pelanggan ({filteredCustomers.length})
              </h1>
              <button
                type="button"
                onClick={openNew}
                style={{
                  background: '#001b3a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                + Tambah
              </button>
            </div>

            <div className="order-search-wrap" style={{ margin: 0 }}>
              <svg className="order-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="order-search-field"
                placeholder="Cari nama atau no hp..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="order-search-clear"
                  onClick={() => setSearch('')}
                  title="Hapus"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills: Semua, Offline, Online, Sort A-Z */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setFilterType('semua')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  border: filterType === 'semua' ? 'none' : '1px solid #e2e8f0',
                  background: filterType === 'semua' ? '#001b3a' : '#ffffff',
                  color: filterType === 'semua' ? '#ffffff' : '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setFilterType('offline')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  border: filterType === 'offline' ? 'none' : '1px solid #e2e8f0',
                  background: filterType === 'offline' ? '#001b3a' : '#ffffff',
                  color: filterType === 'offline' ? '#ffffff' : '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Offline
              </button>
              <button
                type="button"
                onClick={() => setFilterType('online')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  border: filterType === 'online' ? 'none' : '1px solid #e2e8f0',
                  background: filterType === 'online' ? '#001b3a' : '#ffffff',
                  color: filterType === 'online' ? '#ffffff' : '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Online
              </button>
            </div>

            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
              A-Z ▾
            </span>
          </div>

          {/* List of Customers */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Memuat data pelanggan...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px 60px' }}>
              <EmptyStateIllustration size={130} />
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                Belum ada data
              </div>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Belum ada pelanggan yang terdaftar
              </span>
            </div>
          ) : (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
            >
              {filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: '#f0f4f9',
                        color: '#001b3a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        fontWeight: 800,
                      }}
                    >
                      {c.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.94rem', color: '#0f172a' }}>
                        {c.name}
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {c.phone || 'Tanpa no. telepon'}
                      </span>
                    </div>
                  </div>
                  <span style={{ color: '#94a3b8', fontSize: '1.2rem' }}>›</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL TAMBAH PELANGGAN (Persis Bilas Screenshot)        */}
      {/* ======================================================== */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '460px', borderRadius: '20px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header Form */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#0f172a' }}
                >
                  ←
                </button>
                <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800 }}>Tambah Pelanggan</h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <CloseIcon size={18} color="#94a3b8" />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleSaveCustomer} style={{ padding: '16px 20px', overflowY: 'auto' }} className="stack">
              <label className="field">
                <span>Nama *</span>
                <input
                  type="text"
                  placeholder="Masukkan nama pelanggan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>

              <label className="field">
                <span>Telepon *</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: '#334155',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <IndonesiaFlagIcon size={18} />
                    <span>+62</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="81234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={noPhone}
                    required={!noPhone}
                  />
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={noPhone}
                  onChange={(e) => setNoPhone(e.target.checked)}
                />
                <span>Tanpa nomor telepon</span>
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="email@contoh.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Tanggal Lahir</span>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </label>

              <div className="field">
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
                  Jenis Kelamin
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setGender('laki')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: gender === 'laki' ? '2px solid #001b3a' : '1px solid #cbd5e1',
                      background: gender === 'laki' ? '#f0f4f9' : '#ffffff',
                      color: gender === 'laki' ? '#001b3a' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    Laki-laki
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('perempuan')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: gender === 'perempuan' ? '2px solid #001b3a' : '1px solid #cbd5e1',
                      background: gender === 'perempuan' ? '#f0f4f9' : '#ffffff',
                      color: gender === 'perempuan' ? '#001b3a' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    Perempuan
                  </button>
                </div>
              </div>

              <label className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Alamat</span>
                  <button
                    type="button"
                    onClick={() => setMapsModalOpen(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#bf2f3b',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <PinIcon size={14} color="#bf2f3b" />
                    <span>Maps</span>
                  </button>
                </div>
                <textarea
                  placeholder="Masukkan alamat lengkap..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                />
              </label>

              {/* Sticky SIMPAN button */}
              <div style={{ marginTop: '12px' }}>
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    background: '#001b3a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '0.94rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  SIMPAN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Maps Picker Modal */}
      <MapsPickerModal
        isOpen={mapsModalOpen}
        onClose={() => setMapsModalOpen(false)}
        initialAddress={address}
        onSelectAddress={(addr) => setAddress(addr)}
      />
    </div>
  );
};
