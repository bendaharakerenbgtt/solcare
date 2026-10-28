import React, { useState } from 'react';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import type { StaffUser, Role } from '../../data/types';
import { fmtDateTime } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';

export const StaffAdminPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { data: staffList, reload } = useAsync(() => repo.listStaff(), []);

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

  return (
    <div className="stack" style={{ gap: '20px' }}>
      <div className="admin-top">
        <div>
          <h1>Akun Pegawai & Administrator</h1>
          <p className="small muted">
            Kelola hak akses dan staf operasional toko.
          </p>
        </div>
        <div className="spacer" />
        <button type="button" className="btn" onClick={() => setModalOpen(true)}>
          + Tambah Pegawai
        </button>
      </div>

      <div className="card">
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
              {staffList?.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                    {s.id === currentUser?.id && <span className="xs teal" style={{ marginLeft: '6px' }}>(Anda)</span>}
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
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Email Akun *</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Password Awal *</span>
                  <input
                    type="password"
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Role Akses</span>
                  <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                    <option value="staff">Staff Operasional</option>
                    <option value="admin">Administrator</option>
                  </select>
                </label>
              </div>
              <footer>
                <button type="button" className="btn secondary" onClick={() => setModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn">
                  Buat Akun
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
              <h3>Ubah Kata Sandi Pegawai</h3>
              <button type="button" className="x" onClick={() => setPwdModalOpen(false)}>
                ✕
              </button>
            </header>
            <form onSubmit={handleChangePwd}>
              <div className="body stack" style={{ gap: '14px' }}>
                <label className="field">
                  <span>Kata Sandi Baru *</span>
                  <input
                    type="password"
                    placeholder="Minimal 8 karakter"
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
                  Simpan Sandi Baru
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
