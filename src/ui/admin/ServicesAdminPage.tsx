import React, { useState } from 'react';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import type { Service, ServiceCategory } from '../../data/types';
import { CATEGORY_LABEL, priceLabel, durationLabel } from '../../lib/format';

export const ServicesAdminPage: React.FC = () => {
  const { data: services, loading, reload } = useAsync(() => repo.listServices(true), []);

  const [editing, setEditing] = useState<Service | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ServiceCategory>('all');

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('main');
  const [description, setDescription] = useState('');
  const [terms, setTerms] = useState('');
  const [priceMin, setPriceMin] = useState<string | number>(35000);
  const [priceMax, setPriceMax] = useState<string>('');
  const [durationMinDays, setDurationMinDays] = useState<string | number>(2);
  const [durationMaxDays, setDurationMaxDays] = useState<string | number>(2);
  const [workloadWeight, setWorkloadWeight] = useState<string | number>(1);
  const [expressHours, setExpressHours] = useState<string>('');
  const [expressEligible, setExpressEligible] = useState(false);
  const [active, setActive] = useState(true);

  const openNew = () => {
    setEditing(null);
    setName('');
    setCategory('main');
    setDescription('');
    setTerms('');
    setPriceMin(35000);
    setPriceMax('');
    setDurationMinDays(2);
    setDurationMaxDays(2);
    setWorkloadWeight(1);
    setExpressHours('');
    setExpressEligible(false);
    setActive(true);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setName(s.name);
    setCategory(s.category);
    setDescription(s.description);
    setTerms(s.terms);
    setPriceMin(s.priceMin);
    setPriceMax(s.priceMax != null ? String(s.priceMax) : '');
    setDurationMinDays(s.durationMinDays);
    setDurationMaxDays(s.durationMaxDays);
    setWorkloadWeight(s.workloadWeight);
    setExpressHours(s.expressHours ? String(s.expressHours) : '');
    setExpressEligible(s.expressEligible);
    setActive(s.active);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await repo.saveService({
        id: editing?.id,
        name,
        category,
        description,
        terms,
        priceMin: Number(priceMin),
        priceMax: priceMax.trim() ? Number(priceMax) : null,
        durationMinDays: Number(durationMinDays),
        durationMaxDays: Number(durationMaxDays),
        workloadWeight: Number(workloadWeight),
        expressHours: expressHours.trim() ? Number(expressHours) : null,
        expressEligible,
        active,
        sortOrder: editing?.sortOrder ?? (services?.length || 0),
      });
      setModalOpen(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan layanan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, svcName: string) => {
    if (!confirm(`Hapus layanan "${svcName}"? Transaksi lama tetap aman karena menggunakan snapshot.`)) return;
    try {
      await repo.deleteService(id);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus');
    }
  };

  // Filtered Services list
  const filtered = (services || []).filter((s) => {
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="stack" style={{ gap: '16px' }}>
      <div className="admin-page-header">
        <h1>Layanan & Harga</h1>
        <button type="button" className="btn sm" onClick={openNew}>
          + Layanan
        </button>
      </div>

      <div className="card">
        {/* Search & Category Filter Section */}
        <div className="order-filter-container" style={{ marginBottom: '16px' }}>
          <div className="order-search-wrap">
            <svg
              className="order-search-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="order-search-field"
              placeholder="Cari nama layanan atau deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="order-search-clear"
                onClick={() => setSearch('')}
                title="Hapus pencarian"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Pills (Matches OrdersListPage / Dashboard pills) */}
          <div className="services-filter-pills">
            <button
              type="button"
              className={`activity-filter-btn filter-all ${categoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              Semua ({services?.length || 0})
            </button>
            <button
              type="button"
              className={`activity-filter-btn filter-main ${categoryFilter === 'main' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('main')}
            >
              Main ({services?.filter((s) => s.category === 'main').length || 0})
            </button>
            <button
              type="button"
              className={`activity-filter-btn filter-express ${categoryFilter === 'express' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('express')}
            >
              Express ({services?.filter((s) => s.category === 'express').length || 0})
            </button>
            <button
              type="button"
              className={`activity-filter-btn filter-additional ${categoryFilter === 'additional' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('additional')}
            >
              Additional ({services?.filter((s) => s.category === 'additional').length || 0})
            </button>
            <button
              type="button"
              className={`activity-filter-btn filter-other ${categoryFilter === 'other' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('other')}
            >
              Other ({services?.filter((s) => s.category === 'other').length || 0})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty">Memuat katalog...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">Tidak ada layanan yang cocok dengan pencarian.</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="desktop-only-table">
              <div className="table-scroll-hint">Geser ke samping untuk melihat tabel lengkap</div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nama Layanan</th>
                      <th>Kategori</th>
                      <th>Harga Referensi</th>
                      <th>Durasi & Beban</th>
                      <th>Status</th>
                      <th className="right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <strong>{s.name}</strong>
                          {s.description && <div className="xs muted">{s.description}</div>}
                          {s.expressEligible && (
                            <span className="badge teal" style={{ marginTop: '4px' }}>
                              Express Eligible
                            </span>
                          )}
                        </td>
                        <td>{CATEGORY_LABEL[s.category]}</td>
                        <td>
                          <strong style={{ color: 'var(--primary)' }}>{priceLabel(s)}</strong>
                        </td>
                        <td>
                          <div>{durationLabel(s) || '-'}</div>
                          <div className="xs muted">Beban: {s.workloadWeight} unit</div>
                        </td>
                        <td>
                          <span className={`badge ${s.active ? 'ok' : 'danger'}`}>
                            {s.active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="right">
                          <div className="row" style={{ justifyContent: 'flex-end', gap: '6px' }}>
                            <button type="button" className="btn secondary sm" onClick={() => openEdit(s)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn danger sm"
                              onClick={() => handleDelete(s.id, s.name)}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View (Touch-friendly responsive, matches OrdersListPage layout) */}
            <div className="mobile-only-cards">
              {filtered.map((s) => (
                <div key={s.id} className="service-mobile-card">
                  <div className="service-card-top">
                    <strong className="service-card-name">{s.name}</strong>
                    <span className="service-card-price">{priceLabel(s)}</span>
                  </div>

                  <div className="service-card-badges">
                    <span className="badge" style={{ fontSize: '0.72rem' }}>
                      {CATEGORY_LABEL[s.category]}
                    </span>
                    {s.expressEligible && (
                      <span className="badge teal" style={{ fontSize: '0.72rem' }}>
                        Express Eligible
                      </span>
                    )}
                    <span
                      className={`badge ${s.active ? 'ok' : 'danger'}`}
                      style={{ fontSize: '0.72rem' }}
                    >
                      {s.active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>

                  {s.description && (
                    <div className="service-card-desc">{s.description}</div>
                  )}

                  {/* Metadata Row: Clean and subtle */}
                  <div className="service-card-meta-row">
                    <span>Durasi: <strong>{durationLabel(s) || '-'}</strong></span>
                    <span>•</span>
                    <span>Beban: <strong>{s.workloadWeight} unit</strong></span>
                    {s.terms && (
                      <>
                        <span>•</span>
                        <span className="xs muted">{s.terms}</span>
                      </>
                    )}
                  </div>

                  {/* Card Actions: Standard subtle buttons */}
                  <div className="service-card-footer">
                    <div className="service-card-actions">
                      <button
                        type="button"
                        className="btn secondary sm"
                        onClick={() => openEdit(s)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn danger sm"
                        onClick={() => handleDelete(s.id, s.name)}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal Form */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <header>
              <h3>{editing ? 'Edit Layanan' : 'Tambah Layanan Baru'}</h3>
              <button type="button" className="x" onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </header>
            <form onSubmit={handleSave}>
              <div className="body stack" style={{ gap: '14px' }}>
                {error && <div className="alert error">{error}</div>}

                <label className="field">
                  <span>Nama Layanan *</span>
                  <input
                    type="text"
                    placeholder="Contoh: Basic Clean"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </label>

                <div className="grid grid-2">
                  <label className="field">
                    <span>Kategori *</span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                    >
                      <option value="main">Main Services</option>
                      <option value="express">Express Services</option>
                      <option value="additional">Additional Services</option>
                      <option value="other">Other Services</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Bobot Beban Kerja (unit) *</span>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      placeholder="1"
                      value={workloadWeight}
                      onChange={(e) => setWorkloadWeight(e.target.value === '' ? '' : Number(e.target.value))}
                      required
                    />
                    <span className="hint">1 unit = standar 1 pasang Basic Clean</span>
                  </label>
                </div>

                <div className="grid grid-2">
                  <label className="field">
                    <span>Harga Awal / Minimal (Rp) *</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="35000"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value === '' ? '' : Number(e.target.value))}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Harga Maksimal (Opsional / Rentang)</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Kosongkan jika harga tetap"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                    />
                  </label>
                </div>

                {category === 'express' ? (
                  <label className="field">
                    <span>Target Selesai Express (Jam) *</span>
                    <input
                      type="number"
                      placeholder="Misal: 24 atau 48"
                      value={expressHours}
                      onChange={(e) => setExpressHours(e.target.value)}
                      required
                    />
                  </label>
                ) : (
                  <div className="grid grid-2">
                    <label className="field">
                      <span>Durasi Minimal (Hari Buka)</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="2"
                        value={durationMinDays}
                        onChange={(e) => setDurationMinDays(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Durasi Maksimal (Hari Buka)</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="2"
                        value={durationMaxDays}
                        onChange={(e) => setDurationMaxDays(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </label>
                  </div>
                )}

                <label className="field">
                  <span>Deskripsi Singkat</span>
                  <input
                    type="text"
                    placeholder="Pembersihan midsole, outsole, dan upper"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Ketentuan Khusus (Tampil di Website Publik)</span>
                  <input
                    type="text"
                    placeholder="Misal: Khusus bahan canvas putih / penyesuaian kondisi noda"
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                  />
                </label>

                {category === 'main' && (
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={expressEligible}
                      onChange={(e) => setExpressEligible(e.target.checked)}
                    />
                    <span>Boleh dikombinasikan dengan Layanan Express (24h / 48h)</span>
                  </label>
                )}

                <label className="check">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                  <span>Tampilkan dan aktifkan layanan ini di sistem & website publik</span>
                </label>
              </div>
              <footer>
                <button type="button" className="btn secondary" onClick={() => setModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan Layanan'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
