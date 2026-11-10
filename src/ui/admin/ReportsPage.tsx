import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { rupiah } from '../../lib/format';
import { isLate } from '../../lib/estimation';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { data: orders } = useAsync(() => repo.listOrders(), []);
  const [expandedSection, setExpandedSection] = useState<string | null>('ringkasan');

  const now = new Date();

  // Statistics calculation
  const totalOrders = (orders || []).length;
  const paidOrders = (orders || []).filter((o) => o.payment.status === 'lunas');
  const unpaidOrders = (orders || []).filter((o) => o.payment.status === 'belum_lunas');
  const realRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const pendingRevenue = unpaidOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOmzet = (orders || []).reduce((sum, o) => sum + o.total, 0);

  // QRIS vs Cash
  const qrisOrders = paidOrders.filter((o) => o.payment.method === 'qris');
  const cashOrders = paidOrders.filter((o) => o.payment.method === 'tunai');
  const qrisRevenue = qrisOrders.reduce((sum, o) => sum + o.total, 0);
  const cashRevenue = cashOrders.reduce((sum, o) => sum + o.total, 0);
  const qrisPct = realRevenue > 0 ? Math.round((qrisRevenue / realRevenue) * 100) : 0;
  const cashPct = realRevenue > 0 ? Math.round((cashRevenue / realRevenue) * 100) : 0;

  // Late orders
  const lateOrders = (orders || []).filter((o) => isLate(o, now) && o.status !== 'diambil');

  // Top services
  const serviceCount = new Map<string, { count: number; revenue: number }>();
  (orders || []).forEach((o) => {
    o.services.forEach((s) => {
      const cur = serviceCount.get(s.name) || { count: 0, revenue: 0 };
      serviceCount.set(s.name, {
        count: cur.count + 1,
        revenue: cur.revenue + (o.payment.status === 'lunas' ? s.price : 0),
      });
    });
  });
  const topServices = Array.from(serviceCount.entries()).sort((a, b) => b[1].count - a[1].count);

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const handleExportCSV = () => {
    if (!orders || orders.length === 0) {
      alert('Belum ada data transaksi untuk diekspor.');
      return;
    }
    const headers = ['Kode', 'Tanggal', 'Pelanggan', 'No WA', 'Barang', 'Layanan', 'Total', 'Status', 'Metode Bayar'];
    const rows = orders.map((o) => [
      o.code,
      new Date(o.receivedAt).toLocaleDateString('id-ID'),
      `"${o.customerName}"`,
      `"${o.customerPhone}"`,
      `"${o.itemType} ${o.brand} ${o.model}"`,
      `"${o.services.map((s) => s.name).join(', ')}"`,
      o.total,
      o.status,
      o.payment.method,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laporan_solecare_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="stack" style={{ gap: '14px' }}>
      {/* 1. Header Sapaan Persis Bilas: Hai, [Nama] \n Ini adalah laporan usaha laundry kamu */}
      <div style={{ marginTop: '2px', marginBottom: '4px' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Hai, {user?.name || 'coba'}
        </h1>
        <span style={{ fontSize: '0.84rem', color: '#64748b' }}>Ini adalah laporan usaha laundry kamu</span>
      </div>

      {/* 2. Top Card: Ringkasan Outlet (Persis Bilas Screenshot) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          border: '1px solid #e2e8f0',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          cursor: 'pointer',
        }}
        onClick={() => toggleSection('ringkasan')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/bilas_icons/icon_lap_ringkasan.webp"
            alt="Ringkasan Outlet"
            style={{ width: '52px', height: '52px', objectFit: 'contain' }}
          />
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block', fontSize: '1.05rem', color: '#f97316', fontWeight: 800 }}>
              Ringkasan Outlet
            </strong>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Performa keseluruhan outlet kamu
            </span>
          </div>
          <span style={{ color: '#94a3b8', fontSize: '1.2rem', transform: expandedSection === 'ringkasan' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
            ›
          </span>
        </div>

        {expandedSection === 'ringkasan' && (
          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Total Omset</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#001b3a' }}>{rupiah(totalOmzet)}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Pendapatan Lunas</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#15803d' }}>{rupiah(realRevenue)}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Piutang / Kasbon</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: pendingRevenue > 0 ? '#b91c1c' : '#334155' }}>
                  {rupiah(pendingRevenue)}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Total Transaksi</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#001b3a' }}>{totalOrders} Order</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. 7 Accordion Cards Persis Bilas Screenshot */}
      <div className="stack" style={{ gap: '10px' }}>
        {/* 1. Laporan Keuangan */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
          }}
          onClick={() => toggleSection('keuangan')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/bilas_icons/icon_lap_keuangan.webp" alt="Laporan Keuangan" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '0.98rem', color: '#0f172a' }}>Laporan Keuangan</strong>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Analisis omzet, pendapatan, kasbon, laba rugi</span>
            </div>
            <span style={{ color: '#94a3b8', fontSize: '1.2rem', transform: expandedSection === 'keuangan' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              ›
            </span>
          </div>

          {expandedSection === 'keuangan' && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <div className="bilas-finance-breakdown-table">
                <div className="bilas-finance-breakdown-row">
                  <span>Metode Pembayaran QRIS</span>
                  <strong>{rupiah(qrisRevenue)} ({qrisPct}%)</strong>
                </div>
                <div className="bilas-finance-breakdown-row">
                  <span>Metode Pembayaran Tunai</span>
                  <strong>{rupiah(cashRevenue)} ({cashPct}%)</strong>
                </div>
                <div className="bilas-finance-breakdown-row">
                  <span>Piutang Belum Lunas</span>
                  <strong style={{ color: '#b91c1c' }}>{rupiah(pendingRevenue)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Laporan Transaksi */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
          }}
          onClick={() => toggleSection('transaksi')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/bilas_icons/icon_lap_transaksi.webp" alt="Laporan Transaksi" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '0.98rem', color: '#0f172a' }}>Laporan Transaksi</strong>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Riwayat transaksi masuk, selesai, dan batal</span>
            </div>
            <span style={{ color: '#94a3b8', fontSize: '1.2rem', transform: expandedSection === 'transaksi' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              ›
            </span>
          </div>

          {expandedSection === 'transaksi' && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <div className="bilas-finance-breakdown-table">
                <div className="bilas-finance-breakdown-row">
                  <span>Transaksi Lunas</span>
                  <strong>{paidOrders.length} Order</strong>
                </div>
                <div className="bilas-finance-breakdown-row">
                  <span>Transaksi Belum Lunas</span>
                  <strong>{unpaidOrders.length} Order</strong>
                </div>
                <div className="bilas-finance-breakdown-row">
                  <span>Pesanan Melewati Target</span>
                  <strong style={{ color: lateOrders.length > 0 ? '#b91c1c' : 'inherit' }}>{lateOrders.length} Order</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Laporan Mesin */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
          }}
          onClick={() => toggleSection('mesin')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/bilas_icons/icon_lap_mesin.webp" alt="Laporan Mesin" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '0.98rem', color: '#0f172a' }}>Laporan Mesin</strong>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Penggunaan rak, mesin cuci & pengering</span>
            </div>
            <span style={{ color: '#94a3b8', fontSize: '1.2rem', transform: expandedSection === 'mesin' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              ›
            </span>
          </div>

          {expandedSection === 'mesin' && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '0.85rem', color: '#334155' }}>
              <div className="bilas-finance-breakdown-table">
                <div className="bilas-finance-breakdown-row">
                  <span>Kapasitas Rak Harian</span>
                  <strong>8.5 Pasang / Hari</strong>
                </div>
                <div className="bilas-finance-breakdown-row">
                  <span>Status Rak Pengerjaan</span>
                  <strong style={{ color: '#15803d' }}>Normal & Optimal</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Laporan Persediaan */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
          }}
          onClick={() => toggleSection('persediaan')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/bilas_icons/icon_lap_persediaan.webp" alt="Laporan Persediaan" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '0.98rem', color: '#0f172a' }}>Laporan Persediaan</strong>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Stok produk, sabun, pewangi, packaging</span>
            </div>
            <span style={{ color: '#94a3b8', fontSize: '1.2rem', transform: expandedSection === 'persediaan' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              ›
            </span>
          </div>

          {expandedSection === 'persediaan' && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <div className="bilas-finance-breakdown-table">
                <div className="bilas-finance-breakdown-row">
                  <span>Pembersih Sepatu (Cleaner)</span>
                  <strong>Tersedia (Aman)</strong>
                </div>
                <div className="bilas-finance-breakdown-row">
                  <span>Parfum & Deodorizer</span>
                  <strong>Tersedia (Aman)</strong>
                </div>
                <div className="bilas-finance-breakdown-row">
                  <span>Plastik Packaging & Tag</span>
                  <strong>Tersedia (Aman)</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Laporan Pegawai */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
          }}
          onClick={() => toggleSection('pegawai')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/bilas_icons/icon_lap_pegawai.webp" alt="Laporan Pegawai" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '0.98rem', color: '#0f172a' }}>Laporan Pegawai</strong>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Produktivitas staf & komisi pengerjaan</span>
            </div>
            <span style={{ color: '#94a3b8', fontSize: '1.2rem', transform: expandedSection === 'pegawai' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              ›
            </span>
          </div>

          {expandedSection === 'pegawai' && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <div className="bilas-finance-breakdown-table">
                <div className="bilas-finance-breakdown-row">
                  <span>Staf Bertugas</span>
                  <strong>{user?.name || 'Admin Solecare'}</strong>
                </div>
                <div className="bilas-finance-breakdown-row">
                  <span>Total Order Ditangani</span>
                  <strong>{totalOrders} Order</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 6. Laporan Pelanggan */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
          }}
          onClick={() => toggleSection('pelanggan')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/bilas_icons/icon_lap_pelanggan.webp" alt="Laporan Pelanggan" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '0.98rem', color: '#0f172a' }}>Laporan Pelanggan</strong>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Aktivitas pelanggan, repeat order & piutang</span>
            </div>
            <span style={{ color: '#94a3b8', fontSize: '1.2rem', transform: expandedSection === 'pelanggan' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              ›
            </span>
          </div>

          {expandedSection === 'pelanggan' && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                Layanan Paling Sering Dipesan:
              </div>
              <div className="bilas-finance-breakdown-table">
                {topServices.slice(0, 4).map(([name, stat]) => (
                  <div key={name} className="bilas-finance-breakdown-row">
                    <span>{name}</span>
                    <strong>{stat.count}x dipesan</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 7. Export Data */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
          }}
          onClick={handleExportCSV}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/bilas_icons/icon_lap_export.webp" alt="Export Data" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '0.98rem', color: '#0f172a' }}>Export Data</strong>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Unduh laporan format XLS/Excel</span>
            </div>
            <button
              type="button"
              style={{
                background: '#001b3a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleExportCSV();
              }}
            >
              Unduh CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
