// Domain types shared by the UI, the local (demo) repository and the
// future Supabase repository. Field names map 1:1 to the SQL schema in
// supabase/migrations (camelCase here, snake_case in SQL).

export type ID = string;
export type ISODateTime = string; // e.g. 2026-10-19T08:00:00.000Z
export type DateKey = string; // YYYY-MM-DD (local business date)

export type Role = 'admin' | 'staff';

export interface StaffUser {
  id: ID;
  email: string;
  name: string;
  /** MVP: admin & staff have identical permissions. Kept for future separation. */
  role: Role;
  active: boolean;
  createdAt: ISODateTime;
}

export type ServiceCategory = 'main' | 'express' | 'additional' | 'other';

export interface Service {
  id: ID;
  name: string;
  category: ServiceCategory;
  description: string;
  /** Ketentuan khusus (ditampilkan di website publik). */
  terms: string;
  /** Harga referensi. Untuk express = biaya tambahan. */
  priceMin: number;
  /** null = harga tetap. Jika diisi = harga rentang; harga final ditentukan pegawai. */
  priceMax: number | null;
  /** Durasi pengerjaan standar dalam hari operasional. 0 = tidak memengaruhi durasi. */
  durationMinDays: number;
  durationMaxDays: number;
  /** Bobot beban kerja. 1 unit = beban 1 pasang Basic Clean. */
  workloadWeight: number;
  /** Khusus kategori express: target selesai dalam N jam. */
  expressHours: number | null;
  /** Khusus layanan utama: boleh dikombinasikan dengan express. */
  expressEligible: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Product {
  id: ID;
  name: string;
  description: string;
  price: number;
  active: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Fragrance {
  id: ID;
  name: string;
  description: string;
  active: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Customer {
  id: ID;
  name: string;
  phone: string;
  notes: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export const ORDER_STATUSES = [
  'menunggu',
  'pencucian',
  'pengeringan',
  'finishing',
  'selesai',
  'diambil',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ACTIVE_STATUSES: OrderStatus[] = ['menunggu', 'pencucian', 'pengeringan', 'finishing'];

export type PaymentMethod = 'tunai' | 'qris';
export type PaymentStatus = 'lunas' | 'belum_lunas';

/** Snapshot layanan pada saat transaksi. Tidak berubah jika katalog berubah. */
export interface OrderServiceLine {
  serviceId: ID | null;
  name: string;
  category: ServiceCategory;
  /** Harga final yang disepakati (sudah termasuk penyesuaian kondisi barang). */
  price: number;
  priceMin: number;
  priceMax: number | null;
  workloadWeight: number;
  durationMinDays: number;
  durationMaxDays: number;
  expressHours: number | null;
}

export interface OrderProductLine {
  productId: ID | null;
  name: string;
  unitPrice: number;
  qty: number;
  subtotal: number;
}

export interface OrderItem {
  id: ID;
  itemType: string;
  brand: string;
  model: string;
  color: string;
  conditionNotes: string;
  services: OrderServiceLine[];
}

export interface Payment {
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: ISODateTime | null;
  recordedById: ID | null;
  recordedByName: string;
}

export interface Order {
  id: ID;
  /** Kode pelacakan untuk pelanggan (acak, tidak berurutan). Disimpan dalam bentuk ternormalisasi. */
  code: string;
  customerId: ID;
  customerName: string;
  customerPhone: string;
  items?: OrderItem[];
  itemType: string;
  brand: string;
  model: string;
  color: string;
  conditionNotes: string;
  services: OrderServiceLine[];
  products: OrderProductLine[];
  fragranceId: ID | null;
  fragranceName: string;
  receivedAt: ISODateTime;
  estimatedEarliestAt: ISODateTime | null;
  estimatedAt: ISODateTime | null;
  estimateSource: 'auto' | 'manual';
  completedAt: ISODateTime | null;
  pickedUpAt: ISODateTime | null;
  status: OrderStatus;
  total: number;
  payment: Payment;
  internalNotes: string;
  createdById: ID | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface StatusHistoryEntry {
  id: ID;
  orderId: ID;
  from: OrderStatus | null;
  to: OrderStatus;
  note: string;
  at: ISODateTime;
  byId: ID | null;
  byName: string;
}

export interface EstimateHistoryEntry {
  id: ID;
  orderId: ID;
  previousAt: ISODateTime | null;
  newAt: ISODateTime | null;
  source: 'auto' | 'manual';
  reason: string;
  at: ISODateTime;
  byId: ID | null;
  byName: string;
}

export type PhotoProvider = 'local' | 'gdrive';
export type PhotoStatus = 'active' | 'deleted' | 'delete_failed';

export interface OrderPhoto {
  id: ID;
  orderId: ID;
  provider: PhotoProvider;
  fileId: string;
  folderId: string | null;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  labels: string[];
  caption: string;
  status: PhotoStatus;
  uploadedAt: ISODateTime;
  uploadedById: ID | null;
  uploadedByName: string;
  deletedAt: ISODateTime | null;
  deleteNote: string;
}

export type AnnouncementCategory = 'kendala' | 'keterlambatan' | 'jam_operasional' | 'libur' | 'promosi' | 'lainnya';

export interface Announcement {
  id: ID;
  title: string;
  body: string;
  category: AnnouncementCategory;
  publishAt: ISODateTime;
  expiresAt: ISODateTime | null;
  status: 'draft' | 'published';
  important: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type AuditLevel = 'info' | 'warning' | 'error';

export interface AuditLog {
  id: ID;
  at: ISODateTime;
  actorId: ID | null;
  actorName: string;
  action: string;
  entity: string;
  entityId: string | null;
  detail: string;
  level: AuditLevel;
}

export type RetentionBasis = 'picked_up_or_completed' | 'completed' | 'picked_up';

export interface Settings {
  businessName: string;
  tagline: string;
  address: string;
  /** Format internasional tanpa '+', mis. 62812xxxx. Kosong = belum dikonfigurasi. */
  whatsappNumber: string;
  instagramUrl: string;
  /** Teks awal pesan WhatsApp. {kode} diganti kode pesanan. */
  whatsappTemplate: string;
  /** Kapasitas harian dalam unit beban (1 unit = 1 pasang Basic Clean). */
  dailyCapacity: number;
  openTime: string; // HH:mm
  closeTime: string; // HH:mm
  /** Teks jam operasional untuk publik. Kosong = tidak ditampilkan. */
  publicHoursText: string;
  /** 0 = Minggu ... 6 = Sabtu */
  closedWeekdays: number[];
  holidays: DateKey[];
  estimateHorizonDays: number;
  priceDisclaimer: string;
  retentionMonths: number;
  retentionBasis: RetentionBasis;
  collageLabels: [string, string, string, string];
  /** Opsional: pelanggan wajib memasukkan 4 digit terakhir nomor WA saat cek pesanan. */
  trackingRequirePhoneSuffix: boolean;
  updatedAt: ISODateTime;
}

/** Data yang BOLEH dilihat pelanggan. Tidak memuat nomor HP, catatan internal, atau nama pegawai. */
export interface PublicOrderView {
  code: string;
  customerDisplayName: string;
  items?: {
    id?: ID;
    itemType: string;
    brand: string;
    model: string;
    color: string;
    conditionNotes?: string;
    services: { name: string; category: ServiceCategory; price: number }[];
  }[];
  itemType: string;
  brand: string;
  model: string;
  color: string;
  services: { name: string; category: ServiceCategory; price: number }[];
  products: { name: string; qty: number; subtotal: number }[];
  fragranceName: string;
  receivedAt: ISODateTime;
  estimatedEarliestAt: ISODateTime | null;
  estimatedAt: ISODateTime | null;
  completedAt: ISODateTime | null;
  pickedUpAt: ISODateTime | null;
  status: OrderStatus;
  timeline: { status: OrderStatus; at: ISODateTime }[];
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAt: ISODateTime | null;
  photos: { id: ID; labels: string[]; caption: string; uploadedAt: ISODateTime; available: boolean }[];
}
