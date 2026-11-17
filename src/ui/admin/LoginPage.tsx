import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export const LoginPage: React.FC = () => {
  const { user, needsSetup, signIn, setupFirstAdmin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
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

  const handleQuickDemo = async () => {
    setDemoLoading(true);
    setError(null);
    try {
      // 1. Coba login otomatis dengan akun default admin
      await signIn('admin@solefulsoaks.id', 'admin12345');
    } catch {
      try {
        // 2. Fallback: panggil setup/quick demo bawaan jika belum terdaftar
        await setupFirstAdmin({
          name: 'Demo Admin (Portofolio)',
          email: 'admin@solefulsoaks.id',
          password: 'admin12345',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Login cepat demo gagal');
      }
    } finally {
      setDemoLoading(false);
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

          <button type="submit" className="btn" disabled={loading || demoLoading} style={{ marginTop: '8px', height: '46px', fontSize: '1rem' }}>
            {loading ? 'Memproses…' : needsSetup ? 'Buat Akun Administrator' : 'Masuk Dashboard'}
          </button>
        </form>

        {/* Tombol Login Cepat untuk Review Portofolio / Demo Showcase */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Mode Demo Portofolio
            </span>
            <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 500 }}>
              1-Klik Akses
            </span>
          </div>

          <button
            type="button"
            onClick={handleQuickDemo}
            disabled={loading || demoLoading}
            style={{
              width: '100%',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: '#00264d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.92rem',
              fontWeight: 600,
              cursor: loading || demoLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(0, 38, 77, 0.2)',
              transition: 'all 0.2s ease',
            }}
          >
            {demoLoading ? (
              'Menyiapkan Sesi Demo…'
            ) : (
              <>
                <span>⚡</span>
                <span>Masuk Cepat Demo (Akses Admin)</span>
              </>
            )}
          </button>
          <p className="small muted" style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '6px', marginBottom: 0 }}>
            Untuk demonstrasi fitur &amp; review portofolio tanpa perlu input kredensial manual.
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '18px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
          <Link to="/" className="small muted" style={{ textDecoration: 'none' }}>
            ← Kembali ke Website Pelanggan
          </Link>
        </div>
      </div>
    </div>
  );
};
