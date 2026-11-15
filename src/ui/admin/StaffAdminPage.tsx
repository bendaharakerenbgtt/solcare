import React, { useState } from 'react';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import type { StaffUser, Role } from '../../data/types';
import { fmtDateTime } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';
import { ModalPortal } from '../common/ModalPortal';

export const StaffAdminPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { data: staffList, loading, reload } = useAsync(() => repo.listStaff(), []);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('staff');

  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdTarget, setPwdTarget] = useState<StaffUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedEmail(id);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await repo.createStaff({ name, email, password, role });
      setModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal membuat akun');
    }
  };

  const handleToggleActive = async (s: StaffUser) => {
    try {
      await repo.updateStaff(s.id, { active: !s.active });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengubah status');
    }
  };

  const handleChangePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdTarget) return;
    try {
      await repo.changePassword(pwdTarget.id, newPassword);
      setPwdModalOpen(false);
      setNewPassword('');
      alert(`Password untuk akun "${pwdTarget.email}" (${pwdTarget.name}) berhasil diperbarui!`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengubah password');
    }
  };

  const filtered = (staffList || []).filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.role.toLowerCase().includes(q);
  });

  return (
    <div className="stack" style={{ gap: '16px' }}>
      <div className="admin-page-header">
        <h1>Akun Pegawai</h1>
        <button type="button" className="btn sm" onClick={() => setModalOpen(true)}>
          + Pegawai
        </button>
      </div>

      <div className="card">
        {/* Search Wrap (Consistent with other admin pages) */}
        <div className="order-search-wrap" style={{ marginBottom: '16px' }}>
          <svg
            className="order-search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="order-search-field"
            placeholder="Cari nama, email, atau role pegawai..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="order-search-clear"
              onClick={() => setSearch('')}
              title="Hapus pencarian"
            >
              ✕
            </button>
          )}
        </div>

        {loading ? (
          <div className="empty">Memuat akun pegawai...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">Tidak ada akun pegawai yang sesuai.</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="desktop-only-table">
              <div className="table-scroll-hint">Geser ke samping untuk melihat tabel lengkap</div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nama Pegawai</th>
                      <th>Email (Akun Login)</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Dibuat Pada</th>
                      <th className="right">Aksi &amp; Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <strong>{s.name}</strong>
                          {s.id === currentUser?.id && (
                            <span className="xs teal" style={{ marginLeft: '6px' }}>
                              (Anda)
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <strong className="mono" style={{ color: '#001b3a', fontSize: '0.84rem' }}>{s.email}</strong>
                            <button
                              type="button"
                              onClick={() => handleCopy(s.email, s.id)}
                              title="Salin email login"
                              style={{
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '2px 6px',
                                fontSize: '0.68rem',
                                cursor: 'pointer',
                                color: '#475569',
                              }}
                            >
                              {copiedEmail === s.id ? '✓ Tersalin' : 'Salin'}
                            </button>
                          </div>
                        </td>
                        <td>
                          <span className="badge teal" style={{ textTransform: 'uppercase' }}>
                            {s.role}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${s.active ? 'ok' : 'danger'}`}>
                            {s.active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="small muted">{fmtDateTime(s.createdAt)}</td>
                        <td className="right">
                          <button
                            type="button"
                            className="btn sm"
                            style={{ background: '#001b3a', color: '#ffffff' }}
                            onClick={() => {
                              setPwdTarget(s);
                              setPwdModalOpen(true);
                              setNewPassword('');
                              setShowPassword(false);
                            }}
                          >
                            🔑 Ubah Password
                          </button>
                          {s.id !== currentUser?.id && (
                            <button
                              type="button"
                              className={`btn ${s.active ? 'danger' : 'secondary'} sm`}
                              style={{ marginLeft: '6px' }}
                              onClick={() => void handleToggleActive(s)}
                            >
                              {s.active ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View (Touch-friendly responsive) */}
            <div className="mobile-only-cards">
              {filtered.map((s) => (
                <div key={s.id} className="staff-mobile-card" style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', background: '#ffffff', marginBottom: '10px' }}>
                  <div className="service-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <strong className="service-card-name" style={{ fontSize: '1rem', color: '#0f172a' }}>{s.name}</strong>
                      {s.id === currentUser?.id && (
                        <span className="badge teal" style={{ marginLeft: '6px', fontSize: '0.68rem' }}>
                          Akun Anda
                        </span>
                      )}
                    </div>
                    <span className={`badge ${s.active ? 'ok' : 'danger'}`}>
                      {s.active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>

                  {/* Info Akun Login */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      margin: '8px 0',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>
                      Akun Login (Email):
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <strong className="mono" style={{ fontSize: '0.86rem', color: '#001b3a', wordBreak: 'break-all' }}>
                        {s.email}
                      </strong>
                      <button
                        type="button"
                        onClick={() => handleCopy(s.email, s.id)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: '#334155',
                          flexShrink: 0,
                        }}
                      >
                        {copiedEmail === s.id ? '✓ Tersalin' : 'Salin'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                      <span className="badge teal" style={{ textTransform: 'uppercase', fontSize: '0.68rem' }}>
                        Hak Akses: {s.role === 'admin' ? 'Administrator' : 'Staff Operasional'}
                      </span>
                      <span className="xs muted">
                        Dibuat: {fmtDateTime(s.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="service-card-footer" style={{ marginTop: '10px' }}>
                    <div className="service-card-actions" style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn sm"
                        style={{ flex: 1, background: '#001b3a', color: '#ffffff', justifyContent: 'center' }}
                        onClick={() => {
                          setPwdTarget(s);
                          setPwdModalOpen(true);
                          setNewPassword('');
                          setShowPassword(false);
                        }}
                      >
                        🔑 Ubah Password
                      </button>
                      {s.id !== currentUser?.id && (
                        <button
                          type="button"
                          className={`btn ${s.active ? 'danger' : 'secondary'} sm`}
                          onClick={() => void handleToggleActive(s)}
                        >
                          {s.active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <ModalPortal>
        <div className="modal-backdrop">
          <div className="modal">
            <header>
              <h3>Tambah Pegawai Baru</h3>
              <button type="button" className="x" onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </header>
            <form onSubmit={handleCreate}>
              <div className="body stack" style={{ gap: '14px' }}>
                <label className="field">
                  <span>Nama Lengkap *</span>
                  <input
                    type="text"
                    placeholder="Nama staf"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Email Login *</span>
                  <input
                    type="email"
                    placeholder="staf@solefulsoaks.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Password Awal *</span>
                  <input
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Role Akses *</span>
                  <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                    <option value="staff">Staff Operasional (Pengerjaan & Kasir)</option>
                    <option value="admin">Administrator (Akses Penuh)</option>
                  </select>
                </label>
              </div>
              <footer>
                <button type="button" className="btn secondary" onClick={() => setModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn">
                  Simpan Pegawai
                </button>
              </footer>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {pwdModalOpen && pwdTarget && (
        <ModalPortal>
        <div className="modal-backdrop" onClick={() => setPwdModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <h3>Ubah Password Pegawai</h3>
              <button type="button" className="x" onClick={() => setPwdModalOpen(false)}>
                ✕
              </button>
            </header>
            <form onSubmit={handleChangePwd}>
              <div className="body stack" style={{ gap: '14px' }}>
                {/* Info Identitas Akun yang Sedang Diubah */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: '2px' }}>
                    Mengubah Password Untuk Akun:
                  </div>
                  <strong style={{ fontSize: '0.96rem', color: '#0f172a', display: 'block' }}>
                    {pwdTarget.name}
                  </strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span className="mono" style={{ fontSize: '0.84rem', color: '#001b3a', fontWeight: 600 }}>
                      {pwdTarget.email}
                    </span>
                    <span className="badge teal" style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                      {pwdTarget.role}
                    </span>
                  </div>
                </div>

                <label className="field">
                  <span>Masukkan Password Baru *</span>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimal 6 karakter..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      autoFocus
                      style={{ paddingRight: '40px', width: '100%' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        padding: '4px',
                      }}
                      title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                    Pastikan password baru dicatat atau langsung diinformasikan ke pegawai terkait.
                  </span>
                </label>
              </div>
              <footer>
                <button type="button" className="btn secondary" onClick={() => setPwdModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn" style={{ background: '#001b3a' }}>
                  Simpan Password Baru
                </button>
              </footer>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};
