import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import {
  UsersIcon,
  StoreIcon,
  TagIcon,
  ShirtIcon,
  CashIcon,
  BanIcon,
  ChatIcon,
  LogoutIcon,
  CloseIcon,
} from '../common/Icons';
import { ModalPortal } from '../common/ModalPortal';

export const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: currentSettings, reload } = useAsync(() => repo.getSettings(), []);

  const [outletModalOpen, setOutletModalOpen] = useState(false);
  const [waModalOpen, setWaModalOpen] = useState(false);

  // Outlet form
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [address, setAddress] = useState('');
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('18:00');
  const [dailyCapacity, setDailyCapacity] = useState(8.5);

  const openOutletModal = () => {
    if (currentSettings) {
      setBusinessName(currentSettings.businessName || 'Soleful Soaks! Shoes Care');
      setPhone(currentSettings.whatsappNumber || '081292928699');
      setInstagramUrl(currentSettings.instagramUrl || 'https://www.instagram.com/soleful.soaks?obrf=MXRsZWc0OTFwanB1bA==');
      setAddress(currentSettings.address || 'Mampang Prapatan, Jakarta Selatan');
      setOpenTime(currentSettings.openTime || '09:00');
      setCloseTime(currentSettings.closeTime || '18:00');
      setDailyCapacity(currentSettings.dailyCapacity || 8.5);
    }
    setOutletModalOpen(true);
  };

  const handleSaveOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await repo.updateSettings({
        businessName,
        whatsappNumber: phone,
        instagramUrl,
        address,
        openTime,
        closeTime,
        dailyCapacity: Number(dailyCapacity) || 8.5,
      });
      setOutletModalOpen(false);
      await reload();
      alert('Pengaturan outlet & jam operasional berhasil disimpan!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan');
    }
  };

  return (
    <div className="stack" style={{ gap: '14px', maxWidth: '640px', margin: '0 auto' }}>
      {/* 1. Profile Card Persis Bilas Screenshot */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          border: '1px solid #e2e8f0',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/bilas_icons/img_avatar.webp"
            alt="Profile Avatar"
            style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: '1.05rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentSettings?.businessName || user?.name || 'Soleful Soaks! Shoes Care'}
            </strong>
            <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
              {user?.email || 'admin@solefulsoaks.id'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. 10 Menu List Items Persis Bilas Screenshot */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        {/* 1. Pelanggan Saya */}
        <Link
          to="/admin/customers"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid #f1f5f9',
            textDecoration: 'none',
            color: '#0f172a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: '#f0f4f9' }}>
              <UsersIcon size={18} color="#001b3a" />
            </span>
            <strong style={{ fontSize: '0.92rem' }}>Pelanggan Saya</strong>
          </div>
          <span style={{ color: '#94a3b8', fontSize: '1.2rem' }}>›</span>
        </Link>

        {/* 2. Kelola Outlet */}
        <div
          onClick={openOutletModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid #f1f5f9',
            cursor: 'pointer',
            color: '#0f172a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: '#f0f4f9' }}>
              <StoreIcon size={18} color="#001b3a" />
            </span>
            <strong style={{ fontSize: '0.92rem' }}>Kelola Outlet</strong>
          </div>
          <span style={{ color: '#94a3b8', fontSize: '1.2rem' }}>›</span>
        </div>

        {/* 3. Kelola Layanan/Produk */}
        <Link
          to="/admin/services"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid #f1f5f9',
            textDecoration: 'none',
            color: '#0f172a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: '#f0f4f9' }}>
              <TagIcon size={18} color="#001b3a" />
            </span>
            <strong style={{ fontSize: '0.92rem' }}>Kelola Layanan/Produk</strong>
          </div>
          <span style={{ color: '#94a3b8', fontSize: '1.2rem' }}>›</span>
        </Link>

        {/* 4. Kelola Pegawai */}
        <Link
          to="/admin/staff"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid #f1f5f9',
            textDecoration: 'none',
            color: '#0f172a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: '#f0f4f9' }}>
              <ShirtIcon size={18} color="#001b3a" />
            </span>
            <strong style={{ fontSize: '0.92rem' }}>Kelola Pegawai</strong>
          </div>
          <span style={{ color: '#94a3b8', fontSize: '1.2rem' }}>›</span>
        </Link>

        {/* 5. Kelola Keuangan */}
        <Link
          to="/admin/reports"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid #f1f5f9',
            textDecoration: 'none',
            color: '#0f172a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: '#f0f4f9' }}>
              <CashIcon size={18} color="#001b3a" />
            </span>
            <strong style={{ fontSize: '0.92rem' }}>Kelola Keuangan</strong>
          </div>
          <span style={{ color: '#94a3b8', fontSize: '1.2rem' }}>›</span>
        </Link>

        {/* 6. Pembatalan Transaksi */}
        <div
          onClick={() => navigate('/admin/orders?tab=semua')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid #f1f5f9',
            cursor: 'pointer',
            color: '#0f172a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: '#fef2f2' }}>
              <BanIcon size={18} color="#bf2f3b" />
            </span>
            <strong style={{ fontSize: '0.92rem' }}>Pembatalan Transaksi</strong>
          </div>
          <span style={{ color: '#94a3b8', fontSize: '1.2rem' }}>›</span>
        </div>

        {/* 7. Kirim WA */}
        <div
          onClick={() => setWaModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid #f1f5f9',
            cursor: 'pointer',
            color: '#0f172a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: '#f0f4f9' }}>
              <ChatIcon size={18} color="#001b3a" />
            </span>
            <strong style={{ fontSize: '0.92rem' }}>Kirim WA</strong>
          </div>
          <span style={{ color: '#94a3b8', fontSize: '1.2rem' }}>›</span>
        </div>

        {/* 8. Keluar Akun */}
        <div
          onClick={() => {
            if (confirm('Keluar dari sesi admin?')) {
              void signOut();
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            cursor: 'pointer',
            color: '#dc2626',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: '#fef2f2' }}>
              <LogoutIcon size={18} color="#dc2626" />
            </span>
            <strong style={{ fontSize: '0.92rem' }}>Keluar Akun</strong>
          </div>
          <span style={{ color: '#dc2626', fontSize: '1.2rem' }}>›</span>
        </div>
      </div>

      {/* Modal: Kelola Outlet */}
      {outletModalOpen && (
        <ModalPortal>
          <div className="modal-backdrop" onClick={() => setOutletModalOpen(false)} style={{ zIndex: 9000 }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', width: '92%', margin: '0 auto', padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Kelola Outlet</h2>
                <button
                  type="button"
                  onClick={() => setOutletModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <CloseIcon size={18} color="#64748b" />
                </button>
              </div>
              <form onSubmit={handleSaveOutlet} className="stack" style={{ gap: '12px', padding: '18px 20px' }}>
                <label className="field">
                  <span>Nama Outlet / Bisnis</span>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Nomor WhatsApp Toko</span>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Link Instagram Toko</span>
                  <input
                    type="url"
                    placeholder="https://www.instagram.com/soleful.soaks"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Alamat Toko</span>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                  />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label className="field">
                    <span>Jam Buka Toko</span>
                    <input
                      type="time"
                      value={openTime}
                      onChange={(e) => setOpenTime(e.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Jam Tutup Toko</span>
                    <input
                      type="time"
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                      required
                    />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button type="button" className="btn secondary" style={{ flex: 1 }} onClick={() => setOutletModalOpen(false)}>
                    Batal
                  </button>
                  <button type="submit" className="btn" style={{ flex: 1, background: '#001b3a' }}>
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal: Kirim WA */}
      {waModalOpen && (
        <ModalPortal>
          <div className="modal-backdrop" onClick={() => setWaModalOpen(false)} style={{ zIndex: 9000 }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', width: '92%', margin: '0 auto', padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Broadcast Pesan WhatsApp</h2>
                <button
                  type="button"
                  onClick={() => setWaModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <CloseIcon size={18} color="#64748b" />
                </button>
              </div>
              <div style={{ padding: '18px 20px' }} className="stack">
                <p className="small muted" style={{ lineHeight: 1.5, margin: '0 0 16px' }}>
                  Pilih pelanggan di menu <strong>Pelanggan Saya</strong> untuk langsung mengirim pesan WhatsApp otomatis dengan template notifikasi pengerjaan & pengingat pengambilan.
                </p>
                <Link
                  to="/admin/customers"
                  className="btn"
                  style={{ background: '#22c55e', color: '#ffffff', textAlign: 'center', justifyContent: 'center' }}
                  onClick={() => setWaModalOpen(false)}
                >
                  Buka Pelanggan Saya
                </Link>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
