import React, { useState } from 'react';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import type { Announcement, AnnouncementCategory } from '../../data/types';
import { fmtDateTime, ANNOUNCEMENT_CATEGORY_LABEL } from '../../lib/format';
import { toLocalInput, fromLocalInput } from '../hooks';

export const AnnouncementsAdminPage: React.FC = () => {
  const { data: list, loading, reload } = useAsync(() => repo.listAnnouncements(), []);

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('promosi');
  const [publishAt, setPublishAt] = useState(toLocalInput(new Date().toISOString()));
  const [expiresAt, setExpiresAt] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [important, setImportant] = useState(false);

  const openNew = () => {
    setEditing(null);
    setTitle('');
    setBody('');
    setCategory('promosi');
    setPublishAt(toLocalInput(new Date().toISOString()));
    setExpiresAt('');
    setStatus('published');
    setImportant(false);
    setModalOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setTitle(a.title);
    setBody(a.body);
    setCategory(a.category);
    setPublishAt(toLocalInput(a.publishAt));
    setExpiresAt(a.expiresAt ? toLocalInput(a.expiresAt) : '');
    setStatus(a.status);
    setImportant(a.important);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await repo.saveAnnouncement({
        id: editing?.id,
        title,
        body,
        category,
        publishAt: fromLocalInput(publishAt) || new Date().toISOString(),
        expiresAt: expiresAt ? fromLocalInput(expiresAt) : null,
        status,
        important,
      });
      setModalOpen(false);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan pengumuman');
    }
  };

  const handleDelete = async (id: string, t: string) => {
    if (!confirm(`Hapus pengumuman "${t}"?`)) return;
    await repo.deleteAnnouncement(id);
    await reload();
  };

  const filtered = (list || []).filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q);
  });

  return (
    <div className="stack" style={{ gap: '16px' }}>
      <div className="admin-page-header">
        <h1>Pengumuman</h1>
        <button type="button" className="btn sm" onClick={openNew}>
          + Pengumuman
        </button>
      </div>

      <div className="card">
        {/* Search Wrap */}
        <div className="order-search-wrap" style={{ marginBottom: '16px' }}>
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
            placeholder="Cari judul atau isi pengumuman..."
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

        {loading ? (
          <div className="empty">Memuat pengumuman...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">Tidak ada pengumuman yang sesuai.</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="desktop-only-table">
              <div className="table-scroll-hint">Geser ke samping untuk melihat tabel lengkap</div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Judul & Isi Singkat</th>
                      <th>Kategori</th>
                      <th>Jadwal Tayang</th>
                      <th>Status</th>
                      <th className="right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <strong>{a.title}</strong>
                          {a.important && (
                            <span className="badge warn" style={{ marginLeft: '6px', fontSize: '0.7rem' }}>
                              Penting
                            </span>
                          )}
                          <div
                            className="xs muted"
                            style={{
                              maxWidth: '400px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginTop: '2px',
                            }}
                          >
                            {a.body}
                          </div>
                        </td>
                        <td>
                          <span className="badge teal">{ANNOUNCEMENT_CATEGORY_LABEL[a.category]}</span>
                        </td>
                        <td>
                          <div>Mulai: {fmtDateTime(a.publishAt)}</div>
                          {a.expiresAt && <div className="xs muted">Kedaluwarsa: {fmtDateTime(a.expiresAt)}</div>}
                        </td>
                        <td>
                          <span className={`badge ${a.status === 'published' ? 'ok' : 'warn'}`}>
                            {a.status === 'published' ? 'Tayang (Publik)' : 'Draft'}
                          </span>
                        </td>
                        <td className="right">
                          <button type="button" className="btn secondary sm" onClick={() => openEdit(a)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn danger sm"
                            style={{ marginLeft: '4px' }}
                            onClick={() => void handleDelete(a.id, a.title)}
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View (Touch-friendly responsive) */}
            <div className="mobile-only-cards">
              {filtered.map((a) => (
                <div key={a.id} className="announcement-mobile-card">
                  <div className="service-card-top">
                    <div>
                      <strong className="service-card-name">{a.title}</strong>
                      {a.important && (
                        <span className="badge warn" style={{ marginLeft: '6px', fontSize: '0.7rem' }}>
                          Penting
                        </span>
                      )}
                    </div>
                    <span className={`badge ${a.status === 'published' ? 'ok' : 'warn'}`}>
                      {a.status === 'published' ? 'Tayang' : 'Draft'}
                    </span>
                  </div>

                  <div className="service-card-badges">
                    <span className="badge teal" style={{ fontSize: '0.72rem' }}>
                      {ANNOUNCEMENT_CATEGORY_LABEL[a.category]}
                    </span>
                  </div>

                  <div className="service-card-desc">{a.body}</div>

                  <div className="service-card-meta-row">
                    <span>Mulai: <strong>{fmtDateTime(a.publishAt)}</strong></span>
                    {a.expiresAt && (
                      <>
                        <span>•</span>
                        <span>Kedaluwarsa: <strong>{fmtDateTime(a.expiresAt)}</strong></span>
                      </>
                    )}
                  </div>

                  <div className="service-card-footer">
                    <div className="service-card-actions">
                      <button type="button" className="btn secondary sm" onClick={() => openEdit(a)}>
                        Edit
                      </button>
                      <button type="button" className="btn danger sm" onClick={() => void handleDelete(a.id, a.title)}>
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

      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <header>
              <h3>{editing ? 'Edit Pengumuman' : 'Buat Pengumuman'}</h3>
              <button type="button" className="x" onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </header>
            <form onSubmit={handleSave}>
              <div className="body stack" style={{ gap: '14px' }}>
                <label className="field">
                  <span>Judul Pengumuman *</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </label>

                <label className="field">
                  <span>Kategori *</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
                  >
                    <option value="promosi">Promosi & Diskon</option>
                    <option value="operasional">Info Operasional (Buka / Tutup)</option>
                    <option value="libur">Pemberitahuan Hari Libur</option>
                    <option value="teknis">Kendala Teknis / Pemeliharaan</option>
                  </select>
                </label>

                <label className="field">
                  <span>Isi Pengumuman *</span>
                  <textarea
                    rows={4}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                  />
                </label>

                <div className="grid grid-2">
                  <label className="field">
                    <span>Jadwal Mulai Tayang *</span>
                    <input
                      type="datetime-local"
                      value={publishAt}
                      onChange={(e) => setPublishAt(e.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Jadwal Berakhir (Opsional)</span>
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </label>
                </div>

                <div className="grid grid-2">
                  <label className="field">
                    <span>Status Publikasi</span>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                    >
                      <option value="published">Tayang Sekarang (Publik)</option>
                      <option value="draft">Simpan sebagai Draft</option>
                    </select>
                  </label>
                  <label className="check" style={{ marginTop: '28px' }}>
                    <input
                      type="checkbox"
                      checked={important}
                      onChange={(e) => setImportant(e.target.checked)}
                    />
                    <span>Tandai sebagai Pengumuman Penting</span>
                  </label>
                </div>
              </div>
              <footer>
                <button type="button" className="btn secondary" onClick={() => setModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn">
                  Simpan Pengumuman
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
