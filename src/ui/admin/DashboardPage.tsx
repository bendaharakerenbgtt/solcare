import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks';
import { repo } from '../../data';
import { fmtDateTime, rupiah, STATUS_LABEL, displayCode, whatsappLink } from '../../lib/format';
import { isLate } from '../../lib/estimation';
import { dateKey, isOpenDay } from '../../lib/dates';
import type { Order } from '../../data/types';

export const DashboardPage: React.FC = () => {
  const { data: orders, loading } = useAsync(() => repo.listOrders(), []);
  const { data: settings } = useAsync(() => repo.getSettings(), []);

  const now = new Date();
  const todayStr = dateKey(now);

  // States
  const [filterType, setFilterType] = useState<'all' | 'active' | 'today' | 'late' | 'ready' | 'unpaid'>('all');
  const [calMonth, setCalMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedCalDate, setSelectedCalDate] = useState<string>(todayStr);

  const activeOrders = (orders || []).filter((o) => o.status !== 'selesai' && o.status !== 'diambil');
  const todayEst = (orders || []).filter((o) => o.estimatedAt && o.estimatedAt.startsWith(todayStr) && o.status !== 'diambil');
  const completedOrders = (orders || []).filter((o) => o.status === 'selesai');
  const lateOrders = (orders || []).filter((o) => isLate(o, now) && o.status !== 'diambil');
  const unpaidOrders = (orders || []).filter((o) => o.payment.status === 'belum_lunas');

  // Month Calendar Matrix calculation
  const cYear = calMonth.getFullYear();
  const cMonth = calMonth.getMonth();
  const firstDayIdx = new Date(cYear, cMonth, 1).getDay();
  const totalDays = new Date(cYear, cMonth + 1, 0).getDate();

  const calDays: { key: string; dayNum: number; inMonth: boolean }[] = [];
  const prevMonthTotal = new Date(cYear, cMonth, 0).getDate();
  for (let i = firstDayIdx - 1; i >= 0; i--) {
    const dNum = prevMonthTotal - i;
    const prevD = new Date(cYear, cMonth - 1, dNum);
    calDays.push({ key: dateKey(prevD), dayNum: dNum, inMonth: false });
  }
  for (let i = 1; i <= totalDays; i++) {
    const curD = new Date(cYear, cMonth, i);
    calDays.push({ key: dateKey(curD), dayNum: i, inMonth: true });
  }
  let nextPad = 1;
  while (calDays.length % 7 !== 0) {
    const nextD = new Date(cYear, cMonth + 1, nextPad);
    calDays.push({ key: dateKey(nextD), dayNum: nextPad, inMonth: false });
    nextPad++;
  }

  // Map orders by estimation date
  const ordersByEstDate = new Map<string, Order[]>();
  (orders || []).forEach((o) => {
    if (o.estimatedAt) {
      const k = dateKey(new Date(o.estimatedAt));
      const list = ordersByEstDate.get(k) || [];
      list.push(o);
      ordersByEstDate.set(k, list);
    }
  });

  const selectedDateOrders = ordersByEstDate.get(selectedCalDate) || [];

  // Filtered orders for table / cards
  const displayedOrders = (orders || []).filter((o) => {
    if (filterType === 'active') return o.status !== 'selesai' && o.status !== 'diambil';
    if (filterType === 'today') return o.estimatedAt && o.estimatedAt.startsWith(todayStr) && o.status !== 'diambil';
    if (filterType === 'late') return isLate(o, now) && o.status !== 'diambil';
    if (filterType === 'ready') return o.status === 'selesai';
    if (filterType === 'unpaid') return o.payment.status === 'belum_lunas';
    return true;
  }).slice(0, 8);

  const prevMonth = () => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1));
  const nextMonth = () => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1));

  return (
    <div className="stack" style={{ gap: '20px' }}>
      {/* Top Header */}
      <div className="admin-top admin-top-responsive">
        <div>
          <h1>Dashboard Operasional</h1>
          <p className="small muted">
            Ringkasan antrean, status pesanan, dan visual kalender estimasi selesai.
          </p>
        </div>
        <div className="spacer" />
        <Link to="/admin/orders/new" className="btn primary admin-header-action-btn">
          ➕ Catat Pesanan Baru
        </Link>
      </div>

      {/* Quick Menu Bar */}
      <div className="dash-quick-menu">
        <Link to="/admin/orders/new" className="dash-quick-btn primary full">
          ➕ Catat Pesanan Baru
        </Link>
        <Link to="/admin/orders" className="dash-quick-btn">
          📦 Semua Pesanan ({orders?.length || 0})
        </Link>
        <Link to="/admin/calendar" className="dash-quick-btn">
          📅 Kalender Jadwal Penuh
        </Link>
      </div>

      {/* Modern Compact 2x2 Metrics Cards on Mobile (4 cols on Desktop) */}
      <div className="dash-metrics-grid">
        <div
          className={`dash-metric-card ${filterType === 'active' ? 'active' : ''}`}
          onClick={() => setFilterType(filterType === 'active' ? 'all' : 'active')}
        >
          <div className="icon-label">
            <span>📦</span>
            <span>Pesanan Aktif</span>
          </div>
          <div className="val" style={{ color: 'var(--primary)' }}>
            {activeOrders.length}
          </div>
          <div className="sub">Kapasitas: {settings?.dailyCapacity || 20} unit/hari</div>
        </div>

        <div
          className={`dash-metric-card ${filterType === 'today' ? 'active' : ''}`}
          onClick={() => setFilterType(filterType === 'today' ? 'all' : 'today')}
        >
          <div className="icon-label">
            <span>⚡</span>
            <span>Target Hari Ini</span>
          </div>
          <div className="val" style={{ color: todayEst.length > 0 ? '#0284c7' : 'inherit' }}>
            {todayEst.length}
          </div>
          <div className="sub">Perlu selesai hari ini</div>
        </div>

        <div
          className={`dash-metric-card ${filterType === 'late' ? 'active' : ''}`}
          onClick={() => setFilterType(filterType === 'late' ? 'all' : 'late')}
        >
          <div className="icon-label">
            <span>⚠️</span>
            <span>Terlambat</span>
          </div>
          <div className="val" style={{ color: lateOrders.length > 0 ? 'var(--danger)' : 'var(--ok)' }}>
            {lateOrders.length}
          </div>
          <div className="sub">Melewati target estimasi</div>
        </div>

        <div
          className={`dash-metric-card ${filterType === 'ready' ? 'active' : ''}`}
          onClick={() => setFilterType(filterType === 'ready' ? 'all' : 'ready')}
        >
          <div className="icon-label">
            <span>✅</span>
            <span>Siap Diambil</span>
          </div>
          <div className="val" style={{ color: 'var(--ok)' }}>
            {completedOrders.length}
          </div>
          <div className="sub">Menunggu dijemput</div>
        </div>
      </div>

      {/* Visual Calendar Widget: Jadwal Estimasi Selesai */}
      <div className="card mini-cal-card">
        <div className="mini-cal-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>
              📅 Visual Kalender: Target Selesai
            </h3>
            <span className="small muted">Klik tanggal untuk melihat daftar pesanan yang selesai</span>
          </div>
          <div className="row" style={{ gap: '6px' }}>
            <button type="button" className="btn secondary sm" style={{ padding: '4px 8px' }} onClick={prevMonth}>
              ←
            </button>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', minWidth: '110px', textAlign: 'center' }}>
              {calMonth.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
            </span>
            <button type="button" className="btn secondary sm" style={{ padding: '4px 8px' }} onClick={nextMonth}>
              →
            </button>
          </div>
        </div>

        {/* Calendar Day Grid */}
        <div className="mini-cal-grid">
          <div className="mini-cal-dow">Min</div>
          <div className="mini-cal-dow">Sen</div>
          <div className="mini-cal-dow">Sel</div>
          <div className="mini-cal-dow">Rab</div>
          <div className="mini-cal-dow">Kam</div>
          <div className="mini-cal-dow">Jum</div>
          <div className="mini-cal-dow">Sab</div>

          {calDays.map((d) => {
            const ords = ordersByEstDate.get(d.key) || [];
            const isToday = d.key === todayStr;
            const isSel = d.key === selectedCalDate;
            const open = settings ? isOpenDay(d.key, settings) : true;
            const hasLate = ords.some((o) => isLate(o, now) && o.status !== 'diambil');

            return (
              <div
                key={d.key}
                onClick={() => setSelectedCalDate(d.key)}
                className={`mini-cal-day ${!d.inMonth ? 'out' : ''} ${!open ? 'closed' : ''} ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''} ${hasLate ? 'late-order' : ''}`}
                title={`${d.key} (${ords.length} pesanan)`}
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

        {/* Selected Date Orders Drawer / Box */}
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed var(--line)' }}>
          <div className="row between" style={{ marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              Target Selesai {selectedCalDate === todayStr ? 'Hari Ini' : ''} ({selectedCalDate}):
            </span>
            <span className="small muted">{selectedDateOrders.length} Pesanan</span>
          </div>

          {selectedDateOrders.length === 0 ? (
            <div className="small muted" style={{ padding: '8px 0' }}>
              Tidak ada pesanan dengan target selesai pada tanggal ini.
            </div>
          ) : (
            <div className="stack" style={{ gap: '8px' }}>
              {selectedDateOrders.map((o) => {
                const late = isLate(o, now) && o.status !== 'diambil';
                const waUrl = whatsappLink(o.customerPhone, `Halo Kak ${o.customerName}, info pesanan ${displayCode(o.code)}`);
                return (
                  <div
                    key={o.id}
                    className="card flat"
                    style={{
                      padding: '10px 12px',
                      border: '1px solid var(--line)',
                      borderRadius: '10px',
                      background: '#f8fafc',
                    }}
                  >
                    <div className="row between" style={{ marginBottom: '4px' }}>
                      <div>
                        <strong className="mono">{displayCode(o.code)}</strong>
                        <span style={{ marginLeft: '8px', fontWeight: 600 }}>{o.customerName}</span>
                      </div>
                      <span className={`badge ${o.status === 'selesai' ? 'ok' : o.status === 'diambil' ? '' : 'teal'}`}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </div>
                    <div className="small muted">
                      {o.itemType}: {o.brand} {o.model} • {rupiah(o.total)}
                    </div>
                    {late && <div className="xs" style={{ color: 'var(--danger)', fontWeight: 700, marginTop: '2px' }}>⚠️ Melewati estimasi</div>}
                    <div className="row" style={{ marginTop: '8px', gap: '6px' }}>
                      <Link to={`/admin/orders/${o.id}`} className="btn sm secondary" style={{ flex: 1, padding: '6px 8px' }}>
                        ✏️ Edit / Detail Pesanan
                      </Link>
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn sm wa"
                          style={{ padding: '6px 12px' }}
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

      {/* Orders Management Section */}
      <div className="card">
        <div className="row between" style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0 }}>Kelola Pesanan</h3>
            <span className="small muted">
              {filterType === 'all' ? 'Seluruh pesanan masuk' : `Filter: ${filterType.toUpperCase()}`}
            </span>
          </div>
          <Link to="/admin/orders" className="btn sm secondary">
            Lihat Semua Antrean ({orders?.length || 0}) →
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="tabs" style={{ marginBottom: '16px' }}>
          <button
            type="button"
            className={filterType === 'all' ? 'active' : ''}
            onClick={() => setFilterType('all')}
          >
            Semua ({orders?.length || 0})
          </button>
          <button
            type="button"
            className={filterType === 'active' ? 'active' : ''}
            onClick={() => setFilterType('active')}
          >
            Aktif ({activeOrders.length})
          </button>
          <button
            type="button"
            className={filterType === 'today' ? 'active' : ''}
            onClick={() => setFilterType('today')}
          >
            Hari Ini ({todayEst.length})
          </button>
          <button
            type="button"
            className={filterType === 'late' ? 'active' : ''}
            onClick={() => setFilterType('late')}
          >
            Terlambat ({lateOrders.length})
          </button>
          <button
            type="button"
            className={filterType === 'ready' ? 'active' : ''}
            onClick={() => setFilterType('ready')}
          >
            Siap Ambil ({completedOrders.length})
          </button>
          <button
            type="button"
            className={filterType === 'unpaid' ? 'active' : ''}
            onClick={() => setFilterType('unpaid')}
          >
            Belum Lunas ({unpaidOrders.length})
          </button>
        </div>

        {loading ? (
          <div className="empty">Memuat data pesanan...</div>
        ) : displayedOrders.length === 0 ? (
          <div className="empty">Tidak ada pesanan untuk filter ini.</div>
        ) : (
          <>
            {/* MOBILE ONLY: Modern Mobile Cards */}
            <div className="mobile-only-cards mobile-order-cards">
              {displayedOrders.map((o) => {
                const late = isLate(o, now) && o.status !== 'diambil';
                const waUrl = whatsappLink(o.customerPhone, `Halo Kak ${o.customerName}, info pesanan ${displayCode(o.code)}`);
                return (
                  <div key={o.id} className="mobile-order-card">
                    <div className="mobile-order-card-top">
                      <div>
                        <strong className="mono" style={{ fontSize: '1rem', color: 'var(--primary)' }}>
                          {displayCode(o.code)}
                        </strong>
                        <div className="xs muted">{fmtDateTime(o.receivedAt)}</div>
                      </div>
                      <div className="row" style={{ gap: '4px' }}>
                        <span className={`badge ${o.status === 'selesai' ? 'ok' : o.status === 'diambil' ? '' : 'teal'}`}>
                          {STATUS_LABEL[o.status]}
                        </span>
                        <span className={`badge ${o.payment.status === 'lunas' ? 'ok' : 'warn'}`}>
                          {o.payment.status === 'lunas' ? 'Lunas' : 'Belum'}
                        </span>
                      </div>
                    </div>

                    <div className="mobile-order-card-body">
                      <div>
                        <strong>{o.customerName}</strong>
                        <span className="small muted" style={{ marginLeft: '6px' }}>({o.customerPhone})</span>
                      </div>
                      <div className="small">
                        👟 <strong>{o.itemType}</strong>: {o.brand} {o.model}
                      </div>
                      <div className="xs muted">
                        Layanan: {o.services.map((s) => s.name).join(', ')}
                      </div>
                      <div className="small row between" style={{ marginTop: '2px' }}>
                        <span>Target Selesai:</span>
                        <strong className={late ? 'badge danger' : ''}>
                          {o.estimatedAt ? fmtDateTime(o.estimatedAt) : '-'}
                        </strong>
                      </div>
                      <div className="small row between">
                        <span>Total Biaya:</span>
                        <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>{rupiah(o.total)}</strong>
                      </div>
                    </div>

                    <div className="mobile-order-card-actions">
                      <Link to={`/admin/orders/${o.id}`} className="btn secondary">
                        ✏️ Edit / Detail Pesanan
                      </Link>
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn wa"
                          style={{ flex: '0 0 auto', padding: '9px 14px' }}
                        >
                          💬 WA
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP ONLY: Full Table */}
            <div className="desktop-only-table">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Kode & Tanggal</th>
                      <th>Pelanggan</th>
                      <th>Barang</th>
                      <th>Status</th>
                      <th>Estimasi</th>
                      <th>Pembayaran</th>
                      <th className="right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedOrders.map((o) => {
                      const late = isLate(o, now) && o.status !== 'diambil';
                      return (
                        <tr key={o.id}>
                          <td>
                            <strong className="mono">{displayCode(o.code)}</strong>
                            <div className="xs muted">{fmtDateTime(o.receivedAt)}</div>
                          </td>
                          <td>
                            <strong>{o.customerName}</strong>
                            <div className="xs muted">{o.customerPhone}</div>
                          </td>
                          <td>
                            {o.itemType} - {o.brand} {o.model}
                          </td>
                          <td>
                            <span className={`badge ${o.status === 'selesai' ? 'ok' : o.status === 'diambil' ? '' : 'teal'}`}>
                              {STATUS_LABEL[o.status]}
                            </span>
                          </td>
                          <td>
                            <div className={late ? 'badge danger' : ''}>
                              {o.estimatedAt ? fmtDateTime(o.estimatedAt) : '-'}
                            </div>
                          </td>
                          <td>
                            <div>{rupiah(o.total)}</div>
                            <span className={`badge ${o.payment.status === 'lunas' ? 'ok' : 'warn'}`}>
                              {o.payment.status === 'lunas' ? 'Lunas' : 'Belum Lunas'}
                            </span>
                          </td>
                          <td className="right">
                            <Link to={`/admin/orders/${o.id}`} className="btn secondary sm">
                              Detail / Edit
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
