import React, { useState } from 'react';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import type { StaffUser, Role } from '../../data/types';
import { fmtDateTime } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';

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
  const [pwdTargetId, setPwdTargetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

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
    if (!pwdTargetId) return;
    try {
      await repo.changePassword(pwdTargetId, newPassword);
      setPwdModalOpen(false);
      setNewPassword('');
      alert('Password berhasil diubah.');
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
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Dibuat Pada</th>
                      <th className="right">Aksi</th>
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
                        <td>{s.email}</td>
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
                            className="btn secondary sm"
                            onClick={() => {
                              setPwdTargetId(s.id);
                              setPwdModalOpen(true);
                            }}
                          >
                            Ubah Password
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
                <div key={s.id} className="staff-mobile-card">
                  <div className="service-card-top">
                    <div>
                      <strong className="service-card-name">{s.name}</strong>
                      {s.id === currentUser?.id && (
                        <span className="badge teal" style={{ marginLeft: '6px', fontSize: '0.7rem' }}>
                          Anda
                        </span>
                      )}
                    </div>
                    <span className={`badge ${s.active ? 'ok' : 'danger'}`}>
                      {s.active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>

                  <div className="service-card-badges">
                    <span className="badge teal" style={{ textTransform: 'uppercase', fontSize: '0.72rem' }}>
                      Role: {s.role}
                    </span>
                    <span className="mono xs muted" style={{ wordBreak: 'break-all' }}>
                      {s.email}
                    </span>
                  </div>

                  <div className="service-card-meta-row">
                    <span className="xs muted">Terdaftar: {fmtDateTime(s.createdAt)}</span>
                  </div>

                  <div className="service-card-footer">
                    <div className="service-card-actions">
                      <button
                        type="button"
                        className="btn secondary sm"
                        onClick={() => {
                          setPwdTargetId(s.id);
                          setPwdModalOpen(true);
                        }}
                      >
                        Ubah Password
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
      )}

      {pwdModalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <header>
              <h3>Ubah Password Pegawai</h3>
              <button type="button" className="x" onClick={() => setPwdModalOpen(false)}>
                ✕
              </button>
            </header>
            <form onSubmit={handleChangePwd}>
              <div className="body stack" style={{ gap: '14px' }}>
                <label className="field">
                  <span>Password Baru *</span>
                  <input
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </label>
              </div>
              <footer>
                <button type="button" className="btn secondary" onClick={() => setPwdModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn">
                  Perbarui Password
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
