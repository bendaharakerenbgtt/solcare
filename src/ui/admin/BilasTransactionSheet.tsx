import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { repo } from '../../data';
import type { Customer } from '../../data/types';
import { useAsync } from '../hooks';
import { MapsPickerModal } from '../common/MapsPickerModal';
import { CloseIcon, PinIcon, IndonesiaFlagIcon } from '../common/Icons';
import { ModalPortal } from '../common/ModalPortal';

interface BilasTransactionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BilasTransactionSheet: React.FC<BilasTransactionSheetProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [subMode, setSubMode] = useState<'menu' | 'search' | 'new' | 'contacts'>('menu');
  const [searchQuery, setSearchQuery] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [mapsModalOpen, setMapsModalOpen] = useState(false);

  // Form state for Tambah Pelanggan persis foto WhatsApp Image 2026-11-10 at 2.42.14 PM.jpeg
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [noPhone, setNoPhone] = useState(false);
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustBirthDate, setNewCustBirthDate] = useState('');
  const [newCustGender, setNewCustGender] = useState<'laki' | 'perempuan'>('laki');
  const [newCustAddress, setNewCustAddress] = useState('');

  const { data: customers, reload } = useAsync(() => repo.listCustomers(), [isOpen]);

  if (!isOpen) return null;

  const handleSelectCustomer = (c: Customer) => {
    onClose();
    // Buka detail pelanggan dengan opsi BUAT TRANSAKSI persis Bilas
    navigate(`/admin/customers?selectedId=${c.id}`);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      alert('Nama pelanggan wajib diisi');
      return;
    }
    const finalPhone = noPhone ? '-' : newCustPhone.trim();
    if (!noPhone && !finalPhone) {
      alert('Nomor WhatsApp wajib diisi atau centang Tanpa nomor telepon');
      return;
    }

    try {
      const fullNotes = [
        newCustAddress ? `Alamat: ${newCustAddress}` : '',
        newCustEmail ? `Email: ${newCustEmail}` : '',
        newCustBirthDate ? `Lahir: ${newCustBirthDate}` : '',
        newCustGender ? `Gender: ${newCustGender}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const created = await repo.saveCustomer({
        name: newCustName.trim(),
        phone: finalPhone,
        notes: fullNotes,
      });

      await reload();
      onClose();
      // Buka detail pelanggan persis Bilas
      navigate(`/admin/customers?selectedId=${created.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menambahkan pelanggan');
    }
  };

  const filteredCustomers = (customers || []).filter((c) => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  // Contoh data kontak HP persis foto WhatsApp Image 2026-11-10 at 2.42.14 PM (1).jpeg
  const phoneContacts = [
    { name: 'Adit Sepatu', phone: '081234567891' },
    { name: 'Budi Santoso', phone: '081298765432' },
    { name: 'Citra Kirana', phone: '085712345678' },
    { name: 'Dimas Kurnia', phone: '087812345678' },
    { name: 'Eka Prasetya', phone: '081399887766' },
    { name: 'Fajar Maulana', phone: '082155443322' },
    { name: 'Gita Savitri', phone: '089611223344' },
    { name: 'Hendra Saputra', phone: '085233445566' },
  ].filter((ct) => {
    if (!contactSearch.trim()) return true;
    const q = contactSearch.toLowerCase();
    return ct.name.toLowerCase().includes(q) || ct.phone.includes(q);
  });

  return (
    <ModalPortal>
      <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9000 }}>
        <div
          className="bilas-sheet-container"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxHeight: subMode === 'new' ? '92vh' : '82vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div className="bilas-sheet-handle-bar" />

          {/* Header Bar Sheet */}
        <div className="bilas-sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {subMode !== 'menu' && (
              <button
                type="button"
                onClick={() => setSubMode('menu')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  color: '#0f172a',
                  padding: '0 4px',
                }}
              >
                ←
              </button>
            )}
            <div className="bilas-sheet-title">
              {subMode === 'menu' && 'Pilih pelanggan sebelum melakukan transaksi!'}
              {subMode === 'search' && 'Cari Pelanggan'}
              {subMode === 'new' && 'Tambah Pelanggan'}
              {subMode === 'contacts' && 'Daftar Kontak Saya'}
            </div>
          </div>
          <button type="button" className="bilas-sheet-close" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CloseIcon size={18} color="#64748b" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* SUBMODE 1: MENU 3 OPSI (Persis Foto Bilas 2.42.13 PM (2)) */}
        {/* ======================================================== */}
        {subMode === 'menu' && (
          <div className="bilas-sheet-cards">
            {/* 1. Cari Pelanggan */}
            <button
              type="button"
              className="bilas-card-option"
              onClick={() => setSubMode('search')}
            >
              <img
                src="/bilas_icons/icon_pelanggancari.webp"
                alt="Cari Pelanggan"
                className="bilas-card-icon"
              />
              <div className="bilas-card-text">
                <strong>Cari Pelanggan</strong>
                <span>Cari nama atau nomor WhatsApp pelanggan lama</span>
              </div>
              <span className="bilas-card-arrow">›</span>
            </button>

            {/* 2. Tambah Pelanggan */}
            <button
              type="button"
              className="bilas-card-option"
              onClick={() => setSubMode('new')}
            >
              <img
                src="/bilas_icons/icon_pelangganbaru.webp"
                alt="Tambah Pelanggan"
                className="bilas-card-icon"
              />
              <div className="bilas-card-text">
                <strong>Tambah Pelanggan</strong>
                <span>Daftarkan pelanggan baru langsung ke pesanan</span>
              </div>
              <span className="bilas-card-arrow">›</span>
            </button>

            {/* 3. Ambil dari Kontak HP */}
            <button
              type="button"
              className="bilas-card-option"
              onClick={() => setSubMode('contacts')}
            >
              <img
                src="/bilas_icons/icon_pelanggankontak.webp"
                alt="Ambil dari Kontak HP"
                className="bilas-card-icon"
              />
              <div className="bilas-card-text">
                <strong>Ambil dari Kontak HP</strong>
                <span>Input cepat nomor WhatsApp dari buku telepon</span>
              </div>
              <span className="bilas-card-arrow">›</span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUBMODE 2: CARI PELANGGAN TERDAFTAR                     */}
        {/* ======================================================== */}
        {subMode === 'search' && (
          <div className="bilas-sheet-subcontent">
            <div className="order-search-wrap" style={{ marginBottom: '12px' }}>
              <input
                type="text"
                className="order-search-field"
                placeholder="Ketik nama atau nomor HP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="bilas-customer-list">
              {filteredCustomers.length === 0 ? (
                <div className="empty" style={{ padding: '24px 0', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 10px', color: '#64748b' }}>Pelanggan tidak ditemukan.</p>
                  <button
                    type="button"
                    className="btn sm"
                    style={{ background: '#001b3a', color: '#fff', borderRadius: '10px' }}
                    onClick={() => setSubMode('new')}
                  >
                    + Tambah Pelanggan Baru
                  </button>
                </div>
              ) : (
                filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    className="bilas-customer-row"
                    onClick={() => handleSelectCustomer(c)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.94rem', color: '#0f172a' }}>
                        {c.name}
                      </strong>
                      <span className="xs muted">{c.phone}</span>
                    </div>
                    <span className="btn sm secondary" style={{ fontSize: '0.78rem' }}>
                      Pilih →
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUBMODE 3: TAMBAH PELANGGAN LENGKAP                     */}
        {/* (Persis Foto Bilas 2.42.14 PM: Nama, Telepon, Email,    */}
        {/*  Tanggal Lahir, Jenis Kelamin, Alamat, Maps, SIMPAN)    */}
        {/* ======================================================== */}
        {subMode === 'new' && (
          <form
            onSubmit={handleCreateCustomer}
            style={{
              padding: '12px 18px 24px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* 1. Nama * */}
            <label className="field">
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
                Nama *
              </span>
              <input
                type="text"
                placeholder="Nama pelanggan"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                required
                autoFocus
                style={{
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  fontSize: '0.9rem',
                }}
              />
            </label>

            {/* 2. Telepon * dengan bendera +62 */}
            <label className="field">
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
                Telepon *
              </span>
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
                    userSelect: 'none',
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
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  disabled={noPhone}
                  required={!noPhone}
                  style={{
                    flex: 1,
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    padding: '10px 12px',
                    fontSize: '0.9rem',
                    background: noPhone ? '#f1f5f9' : '#ffffff',
                  }}
                />
              </div>
            </label>

            {/* Checkbox: Tanpa nomor telepon */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', cursor: 'pointer', color: '#475569', marginTop: '-4px' }}>
              <input
                type="checkbox"
                checked={noPhone}
                onChange={(e) => setNoPhone(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#001b3a' }}
              />
              <span>Tanpa nomor telepon</span>
            </label>

            {/* 3. Email */}
            <label className="field">
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
                Email
              </span>
              <input
                type="email"
                placeholder="Email"
                value={newCustEmail}
                onChange={(e) => setNewCustEmail(e.target.value)}
                style={{
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  fontSize: '0.9rem',
                }}
              />
            </label>

            {/* 4. Tanggal Lahir */}
            <label className="field">
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
                Tanggal Lahir
              </span>
              <input
                type="date"
                value={newCustBirthDate}
                onChange={(e) => setNewCustBirthDate(e.target.value)}
                style={{
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  fontSize: '0.9rem',
                }}
              />
            </label>

            {/* 5. Jenis Kelamin */}
            <div className="field">
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
                Jenis Kelamin
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setNewCustGender('laki')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: newCustGender === 'laki' ? '2px solid #001b3a' : '1px solid #cbd5e1',
                    background: newCustGender === 'laki' ? '#f0f4f9' : '#ffffff',
                    color: newCustGender === 'laki' ? '#001b3a' : '#475569',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Laki-laki
                </button>
                <button
                  type="button"
                  onClick={() => setNewCustGender('perempuan')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: newCustGender === 'perempuan' ? '2px solid #001b3a' : '1px solid #cbd5e1',
                    background: newCustGender === 'perempuan' ? '#f0f4f9' : '#ffffff',
                    color: newCustGender === 'perempuan' ? '#001b3a' : '#475569',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Perempuan
                </button>
              </div>
            </div>

            {/* 6. Alamat & Tombol Maps */}
            <label className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
                  Alamat
                </span>
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
                    padding: '2px 0',
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
                value={newCustAddress}
                onChange={(e) => setNewCustAddress(e.target.value)}
                rows={2}
                style={{
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  fontSize: '0.9rem',
                }}
              />
            </label>

            {/* 7. Sticky Tombol SIMPAN (Persis Foto Bilas) */}
            <div style={{ marginTop: '8px' }}>
              <button
                type="submit"
                style={{
                  width: '100%',
                  background: '#001b3a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '13px',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                }}
              >
                SIMPAN
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* SUBMODE 4: DAFTAR KONTAK SAYA (Persis Foto 2.42.14 PM (1))*/}
        {/* ======================================================== */}
        {subMode === 'contacts' && (
          <div className="bilas-sheet-subcontent">
            <div className="order-search-wrap" style={{ marginBottom: '12px' }}>
              <input
                type="text"
                className="order-search-field"
                placeholder="Cari kontak buku telepon..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="bilas-customer-list">
              {phoneContacts.map((ct, idx) => (
                <div
                  key={idx}
                  className="bilas-customer-row"
                  onClick={() => {
                    setNewCustName(ct.name);
                    setNewCustPhone(ct.phone);
                    setSubMode('new');
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: '#f0f4f9',
                        color: '#001b3a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.92rem',
                        fontWeight: 800,
                      }}
                    >
                      {ct.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.92rem', color: '#0f172a' }}>
                        {ct.name}
                      </strong>
                      <span className="xs muted">{ct.phone}</span>
                    </div>
                  </div>
                  <span className="btn sm secondary" style={{ fontSize: '0.78rem' }}>
                    Gunakan →
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Maps Picker Modal */}
      <MapsPickerModal
        isOpen={mapsModalOpen}
        onClose={() => setMapsModalOpen(false)}
        initialAddress={newCustAddress}
        onSelectAddress={(addr) => setNewCustAddress(addr)}
      />
    </div>
    </ModalPortal>
  );
};
