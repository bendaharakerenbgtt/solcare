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
  SettingsIcon,
  CreditCardIcon,
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
  const [machineryModalOpen, setMachineryModalOpen] = useState(false);
  const [merchantModalOpen, setMerchantModalOpen] = useState(false);

  // Outlet form
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dailyCapacity, setDailyCapacity] = useState(8.5);

  const openOutletModal = () => {
    if (currentSettings) {
      setBusinessName(currentSettings.businessName || 'Soleful Soaks! Shoes Care');
      setPhone(currentSettings.whatsappNumber || '081292928699');
      setAddress(currentSettings.address || 'Mampang Prapatan, Jakarta Selatan');
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
        address,
        dailyCapacity: Number(dailyCapacity) || 8.5,
      });
      setOutletModalOpen(false);
      await reload();
      alert('Pengaturan outlet berhasil disimpan!');
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

        {/* 8. Kelola Mesin dan Modul */}
        <div
          onClick={() => setMachineryModalOpen(true)}
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
              <SettingsIcon size={18} color="#001b3a" />
            </span>
            <strong style={{ fontSize: '0.92rem' }}>Kelola Mesin dan Modul</strong>
          </div>
          <span style={{ color: '#94a3b8', fontSize: '1.2rem' }}>›</span>
        </div>

        {/* 9. Merchant Bilas / Solecare */}
        <div
          onClick={() => setMerchantModalOpen(true)}
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
              <CreditCardIcon size={18} color="#001b3a" />
            </span>
            <strong style={{ fontSize: '0.92rem' }}>Merchant Solecare</strong>
          </div>
          <span style={{ color: '#94a3b8', fontSize: '1.2rem' }}>›</span>
        </div>

        {/* 10. Keluar Akun */}
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
                  <span>Alamat Toko</span>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                  />
                </label>
                <label className="field">
                  <span>Kapasitas Rak Harian (Pasang / Hari)</span>
                  <input
                    type="number"
                    step="0.5"
                    value={dailyCapacity}
                    onChange={(e) => setDailyCapacity(Number(e.target.value))}
                  />
                </label>
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

      {/* Modal: Kelola Mesin dan Modul */}
      {machineryModalOpen && (
        <ModalPortal>
          <div className="modal-backdrop" onClick={() => setMachineryModalOpen(false)} style={{ zIndex: 9000 }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', width: '92%', margin: '0 auto', padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Kelola Mesin & Rak</h2>
                <button
                  type="button"
                  onClick={() => setMachineryModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <CloseIcon size={18} color="#64748b" />
                </button>
              </div>
              <div style={{ padding: '18px 20px' }} className="stack">
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: '12px' }}>
                  <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>Rak Sepatu Utama (Kapasitas 50 Unit)</strong>
                  <div className="small muted">Status: Terhubung & Optimal</div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: '12px' }}>
                  <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>Mesin Pengering Sepatu UV</strong>
                  <div className="small muted">Status: Aktif</div>
                </div>
                <button
                  type="button"
                  className="btn secondary"
                  style={{ marginTop: '4px', width: '100%', justifyContent: 'center' }}
                  onClick={() => setMachineryModalOpen(false)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal: Merchant Solecare */}
      {merchantModalOpen && (
        <ModalPortal>
          <div className="modal-backdrop" onClick={() => setMerchantModalOpen(false)} style={{ zIndex: 9000 }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', width: '92%', margin: '0 auto', padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Merchant Solecare</h2>
                <button
                  type="button"
                  onClick={() => setMerchantModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <CloseIcon size={18} color="#64748b" />
                </button>
              </div>
              <div style={{ padding: '18px 20px' }} className="stack">
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px', borderRadius: '12px', color: '#166534' }}>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>QRIS Statis Aktif</strong>
                  <div className="small" style={{ lineHeight: 1.45 }}>Settlement langsung ke rekening terdaftar Solecare.</div>
                </div>
                <button
                  type="button"
                  className="btn secondary"
                  style={{ marginTop: '4px', width: '100%', justifyContent: 'center' }}
                  onClick={() => setMerchantModalOpen(false)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
