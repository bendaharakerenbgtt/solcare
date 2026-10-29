import React, { useState } from 'react';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import type { Product, Fragrance } from '../../data/types';
import { rupiah } from '../../lib/format';

export const ProductsAdminPage: React.FC = () => {
  const { data: products, reload: reloadProducts } = useAsync(() => repo.listProducts(true), []);
  const { data: fragrances, reload: reloadFragrances } = useAsync(() => repo.listFragrances(true), []);

  // Product form modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productModal, setProductModal] = useState(false);
  const [pName, setPName] = useState('');
  const [pPrice, setPPrice] = useState<string | number>(15000);
  const [pDesc, setPDesc] = useState('');
  const [pActive, setPActive] = useState(true);

  // Fragrance form modal
  const [editingFragrance, setEditingFragrance] = useState<Fragrance | null>(null);
  const [fragranceModal, setFragranceModal] = useState(false);
  const [fName, setFName] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fActive, setFActive] = useState(true);

  // Product handlers
  const openNewProduct = () => {
    setEditingProduct(null);
    setPName('');
    setPPrice(15000);
    setPDesc('');
    setPActive(true);
    setProductModal(true);
  };
  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setPName(p.name);
    setPPrice(p.price);
    setPDesc(p.description);
    setPActive(p.active);
    setProductModal(true);
  };
  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await repo.saveProduct({
        id: editingProduct?.id,
        name: pName,
        price: Number(pPrice),
        description: pDesc,
        active: pActive,
      });
      setProductModal(false);
      await reloadProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan produk');
    }
  };
  const deleteProduct = async (id: string, name: string) => {
    if (!confirm(`Hapus produk "${name}"?`)) return;
    await repo.deleteProduct(id);
    await reloadProducts();
  };

  // Fragrance handlers
  const openNewFragrance = () => {
    setEditingFragrance(null);
    setFName('');
    setFDesc('');
    setFActive(true);
    setFragranceModal(true);
  };
  const openEditFragrance = (f: Fragrance) => {
    setEditingFragrance(f);
    setFName(f.name);
    setFDesc(f.description);
    setFActive(f.active);
    setFragranceModal(true);
  };
  const saveFragrance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await repo.saveFragrance({
        id: editingFragrance?.id,
        name: fName,
        description: fDesc,
        active: fActive,
      });
      setFragranceModal(false);
      await reloadFragrances();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan pewangi');
    }
  };
  const deleteFragrance = async (id: string, name: string) => {
    if (!confirm(`Hapus pilihan pewangi "${name}"?`)) return;
    await repo.deleteFragrance(id);
    await reloadFragrances();
  };

  return (
    <div className="stack" style={{ gap: '24px' }}>
      <div className="admin-page-header">
        <h1>Produk & Pewangi</h1>
      </div>

      <div className="grid grid-2">
        {/* Products Section */}
        <div className="card">
          <div className="row between" style={{ marginBottom: '16px' }}>
            <div>
              <h3>Produk Tambahan (Add-ons)</h3>
              <div className="small muted">Dapat ditambahkan saat drop-off</div>
            </div>
            <button type="button" className="btn sm" onClick={openNewProduct}>
              + Tambah Produk
            </button>
          </div>

          {!products || products.length === 0 ? (
            <div className="empty">Belum ada produk tambahan.</div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="desktop-only-table">
                <div className="table-scroll-hint">Geser untuk melihat aksi</div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Nama & Ket.</th>
                        <th>Harga</th>
                        <th>Status</th>
                        <th className="right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.name}</strong>
                            {p.description && <div className="xs muted">{p.description}</div>}
                          </td>
                          <td>{rupiah(p.price)}</td>
                          <td>
                            <span className={`badge ${p.active ? 'ok' : 'danger'}`}>
                              {p.active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="right">
                            <button type="button" className="btn secondary sm" onClick={() => openEditProduct(p)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn danger sm"
                              style={{ marginLeft: '4px' }}
                              onClick={() => void deleteProduct(p.id, p.name)}
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

              {/* Mobile Cards */}
              <div className="mobile-only-cards">
                {products.map((p) => (
                  <div key={p.id} className="service-mobile-card">
                    <div className="service-card-header">
                      <div>
                        <strong className="service-card-name">{p.name}</strong>
                        {p.description && <div className="service-card-desc">{p.description}</div>}
                      </div>
                      <span className={`badge ${p.active ? 'ok' : 'danger'}`}>
                        {p.active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <div className="service-card-meta-grid" style={{ gridTemplateColumns: '1fr' }}>
                      <div className="service-meta-item">
                        <span className="service-meta-label">Harga Satuan</span>
                        <span className="service-meta-val price">{rupiah(p.price)}</span>
                      </div>
                    </div>
                    <div className="service-card-footer">
                      <div className="service-card-actions">
                        <button type="button" className="btn secondary sm" onClick={() => openEditProduct(p)}>
                          Edit
                        </button>
                        <button type="button" className="btn danger sm" onClick={() => void deleteProduct(p.id, p.name)}>
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

        {/* Fragrance Section */}
        <div className="card">
          <div className="row between" style={{ marginBottom: '16px' }}>
            <div>
              <h3>Pilihan Pewangi & Deodorant</h3>
              <div className="small muted">Dipilih pegawai saat proses finishing</div>
            </div>
            <button type="button" className="btn sm" onClick={openNewFragrance}>
              + Tambah Aroma
            </button>
          </div>

          {!fragrances || fragrances.length === 0 ? (
            <div className="empty">Belum ada pilihan pewangi.</div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="desktop-only-table">
                <div className="table-scroll-hint">Geser untuk melihat aksi</div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Aroma Pewangi</th>
                        <th>Status</th>
                        <th className="right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fragrances.map((f) => (
                        <tr key={f.id}>
                          <td>
                            <strong>{f.name}</strong>
                            {f.description && <div className="xs muted">{f.description}</div>}
                          </td>
                          <td>
                            <span className={`badge ${f.active ? 'ok' : 'danger'}`}>
                              {f.active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="right">
                            <button type="button" className="btn secondary sm" onClick={() => openEditFragrance(f)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn danger sm"
                              style={{ marginLeft: '4px' }}
                              onClick={() => void deleteFragrance(f.id, f.name)}
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

              {/* Mobile Cards */}
              <div className="mobile-only-cards">
                {fragrances.map((f) => (
                  <div key={f.id} className="service-mobile-card">
                    <div className="service-card-header">
                      <div>
                        <strong className="service-card-name">{f.name}</strong>
                        {f.description && <div className="service-card-desc">{f.description}</div>}
                      </div>
                      <span className={`badge ${f.active ? 'ok' : 'danger'}`}>
                        {f.active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <div className="service-card-footer">
                      <div className="service-card-actions">
                        <button type="button" className="btn secondary sm" onClick={() => openEditFragrance(f)}>
                          Edit
                        </button>
                        <button type="button" className="btn danger sm" onClick={() => void deleteFragrance(f.id, f.name)}>
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
      </div>

      {/* Product Modal */}
      {productModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <header>
              <h3>{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
              <button type="button" className="x" onClick={() => setProductModal(false)}>
                ✕
              </button>
            </header>
            <form onSubmit={saveProduct}>
              <div className="body stack" style={{ gap: '14px' }}>
                <label className="field">
                  <span>Nama Produk *</span>
                  <input
                    type="text"
                    placeholder="Contoh: Tali Sepatu Pipih Hitam 120cm"
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Harga Satuan (Rp) *</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="15000"
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                  />
                </label>
                <label className="field">
                  <span>Keterangan Opsional</span>
                  <input
                    type="text"
                    value={pDesc}
                    onChange={(e) => setPDesc(e.target.value)}
                  />
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={pActive}
                    onChange={(e) => setPActive(e.target.checked)}
                  />
                  <span>Produk Aktif</span>
                </label>
              </div>
              <footer>
                <button type="button" className="btn secondary" onClick={() => setProductModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn">
                  Simpan Produk
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Fragrance Modal */}
      {fragranceModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <header>
              <h3>{editingFragrance ? 'Edit Pewangi' : 'Tambah Pewangi Baru'}</h3>
              <button type="button" className="x" onClick={() => setFragranceModal(false)}>
                ✕
              </button>
            </header>
            <form onSubmit={saveFragrance}>
              <div className="body stack" style={{ gap: '14px' }}>
                <label className="field">
                  <span>Nama Aroma Pewangi *</span>
                  <input
                    type="text"
                    placeholder="Contoh: Bubblegum / Coffee / Vanilla"
                    value={fName}
                    onChange={(e) => setFName(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Keterangan Aroma</span>
                  <input
                    type="text"
                    placeholder="Manis segar, cocok untuk sneakers santai"
                    value={fDesc}
                    onChange={(e) => setFDesc(e.target.value)}
                  />
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={fActive}
                    onChange={(e) => setFActive(e.target.checked)}
                  />
                  <span>Aroma Aktif</span>
                </label>
              </div>
              <footer>
                <button type="button" className="btn secondary" onClick={() => setFragranceModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn">
                  Simpan Pewangi
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
