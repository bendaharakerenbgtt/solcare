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
    <div className="stack" style={{ gap: '16px' }}>
      <div className="admin-page-header">
        <h1>Retensi Foto</h1>
      </div>

      <div className="card">
        <h3>Kebijakan Retensi Aktif</h3>
        <p className="small muted" style={{ margin: '6px 0 16px' }}>
          Sesuai ketentuan, file foto kolase akan dihapus setelah{' '}
          <strong>{settings?.retentionMonths || 6} bulan</strong> sejak status pesanan Selesai atau Diambil. Riwayat transaksi, data pelanggan, dan nota pembayaran tetap tersimpan aman selamanya.
        </p>

        <div className="retention-action-row">
          <button
            type="button"
            className="btn secondary"
            disabled={running}
            onClick={() => void handleRun(true)}
          >
            Jalankan Simulasi (Dry Run)
          </button>
          <button
            type="button"
            className="btn danger"
            disabled={running}
            onClick={() => void handleRun(false)}
          >
            Eksekusi Pembersihan Sekarang
          </button>
        </div>
      </div>

      {report && (
        <div className="card">
          <div className="row between" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '6px' }}>
            <h3 style={{ margin: 0 }}>Hasil {report.dryRun ? 'Simulasi' : 'Eksekusi'} Retensi</h3>
            <span className="xs muted">Waktu Pemeriksaan: {fmtDateTime(report.ranAt)}</span>
          </div>

          <div className="dash-metrics-grid" style={{ marginBottom: '20px' }}>
            <div className="dash-metric-card">
              <div className="icon-label">
                <span>Total Foto Diperiksa</span>
              </div>
              <div className="val">{report.checked}</div>
              <div className="sub">Dokumentasi kolase</div>
            </div>
            <div className="dash-metric-card">
              <div className="icon-label">
                <span>Syarat Kedaluwarsa</span>
              </div>
              <div className="val" style={{ color: 'var(--warn)' }}>
                {report.items.filter((i) => i.eligible).length}
              </div>
              <div className="sub">Melewati batas simpan</div>
            </div>
            <div className="dash-metric-card">
              <div className="icon-label">
                <span>File Dihapus</span>
              </div>
              <div className="val" style={{ color: 'var(--primary)' }}>
                {report.dryRun ? '0' : report.deleted}
              </div>
              <div className="sub">{report.dryRun ? 'Mode simulasi' : 'Dihapus permanen'}</div>
            </div>
          </div>

          {report.items.length === 0 ? (
            <div className="empty">Belum ada foto dokumentasi yang tersimpan di sistem.</div>
          ) : (
            <>
              <div className="desktop-only-table">
                <div className="table-scroll-hint">Geser ke samping untuk melihat tabel lengkap</div>
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

              <div className="mobile-only-cards">
                {report.items.map((it, idx) => (
                  <div key={idx} className="service-mobile-card">
                    <div className="service-card-top">
                      <div>
                        <strong className="mono" style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>
                          {it.orderCode ? displayCode(it.orderCode) : '-'}
                        </strong>
                        <div className="xs muted" style={{ marginTop: '2px' }}>
                          Kedaluwarsa: {it.expiresAt ? fmtDateTime(it.expiresAt) : '-'}
                        </div>
                      </div>
                      <span className={`badge ${it.eligible ? 'warn' : 'teal'}`}>
                        {it.eligible ? 'Kedaluwarsa' : 'Aktif'}
                      </span>
                    </div>
                    <div className="xs muted" style={{ margin: '6px 0' }}>
                      {it.reason}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px dashed var(--line)' }}>
                      {it.result === 'deleted' ? (
                        <span className="badge ok">Dihapus</span>
                      ) : it.result === 'failed' ? (
                        <span className="badge danger">Gagal: {it.error}</span>
                      ) : report.dryRun && it.eligible ? (
                        <span className="badge warn">Siap Dihapus</span>
                      ) : (
                        <span className="badge">Dipertahankan</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
