import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { repo } from '../../data';

export const LoginPage: React.FC = () => {
  const { user, needsSetup, signIn, refresh } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    navigate('/admin', { replace: true });
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (needsSetup) {
        await repo.setupFirstAdmin({ name, email, password });
        await refresh();
      } else {
        await signIn(email, password);
      }
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="brand-mark" style={{ margin: '0 auto 12px' }}>
            SS
          </div>
          <h2>{needsSetup ? 'Inisialisasi Akun Admin' : 'Login Pegawai'}</h2>
          <p className="small muted">
            {needsSetup
              ? 'Belum ada akun terdaftar. Daftarkan akun Administrator pertama Anda.'
              : 'Masuk untuk mengelola operasional Soleful Soaks! Shoes Care.'}
          </p>
        </div>

        {error && (
          <div className="alert error" style={{ marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="stack">
          {needsSetup && (
            <label className="field">
              <span>Nama Lengkap *</span>
              <input
                type="text"
                placeholder="Misal: Budi Santoso"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          )}

          <label className="field">
            <span>Email *</span>
            <input
              type="email"
              placeholder="admin@solefulsoaks.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Password *</span>
            <input
              type="password"
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button type="submit" className="btn" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? 'Memproses...' : needsSetup ? 'Buat Akun Administrator' : 'Masuk Dashboard'}
          </button>
        </form>

        {/* Quick Demo Template Fill Button */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed var(--line)' }}>
          <div className="small muted" style={{ marginBottom: '8px' }}>
            🧪 <strong>Template Cepat Demo:</strong> Klik tombol di bawah untuk mengisi form login/registrasi secara otomatis:
          </div>
          <button
            type="button"
            className="btn secondary sm"
            style={{ width: '100%' }}
            onClick={() => {
              if (needsSetup) {
                setName('Admin Solecare');
              }
              setEmail('admin@solefulsoaks.id');
              setPassword('admin12345');
            }}
          >
            ⚡ Isi Otomatis Akun Admin (admin@solefulsoaks.id / admin12345)
          </button>
        </div>
      </div>
    </div>
  );
};
