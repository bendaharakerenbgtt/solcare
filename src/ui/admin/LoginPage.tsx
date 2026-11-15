import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export const LoginPage: React.FC = () => {
  const { user, needsSetup, signIn, setupFirstAdmin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/admin" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (needsSetup) {
        await setupFirstAdmin({ name, email, password });
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div className="brand-mark" style={{ margin: '0 auto 12px', width: '56px', height: '56px', borderRadius: '14px', overflow: 'hidden' }}>
            <img src="/solecare_logo.jpg" alt="Solecare Logo" />
          </div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>{needsSetup ? 'Inisialisasi Akun Admin' : 'Login Pegawai'}</h2>
          <p className="small muted" style={{ margin: 0 }}>
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
              name="email"
              autoComplete="email"
              spellCheck={false}
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
              name="password"
              autoComplete="current-password"
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button type="submit" className="btn" disabled={loading} style={{ marginTop: '8px', height: '46px', fontSize: '1rem' }}>
            {loading ? 'Memproses…' : needsSetup ? 'Buat Akun Administrator' : 'Masuk Dashboard'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '18px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
          <Link to="/" className="small muted" style={{ textDecoration: 'none' }}>
            ← Kembali ke Website Pelanggan
          </Link>
        </div>
      </div>
    </div>
  );
};
