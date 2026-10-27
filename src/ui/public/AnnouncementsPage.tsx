import React from 'react';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { fmtDateTime, ANNOUNCEMENT_CATEGORY_LABEL } from '../../lib/format';

export const AnnouncementsPage: React.FC = () => {
  const { data: list, loading } = useAsync(() => repo.listPublicAnnouncements(), []);

  return (
    <div className="container" style={{ padding: '40px 20px 60px', maxWidth: '800px' }}>
      <div className="section-title">
        <div className="eyebrow">Informasi & Update</div>
        <h2>Pengumuman Toko</h2>
        <p className="muted">
          Pemberitahuan terkini seputar jam buka, libur operasional, kendala teknis, maupun promo menarik.
        </p>
      </div>

      {loading ? (
        <div className="empty">Memuat pengumuman...</div>
      ) : !list || list.length === 0 ? (
        <div className="card empty">Saat ini tidak ada pengumuman baru.</div>
      ) : (
        <div className="stack" style={{ gap: '16px' }}>
          {list.map((item) => (
            <div
              key={item.id}
              className={`card announcement ${item.important ? 'important' : ''}`}
            >
              <div className="row between" style={{ marginBottom: '8px' }}>
                <span className="badge teal">{ANNOUNCEMENT_CATEGORY_LABEL[item.category]}</span>
                <span className="xs muted">{fmtDateTime(item.publishAt)}</span>
              </div>
              <h3 style={{ margin: '0 0 8px' }}>{item.title}</h3>
              <p style={{ whiteSpace: 'pre-line', margin: 0, color: '#334155' }}>{item.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
