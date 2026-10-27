import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { dateKey, isOpenDay } from '../../lib/dates';
import { STATUS_LABEL, displayCode } from '../../lib/format';
import { isLate } from '../../lib/estimation';
import type { Order } from '../../data/types';

export const CalendarPage: React.FC = () => {
  const { data: orders } = useAsync(() => repo.listOrders(), []);
  const { data: settings } = useAsync(() => repo.getSettings(), []);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string>(dateKey(new Date()));

  const now = new Date();

  // Helper navigate months
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Build calendar matrix (Sunday to Saturday)
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const days: { key: string; dayNum: number; inMonth: boolean }[] = [];

  // previous month padding
  const prevMonthTotal = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dNum = prevMonthTotal - i;
    const prevD = new Date(year, month - 1, dNum);
    days.push({ key: dateKey(prevD), dayNum: dNum, inMonth: false });
  }

  // current month
  for (let i = 1; i <= totalDays; i++) {
    const curD = new Date(year, month, i);
    days.push({ key: dateKey(curD), dayNum: i, inMonth: true });
  }

  // next month padding to reach multiple of 7
  let nextPad = 1;
  while (days.length % 7 !== 0) {
    const nextD = new Date(year, month + 1, nextPad);
    days.push({ key: dateKey(nextD), dayNum: nextPad, inMonth: false });
    nextPad++;
  }

  // Group orders by estimated date key
  const ordersByEstDate = new Map<string, Order[]>();
  (orders || []).forEach((o) => {
    if (o.estimatedAt) {
      const k = dateKey(new Date(o.estimatedAt));
      const list = ordersByEstDate.get(k) || [];
      list.push(o);
      ordersByEstDate.set(k, list);
    }
  });

  const selectedOrders = ordersByEstDate.get(selectedDateKey) || [];

  return (
    <div className="stack" style={{ gap: '20px' }}>
      <div className="admin-top">
        <div>
          <h1>Kalender Pesanan & Estimasi Selesai</h1>
          <p className="small muted">
            Tinjau pesanan berdasarkan tanggal target estimasi selesai dan kapasitas hari kerja.
          </p>
        </div>
      </div>

      <div className="grid grid-3" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Calendar View */}
        <div className="card">
          <div className="row between" style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>
              {currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="row" style={{ gap: '8px' }}>
              <button type="button" className="btn secondary sm" onClick={prevMonth}>
                ← Bulan Lalu
              </button>
              <button
                type="button"
                className="btn secondary sm"
                onClick={() => {
                  setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDateKey(dateKey(now));
                }}
              >
                Hari Ini
              </button>
              <button type="button" className="btn secondary sm" onClick={nextMonth}>
                Bulan Depan →
              </button>
            </div>
          </div>

          <div className="cal">
            <div className="dow">Min</div>
            <div className="dow">Sen</div>
            <div className="dow">Sel</div>
            <div className="dow">Rab</div>
            <div className="dow">Kam</div>
            <div className="dow">Jum</div>
            <div className="dow">Sab</div>

            {days.map((d) => {
              const ords = ordersByEstDate.get(d.key) || [];
              const isToday = d.key === dateKey(now);
              const isSel = d.key === selectedDateKey;
              const open = settings ? isOpenDay(d.key, settings) : true;

              return (
                <div
                  key={d.key}
                  className={`day ${!d.inMonth ? 'out' : ''} ${!open ? 'closed' : ''} ${isToday ? 'today' : ''} ${isSel ? 'sel' : ''}`}
                  onClick={() => setSelectedDateKey(d.key)}
                >
                  <div className="row between">
                    <span className="num">{d.dayNum}</span>
                    {ords.length > 0 && <span className="count">{ords.length}</span>}
                  </div>
                  {ords.slice(0, 2).map((o) => {
                    const late = isLate(o, now) && o.status !== 'diambil';
                    return (
                      <div key={o.id} className={`chip ${late ? 'late' : ''}`}>
                        {o.brand} ({STATUS_LABEL[o.status].slice(0, 6)})
                      </div>
                    );
                  })}
                  {ords.length > 2 && (
                    <div className="xs muted" style={{ textAlign: 'center' }}>
                      +{ords.length - 2} lainnya
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Orders List */}
        <div className="card">
          <h3>Target Selesai: {selectedDateKey}</h3>
          <p className="small muted" style={{ marginBottom: '16px' }}>
            Daftar pesanan dengan estimasi selesai pada tanggal ini:
          </p>

          {selectedOrders.length === 0 ? (
            <div className="empty">Tidak ada pesanan dijadwalkan selesai pada tanggal ini.</div>
          ) : (
            <div className="stack" style={{ gap: '12px' }}>
              {selectedOrders.map((o) => (
                <div key={o.id} className="card flat" style={{ border: '1px solid var(--line)', padding: '12px' }}>
                  <div className="row between">
                    <strong className="mono">{displayCode(o.code)}</strong>
                    <span className={`badge ${o.status === 'selesai' ? 'ok' : 'teal'}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <strong>{o.customerName}</strong> ({o.itemType} {o.brand} {o.model})
                  </div>
                  <div className="xs muted" style={{ marginTop: '4px' }}>
                    Layanan: {o.services.map((s) => s.name).join(', ')}
                  </div>
                  <div style={{ marginTop: '8px', textAlign: 'right' }}>
                    <Link to={`/admin/orders/${o.id}`} className="btn secondary sm">
                      Buka Detail →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
