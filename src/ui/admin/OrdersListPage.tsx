import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { fmtDateTime, rupiah, STATUS_LABEL, displayCode, whatsappLink } from '../../lib/format';
import { isLate } from '../../lib/estimation';
import type { Order } from '../../data/types';
import { WhatsAppIcon } from '../common/Icons';

type BilasTab = 'konfirmasi' | 'penjemputan' | 'validasi' | 'antrian' | 'proses' | 'siap_ambil' | 'siap_antar' | 'semua';

export const OrdersListPage: React.FC = () => {
  const { user } = useAuth();
  const { data: orders, loading } = useAsync(() => repo.listOrders(), []);
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = (searchParams.get('tab') as BilasTab) || 'antrian';
  const [activeTab, setActiveTab] = useState<BilasTab>(tabParam);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');

  const now = new Date();

  const handleSelectTab = (tab: BilasTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Group counts for Bilas tabs
  const waitingOrders = (orders || []).filter((o) => o.status === 'menunggu');
  const processOrders = (orders || []).filter(
    (o) => o.status === 'pencucian' || o.status === 'pengeringan' || o.status === 'finishing'
  );
  const readyOrders = (orders || []).filter((o) => o.status === 'selesai');

  // Filter orders by Bilas tab
  const filtered = (orders || []).filter((o) => {
    // Tab filter
    if (activeTab === 'antrian' && o.status !== 'menunggu') return false;
    if (activeTab === 'proses' && !['pencucian', 'pengeringan', 'finishing'].includes(o.status)) return false;
    if (activeTab === 'siap_ambil' && o.status !== 'selesai') return false;
    if (activeTab === 'konfirmasi') return false; // Solecare regular store has 0 in pickup/confirm unless enabled
    if (activeTab === 'penjemputan') return false;
    if (activeTab === 'validasi') return false;
    if (activeTab === 'siap_antar') return false;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const codeMatch = o.code.toLowerCase().includes(q) || displayCode(o.code).toLowerCase().includes(q);
      const nameMatch = o.customerName.toLowerCase().includes(q);
      const phoneMatch = o.customerPhone.includes(q);
      const itemMatch = `${o.itemType} ${o.brand} ${o.model}`.toLowerCase().includes(q);
      return codeMatch || nameMatch || phoneMatch || itemMatch;
    }
    return true;
  });

  return (
    <div className="stack" style={{ gap: '14px' }}>
      {/* 1. Header Sapaan & Icons Persis Screenshot Bilas: Hai, [Nama] \n Ini status orderan kamu */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px', marginBottom: '2px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Hai, {user?.name || 'coba'}
          </h1>
          <span style={{ fontSize: '0.84rem', color: '#64748b' }}>Ini status orderan kamu</span>
        </div>

        {/* Action icons right (Search, History, QR Scanner) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            style={{
              background: searchOpen ? '#f0f4f9' : 'transparent',
              border: 'none',
              padding: '6px',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#001b3a',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Cari Pesanan"
            aria-label="Cari Pesanan"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#001b3a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab(activeTab === 'semua' ? 'antrian' : 'semua')}
            style={{
              background: activeTab === 'semua' ? '#f0f4f9' : 'transparent',
              border: 'none',
              padding: '6px',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#001b3a',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Riwayat Semua Pesanan"
            aria-label="Riwayat Semua Pesanan"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#001b3a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => alert('Fitur kamera scanner QR siap digunakan')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#001b3a',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Scan QR Transaksi"
            aria-label="Scan QR Transaksi"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#001b3a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable Search Input */}
      {searchOpen && (
        <div className="order-search-wrap" style={{ margin: '0 0 4px 0' }}>
          <svg className="order-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="order-search-field"
            placeholder="Cari kode pesanan, nama pelanggan, no. WA, atau barang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <button
              type="button"
              className="order-search-clear"
              onClick={() => setSearch('')}
              title="Hapus pencarian"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* 2. Bilas Horizontal Scroll Status Tabs (Screenshot Bilas) */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <button
          type="button"
          onClick={() => handleSelectTab('konfirmasi')}
          style={{
            padding: '7px 14px',
            borderRadius: '999px',
            border: activeTab === 'konfirmasi' ? 'none' : '1px solid #e2e8f0',
            background: activeTab === 'konfirmasi' ? '#001b3a' : '#ffffff',
            color: activeTab === 'konfirmasi' ? '#ffffff' : '#475569',
            fontSize: '0.82rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Konfirmasi
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('penjemputan')}
          style={{
            padding: '7px 14px',
            borderRadius: '999px',
            border: activeTab === 'penjemputan' ? 'none' : '1px solid #e2e8f0',
            background: activeTab === 'penjemputan' ? '#001b3a' : '#ffffff',
            color: activeTab === 'penjemputan' ? '#ffffff' : '#475569',
            fontSize: '0.82rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Penjemputan
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('validasi')}
          style={{
            padding: '7px 14px',
            borderRadius: '999px',
            border: activeTab === 'validasi' ? 'none' : '1px solid #e2e8f0',
            background: activeTab === 'validasi' ? '#001b3a' : '#ffffff',
            color: activeTab === 'validasi' ? '#ffffff' : '#475569',
            fontSize: '0.82rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Validasi
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('antrian')}
          style={{
            padding: '7px 14px',
            borderRadius: '999px',
            border: activeTab === 'antrian' ? 'none' : '1px solid #e2e8f0',
            background: activeTab === 'antrian' ? '#001b3a' : '#ffffff',
            color: activeTab === 'antrian' ? '#ffffff' : '#475569',
            fontSize: '0.82rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          Antrian
          {waitingOrders.length > 0 && (
            <span
              style={{
                background: activeTab === 'antrian' ? '#bf2f3b' : '#f1f5f9',
                color: activeTab === 'antrian' ? '#ffffff' : '#001b3a',
                fontSize: '0.72rem',
                borderRadius: '999px',
                padding: '1px 6px',
              }}
            >
              {waitingOrders.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('proses')}
          style={{
            padding: '7px 14px',
            borderRadius: '999px',
            border: activeTab === 'proses' ? 'none' : '1px solid #e2e8f0',
            background: activeTab === 'proses' ? '#001b3a' : '#ffffff',
            color: activeTab === 'proses' ? '#ffffff' : '#475569',
            fontSize: '0.82rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          Proses
          {processOrders.length > 0 && (
            <span
              style={{
                background: activeTab === 'proses' ? '#bf2f3b' : '#f1f5f9',
                color: activeTab === 'proses' ? '#ffffff' : '#001b3a',
                fontSize: '0.72rem',
                borderRadius: '999px',
                padding: '1px 6px',
              }}
            >
              {processOrders.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('siap_ambil')}
          style={{
            padding: '7px 14px',
            borderRadius: '999px',
            border: activeTab === 'siap_ambil' ? 'none' : '1px solid #e2e8f0',
            background: activeTab === 'siap_ambil' ? '#001b3a' : '#ffffff',
            color: activeTab === 'siap_ambil' ? '#ffffff' : '#475569',
            fontSize: '0.82rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          Siap Ambil
          {readyOrders.length > 0 && (
            <span
              style={{
                background: activeTab === 'siap_ambil' ? '#bf2f3b' : '#f1f5f9',
                color: activeTab === 'siap_ambil' ? '#ffffff' : '#001b3a',
                fontSize: '0.72rem',
                borderRadius: '999px',
                padding: '1px 6px',
              }}
            >
              {readyOrders.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('siap_antar')}
          style={{
            padding: '7px 14px',
            borderRadius: '999px',
            border: activeTab === 'siap_antar' ? 'none' : '1px solid #e2e8f0',
            background: activeTab === 'siap_antar' ? '#001b3a' : '#ffffff',
            color: activeTab === 'siap_antar' ? '#ffffff' : '#475569',
            fontSize: '0.82rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Siap Antar
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('semua')}
          style={{
            padding: '7px 14px',
            borderRadius: '999px',
            border: activeTab === 'semua' ? 'none' : '1px solid #e2e8f0',
            background: activeTab === 'semua' ? '#001b3a' : '#ffffff',
            color: activeTab === 'semua' ? '#ffffff' : '#475569',
            fontSize: '0.82rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Semua
        </button>
      </div>

      {/* 3. Orders Content / Empty State Persis Bilas Screenshot */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 16px', color: '#64748b' }}>
          Memuat pesanan...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px 60px' }}>
          <img
            src="/bilas_icons/img_nodata.webp"
            alt="Belum ada data"
            style={{ width: '220px', maxWidth: '75%', margin: '0 auto 16px', display: 'block' }}
          />
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
            Belum ada data
          </div>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Tidak ada transaksi pada tahapan ini
          </span>
        </div>
      ) : (
        <div className="stack" style={{ gap: '12px' }}>
          {filtered.map((o: Order) => {
            const late = isLate(o, now) && o.status !== 'diambil';
            const waUrl = whatsappLink(o.customerPhone, `Halo Kak ${o.customerName}, info pesanan ${o.code} di Soleful Soaks!`);
            const isPaid = o.payment?.status === 'lunas';

            return (
              <div
                key={o.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '14px 16px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {/* Header Row: Customer Name & Code */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <strong style={{ fontSize: '0.98rem', color: '#0f172a' }}>{o.customerName}</strong>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontFamily: 'monospace' }}>
                      {displayCode(o.code)}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      background: o.status === 'selesai' ? '#dcfce7' : o.status === 'menunggu' ? '#f1f5f9' : '#e0f2fe',
                      color: o.status === 'selesai' ? '#15803d' : o.status === 'menunggu' ? '#334155' : '#0369a1',
                    }}
                  >
                    {STATUS_LABEL[o.status]}
                  </span>
                </div>

                {/* Item & Service Description */}
                <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                  <div style={{ fontWeight: 600 }}>{o.brand} {o.model}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {o.services.map((s) => s.name).join(', ')}
                  </div>
                </div>

                {/* Price, Payment & Target Date */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#001b3a' }}>
                      {rupiah(o.total)}
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: isPaid ? '#15803d' : '#b45309',
                      }}
                    >
                      {isPaid ? '● LUNAS' : '○ BELUM LUNAS'}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: late ? '#dc2626' : '#64748b' }}>
                      {late ? 'Terlambat: ' : 'Target: '}
                      {o.estimatedAt ? fmtDateTime(o.estimatedAt) : '-'}
                    </div>
                  </div>
                </div>

                {/* Actions: WA & Detail */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: '#22c55e',
                        color: '#ffffff',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        flex: '0 0 auto',
                      }}
                    >
                      <WhatsAppIcon size={16} color="#ffffff" />
                      <span>WA</span>
                    </a>
                  )}
                  <Link
                    to={`/admin/orders/${o.id}`}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#001b3a',
                      color: '#ffffff',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    Detail Pesanan →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
