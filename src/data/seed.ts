// Seed data. Prices & names come from the project brief.
// Durations and workload weights marked "ASUMSI" are safe initial defaults that
// the business can change from the dashboard (see docs/ASUMSI.md).
import type { Service, ServiceCategory, Settings } from './types';

type SeedService = Omit<Service, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder' | 'active'> & { active?: boolean };

function svc(
  category: ServiceCategory,
  name: string,
  priceMin: number,
  priceMax: number | null,
  description: string,
  opts: Partial<SeedService> = {},
): SeedService {
  return {
    name,
    category,
    description,
    terms: '',
    priceMin,
    priceMax,
    durationMinDays: 2,
    durationMaxDays: 2,
    workloadWeight: 1,
    expressHours: null,
    expressEligible: false,
    ...opts,
  };
}

const REPAINT = { durationMinDays: 7, durationMaxDays: 14, workloadWeight: 3, terms: 'Estimasi khusus kategori repaint: 7–14 hari.' };

export const SEED_SERVICES: SeedService[] = [
  // Main
  svc('main', 'Basic Clean', 35000, null, 'Pembersihan midsole, outsole, dan upper', { expressEligible: true }),
  svc('main', 'Basic Clean — Leather & Suede', 40000, null, 'Varian bahan khusus (leather & suede)', { workloadWeight: 1.25 }),
  svc('main', 'Deep Clean', 50000, null, 'Pembersihan insole, midsole, outsole, dan upper', { workloadWeight: 1.5, expressEligible: true }),
  svc('main', 'Deep Clean — Leather & Suede', 55000, null, 'Varian bahan khusus (leather & suede)', { workloadWeight: 1.75 }),
  svc('main', 'Heavy Clean', 75000, null, 'Untuk kondisi sangat kotor atau berlumpur', {
    durationMinDays: 3,
    durationMaxDays: 4,
    workloadWeight: 2.5,
    terms: 'Sepatu yang sangat kotor mungkin memerlukan pencucian ulang pada hari kedua.',
  }),
  svc('main', 'Premium — White Canvas Only', 75000, 125000, 'Re-whitening upper dan unyellowing midsole', {
    durationMinDays: 3,
    durationMaxDays: 4,
    workloadWeight: 2.5,
    terms: 'Khusus sepatu canvas putih. Harga final ditentukan sesuai kondisi.',
  }),
  // Express
  svc('express', 'Express 24 Hours', 20000, null, 'Selesai dalam 24 jam', {
    durationMinDays: 0,
    durationMaxDays: 0,
    workloadWeight: 0,
    expressHours: 24,
    terms: 'Hanya untuk Basic Clean dan Deep Clean. Biaya ditambahkan pada harga layanan utama.',
  }),
  svc('express', 'Express 48 Hours', 10000, null, 'Selesai dalam 48 jam', {
    durationMinDays: 0,
    durationMaxDays: 0,
    workloadWeight: 0,
    expressHours: 48,
    terms: 'Hanya untuk Basic Clean dan Deep Clean. Biaya ditambahkan pada harga layanan utama.',
  }),
  // Additional
  svc('additional', 'Unyellowing', 70000, null, 'Pemutihan bagian midsole yang menguning', { durationMinDays: 2, durationMaxDays: 3, workloadWeight: 1 }),
  svc('additional', 'Reglue — kecil', 15000, null, 'Pengeleman ulang bagian yang terbuka', { durationMinDays: 0, durationMaxDays: 0, workloadWeight: 0.25 }),
  svc('additional', 'Reglue — sedang', 30000, null, 'Pengeleman ulang bagian yang terbuka', { durationMinDays: 0, durationMaxDays: 0, workloadWeight: 0.5 }),
  svc('additional', 'Reglue — luas/banyak', 50000, null, 'Pengeleman ulang bagian yang terbuka', { durationMinDays: 0, durationMaxDays: 0, workloadWeight: 1 }),
  svc('additional', 'Water Repellent', 20000, null, 'Perlindungan terhadap air', { durationMinDays: 0, durationMaxDays: 0, workloadWeight: 0.25 }),
  svc('additional', 'Anti Stain — kecil', 10000, null, 'Penanganan noda', { durationMinDays: 0, durationMaxDays: 0, workloadWeight: 0.25 }),
  svc('additional', 'Anti Stain — sedang', 20000, null, 'Penanganan noda', { durationMinDays: 0, durationMaxDays: 0, workloadWeight: 0.5 }),
  svc('additional', 'Anti Stain — besar/banyak', 30000, null, 'Penanganan noda', { durationMinDays: 0, durationMaxDays: 0, workloadWeight: 0.75 }),
  svc('additional', 'Repaint Canvas Basic', 135000, null, 'Restorasi warna', REPAINT),
  svc('additional', 'Canvas Recolor', 155000, null, 'Pewarnaan ulang', REPAINT),
  svc('additional', 'Repaint Leather/Suede Basic', 155000, null, 'Restorasi warna', REPAINT),
  svc('additional', 'Recolor Leather', 175000, null, 'Pewarnaan ulang', REPAINT),
  svc('additional', 'Pattern', 200000, null, 'Pengerjaan pola', { ...REPAINT, workloadWeight: 4 }),
  // Other
  svc('other', 'Kids Shoes', 35000, null, 'Sepatu anak', { workloadWeight: 0.75, terms: 'Ukuran sampai 33.' }),
  svc('other', 'Sandals / Wedges', 45000, null, 'Sandal dan wedges'),
  svc('other', 'Hat', 35000, null, 'Topi'),
  svc('other', 'Helmet', 50000, 75000, 'Helm', { durationMaxDays: 3, workloadWeight: 1.5 }),
  svc('other', 'Bag', 55000, 125000, 'Tas', { durationMaxDays: 4, workloadWeight: 2 }),
];

export function defaultSettings(now: string): Settings {
  return {
    businessName: 'Soleful Soaks! Shoes Care',
    tagline: 'Jasa perawatan & pembersihan sepatu, tas, topi, dan helm',
    address: '',
    whatsappNumber: '',
    instagramUrl: '',
    whatsappTemplate: 'Halo Soleful Soaks!, saya ingin bertanya tentang pesanan dengan kode {kode}.',
    dailyCapacity: 8.5,
    // ASUMSI: jam kerja untuk perhitungan estimasi. Belum diberikan mitra.
    openTime: '09:00',
    closeTime: '18:00',
    publicHoursText: '',
    closedWeekdays: [],
    holidays: [],
    estimateHorizonDays: 60,
    priceDisclaimer: 'Harga merupakan referensi. Harga akhir dapat berubah berdasarkan kondisi barang setelah pengecekan di toko.',
    retentionMonths: 6,
    retentionBasis: 'picked_up_or_completed',
    collageLabels: ['Foto 1', 'Foto 2', 'Foto 3', 'Foto 4'],
    trackingRequirePhoneSuffix: false,
    updatedAt: now,
  };
}
