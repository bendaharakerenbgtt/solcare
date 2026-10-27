import React, { useState } from 'react';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { fmtDateTime, displayCode } from '../../lib/format';
import type { RetentionReport } from '../../data/repo';

export const RetentionPage: React.FC = () => {
  const { data: settings } = useAsync(() => repo.getSettings(), []);
  const [report, setReport] = useState<RetentionReport | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = async (dryRun: boolean) => {
    if (!dryRun && !confirm('Jalankan pembersihan foto sekarang? Foto yang memenuhi kriteria kedaluwarsa akan dihapus permanen.')) {
      return;
    }
    setRunning(true);
    try {
      const res = await repo.runRetention(dryRun);
      setReport(res);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menjalankan pembersihan retensi');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="stack" style={{ gap: '24px' }}>
      <div className="admin-top">
        <div>
          <h1>Kebijakan Retensi & Pembersihan Foto</h1>
          <p className="small muted">
            Pembersihan otomatis file kolase dokumentasi untuk menghemat kuota penyimpanan.
          </p>
        </div>
      </div>

      <div className="card">
        <h3>Kebijakan Retensi Aktif</h3>
        <p className="small muted" style={{ margin: '6px 0 16px' }}>
          Sesuai ketentuan, file foto kolase akan dihapus setelah{' '}
          <strong>{settings?.retentionMonths || 6} bulan</strong> sejak status pesanan Selesai atau Diambil. Riwayat transaksi, data pelanggan, dan nota pembayaran tetap tersimpan aman selamanya.
        </p>

        <div className="row" style={{ gap: '12px' }}>
          <button
            type="button"
            className="btn secondary"
            disabled={running}
            onClick={() => void handleRun(true)}
          >
            🔍 Jalankan Simulasi (Dry Run)
          </button>
          <button
            type="button"
            className="btn danger"
            disabled={running}
            onClick={() => void handleRun(false)}
          >
            🗑️ Eksekusi Pembersihan Sekarang
          </button>
        </div>
      </div>

      {report && (
        <div className="card">
          <div className="row between" style={{ marginBottom: '16px' }}>
            <h3>Hasil {report.dryRun ? 'Simulasi' : 'Eksekusi'} Retensi</h3>
            <span className="small muted">Waktu Pemeriksaan: {fmtDateTime(report.ranAt)}</span>
          </div>

          <div className="grid grid-3" style={{ marginBottom: '20px' }}>
            <div className="card flat" style={{ padding: '14px', border: '1px solid var(--line)' }}>
              <div className="small muted">Total Foto Diperiksa</div>
              <strong style={{ fontSize: '1.4rem' }}>{report.checked} foto</strong>
            </div>
            <div className="card flat" style={{ padding: '14px', border: '1px solid var(--line)' }}>
              <div className="small muted">Memenuhi Syarat Kedaluwarsa</div>
              <strong style={{ fontSize: '1.4rem', color: 'var(--warn)' }}>
                {report.items.filter((i) => i.eligible).length} foto
              </strong>
            </div>
            <div className="card flat" style={{ padding: '14px', border: '1px solid var(--line)' }}>
              <div className="small muted">Status File Dihapus</div>
              <strong style={{ fontSize: '1.4rem', color: 'var(--primary)' }}>
                {report.dryRun ? '0 (Simulasi)' : `${report.deleted} berhasil`}
              </strong>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Kode Pesanan</th>
                  <th>Tanggal Kedaluwarsa</th>
                  <th>Status Syarat</th>
                  <th>Alasan / Keterangan</th>
                  <th className="right">Hasil Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((it, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong className="mono">{it.orderCode ? displayCode(it.orderCode) : '-'}</strong>
                    </td>
                    <td>{it.expiresAt ? fmtDateTime(it.expiresAt) : '-'}</td>
                    <td>
                      <span className={`badge ${it.eligible ? 'warn' : 'teal'}`}>
                        {it.eligible ? 'Kedaluwarsa' : 'Belum Kedaluwarsa'}
                      </span>
                    </td>
                    <td className="small">{it.reason}</td>
                    <td className="right">
                      {it.result === 'deleted' ? (
                        <span className="badge ok">Dihapus</span>
                      ) : it.result === 'failed' ? (
                        <span className="badge danger">Gagal: {it.error}</span>
                      ) : report.dryRun && it.eligible ? (
                        <span className="badge warn">Siap Dihapus</span>
                      ) : (
                        <span className="badge">Dipertahankan</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
