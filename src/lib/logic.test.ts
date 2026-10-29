import { describe, expect, it } from 'vitest';
import { estimateCompletion, isLate, orderDuration, orderWeight, queueSnapshot, type QueueOrder, type WorkLine } from './estimation';
import { addOpenDays, intakeStartDay } from './dates';
import { checkPhotoEligibility } from './retention';
import { displayCode, generateCode, normalizeCode } from './code';
import { validateServiceLines, lineFromService } from './pricing';
import type { Order, OrderPhoto, Service } from '../data/types';

const settings = {
  dailyCapacity: 20,
  estimateHorizonDays: 60,
  openTime: '09:00',
  closeTime: '18:00',
  closedWeekdays: [0], // Minggu libur
  holidays: ['2026-10-21'],
};

const basic: WorkLine = { category: 'main', workloadWeight: 1, durationMinDays: 2, durationMaxDays: 2, expressHours: null };
const heavy: WorkLine = { category: 'main', workloadWeight: 2.5, durationMinDays: 3, durationMaxDays: 4, expressHours: null };
const repaint: WorkLine = { category: 'additional', workloadWeight: 3, durationMinDays: 7, durationMaxDays: 14, expressHours: null };
const express24: WorkLine = { category: 'express', workloadWeight: 0, durationMinDays: 0, durationMaxDays: 0, expressHours: 24 };

// Monday 19 Oct 2026, 10:00 local
const MON = new Date(2026, 9, 19, 10, 0);

function waiting(n: number, lines: WorkLine[], at = MON): QueueOrder[] {
  return Array.from({ length: n }, (_, i) => ({ id: 'o' + i, receivedAt: new Date(at.getTime() - 1000 * (n - i)).toISOString(), status: 'menunggu', services: lines }));
}

describe('calendar', () => {
  it('skips closed weekdays and holidays', () => {
    // Tue 20 -> +1 open day skips Wed 21 (holiday) -> Thu 22
    expect(addOpenDays('2026-10-20', 1, settings)).toBe('2026-10-22');
    // Sat 24 -> +1 skips Sunday -> Mon 26
    expect(addOpenDays('2026-10-24', 1, settings)).toBe('2026-10-26');
  });
  it('orders after closing start next open day', () => {
    expect(intakeStartDay(new Date(2026, 9, 19, 19, 0), settings)).toBe('2026-10-20');
    expect(intakeStartDay(new Date(2026, 9, 25, 12, 0), settings)).toBe('2026-10-26'); // Sunday
  });
});

describe('estimation', () => {
  it('weights heavy/restoration more than basic', () => {
    expect(orderWeight([heavy])).toBeGreaterThan(orderWeight([basic]));
    expect(orderDuration([basic, repaint])).toEqual({ min: 7, max: 14 });
  });

  it('empty queue: basic clean finishes in 2 open days', () => {
    const r = estimateCompletion([basic], [], settings, MON);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.startDay).toBe('2026-10-19');
      expect(new Date(r.estimatedAt).getDate()).toBe(20);
    }
  });

  it('full day pushes start to the next open day (skipping holiday)', () => {
    const r = estimateCompletion([basic], waiting(20, [basic]), settings, MON);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.startDay).toBe('2026-10-20');
      // 2 days from Tue 20 -> Thu 22 because Wed 21 is a holiday
      expect(new Date(r.estimatedAt).getDate()).toBe(22);
      expect(r.warnings.length).toBeGreaterThan(0);
    }
  });

  it('counts workload, not just pairs: 8 heavy cleans (20 units) fill a day', () => {
    const r = estimateCompletion([basic], waiting(8, [heavy]), settings, MON);
    expect(r.ok && r.startDay).toBe('2026-10-20');
  });

  it('refuses to invent a date when capacity is full over the horizon', () => {
    const small = { ...settings, estimateHorizonDays: 3 };
    const r = estimateCompletion([basic], waiting(200, [basic]), small, MON);
    expect(r.ok).toBe(false);
  });

  it('refuses when capacity is 0', () => {
    expect(estimateCompletion([basic], [], { ...settings, dailyCapacity: 0 }, MON).ok).toBe(false);
  });

  it('express 24h targets now + 24h and is prioritised even when full', () => {
    const r = estimateCompletion([basic, express24], waiting(20, [basic]), settings, MON);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.express).toBe(true);
      expect(r.startDay).toBe('2026-10-19');
      expect(new Date(r.estimatedAt).getTime()).toBe(MON.getTime() + 24 * 3600_000);
      expect(r.warnings.some((w) => w.includes('terlampaui'))).toBe(true);
    }
  });

  it('in-progress orders started earlier do not consume future capacity', () => {
    const old = waiting(20, [basic], new Date(2026, 9, 16, 10)).map((o) => ({ ...o, status: 'pencucian' as const }));
    const r = estimateCompletion([basic], old, settings, MON);
    expect(r.ok && r.startDay).toBe('2026-10-19');
  });

  it('snapshot reports daily loads', () => {
    const snap = queueSnapshot(waiting(25, [basic]), settings, MON, 3);
    expect(snap[0].used).toBe(20);
    expect(snap[1].used).toBe(5);
  });

  it('late detection', () => {
    expect(isLate({ status: 'pencucian', estimatedAt: '2026-10-18T10:00:00.000Z', completedAt: null }, MON)).toBe(true);
    expect(isLate({ status: 'selesai', estimatedAt: '2026-10-18T10:00:00.000Z', completedAt: '2026-10-17T10:00:00.000Z' }, MON)).toBe(false);
  });
});

describe('tracking code', () => {
  it('is random, normalizable and unique enough', () => {
    const set = new Set(Array.from({ length: 5000 }, generateCode));
    expect(set.size).toBe(5000);
    const c = generateCode();
    expect(normalizeCode(displayCode(c).toLowerCase())).toBe(c);
    expect(normalizeCode('SS-AAAA')).toBeNull();
    expect(normalizeCode('SS-00000-11111')).toBeNull();
  });
});

describe('pricing validation', () => {
  const now = new Date().toISOString();
  const mk = (p: Partial<Service>): Service => ({
    id: p.name!, name: p.name!, category: 'main', description: '', terms: '', priceMin: 35000, priceMax: null,
    durationMinDays: 2, durationMaxDays: 2, workloadWeight: 1, expressHours: null, expressEligible: false, active: true, sortOrder: 0, createdAt: now, updatedAt: now, ...p,
  });
  const basicS = mk({ name: 'Basic Clean', expressEligible: true });
  const heavyS = mk({ name: 'Heavy Clean', priceMin: 75000 });
  const ex = mk({ name: 'Express 24', category: 'express', priceMin: 20000, expressHours: 24 });
  const premium = mk({ name: 'Premium', priceMin: 75000, priceMax: 125000 });
  const cat = [basicS, heavyS, ex, premium];

  it('express only with eligible main services', () => {
    expect(validateServiceLines([lineFromService(basicS), lineFromService(ex)], cat).errors).toEqual([]);
    expect(validateServiceLines([lineFromService(heavyS), lineFromService(ex)], cat).errors.length).toBe(1);
    expect(validateServiceLines([lineFromService(ex)], cat).errors.length).toBe(1);
  });
  it('warns when range price is outside the catalog range', () => {
    const l = { ...lineFromService(premium), price: 150000 };
    expect(validateServiceLines([l], cat).warnings.length).toBe(1);
    expect(validateServiceLines([{ ...l, price: 100000 }], cat).warnings.length).toBe(0);
  });
});

describe('photo retention', () => {
  const settingsR = { retentionBasis: 'picked_up_or_completed' as const, retentionMonths: 6 };
  const order = { id: 'o1', status: 'diambil', completedAt: '2026-01-10T10:00:00.000Z', pickedUpAt: '2026-01-15T10:00:00.000Z' } as Order;
  const photo = { id: 'p1', orderId: 'o1', status: 'active' } as OrderPhoto;

  it('deletes only after 6 months from pickup', () => {
    expect(checkPhotoEligibility(photo, order, settingsR, new Date('2026-07-14T10:00:00Z')).eligible).toBe(false);
    expect(checkPhotoEligibility(photo, order, settingsR, new Date('2026-07-15T10:00:01Z')).eligible).toBe(true);
  });
  it('never deletes for active orders, missing owner, or already deleted', () => {
    const late = new Date('2030-01-01');
    expect(checkPhotoEligibility(photo, { ...order, status: 'finishing' }, settingsR, late).eligible).toBe(false);
    expect(checkPhotoEligibility(photo, undefined, settingsR, late).eligible).toBe(false);
    expect(checkPhotoEligibility(photo, { ...order, id: 'other' }, settingsR, late).eligible).toBe(false);
    expect(checkPhotoEligibility({ ...photo, status: 'deleted' }, order, settingsR, late).eligible).toBe(false);
  });
});

describe('indonesian holidays & tanggal merah', () => {
  it('identifies national holidays and Sundays as tanggal merah', async () => {
    const { getNationalHolidayName, isTanggalMerah } = await import('./holidays');
    expect(getNationalHolidayName('2026-08-17')).toContain('Kemerdekaan RI');
    expect(isTanggalMerah('2026-08-17', 1)).toBe(true); // Monday national holiday
    expect(isTanggalMerah('2026-10-18', 0)).toBe(true); // Sunday
    expect(isTanggalMerah('2026-10-20', 2)).toBe(false); // Normal Tuesday
  });
});
