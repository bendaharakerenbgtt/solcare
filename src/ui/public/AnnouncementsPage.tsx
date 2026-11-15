import React, { useMemo, useState } from 'react';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { ANNOUNCEMENT_CATEGORY_LABEL, fmtDateTime } from '../../lib/format';
import type { Announcement } from '../../data/types';
import { EmptyStateIllustration } from '../common/Icons';

type FilterGroup = 'all' | 'promosi' | 'jam_libur' | 'operasional' | 'lainnya';

const FILTER_TABS: { id: FilterGroup; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'promosi', label: 'Promo' },
  { id: 'jam_libur', label: 'Jam Buka & Libur' },
  { id: 'operasional', label: 'Info Pengerjaan' },
  { id: 'lainnya', label: 'Umum' },
];

function matchesFilterGroup(item: Announcement, group: FilterGroup): boolean {
  if (group === 'all') return true;
  if (group === 'promosi') return item.category === 'promosi';
  if (group === 'jam_libur') return item.category === 'jam_operasional' || item.category === 'libur';
  if (group === 'operasional') return item.category === 'kendala' || item.category === 'keterlambatan';
  return item.category === 'lainnya';
}

export const AnnouncementsPage: React.FC = () => {
  const { data: list, loading } = useAsync(() => repo.listPublicAnnouncements(), []);
  const [filter, setFilter] = useState<FilterGroup>('all');

  const filtered = useMemo(() => {
    return (list || []).filter((item) => matchesFilterGroup(item, filter));
  }, [list, filter]);

  return (
    <div className="public-container">
      <div className="stack" style={{ gap: '14px' }}>
        {/* Header */}
        <div style={{ marginTop: '2px' }}>
          <h1 style={{ margin: 0, fontSize: '1.24rem', fontWeight: 800, color: '#0f172a' }}>
            Pengumuman &amp; Promo
          </h1>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Update jam buka workshop, promo aktif, dan informasi operasional
          </span>
        </div>

        {/* Bilas Filter Pills */}
        <div className="orders-filter-grid">
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.id;
            const count = (list || []).filter((it) => matchesFilterGroup(it, tab.id)).length;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className="activity-filter-btn"
                style={{
                  background: active ? '#001b3a' : '#ffffff',
                  color: active ? '#ffffff' : '#475569',
                  border: active ? '1px solid #001b3a' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                }}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        {/* List */}
        {loading ? (
          <div className="empty">Memuat pengumuman...</div>
        ) : filtered.length === 0 ? (
          <div className="public-card" style={{ textAlign: 'center', padding: '28px 16px' }}>
            <EmptyStateIllustration size={105} />
            <strong style={{ display: 'block', fontSize: '0.96rem', color: '#0f172a', marginBottom: '4px' }}>
              Belum Ada Pengumuman
            </strong>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Saat ini tidak ada pembaruan pada kategori ini.
            </span>
          </div>
        ) : (
          <div className="stack" style={{ gap: '12px' }}>
            {filtered.map((item) => (
              <article
                key={item.id}
                className="public-card"
                style={{
                  borderLeft: item.important ? '4px solid #bf2f3b' : '4px solid #001b3a',
                  background: item.important ? '#fef2f2' : '#ffffff',
                  borderColor: item.important ? '#fecaca' : '#e2e8f0',
                  borderLeftColor: item.important ? '#bf2f3b' : '#001b3a',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {item.important && (
                      <span
                        style={{
                          background: '#bf2f3b',
                          color: '#ffffff',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '999px',
                        }}
                      >
                        PENTING
                      </span>
                    )}
                    <span className="badge teal" style={{ fontSize: '0.72rem' }}>
                      {ANNOUNCEMENT_CATEGORY_LABEL[item.category]}
                    </span>
                  </div>
                  <span className="xs muted price">{fmtDateTime(item.publishAt)}</span>
                </div>

                <h2 style={{ margin: '0 0 6px', fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
                  {item.title}
                </h2>
                <p style={{ whiteSpace: 'pre-line', margin: 0, fontSize: '0.84rem', color: '#334155', lineHeight: 1.55 }}>
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
