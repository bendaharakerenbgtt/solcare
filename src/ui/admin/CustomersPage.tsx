import React, { useState } from 'react';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import type { Customer } from '../../data/types';
import { fmtDateTime, whatsappLink } from '../../lib/format';

export const CustomersPage: React.FC = () => {
  const { data: customers, loading, reload } = useAsync(() => repo.listCustomers(), []);
  const [search, setSearch] = useState('');

  const [editing, setEditing] = useState<Customer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const openNew = () => {
    setEditing(null);
    setName('');
    setPhone('');
    setNotes('');
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setName(c.name);
    setPhone(c.phone);
    setNotes(c.notes);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await repo.saveCustomer({
        id: editing?.id,
        name,
        phone,
        notes,
      });
      setModalOpen(false);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan data pelanggan');
    }
  };

  const handleDelete = async (id: string, custName: string) => {
    if (!confirm(`Hapus data pelanggan "${custName}"?`)) return;
    try {
      await repo.deleteCustomer(id);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus');
    }
  };

  const filtered = (customers || []).filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  return (
    <div className="stack" style={{ gap: '16px' }}>
      <div className="admin-page-header">
        <h1>Data Pelanggan</h1>
        <button type="button" className="btn sm" onClick={openNew}>
          + Pelanggan
        </button>
      </div>

      <div className="card">
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
            placeholder="Cari nama atau nomor WhatsApp pelanggan..."
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
              ×
            </button>
          )}
        </div>

        {loading ? (
          <div className="empty">Memuat data pelanggan...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">Tidak ada data pelanggan yang cocok.</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="desktop-only-table">
              <div className="table-scroll-hint">Geser ke samping untuk melihat tabel lengkap</div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nama Pelanggan</th>
                      <th>Nomor WhatsApp</th>
                      <th>Catatan Preferensi</th>
                      <th>Terdaftar Sejak</th>
                      <th className="right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => {
                      const wa = whatsappLink(c.phone, `Halo Kak ${c.name}, dari Soleful Soaks! Shoes Care.`);
                      return (
                        <tr key={c.id}>
                          <td><strong>{c.name}</strong></td>
                          <td>
                            <span className="mono">{c.phone}</span>
                            {wa && (
                              <a
                                href={wa}
                                target="_blank"
                                rel="noreferrer"
                                className="btn wa sm"
                                style={{ marginLeft: '8px', padding: '2px 8px', fontSize: '0.75rem' }}
                              >
                                Chat WA
                              </a>
                            )}
                          </td>
                          <td>{c.notes || '-'}</td>
                          <td className="small muted">{fmtDateTime(c.createdAt)}</td>
                          <td className="right">
                            <button type="button" className="btn secondary sm" onClick={() => openEdit(c)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn danger sm"
                              style={{ marginLeft: '4px' }}
                              onClick={() => void handleDelete(c.id, c.name)}
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View (Touch Friendly) */}
            <div className="mobile-only-cards">
              {filtered.map((c) => {
                const wa = whatsappLink(c.phone, `Halo Kak ${c.name}, dari Soleful Soaks! Shoes Care.`);
                return (
                  <div key={c.id} className="customer-mobile-card">
                    <div className="customer-card-header">
                      <div>
                        <strong className="customer-card-name">{c.name}</strong>
                        <div className="customer-card-phone mono">{c.phone}</div>
                      </div>
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          className="btn wa sm customer-card-wa"
                        >
                          Chat WA
                        </a>
                      )}
                    </div>

                    {c.notes && (
                      <div className="customer-card-notes">
                        <span className="customer-notes-label">Preferensi:</span> {c.notes}
                      </div>
                    )}

                    <div className="customer-card-footer">
                      <span className="customer-card-date">
                        Terdaftar: {fmtDateTime(c.createdAt)}
                      </span>
                      <div className="customer-card-actions">
                        <button
                          type="button"
                          className="btn secondary sm"
                          onClick={() => openEdit(c)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn danger sm"
                          onClick={() => void handleDelete(c.id, c.name)}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <header>
              <h3>{editing ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</h3>
              <button type="button" className="x" onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </header>
            <form onSubmit={handleSave}>
              <div className="body stack" style={{ gap: '14px' }}>
                <label className="field">
                  <span>Nama Lengkap *</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Nomor WhatsApp *</span>
                  <input
                    type="tel"
                    placeholder="08123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Catatan Khusus (Preferensi / Alamat Pengiriman)</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
              </div>
              <footer>
                <button type="button" className="btn secondary" onClick={() => setModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn">
                  Simpan Pelanggan
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
