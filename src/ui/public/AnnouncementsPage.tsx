import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { getAnnouncementCategoryLabel, fmtDateTime } from '../../lib/format';
import type { Announcement } from '../../data/types';
import { EmptyStateIllustration } from '../common/Icons';

type FilterGroup = 'all' | 'promosi' | 'operasional' | 'libur' | 'teknis' | 'lainnya';

const FILTER_TABS: { id: FilterGroup; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'promosi', label: 'Promo & Diskon' },
  { id: 'operasional', label: 'Operasional' },
  { id: 'libur', label: 'Hari Libur' },
  { id: 'teknis', label: 'Kendala Teknis' },
  { id: 'lainnya', label: 'Lainnya' },
];

function matchesFilterGroup(item: Announcement, group: FilterGroup): boolean {
  if (group === 'all') return true;
  const cat = (item.category || '').toLowerCase();
  if (group === 'promosi') return cat === 'promosi';
  if (group === 'operasional') return cat === 'operasional' || cat === 'jam_operasional';
  if (group === 'libur') return cat === 'libur';
  if (group === 'teknis') return cat === 'teknis' || cat === 'kendala' || cat === 'keterlambatan';
  // 'lainnya': items not matching the predefined tabs
  return !['promosi', 'operasional', 'jam_operasional', 'libur', 'teknis', 'kendala', 'keterlambatan'].includes(cat);
}

function getCategoryColor(category: string): { bg: string; text: string; border: string } {
  const cat = (category || '').toLowerCase();
  if (cat === 'promosi') {
    return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
  }
  if (cat === 'teknis' || cat === 'kendala' || cat === 'keterlambatan') {
    return { bg: '#fff1f2', text: '#e11d48', border: '#fecdd3' };
  }
  if (cat === 'libur') {
    return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
  }
  if (cat === 'operasional' || cat === 'jam_operasional') {
    return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
  }
  return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
}

export const AnnouncementsPage: React.FC = () => {
  const { data: list, loading } = useAsync(() => repo.listPublicAnnouncements(), []);
  const [filter, setFilter] = useState<FilterGroup>('all');

  const filtered = useMemo(() => {
    return (list || []).filter((item) => matchesFilterGroup(item, filter));
  }, [list, filter]);

  return (
    <div className="public-container" style={{ paddingBottom: '32px' }}>
      <div className="stack" style={{ gap: '14px' }}>
        {/* Tombol Kembali ke Beranda */}
        <div>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.84rem',
              fontWeight: 700,
              color: '#001b3a',
              textDecoration: 'none',
              padding: '6px 0',
            }}
          >
            ← Kembali ke Beranda
          </Link>
        </div>

        {/* Title Header Bersih & Ringkas */}
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '1.28rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
            Pengumuman &amp; Promo
          </h1>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
            Update resmi seputar operasional, jam buka, dan promo workshop.
          </p>
        </div>

        {/* Scrollable Filter Chips / Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.id;
            const count = (list || []).filter((it) => matchesFilterGroup(it, tab.id)).length;
            if (count === 0 && tab.id !== 'all' && filter !== tab.id) return null;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: active ? 700 : 500,
                  background: active ? '#001b3a' : '#ffffff',
                  color: active ? '#ffffff' : '#334155',
                  border: active ? '1.5px solid #001b3a' : '1px solid #e2e8f0',
                  boxShadow: active ? '0 2px 6px rgba(0, 27, 58, 0.15)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '1px 6px',
                    borderRadius: '999px',
                    background: active ? 'rgba(255, 255, 255, 0.25)' : '#f1f5f9',
                    color: active ? '#ffffff' : '#64748b',
                    fontWeight: 600,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* List of Announcements */}
        {loading ? (
          <div className="empty" style={{ padding: '40px 16px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.86rem', color: '#64748b' }}>Memuat pengumuman...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="public-card" style={{ textAlign: 'center', padding: '36px 20px', borderRadius: '16px' }}>
            <EmptyStateIllustration size={110} />
            <strong style={{ display: 'block', fontSize: '1rem', color: '#0f172a', marginTop: '12px', marginBottom: '4px' }}>
              Tidak Ada Pengumuman
            </strong>
            <span style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '320px', display: 'inline-block' }}>
              Belum ada informasi terbaru pada kategori yang dipilih.
            </span>
          </div>
        ) : (
          <div className="stack" style={{ gap: '14px' }}>
            {filtered.map((item) => {
              const catColors = getCategoryColor(item.category);
              const label = getAnnouncementCategoryLabel(item.category);

              return (
                <article
                  key={item.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: item.important ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
                    borderLeft: item.important ? '5px solid #bf2f3b' : '5px solid #001b3a',
                    boxShadow: item.important
                      ? '0 4px 14px rgba(191, 47, 59, 0.08)'
                      : '0 2px 8px rgba(0, 0, 0, 0.04)',
                    padding: '16px 18px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Top Badges & Time */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      flexWrap: 'wrap',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {item.important && (
                        <span
                          style={{
                            background: '#bf2f3b',
                            color: '#ffffff',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 1px 4px rgba(191, 47, 59, 0.3)',
                          }}
                        >
                          <span style={{ fontSize: '0.65rem' }}>⚠️</span> PENTING
                        </span>
                      )}
                      <span
                        style={{
                          background: catColors.bg,
                          color: catColors.text,
                          border: `1px solid ${catColors.border}`,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2.5px 10px',
                          borderRadius: '999px',
                          display: 'inline-block',
                        }}
                      >
                        {label}
                      </span>
                    </div>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: '#64748b' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{fmtDateTime(item.publishAt)}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h2
                    style={{
                      margin: '0 0 8px',
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: item.important ? '#991b1b' : '#0f172a',
                      lineHeight: 1.35,
                    }}
                  >
                    {item.title}
                  </h2>

                  {/* Body Text */}
                  <p
                    style={{
                      whiteSpace: 'pre-line',
                      margin: 0,
                      fontSize: '0.86rem',
                      color: '#334155',
                      lineHeight: 1.6,
                    }}
                  >
                    {item.body}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
