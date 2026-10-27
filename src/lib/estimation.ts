// Queue-capacity based completion estimate.
//
// Model (documented in docs/ESTIMASI.md):
// - Daily capacity is expressed in workload units (1 unit = 1 pair Basic Clean).
// - Every order consumes `sum(workloadWeight)` units on the business day work STARTS.
// - Orders still "menunggu" are scheduled FIFO onto the first open day (>= today) that
//   still has room. Orders already in progress that started on an earlier day no longer
//   consume future capacity.
// - Express orders are prioritised: placed on their intake day even if that exceeds
//   capacity (a warning is produced instead).
// - Completion = start day + (duration - 1) open days, at closing time.
// - If no day within the horizon has room, NO date is invented: result.ok = false.
// The result is always an estimate, never a guarantee. Staff can override manually.

import type { DateKey, ISODateTime, OrderServiceLine, OrderStatus, Settings } from '../data/types';
import { addOpenDays, atTime, dateKey, intakeStartDay, isOpenDay, minutesOf, nextOpenDay, addDaysKey, type OpCalendar } from './dates';

export type WorkLine = Pick<OrderServiceLine, 'category' | 'workloadWeight' | 'durationMinDays' | 'durationMaxDays' | 'expressHours'>;

export interface QueueOrder {
  id: string;
  receivedAt: ISODateTime;
  status: OrderStatus;
  services: WorkLine[];
}

export type EstimationSettings = Pick<Settings, 'dailyCapacity' | 'estimateHorizonDays'> & OpCalendar;

export interface DayLoad {
  date: DateKey;
  used: number;
  capacity: number;
  orderIds: string[];
}

export function orderWeight(lines: WorkLine[]): number {
  const w = lines.reduce((s, l) => s + (Number(l.workloadWeight) || 0), 0);
  return Math.round(w * 100) / 100;
}

export function orderDuration(lines: WorkLine[]): { min: number; max: number } {
  let min = 0;
  let max = 0;
  for (const l of lines) {
    if (l.category === 'express') continue;
    min = Math.max(min, l.durationMinDays || 0);
    max = Math.max(max, l.durationMaxDays || 0, l.durationMinDays || 0);
  }
  min = Math.max(1, min);
  max = Math.max(min, max);
  return { min, max };
}

export function expressHoursOf(lines: WorkLine[]): number | null {
  const hs = lines.filter((l) => l.category === 'express' && l.expressHours).map((l) => l.expressHours as number);
  return hs.length ? Math.min(...hs) : null;
}

const isActive = (s: OrderStatus) => s !== 'selesai' && s !== 'diambil';

interface Scheduler {
  loads: Map<DateKey, DayLoad>;
  assignment: Map<string, DateKey | null>;
  place(id: string, base: DateKey, weight: number, express: boolean): DateKey | null;
}

function createScheduler(settings: EstimationSettings, today: DateKey): Scheduler {
  const loads = new Map<DateKey, DayLoad>();
  const assignment = new Map<string, DateKey | null>();
  const cap = Math.max(0, Number(settings.dailyCapacity) || 0);
  const horizonEnd = addDaysKey(today, Math.max(1, settings.estimateHorizonDays || 60));

  const get = (d: DateKey) => {
    let l = loads.get(d);
    if (!l) {
      l = { date: d, used: 0, capacity: cap, orderIds: [] };
      loads.set(d, l);
    }
    return l;
  };

  return {
    loads,
    assignment,
    place(id, base, weight, express) {
      let day = nextOpenDay(base, settings);
      if (!day) {
        assignment.set(id, null);
        return null;
      }
      if (express || weight <= 0) {
        const l = get(day);
        l.used += weight;
        l.orderIds.push(id);
        assignment.set(id, day);
        return day;
      }
      while (day && day <= horizonEnd) {
        const l = get(day);
        // An order bigger than the whole capacity may take an otherwise empty day.
        if (cap > 0 && (l.used + weight <= cap + 1e-9 || l.used === 0)) {
          l.used += weight;
          l.orderIds.push(id);
          assignment.set(id, day);
          return day;
        }
        day = nextOpenDay(addDaysKey(day, 1), settings);
      }
      assignment.set(id, null);
      return null;
    },
  };
}

function scheduleExisting(orders: QueueOrder[], settings: EstimationSettings, now: Date) {
  const today = intakeStartDay(now, settings) ?? dateKey(now);
  const sched = createScheduler(settings, today);
  const active = orders.filter((o) => isActive(o.status));
  const sorted = [...active].sort((a, b) => {
    const ea = expressHoursOf(a.services) ? 0 : 1;
    const eb = expressHoursOf(b.services) ? 0 : 1;
    if (ea !== eb) return ea - eb;
    return a.receivedAt.localeCompare(b.receivedAt);
  });
  for (const o of sorted) {
    const r = intakeStartDay(new Date(o.receivedAt), settings);
    if (!r) continue;
    let base: DateKey;
    if (o.status === 'menunggu') base = r > today ? r : today;
    else if (r < today) continue; // already being worked on; no future capacity used
    else base = r;
    sched.place(o.id, base, orderWeight(o.services), !!expressHoursOf(o.services));
  }
  return { sched, today };
}

/** Upcoming daily loads (for dashboard & order form). */
export function queueSnapshot(orders: QueueOrder[], settings: EstimationSettings, now: Date, days = 14): DayLoad[] {
  const { sched, today } = scheduleExisting(orders, settings, now);
  const out: DayLoad[] = [];
  let d: DateKey | null = nextOpenDay(today, settings);
  while (d && out.length < days) {
    out.push(sched.loads.get(d) ?? { date: d, used: 0, capacity: settings.dailyCapacity, orderIds: [] });
    d = nextOpenDay(addDaysKey(d, 1), settings);
  }
  return out;
}

export type EstimateResult =
  | {
      ok: true;
      startDay: DateKey;
      earliestAt: ISODateTime;
      estimatedAt: ISODateTime;
      express: boolean;
      weight: number;
      loadBefore: number;
      capacity: number;
      warnings: string[];
    }
  | { ok: false; reason: string; weight: number; warnings: string[] };

function expressDeadline(now: Date, hours: number, cal: OpCalendar): Date | null {
  const dl = new Date(now.getTime() + hours * 3600_000);
  const k = dateKey(dl);
  const m = dl.getHours() * 60 + dl.getMinutes();
  if (isOpenDay(k, cal) && m <= minutesOf(cal.closeTime)) {
    return m < minutesOf(cal.openTime) ? atTime(k, cal.openTime) : dl;
  }
  const next = nextOpenDay(isOpenDay(k, cal) ? addDaysKey(k, 1) : k, cal);
  return next ? atTime(next, cal.openTime) : null;
}

export function estimateCompletion(
  lines: WorkLine[],
  existing: QueueOrder[],
  settings: EstimationSettings,
  now: Date,
  excludeOrderId?: string,
): EstimateResult {
  const warnings: string[] = [];
  const weight = orderWeight(lines);
  const others = excludeOrderId ? existing.filter((o) => o.id !== excludeOrderId) : existing;
  const { sched } = scheduleExisting(others, settings, now);
  const base = intakeStartDay(now, settings);
  if (!base) return { ok: false, reason: 'Kalender operasional tidak memiliki hari buka. Periksa pengaturan hari operasional.', weight, warnings };
  if (!settings.dailyCapacity || settings.dailyCapacity <= 0) {
    return { ok: false, reason: 'Kapasitas harian belum diatur (0). Atur kapasitas di Pengaturan.', weight, warnings };
  }
  const exH = expressHoursOf(lines);
  const loadBeforeBase = sched.loads.get(base)?.used ?? 0;
  const start = sched.place('__new__', base, weight, !!exH);
  if (!start) {
    return {
      ok: false,
      reason: `Antrean penuh untuk ${settings.estimateHorizonDays} hari ke depan berdasarkan kapasitas ${settings.dailyCapacity} unit/hari. Estimasi tidak dapat dihitung otomatis — tentukan estimasi manual atau sesuaikan kapasitas.`,
      weight,
      warnings,
    };
  }
  const loadBefore = (sched.loads.get(start)?.used ?? weight) - weight;
  const dur = orderDuration(lines);

  if (exH) {
    const dl = expressDeadline(now, exH, settings);
    if (!dl) return { ok: false, reason: 'Tidak ada hari buka untuk target express.', weight, warnings };
    if (loadBeforeBase + weight > settings.dailyCapacity) {
      warnings.push(`Kapasitas hari ${start} akan terlampaui (${loadBeforeBase + weight}/${settings.dailyCapacity} unit). Express tetap diprioritaskan — pastikan target dapat dipenuhi.`);
    }
    const expressDays = Math.ceil(exH / 24);
    if (dur.max > expressDays) {
      warnings.push(`Ada layanan dengan durasi standar ${dur.max} hari, lebih lama dari target express ${exH} jam.`);
    }
    return { ok: true, startDay: start, earliestAt: dl.toISOString(), estimatedAt: dl.toISOString(), express: true, weight, loadBefore, capacity: settings.dailyCapacity, warnings };
  }

  const earliestKey = addOpenDays(start, dur.min - 1, settings);
  const latestKey = addOpenDays(start, dur.max - 1, settings);
  if (!earliestKey || !latestKey) return { ok: false, reason: 'Kalender operasional tidak memiliki cukup hari buka.', weight, warnings };
  if (start !== base) warnings.push(`Kapasitas hari ${base} sudah penuh; pengerjaan diperkirakan mulai ${start}.`);
  if (weight > settings.dailyCapacity) warnings.push(`Beban pesanan (${weight} unit) melebihi kapasitas harian.`);
  return {
    ok: true,
    startDay: start,
    earliestAt: atTime(earliestKey, settings.closeTime).toISOString(),
    estimatedAt: atTime(latestKey, settings.closeTime).toISOString(),
    express: false,
    weight,
    loadBefore,
    capacity: settings.dailyCapacity,
    warnings,
  };
}

export function isLate(o: { status: OrderStatus; estimatedAt: string | null; completedAt: string | null }, now: Date): boolean {
  if (!o.estimatedAt) return false;
  if (o.status === 'selesai' || o.status === 'diambil') {
    return !!o.completedAt && o.completedAt > o.estimatedAt;
  }
  return now.toISOString() > o.estimatedAt;
}
