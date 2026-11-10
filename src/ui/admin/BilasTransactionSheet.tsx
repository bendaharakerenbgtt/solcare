import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { repo } from '../../data';
import type { Customer } from '../../data/types';
import { useAsync } from '../hooks';

interface BilasTransactionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BilasTransactionSheet: React.FC<BilasTransactionSheetProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [subMode, setSubMode] = useState<'menu' | 'search' | 'new'>('menu');
  const [searchQuery, setSearchQuery] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  const { data: customers } = useAsync(() => repo.listCustomers(), [isOpen]);

  if (!isOpen) return null;

  const handleSelectCustomer = (c: Customer) => {
    onClose();
    navigate(`/admin/orders/new?customerId=${c.id}&name=${encodeURIComponent(c.name)}&phone=${encodeURIComponent(c.phone)}`);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      alert('Nama dan Nomor WhatsApp wajib diisi');
      return;
    }
    try {
      const created = await repo.saveCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        notes: '',
      });
      onClose();
      navigate(`/admin/orders/new?customerId=${created.id}&name=${encodeURIComponent(created.name)}&phone=${encodeURIComponent(created.phone)}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menambahkan pelanggan');
    }
  };

  const filteredCustomers = (customers || []).filter((c) => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 110 }}>
      <div
        className="bilas-sheet-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bilas-sheet-handle-bar" />

        <div className="bilas-sheet-header">
          <div className="bilas-sheet-title">
            {subMode === 'menu' && 'Pilih pelanggan sebelum melakukan transaksi!'}
            {subMode === 'search' && 'Cari Pelanggan Terdaftar'}
            {subMode === 'new' && 'Tambah Pelanggan Baru'}
          </div>
          <button type="button" className="bilas-sheet-close" onClick={onClose}>
            ✕
          </button>
        </div>

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
              onClick={() => {
                const phoneInput = prompt('Masukkan nomor WhatsApp pelanggan (contoh: 08123456789):');
                if (phoneInput) {
                  const nameInput = prompt('Masukkan nama pelanggan:') || 'Pelanggan';
                  onClose();
                  navigate(`/admin/orders/new?name=${encodeURIComponent(nameInput)}&phone=${encodeURIComponent(phoneInput)}`);
                }
              }}
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
                <div className="empty" style={{ padding: '16px 0' }}>
                  Pelanggan tidak ditemukan.{' '}
                  <button
                    type="button"
                    className="btn sm"
                    style={{ background: 'var(--navy)', color: '#fff', marginTop: '6px' }}
                    onClick={() => setSubMode('new')}
                  >
                    + Tambah Sebagai Pelanggan Baru
                  </button>
                </div>
              ) : (
                filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    className="bilas-customer-row"
                    onClick={() => handleSelectCustomer(c)}
                  >
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.92rem', color: 'var(--ink)' }}>
                        {c.name}
                      </strong>
                      <span className="xs muted">{c.phone}</span>
                    </div>
                    <span className="btn sm secondary" style={{ fontSize: '0.75rem' }}>
                      Pilih →
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              className="btn secondary sm"
              style={{ width: '100%', marginTop: '12px' }}
              onClick={() => setSubMode('menu')}
            >
              ← Kembali ke Pilihan
            </button>
          </div>
        )}

        {subMode === 'new' && (
          <form onSubmit={handleCreateCustomer} className="bilas-sheet-subcontent">
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                Nama Pelanggan *
              </label>
              <input
                type="text"
                className="order-search-field"
                placeholder="Contoh: Mas Faris"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                Nomor WhatsApp *
              </label>
              <input
                type="tel"
                className="order-search-field"
                placeholder="Contoh: 081210043758"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn secondary"
                style={{ flex: 1 }}
                onClick={() => setSubMode('menu')}
              >
                Kembali
              </button>
              <button
                type="submit"
                className="btn"
                style={{ flex: 2, background: 'var(--navy)', color: '#fff', fontWeight: 700 }}
              >
                Lanjut ke Transaksi →
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
