import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { dateKey, isOpenDay } from '../../lib/dates';
import { rupiah, STATUS_LABEL, displayCode, whatsappLink } from '../../lib/format';
import { isLate } from '../../lib/estimation';
import type { Order } from '../../data/types';

interface SlideCalendarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SlideCalendarDrawer: React.FC<SlideCalendarDrawerProps> = ({ isOpen, onClose }) => {
  const { data: orders } = useAsync(() => repo.listOrders(), [isOpen]);
  const { data: settings } = useAsync(() => repo.getSettings(), []);

  const now = new Date();
  const todayStr = dateKey(now);

  const [calMonth, setCalMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Calendar calculations
  const cYear = calMonth.getFullYear();
  const cMonth = calMonth.getMonth();
  const firstDayIdx = new Date(cYear, cMonth, 1).getDay();
  const totalDays = new Date(cYear, cMonth + 1, 0).getDate();

  const days: { key: string; dayNum: number; inMonth: boolean }[] = [];
  const prevMonthTotal = new Date(cYear, cMonth, 0).getDate();
  for (let i = firstDayIdx - 1; i >= 0; i--) {
    const dNum = prevMonthTotal - i;
    const prevD = new Date(cYear, cMonth - 1, dNum);
    days.push({ key: dateKey(prevD), dayNum: dNum, inMonth: false });
  }
  for (let i = 1; i <= totalDays; i++) {
    const curD = new Date(cYear, cMonth, i);
    days.push({ key: dateKey(curD), dayNum: i, inMonth: true });
  }
  let nextPad = 1;
  while (days.length % 7 !== 0) {
    const nextD = new Date(cYear, cMonth + 1, nextPad);
    days.push({ key: dateKey(nextD), dayNum: nextPad, inMonth: false });
    nextPad++;
  }

  // Map orders by estimate date
  const ordersByEstDate = new Map<string, Order[]>();
  (orders || []).forEach((o) => {
    if (o.estimatedAt) {
      const k = dateKey(new Date(o.estimatedAt));
      const list = ordersByEstDate.get(k) || [];
      list.push(o);
      ordersByEstDate.set(k, list);
    }
  });

  const selectedDateOrders = ordersByEstDate.get(selectedDate) || [];

  const prevMonth = () => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1));
  const nextMonth = () => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1));

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="cal-drawer-backdrop" onClick={onClose} aria-hidden="true" />}

      {/* Slide Drawer */}
      <aside className={`cal-drawer ${isOpen ? 'open' : ''}`}>
        <div className="cal-drawer-header">
          <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '1.2rem' }}>📅</span>
            <strong>Kalender Jadwal</strong>
          </div>
          <button
            type="button"
            className="x"
            style={{ color: '#fff', fontSize: '1.5rem', cursor: 'pointer', padding: '0 4px' }}
            onClick={onClose}
            aria-label="Tutup Kalender"
          >
            ✕
          </button>
        </div>

        <div className="cal-drawer-body">
          {/* Month Switcher */}
          <div className="mini-cal-nav row" style={{ justifyContent: 'space-between', padding: '8px 12px' }}>
            <button type="button" className="btn secondary sm" style={{ padding: '4px 10px' }} onClick={prevMonth}>
              ←
            </button>
            <div style={{ textAlign: 'center' }}>
              <strong style={{ fontSize: '0.92rem' }}>
                {calMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </strong>
            </div>
            <button type="button" className="btn secondary sm" style={{ padding: '4px 10px' }} onClick={nextMonth}>
              →
            </button>
          </div>

          {/* Quick jump to today */}
          {selectedDate !== todayStr && (
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                className="btn ghost sm"
                style={{ fontSize: '0.78rem', padding: '2px 8px' }}
                onClick={() => {
                  setCalMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDate(todayStr);
                }}
              >
                Kembali ke Hari Ini
              </button>
            </div>
          )}

          {/* 7-column Calendar Matrix */}
          <div className="mini-cal-grid">
            <div className="mini-cal-dow">Min</div>
            <div className="mini-cal-dow">Sen</div>
            <div className="mini-cal-dow">Sel</div>
            <div className="mini-cal-dow">Rab</div>
            <div className="mini-cal-dow">Kam</div>
            <div className="mini-cal-dow">Jum</div>
            <div className="mini-cal-dow">Sab</div>

            {days.map((d) => {
              const ords = ordersByEstDate.get(d.key) || [];
              const isToday = d.key === todayStr;
              const isSel = d.key === selectedDate;
              const open = settings ? isOpenDay(d.key, settings) : true;
              const hasLate = ords.some((o) => isLate(o, now) && o.status !== 'diambil');

              return (
                <div
                  key={d.key}
                  onClick={() => setSelectedDate(d.key)}
                  className={`mini-cal-day ${!d.inMonth ? 'out' : ''} ${!open ? 'closed' : ''} ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''} ${hasLate ? 'late-order' : ''}`}
                >
                  <span>{d.dayNum}</span>
                  {ords.length > 0 && (
                    <span className="mini-cal-badge">
                      {ords.length}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected Date Orders List */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px', marginTop: '6px' }}>
            <div className="row between" style={{ marginBottom: '8px' }}>
              <div>
                <strong style={{ fontSize: '0.9rem' }}>
                  Target Selesai {selectedDate === todayStr ? '(Hari Ini)' : ''}:
                </strong>
                <div className="xs muted">{selectedDate}</div>
              </div>
              <span className="badge teal">{selectedDateOrders.length} pesanan</span>
            </div>

            {selectedDateOrders.length === 0 ? (
              <div className="empty" style={{ padding: '20px 8px', fontSize: '0.85rem' }}>
                Tidak ada pesanan target selesai pada tanggal ini.
              </div>
            ) : (
              <div className="stack" style={{ gap: '10px' }}>
                {selectedDateOrders.map((o) => {
                  const late = isLate(o, now) && o.status !== 'diambil';
                  const waUrl = whatsappLink(o.customerPhone, `Halo Kak ${o.customerName}, info pesanan ${displayCode(o.code)}`);
                  return (
                    <div
                      key={o.id}
                      style={{
                        padding: '10px',
                        border: '1px solid var(--line)',
                        borderRadius: '10px',
                        background: '#f8fafc',
                      }}
                    >
                      <div className="row between" style={{ marginBottom: '4px' }}>
                        <strong className="mono" style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>
                          {displayCode(o.code)}
                        </strong>
                        <span className={`badge ${o.status === 'selesai' ? 'ok' : o.status === 'diambil' ? '' : 'teal'}`} style={{ fontSize: '0.72rem' }}>
                          {STATUS_LABEL[o.status]}
                        </span>
                      </div>
                      <div className="small">
                        <strong>{o.customerName}</strong>
                        <span className="xs muted" style={{ marginLeft: '4px' }}>({o.customerPhone})</span>
                      </div>
                      <div className="xs muted" style={{ marginTop: '2px' }}>
                        {o.itemType}: {o.brand} {o.model} • {rupiah(o.total)}
                      </div>
                      {late && (
                        <div className="xs" style={{ color: 'var(--danger)', fontWeight: 700, marginTop: '2px' }}>
                          ⚠️ Terlambat dari estimasi
                        </div>
                      )}
                      <div className="row" style={{ marginTop: '8px', gap: '6px' }}>
                        <Link
                          to={`/admin/orders/${o.id}`}
                          onClick={onClose}
                          className="btn sm secondary"
                          style={{ flex: 1, padding: '6px 8px', fontSize: '0.78rem' }}
                        >
                          ✏️ Detail / Edit
                        </Link>
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn sm wa"
                            style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                          >
                            WA
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Link */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', background: '#fff' }}>
          <Link
            to="/admin/calendar"
            onClick={onClose}
            className="btn secondary sm"
            style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }}
          >
            Buka Halaman Kalender Penuh ↗
          </Link>
        </div>
      </aside>
    </>
  );
};
