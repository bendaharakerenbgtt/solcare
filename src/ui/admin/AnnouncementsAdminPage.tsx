import React, { useState } from 'react';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import type { Announcement, AnnouncementCategory } from '../../data/types';
import { fmtDateTime, ANNOUNCEMENT_CATEGORY_LABEL } from '../../lib/format';
import { toLocalInput, fromLocalInput } from '../hooks';

export const AnnouncementsAdminPage: React.FC = () => {
  const { data: list, reload } = useAsync(() => repo.listAnnouncements(), []);

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

  return (
    <div className="stack" style={{ gap: '20px' }}>
      <div className="admin-top">
        <div>
          <h1>Pengumuman Website Publik</h1>
          <p className="small muted">
            Kelola pengumuman jam buka, libur, kendala teknis, atau promosi yang tayang di halaman depan.
          </p>
        </div>
        <div className="spacer" />
        <button type="button" className="btn" onClick={openNew}>
          ➕ Buat Pengumuman Baru
        </button>
      </div>

      <div className="card">
        {!list || list.length === 0 ? (
          <div className="empty">Belum ada pengumuman.</div>
        ) : (
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
                {list.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.important ? '⭐ ' : ''}{a.title}</strong>
                      <div className="xs muted" style={{ maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                        {a.status === 'published' ? 'Tayang (Publik)' : 'Draft (Disembunyikan)'}
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

                <div className="grid grid-2">
                  <label className="field">
                    <span>Kategori</span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
                    >
                      <option value="promosi">Promosi Layanan</option>
                      <option value="jam_operasional">Perubahan Jam Buka</option>
                      <option value="libur">Informasi Libur</option>
                      <option value="keterlambatan">Potensi Keterlambatan</option>
                      <option value="kendala">Kendala Teknis</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Status Tayang</span>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                    >
                      <option value="published">Tayang Sekarang (Publik)</option>
                      <option value="draft">Draft (Sembunyikan)</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-2">
                  <label className="field">
                    <span>Mulai Publikasi</span>
                    <input
                      type="datetime-local"
                      value={publishAt}
                      onChange={(e) => setPublishAt(e.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Kedaluwarsa Otomatis (Opsional)</span>
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </label>
                </div>

                <label className="field">
                  <span>Isi Pengumuman Lengkap *</span>
                  <textarea
                    rows={4}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                  />
                </label>

                <label className="check">
                  <input
                    type="checkbox"
                    checked={important}
                    onChange={(e) => setImportant(e.target.checked)}
                  />
                  <span>Tandai sebagai Informasi Penting (highlight kuning)</span>
                </label>
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
