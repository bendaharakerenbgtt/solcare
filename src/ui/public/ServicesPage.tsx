import React from 'react';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { CATEGORY_LABEL, priceLabel, durationLabel } from '../../lib/format';
import type { ServiceCategory } from '../../data/types';

export const ServicesPage: React.FC = () => {
  const { data: services, loading } = useAsync(() => repo.listServices(false), []);
  const { data: settings } = useAsync(() => repo.getSettings(), []);

  const categories: ServiceCategory[] = ['main', 'express', 'additional', 'other'];

  return (
    <div className="container" style={{ padding: '40px 20px 60px' }}>
      <div className="section-title">
        <div className="eyebrow">Daftar Layanan</div>
        <h2>Katalog Layanan & Estimasi Biaya</h2>
        <p className="muted" style={{ maxWidth: '640px', margin: '0 auto' }}>
          {settings?.priceDisclaimer ||
            'Harga merupakan referensi. Harga akhir dapat berubah berdasarkan kondisi barang setelah pengecekan di toko.'}
        </p>
      </div>

      {loading ? (
        <div className="empty">Memuat katalog layanan...</div>
      ) : (
        <div className="stack" style={{ gap: '36px' }}>
          {categories.map((cat) => {
            const list = (services || []).filter((s) => s.category === cat);
            if (!list.length) return null;

            return (
              <div key={cat} className="card">
                <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>{CATEGORY_LABEL[cat]}</h3>
                  {cat === 'express' && (
                    <p className="small muted">
                      Biaya express ditambahkan pada harga layanan utama (hanya berlaku untuk Basic Clean dan Deep Clean).
                    </p>
                  )}
                  {cat === 'additional' && (
                    <p className="small muted">
                      Perawatan restorasi, pengeleman, unyellowing, maupun pewarnaan ulang sesuai kebutuhan sepatu Anda.
                    </p>
                  )}
                </div>

                <div className="price-list">
                  {list.map((item) => (
                    <div key={item.id} className="price-item">
                      <div style={{ flex: 1 }}>
                        <div className="row" style={{ gap: '8px' }}>
                          <span className="name">{item.name}</span>
                          {item.expressEligible && <span className="badge teal">Express Eligible</span>}
                        </div>
                        {item.description && <p className="small muted" style={{ margin: '4px 0 0' }}>{item.description}</p>}
                        {item.terms && (
                          <div className="xs" style={{ color: 'var(--warn)', marginTop: '4px' }}>
                            ⚠️ {item.terms}
                          </div>
                        )}
                        <div className="xs muted" style={{ marginTop: '4px' }}>
                          {durationLabel(item) ? `Durasi: ${durationLabel(item)}` : ''}
                        </div>
                      </div>
                      <div className="price" style={{ textAlign: 'right' }}>
                        {priceLabel(item)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
