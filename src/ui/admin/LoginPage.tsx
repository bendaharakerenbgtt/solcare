import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export const LoginPage: React.FC = () => {
  const { user, needsSetup, signIn, setupFirstAdmin, quickDemoLogin } = useAuth();

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

  const handleQuickLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await quickDemoLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login demo gagal');
      setEmail('admin@solefulsoaks.id');
      setPassword('admin12345');
      if (needsSetup) setName('Rafi (Admin Solecare)');
    } finally {
      setLoading(false);
    }
  };

  const fillTemplate = () => {
    setEmail('admin@solefulsoaks.id');
    setPassword('admin12345');
    if (needsSetup) setName('Rafi (Admin Solecare)');
    setError(null);
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

        {/* Highlighted 1-Click Fast Login for Mitra / Staff */}
        <div style={{ marginBottom: '20px', padding: '12px', background: '#f0f4f9', border: '1px solid #cbd5e1', borderRadius: '10px' }}>
          <div className="xs" style={{ color: '#001b3a', fontWeight: 700, marginBottom: '8px' }}>
            Akses Cepat Uji Coba Mitra / Staff:
          </div>
          <button
            type="button"
            className="btn"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '0.88rem',
              fontWeight: 700,
              background: '#001b3a',
              color: '#ffffff',
              border: 'none',
              boxShadow: '0 2px 6px rgba(0, 27, 58, 0.25)',
              cursor: 'pointer',
            }}
            onClick={handleQuickLogin}
          >
            {loading ? 'Menghubungkan...' : 'Masuk Instan 1-Klik'}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
            <span className="mono xs muted" style={{ fontSize: '0.72rem' }}>admin@solefulsoaks.id</span>
            <button
              type="button"
              className="btn text xs"
              style={{ padding: '2px 6px', fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}
              onClick={fillTemplate}
            >
              Isi ke Form
            </button>
          </div>
        </div>

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

          <button type="submit" className="btn" disabled={loading} style={{ marginTop: '8px', height: '46px', fontSize: '1rem' }}>
            {loading ? 'Memproses...' : needsSetup ? 'Buat Akun Administrator' : 'Masuk Dashboard'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '18px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
          <a href="/" className="small muted" style={{ textDecoration: 'none' }}>
            ← Kembali ke Website Pelanggan
          </a>
        </div>
      </div>
    </div>
  );
};
