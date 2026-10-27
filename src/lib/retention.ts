import type { Order, OrderPhoto, Settings } from '../data/types';
import { addMonths } from './dates';

export function retentionBaseDate(order: Pick<Order, 'completedAt' | 'pickedUpAt'>, basis: Settings['retentionBasis']): string | null {
  switch (basis) {
    case 'completed':
      return order.completedAt;
    case 'picked_up':
      return order.pickedUpAt;
    default:
      return order.pickedUpAt ?? order.completedAt;
  }
}

export function photoExpiresAt(order: Pick<Order, 'completedAt' | 'pickedUpAt'>, settings: Pick<Settings, 'retentionBasis' | 'retentionMonths'>): Date | null {
  const base = retentionBaseDate(order, settings.retentionBasis);
  if (!base) return null;
  return addMonths(new Date(base), Math.max(1, settings.retentionMonths));
}

export interface EligibilityResult {
  eligible: boolean;
  reason: string;
  expiresAt: Date | null;
}

/**
 * A photo may be deleted only when ALL of these hold:
 * - photo is active (or a previous delete attempt failed),
 * - the photo belongs to an existing order (ownership check),
 * - the order is finished (selesai / diambil) with a retention base date,
 * - base date + retentionMonths <= now.
 */
export function checkPhotoEligibility(
  photo: OrderPhoto,
  order: Order | undefined,
  settings: Pick<Settings, 'retentionBasis' | 'retentionMonths'>,
  now: Date,
): EligibilityResult {
  if (photo.status === 'deleted') return { eligible: false, reason: 'Sudah dihapus', expiresAt: null };
  if (!order || order.id !== photo.orderId) return { eligible: false, reason: 'Pesanan pemilik foto tidak ditemukan — perlu peninjauan manual', expiresAt: null };
  if (order.status !== 'selesai' && order.status !== 'diambil') return { eligible: false, reason: 'Pesanan belum selesai', expiresAt: null };
  const exp = photoExpiresAt(order, settings);
  if (!exp) return { eligible: false, reason: 'Belum ada tanggal dasar retensi', expiresAt: null };
  if (exp.getTime() > now.getTime()) return { eligible: false, reason: 'Belum kedaluwarsa', expiresAt: exp };
  return { eligible: true, reason: 'Memenuhi syarat kedaluwarsa', expiresAt: exp };
}
