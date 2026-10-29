import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { dateKey, parseDateKey, isOpenDay } from '../../lib/dates';
import { getNationalHolidayName } from '../../lib/holidays';
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

  const days: { key: string; dayNum: number; inMonth: boolean; dow: number }[] = [];

  // previous month padding
  const prevMonthTotal = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dNum = prevMonthTotal - i;
    const prevD = new Date(year, month - 1, dNum);
    days.push({ key: dateKey(prevD), dayNum: dNum, inMonth: false, dow: prevD.getDay() });
  }

  // current month
  for (let i = 1; i <= totalDays; i++) {
    const curD = new Date(year, month, i);
    days.push({ key: dateKey(curD), dayNum: i, inMonth: true, dow: curD.getDay() });
  }

  // next month padding to reach multiple of 7
  let nextPad = 1;
  while (days.length % 7 !== 0) {
    const nextD = new Date(year, month + 1, nextPad);
    days.push({ key: dateKey(nextD), dayNum: nextPad, inMonth: false, dow: nextD.getDay() });
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

  // Calculate monthly stats for the visible month
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthOrders = (orders || []).filter(
    (o) => o.estimatedAt && o.estimatedAt.startsWith(currentMonthPrefix)
  );
  const monthTotalOrders = monthOrders.length;
  const monthDoneOrders = monthOrders.filter(
    (o) => o.status === 'selesai' || o.status === 'diambil'
  ).length;
  const monthActiveOrders = monthOrders.filter(
    (o) => o.status !== 'selesai' && o.status !== 'diambil'
  ).length;
  const monthLateOrders = monthOrders.filter(
    (o) => isLate(o, now) && o.status !== 'diambil' && o.status !== 'selesai'
  ).length;

  const selectedOrders = ordersByEstDate.get(selectedDateKey) || [];
  const selectedDateObj = parseDateKey(selectedDateKey);
  const selectedHoliday = getNationalHolidayName(selectedDateKey);
  const isSelectedSunday = selectedDateObj.getDay() === 0;
  const isSelectedStoreClosed = settings ? !isOpenDay(selectedDateKey, settings) : false;

  return (
    <div className="stack" style={{ gap: '16px' }}>
      <div className="admin-page-header">
        <h1>Kalender Pesanan</h1>
      </div>

      <div className="calendar-layout">
        {/* Calendar View */}
        <div className="card">
          <div className="calendar-header-nav">
            <h3 style={{ margin: 0 }}>
              {currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="calendar-nav-buttons">
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

          {/* Month Indicator Summary Bar */}
          <div className="cal-month-summary">
            <div className="cal-summary-item">
              <span>Bulan ini: <strong>{monthTotalOrders}</strong> pesanan</span>
            </div>
            <div className="cal-summary-item">
              <span className="cal-dot green" />
              <span><strong>{monthDoneOrders}</strong> selesai</span>
            </div>
            <div className="cal-summary-item">
              <span className="cal-dot blue" />
              <span><strong>{monthActiveOrders}</strong> proses</span>
            </div>
            {monthLateOrders > 0 && (
              <div className="cal-summary-item">
                <span className="cal-dot red" />
                <span><strong>{monthLateOrders}</strong> terlambat</span>
              </div>
            )}
          </div>

          <div className="cal">
            <div className="dow sunday">Min</div>
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
              const holidayName = getNationalHolidayName(d.key);
              const isSunday = d.dow === 0;
              const isRedDate = isSunday || !!holidayName;
              const open = settings ? isOpenDay(d.key, settings) : true;

              const completedCount = ords.filter(
                (o) => o.status === 'selesai' || o.status === 'diambil'
              ).length;
              const inProgressCount = ords.filter(
                (o) => o.status !== 'selesai' && o.status !== 'diambil'
              ).length;
              const lateCount = ords.filter(
                (o) => isLate(o, now) && o.status !== 'diambil' && o.status !== 'selesai'
              ).length;

              return (
                <div
                  key={d.key}
                  className={`day ${!d.inMonth ? 'out' : ''} ${!open ? 'closed' : ''} ${isRedDate ? 'red-date' : ''} ${isToday ? 'today' : ''} ${isSel ? 'sel' : ''}`}
                  onClick={() => setSelectedDateKey(d.key)}
                >
                  <div className="row between" style={{ alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span className={`num ${isRedDate ? 'red' : ''}`}>{d.dayNum}</span>
                      {holidayName && <span className="cal-holiday-dot" title={holidayName} />}
                    </div>
                    {ords.length > 0 && (
                      <span
                        className={`cal-count-badge ${
                          completedCount === ords.length
                            ? 'all-done'
                            : lateCount > 0
                            ? 'has-late'
                            : ''
                        }`}
                        title={`${ords.length} pesanan (${completedCount} selesai, ${inProgressCount} proses)`}
                      >
                        {ords.length}
                      </span>
                    )}
                  </div>

                  {/* Holiday title tag on desktop */}
                  {holidayName && (
                    <div className="cal-holiday-tag" title={holidayName}>
                      {holidayName}
                    </div>
                  )}

                  {/* Desktop Status Pills */}
                  {completedCount > 0 && (
                    <div className="cal-status-pill done" title={`${completedCount} Pesanan Selesai`}>
                      <span className="cal-dot green" /> {completedCount} Selesai
                    </div>
                  )}
                  {inProgressCount > 0 && (
                    <div className="cal-status-pill prog" title={`${inProgressCount} Sedang Dikerjakan`}>
                      <span className="cal-dot blue" /> {inProgressCount} Proses
                    </div>
                  )}
                  {lateCount > 0 && (
                    <div className="cal-status-pill late" title={`${lateCount} Terlambat`}>
                      <span className="cal-dot red" /> {lateCount} Lewat
                    </div>
                  )}

                  {/* Mobile Compact Indicators */}
                  {ords.length > 0 && (
                    <div className="cal-mob-indicators">
                      {completedCount > 0 && (
                        <span className="cal-mob-pill done" title={`${completedCount} Selesai`}>
                          {completedCount} ✓
                        </span>
                      )}
                      {inProgressCount > 0 && (
                        <span className="cal-mob-pill prog" title={`${inProgressCount} Proses`}>
                          {inProgressCount} ⚙
                        </span>
                      )}
                      {lateCount > 0 && (
                        <span className="cal-mob-pill late" title={`${lateCount} Terlambat`}>
                          {lateCount} !
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Orders List */}
        <div className="card">
          <h3 style={{ margin: 0, fontSize: '1.05rem', marginBottom: '8px' }}>
            {selectedDateObj.toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h3>

          {/* Tanggal Merah Alert */}
          {selectedHoliday && (
            <div className="cal-date-alert holiday">
              <span>Libur Nasional: <strong>{selectedHoliday}</strong></span>
            </div>
          )}
          {isSelectedSunday && !selectedHoliday && (
            <div className="cal-date-alert sunday">
              <span>Tanggal Merah: <strong>Hari Minggu</strong></span>
            </div>
          )}
          {isSelectedStoreClosed && !selectedHoliday && !isSelectedSunday && (
            <div className="cal-date-alert closed">
              <span>Toko Tutup / Off Operasional</span>
            </div>
          )}

          {selectedOrders.length === 0 ? (
            <div className="empty" style={{ padding: '24px 12px' }}>
              Tidak ada pesanan dijadwalkan selesai pada tanggal ini.
            </div>
          ) : (
            <div className="stack" style={{ gap: '10px', marginTop: '10px' }}>
              {selectedOrders.map((o) => {
                const late = isLate(o, now) && o.status !== 'diambil' && o.status !== 'selesai';
                const done = o.status === 'selesai' || o.status === 'diambil';

                return (
                  <div
                    key={o.id}
                    className="card flat"
                    style={{
                      border: late ? '1px solid #fca5a5' : '1px solid var(--line)',
                      background: late ? '#fffdfd' : '#fff',
                      padding: '12px',
                    }}
                  >
                    <div className="row between" style={{ alignItems: 'center' }}>
                      <strong className="mono">{displayCode(o.code)}</strong>
                      <span className={`badge ${done ? 'ok' : late ? 'bad' : 'teal'}`}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '0.9rem' }}>
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
