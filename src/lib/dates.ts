import type { DateKey } from '../data/types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local business date key (YYYY-MM-DD) in the browser's timezone. */
export function dateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(k: DateKey): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function addDaysKey(k: DateKey, n: number): DateKey {
  return dateKey(addDays(parseDateKey(k), n));
}

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  const day = r.getDate();
  r.setDate(1);
  r.setMonth(r.getMonth() + n);
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(day, last));
  return r;
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function atTime(k: DateKey, hhmm: string): Date {
  const d = parseDateKey(k);
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export interface OpCalendar {
  closedWeekdays: number[];
  holidays: DateKey[];
  openTime: string;
  closeTime: string;
}

export function isOpenDay(k: DateKey, cal: OpCalendar): boolean {
  const wd = parseDateKey(k).getDay();
  return !cal.closedWeekdays.includes(wd) && !cal.holidays.includes(k);
}

/** First open day >= k (inclusive). null if none within `limit` days (misconfigured calendar). */
export function nextOpenDay(k: DateKey, cal: OpCalendar, limit = 400): DateKey | null {
  let cur = k;
  for (let i = 0; i <= limit; i++) {
    if (isOpenDay(cur, cal)) return cur;
    cur = addDaysKey(cur, 1);
  }
  return null;
}

/** Move forward `n` open days from open day `k`. n = 0 returns k. */
export function addOpenDays(k: DateKey, n: number, cal: OpCalendar): DateKey | null {
  let cur: DateKey | null = k;
  for (let i = 0; i < n; i++) {
    cur = nextOpenDay(addDaysKey(cur!, 1), cal);
    if (!cur) return null;
  }
  return cur;
}

/** The business day on which work on an order received at `at` can start. */
export function intakeStartDay(at: Date, cal: OpCalendar): DateKey | null {
  const today = dateKey(at);
  const nowMin = at.getHours() * 60 + at.getMinutes();
  if (isOpenDay(today, cal) && nowMin < minutesOf(cal.closeTime)) return today;
  return nextOpenDay(addDaysKey(today, 1), cal);
}
