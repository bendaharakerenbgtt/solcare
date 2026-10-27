import type { AnnouncementCategory, OrderStatus, PaymentMethod, PaymentStatus, Service, ServiceCategory } from '../data/types';
export { displayCode } from './code';

export function rupiah(n: number | null | undefined): string {
  const v = Math.round(Number(n) || 0);
  return 'Rp' + v.toLocaleString('id-ID');
}

export function priceLabel(s: Pick<Service, 'priceMin' | 'priceMax' | 'category'>): string {
  const prefix = s.category === 'express' ? '+' : '';
  if (s.priceMax != null && s.priceMax > s.priceMin) return `${prefix}${rupiah(s.priceMin)}–${rupiah(s.priceMax).replace('Rp', '')}`;
  return prefix + rupiah(s.priceMin);
}

export function durationLabel(s: Pick<Service, 'durationMinDays' | 'durationMaxDays' | 'expressHours'>): string {
  if (s.expressHours) return `${s.expressHours} jam`;
  if (!s.durationMaxDays) return '';
  if (s.durationMaxDays > s.durationMinDays) return `${s.durationMinDays}–${s.durationMaxDays} hari`;
  return `${s.durationMaxDays} hari`;
}

const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const dateLongFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return dateFmt.format(new Date(iso));
}
export function fmtDateLong(iso: string | null | undefined): string {
  if (!iso) return '-';
  return dateLongFmt.format(new Date(iso));
}
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return dateTimeFmt.format(new Date(iso));
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  menunggu: 'Menunggu antrean',
  pencucian: 'Pencucian',
  pengeringan: 'Pengeringan',
  finishing: 'Finishing',
  selesai: 'Selesai (siap diambil)',
  diambil: 'Diambil',
};

export const CATEGORY_LABEL: Record<ServiceCategory, string> = {
  main: 'Main Services',
  express: 'Express Services',
  additional: 'Additional Services',
  other: 'Other Services',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = { tunai: 'Tunai', qris: 'QRIS' };
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = { lunas: 'Lunas', belum_lunas: 'Belum lunas' };

export const ANNOUNCEMENT_CATEGORY_LABEL: Record<AnnouncementCategory, string> = {
  kendala: 'Kendala teknis',
  keterlambatan: 'Potensi keterlambatan',
  jam_operasional: 'Jam operasional',
  libur: 'Libur',
  promosi: 'Promosi',
  lainnya: 'Informasi',
};

export const WEEKDAY_LABEL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** Normalize Indonesian phone input to 62xxxxxxxx (digits only). */
export function normalizePhone(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return d;
}

export function maskName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Pelanggan';
  const first = parts[0];
  const shown = first.length <= 2 ? first[0] + '*' : first.slice(0, 2) + '*'.repeat(Math.min(first.length - 2, 4));
  return parts.length > 1 ? `${shown} ${parts[parts.length - 1][0]}.` : shown;
}

export function whatsappLink(number: string, text: string): string | null {
  const n = normalizePhone(number);
  if (n.length < 9) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
