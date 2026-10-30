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

        {/* Quick Demo Template Fill & Instant Login Button */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed var(--line)' }}>
          <div className="small muted" style={{ marginBottom: '8px' }}>
            <strong>Akses Cepat Uji Coba (Mitra / Staff):</strong> Klik tombol di bawah untuk langsung masuk ke dashboard tanpa mengetik manual:
          </div>
          <div className="stack" style={{ gap: '8px' }}>
            <button
              type="button"
              className="btn secondary sm"
              disabled={loading}
              style={{ width: '100%', padding: '10px 12px', whiteSpace: 'normal', lineHeight: 1.4, fontWeight: 700, borderColor: 'var(--primary)', color: 'var(--primary)' }}
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  if (needsSetup) {
                    await repo.setupFirstAdmin({
                      name: 'Rafi (Admin Solecare)',
                      email: 'admin@solefulsoaks.id',
                      password: 'admin12345',
                    });
                    await refresh();
                  } else {
                    await signIn('admin@solefulsoaks.id', 'admin12345');
                  }
                  navigate('/admin');
                } catch {
                  setEmail('admin@solefulsoaks.id');
                  setPassword('admin12345');
                  if (needsSetup) setName('Rafi (Admin Solecare)');
                } finally {
                  setLoading(false);
                }
              }}
            >
              Masuk Instan 1-Klik (admin@solefulsoaks.id / admin12345)
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '18px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
          <a href="/" className="small muted" style={{ textDecoration: 'none' }}>
            ← Kembali ke Website Pelanggan
          </a>
        </div>
      </div>
    </div>
  );
};
