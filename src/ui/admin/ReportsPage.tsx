import React, { useState, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { rupiah } from '../../lib/format';
import { isLate } from '../../lib/estimation';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { data: rawOrders } = useAsync(() => repo.listOrders(), []);
  const [expandedSection, setExpandedSection] = useState<string | null>('ringkasan');
  const [timeFilter, setTimeFilter] = useState<'semua' | 'minggu' | 'bulan'>('semua');

  const now = new Date();

  // Filter orders by time period: Semua, 7 Hari Terakhir (Mingguan), 30 Hari Terakhir (Bulanan)
  const orders = useMemo(() => {
    if (!rawOrders) return [];
    if (timeFilter === 'semua') return rawOrders;

    const days = timeFilter === 'minggu' ? 7 : 30;
    const cutoff = new Date(now.getTime() - days * 24 * 3600 * 1000);

    return rawOrders.filter((o) => {
      const orderDate = new Date(o.receivedAt);
      return orderDate >= cutoff;
    });
  }, [rawOrders, timeFilter]);

  // Statistics calculation
  const totalOrders = orders.length;
  const paidOrders = orders.filter((o) => o.payment.status === 'lunas');
  const unpaidOrders = orders.filter((o) => o.payment.status === 'belum_lunas');
  const realRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const pendingRevenue = unpaidOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOmzet = orders.reduce((sum, o) => sum + o.total, 0);

  // Late orders
  const lateOrders = orders.filter((o) => isLate(o, now) && o.status !== 'diambil');

  // Top services
  const serviceCount = new Map<string, { count: number; revenue: number }>();
  orders.forEach((o) => {
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
      alert('Belum ada data transaksi untuk diekspor pada periode ini.');
      return;
    }
    const headers = [
      'No Resi',
      'Tanggal Masuk',
      'Nama Pelanggan',
      'Nomor WhatsApp',
      'Jenis Barang',
      'Merek',
      'Model',
      'Layanan',
      'Parfum',
      'Total Biaya (Rp)',
      'Status Pembayaran',
      'Metode Bayar',
      'Status Pengerjaan',
      'Estimasi Selesai',
      'Catatan Kasir',
    ];

    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = orders.map((o) => [
      escapeCsv(o.code),
      escapeCsv(o.receivedAt ? new Date(o.receivedAt).toLocaleString('id-ID') : '-'),
      escapeCsv(o.customerName || '-'),
      escapeCsv(o.customerPhone || '-'),
      escapeCsv(o.itemType || 'Sepatu'),
      escapeCsv(o.brand || '-'),
      escapeCsv(o.model || '-'),
      escapeCsv((o.services || []).map((s) => s.name).join(', ') || '-'),
      escapeCsv(o.fragranceName || '-'),
      o.total || 0,
      escapeCsv(o.payment?.status === 'lunas' ? 'LUNAS' : 'BELUM LUNAS'),
      escapeCsv(o.payment?.method || '-'),
      escapeCsv(o.status || '-'),
      escapeCsv(o.estimatedAt ? new Date(o.estimatedAt).toLocaleString('id-ID') : '-'),
      escapeCsv(o.internalNotes || '-'),
    ]);

    // Tambahkan UTF-8 BOM (\uFEFF) agar Microsoft Excel langsung membaca teks & format angka dengan sempurna
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filterSuffix = timeFilter === 'semua' ? 'semua' : timeFilter === 'minggu' ? '7hari' : '30hari';
    link.setAttribute('download', `laporan_transaksi_solecare_${filterSuffix}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stack" style={{ gap: '14px' }}>
      {/* 1. Header Sapaan & Filter Periode */}
      <div style={{ marginTop: '2px', marginBottom: '2px' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Hai, {user?.name || 'coba'}
        </h1>
        <span style={{ fontSize: '0.84rem', color: '#64748b' }}>Ini adalah laporan usaha laundry kamu</span>

        {/* Filter Periode Pills: Semua, 1 Minggu (7 Hari), 1 Bulan (30 Hari) */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '12px',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '12px',
          }}
        >
          <button
            type="button"
            onClick={() => setTimeFilter('semua')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '9px',
              border: 'none',
              background: timeFilter === 'semua' ? '#ffffff' : 'transparent',
              color: timeFilter === 'semua' ? '#0f172a' : '#64748b',
              fontWeight: timeFilter === 'semua' ? 800 : 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: timeFilter === 'semua' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('minggu')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '9px',
              border: 'none',
              background: timeFilter === 'minggu' ? '#bf2f3b' : 'transparent',
              color: timeFilter === 'minggu' ? '#ffffff' : '#64748b',
              fontWeight: timeFilter === 'minggu' ? 800 : 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: timeFilter === 'minggu' ? '0 2px 6px rgba(191, 47, 59, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            1 Minggu
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('bulan')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '9px',
              border: 'none',
              background: timeFilter === 'bulan' ? '#bf2f3b' : 'transparent',
              color: timeFilter === 'bulan' ? '#ffffff' : '#64748b',
              fontWeight: timeFilter === 'bulan' ? 800 : 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: timeFilter === 'bulan' ? '0 2px 6px rgba(191, 47, 59, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            1 Bulan
          </button>
        </div>
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
            <strong style={{ display: 'block', fontSize: '1.05rem', color: '#bf2f3b', fontWeight: 800 }}>
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
                  <span>Pendapatan Lunas</span>
                  <strong>{rupiah(realRevenue)}</strong>
                </div>
                <div className="bilas-finance-breakdown-row">
                  <span>Belum Lunas</span>
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

        {/* 3. Laporan Pegawai */}
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
              <strong style={{ display: 'block', fontSize: '0.98rem', color: '#0f172a' }}>Export Data Transaksi</strong>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Unduh laporan lengkap format CSV / Excel ({orders.length} transaksi)</span>
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
