import React, { useEffect, useState } from 'react';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { WEEKDAY_LABEL } from '../../lib/format';
import type { Settings } from '../../data/types';

export const SettingsPage: React.FC = () => {
  const { data: currentSettings, reload } = useAsync(() => repo.getSettings(), []);

  const [form, setForm] = useState<Partial<Settings>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (currentSettings) {
      setForm(currentSettings);
    }
  }, [currentSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const payload: Partial<Settings> = {
        ...form,
        dailyCapacity: form.dailyCapacity !== undefined && form.dailyCapacity !== ('' as any)
          ? Number(form.dailyCapacity)
          : 8.5,
        estimateHorizonDays: form.estimateHorizonDays !== undefined && form.estimateHorizonDays !== ('' as any)
          ? Number(form.estimateHorizonDays)
          : 60,
        retentionMonths: form.retentionMonths !== undefined && form.retentionMonths !== ('' as any)
          ? Number(form.retentionMonths)
          : 6,
      };
      await repo.updateSettings(payload);
      setMsg({ type: 'ok', text: 'Pengaturan berhasil diperbarui.' });
      await reload();
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Gagal menyimpan pengaturan' });
    } finally {
      setSaving(false);
    }
  };

  const toggleClosedWeekday = (dayIdx: number) => {
    const list = form.closedWeekdays || [];
    if (list.includes(dayIdx)) {
      setForm({ ...form, closedWeekdays: list.filter((d) => d !== dayIdx) });
    } else {
      setForm({ ...form, closedWeekdays: [...list, dayIdx] });
    }
  };

  return (
    <div className="stack" style={{ gap: '24px', maxWidth: '850px' }}>
      <div className="admin-page-header">
        <h1>Pengaturan Toko</h1>
      </div>

      {msg && (
        <div className={`alert ${msg.type === 'ok' ? 'ok' : 'error'}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="stack" style={{ gap: '20px' }}>
        {/* Identitas Bisnis & Kontak */}
        <div className="card">
          <h3>Identitas Bisnis & Kontak Publik</h3>
          <div className="grid grid-2" style={{ marginTop: '14px' }}>
            <label className="field">
              <span>Nama Bisnis *</span>
              <input
                type="text"
                value={form.businessName || ''}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Tagline / Slogan</span>
              <input
                type="text"
                value={form.tagline || ''}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Nomor WhatsApp Customer Service</span>
              <input
                type="tel"
                placeholder="08123456789 (format Indonesia)"
                value={form.whatsappNumber || ''}
                onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
              />
              <span className="hint">Otomatis terhubung ke tombol chat pelanggan</span>
            </label>
            <label className="field">
              <span>Tautan Instagram Toko</span>
              <input
                type="url"
                placeholder="https://instagram.com/solefulsoaks"
                value={form.instagramUrl || ''}
                onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })}
              />
            </label>
          </div>

          <div style={{ marginTop: '12px' }}>
            <label className="field">
              <span>Alamat Fisik Workshop</span>
              <textarea
                value={form.address || ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </label>
          </div>

          <div style={{ marginTop: '12px' }}>
            <label className="field">
              <span>Template Pesan WhatsApp Pelanggan</span>
              <input
                type="text"
                value={form.whatsappTemplate || ''}
                onChange={(e) => setForm({ ...form, whatsappTemplate: e.target.value })}
              />
              <span className="hint">Gunakan `&#123;kode&#125;` untuk menyisipkan nomor pesanan pelanggan</span>
            </label>
          </div>
        </div>

        {/* Kapasitas & Jadwal Operasional */}
        <div className="card">
          <h3>Kapasitas Antrean & Jam Kerja</h3>
          <p className="small muted" style={{ margin: '4px 0 14px' }}>
            Digunakan oleh mesin algoritma estimasi otomatis untuk menghitung tanggal selesai pengerjaan.
          </p>

          <div className="grid grid-2">
            <label className="field">
              <span>Kapasitas Harian (Unit Beban) *</span>
              <input
                type="number"
                min="0.5"
                step="0.5"
                placeholder="8.5"
                value={form.dailyCapacity !== undefined ? form.dailyCapacity : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({ ...form, dailyCapacity: val === '' ? ('' as any) : Number(val) });
                }}
                required
              />
              <span className="hint">Rekomendasi tim berdua: 8 - 9 pasang sepatu/hari (8.5 unit beban/hari)</span>
            </label>

            <label className="field">
              <span>Batas Horizon Hari Penuh</span>
              <input
                type="number"
                min="1"
                placeholder="60"
                value={form.estimateHorizonDays !== undefined ? form.estimateHorizonDays : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({ ...form, estimateHorizonDays: val === '' ? ('' as any) : Number(val) });
                }}
                required
              />
              <span className="hint">Tolak estimasi otomatis jika antrean melebihi sekian hari</span>
            </label>

            <label className="field">
              <span>Jam Buka Operasional (HH:mm)</span>
              <input
                type="time"
                value={form.openTime !== undefined ? form.openTime : '09:00'}
                onChange={(e) => setForm({ ...form, openTime: e.target.value })}
                required
              />
            </label>

            <label className="field">
              <span>Jam Tutup Operasional (HH:mm)</span>
              <input
                type="time"
                value={form.closeTime !== undefined ? form.closeTime : '18:00'}
                onChange={(e) => setForm({ ...form, closeTime: e.target.value })}
                required
              />
            </label>
          </div>

          <div style={{ marginTop: '16px' }}>
            <span className="field" style={{ marginBottom: '8px' }}>
              <span>Hari Libur Rutin Mingguan:</span>
            </span>
            <div className="row" style={{ gap: '12px' }}>
              {WEEKDAY_LABEL.map((name, idx) => {
                const isClosed = form.closedWeekdays?.includes(idx);
                return (
                  <label key={idx} className="check">
                    <input
                      type="checkbox"
                      checked={isClosed}
                      onChange={() => toggleClosedWeekday(idx)}
                    />
                    <span>{name}</span>
                  </label>
                );
              })}
            </div>
            <span className="hint" style={{ display: 'block', marginTop: '6px' }}>
              Hari yang dicentang tidak akan dihitung sebagai hari pengerjaan dalam jadwal estimasi.
            </span>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label className="field">
              <span>Teks Jam Buka Publik (Tampil di Website)</span>
              <input
                type="text"
                placeholder="Contoh: Senin - Sabtu: 09.00 - 18.00 WIB (Minggu Tutup)"
                value={form.publicHoursText || ''}
                onChange={(e) => setForm({ ...form, publicHoursText: e.target.value })}
              />
            </label>
          </div>
        </div>

        {/* Kebijakan Penyimpanan & Disclaimer */}
        <div className="card">
          <h3>Kebijakan Retensi Foto & Disclaimer</h3>
          <div className="grid grid-2" style={{ marginTop: '14px' }}>
            <label className="field">
              <span>Masa Simpan Foto Dokumentasi (Bulan) *</span>
              <input
                type="number"
                min="1"
                placeholder="6"
                value={form.retentionMonths !== undefined ? form.retentionMonths : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({ ...form, retentionMonths: val === '' ? ('' as any) : Number(val) });
                }}
                required
              />
              <span className="hint">File foto dihapus setelah N bulan dari tanggal selesai / diambil</span>
            </label>

            <label className="field">
              <span>Dasar Perhitungan Retensi</span>
              <select
                value={form.retentionBasis || 'picked_up_or_completed'}
                onChange={(e) => setForm({ ...form, retentionBasis: e.target.value as any })}
              >
                <option value="picked_up_or_completed">Tanggal Diambil (atau Selesai jika belum diambil)</option>
                <option value="completed">Tanggal Selesai Pengerjaan</option>
                <option value="picked_up">Tanggal Diambil Saja</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: '14px' }}>
            <label className="field">
              <span>Disclaimer Harga untuk Publik</span>
              <textarea
                value={form.priceDisclaimer || ''}
                onChange={(e) => setForm({ ...form, priceDisclaimer: e.target.value })}
              />
            </label>
          </div>

          <div style={{ marginTop: '14px' }}>
            <label className="check">
              <input
                type="checkbox"
                checked={form.trackingRequirePhoneSuffix || false}
                onChange={(e) => setForm({ ...form, trackingRequirePhoneSuffix: e.target.checked })}
              />
              <span>
                <strong>Keamanan Ekstra Pelacakan:</strong> Wajibkan pelanggan memasukkan 4 digit terakhir nomor WhatsApp saat mengecek status pesanan.
              </span>
            </label>
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="submit" className="btn lg" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  );
};
