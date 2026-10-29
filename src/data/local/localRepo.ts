// Demo-mode repository: all data stays in this browser.
// SECURITY NOTE: authorization checks here only emulate the production rules
// (Supabase RLS). Anyone with access to the browser can read localStorage.
// Do NOT use local mode with real customer data in production.
import type {
  Announcement,
  AuditLevel,
  AuditLog,
  Customer,
  EstimateHistoryEntry,
  Fragrance,
  ID,
  Order,
  OrderPhoto,
  OrderStatus,
  Product,
  PublicOrderView,
  Role,
  Service,
  Settings,
  StaffUser,
  StatusHistoryEntry,
} from '../types';
import { ORDER_STATUSES } from '../types';
import type {
  CollageMeta,
  OrderInput,
  PaymentInput,
  PhotoIntegrationStatus,
  RetentionItem,
  RetentionReport,
  Repo,
  SaveInput,
  TrackResult,
} from '../repo';
import { SEED_SERVICES, defaultSettings } from '../seed';
import type { BlobStore, KV } from './storage';
import { generateCode, normalizeCode } from '../../lib/code';
import { computeTotal } from '../../lib/pricing';
import { maskName, normalizePhone } from '../../lib/format';
import { checkPhotoEligibility } from '../../lib/retention';

interface Credential {
  userId: ID;
  salt: string;
  hash: string;
}
interface Session {
  userId: ID;
  expiresAt: string;
}

const SESSION_HOURS = 12;
const TRACK_WINDOW_MS = 15 * 60_000;
const TRACK_MAX_FAILURES = 10;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const uid = () => crypto.randomUUID();
const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 120_000 }, key, 256);
  return toHex(bits);
}

function randomSalt(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return toHex(a.buffer);
}

function req(v: string | undefined | null, msg: string): string {
  const s = (v ?? '').trim();
  if (!s) throw new Error(msg);
  return s;
}

function validatePassword(pw: string) {
  if (!pw || pw.length < 8) throw new Error('Kata sandi minimal 8 karakter.');
}

function validEmail(e: string): string {
  const s = e.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error('Format email tidak valid.');
  return s;
}

export class LocalRepo implements Repo {
  readonly mode = 'local' as const;

  constructor(
    private kv: KV,
    private blobs: BlobStore,
    private clock: () => Date = () => new Date(),
  ) {
    this.ensureSeed();
    this.ensureOfficialFragrancesAndProducts();
  }

  // ------------------------------------------------------------------ helpers
  private now() {
    return this.clock().toISOString();
  }
  private list<T>(key: string): T[] {
    return this.kv.get<T[]>(key) ?? [];
  }
  private save<T>(key: string, rows: T[]) {
    this.kv.set(key, rows);
  }
  private ensureSeed() {
    // Migration: Update daily capacity to 8.5 if still on legacy initial default 20
    if (!this.kv.get('capacity_migrated_v4')) {
      const s = this.kv.get<Settings>('settings');
      if (s && (s.dailyCapacity === 20 || !s.dailyCapacity)) {
        this.kv.set('settings', { ...s, dailyCapacity: 8.5 });
      }
      this.kv.set('capacity_migrated_v4', true);
    }

    if (this.kv.get('seeded_v3')) return;
    const now = this.now();
    this.kv.set('settings', {
      ...defaultSettings(now),
      address: 'Jl. Surya Kencana No. 45, Bogor Tengah',
      whatsappNumber: '081234567890',
      instagramUrl: 'https://instagram.com/solefulsoaks',
      publicHoursText: 'Senin - Sabtu: 09.00 - 18.00 WIB (Minggu Libur)',
    });
    this.save<Service>(
      'services',
      SEED_SERVICES.map((s, i) => ({ ...s, active: s.active ?? true, id: uid(), sortOrder: i, createdAt: now, updatedAt: now })),
    );
    this.save('products', [
      { id: uid(), name: 'Tali Sepatu Pipih 120cm (Hitam/Putih)', price: 15000, description: 'Bahan katun premium', active: true, createdAt: now, updatedAt: now },
      { id: uid(), name: 'Parfum Sepatu Anti-Bacterial 60ml', price: 35000, description: 'Wangi bubblegum segar tahan lama', active: true, createdAt: now, updatedAt: now }
    ]);
    this.save('fragrances', [
      { id: uid(), name: 'Bubblegum Fresh', description: 'Aroma manis segar', active: true, createdAt: now, updatedAt: now },
      { id: uid(), name: 'Roasted Coffee', description: 'Aroma kopi hangat penetral bau', active: true, createdAt: now, updatedAt: now },
      { id: uid(), name: 'Vanilla Smooth', description: 'Aroma lembut menenangkan', active: true, createdAt: now, updatedAt: now }
    ]);

    // Data Pelanggan Demo
    const cust1Id = uid();
    const cust2Id = uid();
    this.save('customers', [
      { id: cust1Id, name: 'Budi Santoso', phone: '6281234567890', notes: 'Pelanggan reguler, suka aroma Bubblegum', createdAt: now, updatedAt: now },
      { id: cust2Id, name: 'Annisa Putri', phone: '6285712345678', notes: 'Hati-hati bahan suede jangan kena air banyak', createdAt: now, updatedAt: now }
    ]);

    // Sample Dummy Orders untuk Demonstrasi Langsung
    const order1Id = uid();
    const order2Id = uid();
    const order3Id = uid();

    const sampleOrders: Order[] = [
      {
        id: order1Id,
        code: '7K3QX9MPRA',
        customerId: cust1Id,
        customerName: 'Budi Santoso',
        customerPhone: '6281234567890',
        itemType: 'Sepatu',
        brand: 'Nike',
        model: 'Air Jordan 1 High',
        color: 'Chicago (Merah/Putih/Hitam)',
        conditionNotes: 'Noda debu tebal pada midsole dan toebox, sol bawah kotoran tanah kering',
        services: [
          {
            serviceId: null,
            name: 'Deep Clean',
            category: 'main',
            price: 50000,
            priceMin: 50000,
            priceMax: null,
            workloadWeight: 1.5,
            durationMinDays: 2,
            durationMaxDays: 2,
            expressHours: null
          },
          {
            serviceId: null,
            name: 'Unyellowing',
            category: 'additional',
            price: 70000,
            priceMin: 70000,
            priceMax: null,
            workloadWeight: 1,
            durationMinDays: 2,
            durationMaxDays: 3,
            expressHours: null
          }
        ],
        products: [],
        fragranceId: null,
        fragranceName: 'Bubblegum Fresh',
        receivedAt: new Date(Date.now() - 36 * 3600_000).toISOString(),
        estimatedEarliestAt: new Date(Date.now() + 12 * 3600_000).toISOString(),
        estimatedAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
        estimateSource: 'auto',
        completedAt: null,
        pickedUpAt: null,
        status: 'pengeringan',
        total: 120000,
        payment: {
          method: 'qris',
          status: 'lunas',
          paidAt: new Date(Date.now() - 36 * 3600_000).toISOString(),
          recordedById: null,
          recordedByName: 'Kasir Utama'
        },
        internalNotes: 'Sepatu koleksi, tolong detailing ekstra di jahitan upper',
        createdById: null,
        createdAt: new Date(Date.now() - 36 * 3600_000).toISOString(),
        updatedAt: now
      },
      {
        id: order2Id,
        code: '28YBN4VCFW',
        customerId: cust2Id,
        customerName: 'Annisa Putri',
        customerPhone: '6285712345678',
        itemType: 'Sepatu',
        brand: 'Converse',
        model: 'Chuck 70 Classic Canvas',
        color: 'Parchment White',
        conditionNotes: 'Kotor lumpur setelah kehujanan',
        services: [
          {
            serviceId: null,
            name: 'Basic Clean',
            category: 'main',
            price: 35000,
            priceMin: 35000,
            priceMax: null,
            workloadWeight: 1,
            durationMinDays: 2,
            durationMaxDays: 2,
            expressHours: null
          }
        ],
        products: [
          {
            productId: null,
            name: 'Tali Sepatu Pipih 120cm',
            unitPrice: 15000,
            qty: 1,
            subtotal: 15000
          }
        ],
        fragranceId: null,
        fragranceName: 'Vanilla Smooth',
        receivedAt: new Date(Date.now() - 48 * 3600_000).toISOString(),
        estimatedEarliestAt: new Date(Date.now() - 4 * 3600_000).toISOString(),
        estimatedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
        estimateSource: 'auto',
        completedAt: new Date(Date.now() - 1 * 3600_000).toISOString(),
        pickedUpAt: null,
        status: 'selesai',
        total: 50000,
        payment: {
          method: 'tunai',
          status: 'lunas',
          paidAt: new Date(Date.now() - 48 * 3600_000).toISOString(),
          recordedById: null,
          recordedByName: 'Kasir Utama'
        },
        internalNotes: 'Rak C-04 siap diambil pelanggan',
        createdById: null,
        createdAt: new Date(Date.now() - 48 * 3600_000).toISOString(),
        updatedAt: now
      },
      {
        id: order3Id,
        code: '5MDPE73KZ6',
        customerId: cust1Id,
        customerName: 'Budi Santoso',
        customerPhone: '6281234567890',
        itemType: 'Tas',
        brand: 'Fjallraven',
        model: 'Kanken Classic',
        color: 'Navy Blue',
        conditionNotes: 'Noda bolpoin di kantong samping',
        services: [
          {
            serviceId: null,
            name: 'Bag',
            category: 'other',
            price: 75000,
            priceMin: 55000,
            priceMax: 125000,
            workloadWeight: 2,
            durationMinDays: 2,
            durationMaxDays: 4,
            expressHours: null
          }
        ],
        products: [],
        fragranceId: null,
        fragranceName: '',
        receivedAt: new Date(Date.now() - 4 * 3600_000).toISOString(),
        estimatedEarliestAt: new Date(Date.now() + 48 * 3600_000).toISOString(),
        estimatedAt: new Date(Date.now() + 72 * 3600_000).toISOString(),
        estimateSource: 'auto',
        completedAt: null,
        pickedUpAt: null,
        status: 'menunggu',
        total: 75000,
        payment: {
          method: 'qris',
          status: 'lunas',
          paidAt: new Date(Date.now() - 4 * 3600_000).toISOString(),
          recordedById: null,
          recordedByName: 'Kasir Utama'
        },
        internalNotes: 'Tunggu kering alami tanpa pengering panas',
        createdById: null,
        createdAt: new Date(Date.now() - 4 * 3600_000).toISOString(),
        updatedAt: now
      }
    ];
    this.save('orders', sampleOrders);

    this.save('statusHistory', [
      { id: uid(), orderId: order1Id, from: null, to: 'menunggu', note: 'Drop-off di toko', at: new Date(Date.now() - 36 * 3600_000).toISOString(), byId: null, byName: 'Kasir Utama' },
      { id: uid(), orderId: order1Id, from: 'menunggu', to: 'pencucian', note: 'Mulai pembersihan mendalam & unyellowing', at: new Date(Date.now() - 24 * 3600_000).toISOString(), byId: null, byName: 'Tim Cuci' },
      { id: uid(), orderId: order1Id, from: 'pencucian', to: 'pengeringan', note: 'Pengeringan bertahap dengan UV & dehumidifier', at: new Date(Date.now() - 8 * 3600_000).toISOString(), byId: null, byName: 'Tim Cuci' },
      
      { id: uid(), orderId: order2Id, from: null, to: 'menunggu', note: 'Drop-off sepatu', at: new Date(Date.now() - 48 * 3600_000).toISOString(), byId: null, byName: 'Kasir Utama' },
      { id: uid(), orderId: order2Id, from: 'menunggu', to: 'pencucian', note: 'Pencucian bahan canvas', at: new Date(Date.now() - 30 * 3600_000).toISOString(), byId: null, byName: 'Tim Cuci' },
      { id: uid(), orderId: order2Id, from: 'pencucian', to: 'finishing', note: 'Pemasangan tali baru dan pewangi Vanilla', at: new Date(Date.now() - 10 * 3600_000).toISOString(), byId: null, byName: 'Tim Detailing' },
      { id: uid(), orderId: order2Id, from: 'finishing', to: 'selesai', note: 'Selesai & siap diambil di toko', at: new Date(Date.now() - 1 * 3600_000).toISOString(), byId: null, byName: 'Kasir Utama' },

      { id: uid(), orderId: order3Id, from: null, to: 'menunggu', note: 'Drop-off tas masuk antrean', at: new Date(Date.now() - 4 * 3600_000).toISOString(), byId: null, byName: 'Kasir Utama' }
    ]);

    this.save('estimateHistory', []);
    this.save('photos', []);
    this.save('announcements', []);
    this.save('audit', []);
    this.save('staff', []);
    this.save('credentials', []);
    this.kv.set('seeded', true);
    this.kv.set('seeded_v3', true);

    // Sync official 5 fragrances: Orchid Breeze, Vanila Latte, Green Apple, Mandarin Orange, Coffe
    this.ensureOfficialFragrancesAndProducts();
  }

  private ensureOfficialFragrancesAndProducts() {
    const now = this.now();
    const currentFragrances = this.list<Fragrance>('fragrances');
    const hasOfficial = currentFragrances.some((f) => f.name === 'Orchid Breeze');
    if (!hasOfficial) {
      const officialFragrances = [
        { name: 'Orchid Breeze', desc: 'Aroma bunga anggrek segar & mewah' },
        { name: 'Vanila Latte', desc: 'Aroma manis lembut kopi susu vanilla' },
        { name: 'Green Apple', desc: 'Aroma apel hijau segar & renyah' },
        { name: 'Mandarin Orange', desc: 'Aroma jeruk mandarin segar & ceria' },
        { name: 'Coffe', desc: 'Aroma kopi hangat penetral bau membandel' },
      ];
      const updatedFragrances: Fragrance[] = officialFragrances.map((f) => ({
        id: uid(),
        name: f.name,
        description: f.desc,
        active: true,
        createdAt: now,
        updatedAt: now,
      }));
      this.save('fragrances', updatedFragrances);
    }

    // Ensure retail perfume bottles are available in products catalog
    const currentProducts = this.list<Product>('products');
    const hasPerfumeProduct = currentProducts.some((p) => p.name.includes('Orchid Breeze'));
    if (!hasPerfumeProduct) {
      const baseProducts = currentProducts.filter((p) => !p.name.includes('Parfum Sepatu Anti-Bacterial 60ml'));
      const perfumeProducts: Product[] = [
        { id: uid(), name: 'Parfum Sepatu 60ml - Orchid Breeze', price: 35000, description: 'Wangi anggrek segar mewah tahan lama', active: true, createdAt: now, updatedAt: now },
        { id: uid(), name: 'Parfum Sepatu 60ml - Vanila Latte', price: 35000, description: 'Wangi lembut manis vanilla coffee', active: true, createdAt: now, updatedAt: now },
        { id: uid(), name: 'Parfum Sepatu 60ml - Green Apple', price: 35000, description: 'Wangi segar apel hijau renyah', active: true, createdAt: now, updatedAt: now },
        { id: uid(), name: 'Parfum Sepatu 60ml - Mandarin Orange', price: 35000, description: 'Wangi ceria segar buah jeruk mandarin', active: true, createdAt: now, updatedAt: now },
        { id: uid(), name: 'Parfum Sepatu 60ml - Coffe', price: 35000, description: 'Wangi biji kopi hangat penetral bau', active: true, createdAt: now, updatedAt: now },
      ];
      this.save('products', [...baseProducts, ...perfumeProducts]);
    }
  }

  private async requireStaff(): Promise<StaffUser> {
    const u = await this.currentUser();
    if (!u) throw new Error('Akses ditolak. Silakan login sebagai pegawai.');
    return u;
  }

  private audit(actor: StaffUser | null, action: string, entity: string, entityId: string | null, detail: string, level: AuditLevel = 'info') {
    const rows = this.list<AuditLog>('audit');
    rows.unshift({ id: uid(), at: this.now(), actorId: actor?.id ?? null, actorName: actor?.name ?? 'Sistem', action, entity, entityId, detail, level });
    this.save('audit', rows.slice(0, 2000));
  }

  private upsert<T extends { id: ID; createdAt: string; updatedAt: string }>(key: string, input: Partial<T> & { id?: ID }): T {
    const rows = this.list<T>(key);
    const now = this.now();
    if (input.id) {
      const i = rows.findIndex((r) => r.id === input.id);
      if (i < 0) throw new Error('Data tidak ditemukan.');
      rows[i] = { ...rows[i], ...input, id: rows[i].id, createdAt: rows[i].createdAt, updatedAt: now };
      this.save(key, rows);
      return rows[i];
    }
    const row = { ...(input as T), id: uid(), createdAt: now, updatedAt: now };
    rows.push(row);
    this.save(key, rows);
    return row;
  }

  private remove(key: string, id: ID) {
    const rows = this.list<{ id: ID }>(key);
    const next = rows.filter((r) => r.id !== id);
    if (next.length === rows.length) throw new Error('Data tidak ditemukan.');
    this.save(key, next);
  }

  // --------------------------------------------------------------------- auth
  async needsSetup() {
    return this.list<StaffUser>('staff').length === 0;
  }

  async setupFirstAdmin(input: { name: string; email: string; password: string }) {
    if (!(await this.needsSetup())) throw new Error('Akun admin pertama sudah dibuat.');
    const user = await this.insertStaff({ ...input, role: 'admin' });
    this.kv.set<Session>('session', { userId: user.id, expiresAt: new Date(this.clock().getTime() + SESSION_HOURS * 3600_000).toISOString() });
    this.audit(user, 'staff.setup', 'staff', user.id, 'Akun admin pertama dibuat');
    return user;
  }

  private async insertStaff(input: { name: string; email: string; password: string; role: Role }): Promise<StaffUser> {
    const email = validEmail(input.email);
    const name = req(input.name, 'Nama wajib diisi.');
    validatePassword(input.password);
    const staff = this.list<StaffUser>('staff');
    if (staff.some((s) => s.email === email)) throw new Error('Email sudah terdaftar.');
    const user: StaffUser = { id: uid(), email, name, role: input.role, active: true, createdAt: this.now() };
    const salt = randomSalt();
    const creds = this.list<Credential>('credentials');
    creds.push({ userId: user.id, salt, hash: await hashPassword(input.password, salt) });
    staff.push(user);
    this.save('staff', staff);
    this.save('credentials', creds);
    return user;
  }

  async signIn(email: string, password: string) {
    const e = email.trim().toLowerCase();
    const user = this.list<StaffUser>('staff').find((s) => s.email === e);
    const cred = user && this.list<Credential>('credentials').find((c) => c.userId === user.id);
    const ok = !!cred && (await hashPassword(password, cred.salt)) === cred.hash;
    if (!user || !ok) {
      this.audit(null, 'auth.failed', 'staff', null, `Login gagal untuk ${e}`, 'warning');
      throw new Error('Email atau kata sandi salah.');
    }
    if (!user.active) throw new Error('Akun dinonaktifkan. Hubungi admin.');
    this.kv.set<Session>('session', { userId: user.id, expiresAt: new Date(this.clock().getTime() + SESSION_HOURS * 3600_000).toISOString() });
    this.audit(user, 'auth.login', 'staff', user.id, 'Login berhasil');
    return user;
  }

  async signOut() {
    this.kv.set('session', null);
  }

  async currentUser() {
    const s = this.kv.get<Session | null>('session');
    if (!s || s.expiresAt < this.now()) return null;
    const u = this.list<StaffUser>('staff').find((x) => x.id === s.userId);
    return u && u.active ? u : null;
  }

  async listStaff() {
    await this.requireStaff();
    return this.list<StaffUser>('staff');
  }

  async createStaff(input: { name: string; email: string; password: string; role: Role }) {
    const me = await this.requireStaff();
    const u = await this.insertStaff(input);
    this.audit(me, 'staff.create', 'staff', u.id, `Akun ${u.email} dibuat`);
    return u;
  }

  async updateStaff(id: ID, patch: Partial<Pick<StaffUser, 'name' | 'role' | 'active'>>) {
    const me = await this.requireStaff();
    const rows = this.list<StaffUser>('staff');
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) throw new Error('Akun tidak ditemukan.');
    if (patch.active === false && id === me.id) throw new Error('Tidak dapat menonaktifkan akun sendiri.');
    rows[i] = { ...rows[i], ...patch };
    if (!rows.some((r) => r.active)) throw new Error('Minimal harus ada satu akun aktif.');
    this.save('staff', rows);
    this.audit(me, 'staff.update', 'staff', id, JSON.stringify(patch));
    return rows[i];
  }

  async changePassword(id: ID, newPassword: string) {
    const me = await this.requireStaff();
    validatePassword(newPassword);
    const creds = this.list<Credential>('credentials');
    const c = creds.find((x) => x.userId === id);
    if (!c) throw new Error('Akun tidak ditemukan.');
    c.salt = randomSalt();
    c.hash = await hashPassword(newPassword, c.salt);
    this.save('credentials', creds);
    this.audit(me, 'staff.password', 'staff', id, 'Kata sandi diubah');
  }

  // ----------------------------------------------------------------- settings
  async getSettings(): Promise<Settings> {
    const s = this.kv.get<Settings>('settings')!;
    return { ...defaultSettings(this.now()), ...s };
  }

  async updateSettings(patch: Partial<Settings>) {
    const me = await this.requireStaff();
    const cur = await this.getSettings();
    const next: Settings = { ...cur, ...patch, updatedAt: this.now() };
    if (!Number.isFinite(next.dailyCapacity) || next.dailyCapacity < 0) throw new Error('Kapasitas harian tidak valid.');
    if (next.closedWeekdays.length >= 7) throw new Error('Minimal harus ada satu hari operasional.');
    if (!/^\d{2}:\d{2}$/.test(next.openTime) || !/^\d{2}:\d{2}$/.test(next.closeTime) || next.openTime >= next.closeTime)
      throw new Error('Jam operasional tidak valid.');
    if (!Number.isInteger(next.retentionMonths) || next.retentionMonths < 1) throw new Error('Masa simpan foto minimal 1 bulan.');
    if (next.whatsappNumber) next.whatsappNumber = normalizePhone(next.whatsappNumber);
    this.kv.set('settings', next);
    const changed = Object.keys(patch).filter((k) => JSON.stringify((cur as never)[k]) !== JSON.stringify((patch as never)[k]));
    this.audit(me, 'settings.update', 'settings', null, `Diubah: ${changed.join(', ') || '-'}`);
    return next;
  }

  // ------------------------------------------------------------------ catalog
  async listServices(includeInactive = false) {
    if (includeInactive) await this.requireStaff();
    const rows = this.list<Service>('services').sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    return includeInactive ? rows : rows.filter((r) => r.active);
  }

  async saveService(s: SaveInput<Service>) {
    const me = await this.requireStaff();
    req(s.name, 'Nama layanan wajib diisi.');
    if (s.priceMin < 0 || (s.priceMax != null && s.priceMax < s.priceMin)) throw new Error('Rentang harga tidak valid.');
    if (s.durationMinDays < 0 || s.durationMaxDays < s.durationMinDays) throw new Error('Rentang durasi tidak valid.');
    if (s.workloadWeight < 0) throw new Error('Bobot beban kerja tidak valid.');
    if (s.category === 'express' && !s.expressHours) throw new Error('Layanan express wajib memiliki target jam.');
    const row = this.upsert<Service>('services', s);
    this.audit(me, s.id ? 'service.update' : 'service.create', 'service', row.id, row.name);
    return row;
  }

  async deleteService(id: ID) {
    const me = await this.requireStaff();
    this.remove('services', id);
    // Orders keep their own snapshot; nothing else to update.
    this.audit(me, 'service.delete', 'service', id, 'Layanan dihapus (transaksi lama tetap menyimpan snapshot)');
  }

  async listProducts(includeInactive = false) {
    if (includeInactive) await this.requireStaff();
    const rows = this.list<Product>('products').sort((a, b) => a.name.localeCompare(b.name));
    return includeInactive ? rows : rows.filter((r) => r.active);
  }
  async saveProduct(p: SaveInput<Product>) {
    const me = await this.requireStaff();
    req(p.name, 'Nama produk wajib diisi.');
    if (!(p.price >= 0)) throw new Error('Harga tidak valid.');
    const row = this.upsert<Product>('products', p);
    this.audit(me, p.id ? 'product.update' : 'product.create', 'product', row.id, row.name);
    return row;
  }
  async deleteProduct(id: ID) {
    const me = await this.requireStaff();
    this.remove('products', id);
    this.audit(me, 'product.delete', 'product', id, '');
  }

  async listFragrances(includeInactive = false) {
    if (includeInactive) await this.requireStaff();
    const rows = this.list<Fragrance>('fragrances').sort((a, b) => a.name.localeCompare(b.name));
    return includeInactive ? rows : rows.filter((r) => r.active);
  }
  async saveFragrance(f: SaveInput<Fragrance>) {
    const me = await this.requireStaff();
    req(f.name, 'Nama pewangi wajib diisi.');
    const row = this.upsert<Fragrance>('fragrances', f);
    this.audit(me, f.id ? 'fragrance.update' : 'fragrance.create', 'fragrance', row.id, row.name);
    return row;
  }
  async deleteFragrance(id: ID) {
    const me = await this.requireStaff();
    this.remove('fragrances', id);
    this.audit(me, 'fragrance.delete', 'fragrance', id, '');
  }

  // ---------------------------------------------------------------- customers
  async listCustomers() {
    await this.requireStaff();
    return this.list<Customer>('customers').sort((a, b) => a.name.localeCompare(b.name));
  }
  async saveCustomer(c: SaveInput<Customer>) {
    const me = await this.requireStaff();
    const name = req(c.name, 'Nama pelanggan wajib diisi.');
    const phone = normalizePhone(c.phone);
    if (phone.length < 10 || phone.length > 15) throw new Error('Nomor WhatsApp tidak valid.');
    const dup = this.list<Customer>('customers').find((x) => x.phone === phone && x.id !== c.id);
    if (dup) throw new Error(`Nomor sudah terdaftar atas nama ${dup.name}.`);
    const row = this.upsert<Customer>('customers', { ...c, name, phone });
    this.audit(me, c.id ? 'customer.update' : 'customer.create', 'customer', row.id, row.name);
    return row;
  }
  async deleteCustomer(id: ID) {
    const me = await this.requireStaff();
    if (this.list<Order>('orders').some((o) => o.customerId === id))
      throw new Error('Pelanggan memiliki riwayat pesanan sehingga tidak dapat dihapus.');
    this.remove('customers', id);
    this.audit(me, 'customer.delete', 'customer', id, '');
  }

  // ------------------------------------------------------------------- orders
  async listOrders() {
    await this.requireStaff();
    return this.list<Order>('orders').sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  }

  async getOrder(id: ID) {
    await this.requireStaff();
    return this.list<Order>('orders').find((o) => o.id === id) ?? null;
  }

  private resolveCustomer(input: OrderInput['customer']): Customer {
    const name = req(input.name, 'Nama pelanggan wajib diisi.');
    const phone = normalizePhone(input.phone);
    if (phone.length < 10 || phone.length > 15) throw new Error('Nomor WhatsApp pelanggan tidak valid.');
    const rows = this.list<Customer>('customers');
    const now = this.now();
    let c = (input.id && rows.find((r) => r.id === input.id)) || rows.find((r) => r.phone === phone);
    if (c) {
      if (c.name !== name || c.phone !== phone) {
        const clash = rows.find((r) => r.phone === phone && r.id !== c!.id);
        if (clash) throw new Error(`Nomor sudah terdaftar atas nama ${clash.name}.`);
        c = { ...c, name, phone, updatedAt: now };
        this.save('customers', rows.map((r) => (r.id === c!.id ? c! : r)));
      }
      return c;
    }
    const created: Customer = { id: uid(), name, phone, notes: '', createdAt: now, updatedAt: now };
    rows.push(created);
    this.save('customers', rows);
    return created;
  }

  private validateOrderInput(input: OrderInput) {
    req(input.itemType, 'Jenis barang wajib diisi.');
    if (!input.services.length) throw new Error('Pilih minimal satu layanan.');
    for (const l of input.services) if (!(l.price >= 0)) throw new Error(`Harga "${l.name}" tidak valid.`);
    for (const p of input.products) {
      if (!(p.qty >= 1) || !Number.isInteger(p.qty)) throw new Error(`Kuantitas "${p.name}" tidak valid.`);
      if (!(p.unitPrice >= 0)) throw new Error(`Harga "${p.name}" tidak valid.`);
    }
    if (input.payment.status === 'lunas' && !input.payment.confirmed)
      throw new Error('Konfirmasi bahwa pembayaran penuh sudah diterima sebelum menandai lunas.');
    if (!['tunai', 'qris'].includes(input.payment.method)) throw new Error('Metode pembayaran tidak valid.');
    if (input.estimate.source === 'manual' && !input.estimate.estimatedAt) throw new Error('Estimasi manual wajib diisi.');
  }

  private fragranceName(id: ID | null): string {
    if (!id) return '';
    return this.list<Fragrance>('fragrances').find((f) => f.id === id)?.name ?? '';
  }

  private addEstimateHistory(orderId: ID, previousAt: string | null, newAt: string | null, source: 'auto' | 'manual', reason: string, me: StaffUser) {
    const rows = this.list<EstimateHistoryEntry>('estimateHistory');
    rows.push({ id: uid(), orderId, previousAt, newAt, source, reason, at: this.now(), byId: me.id, byName: me.name });
    this.save('estimateHistory', rows);
  }

  private addStatusHistory(orderId: ID, from: OrderStatus | null, to: OrderStatus, note: string, me: StaffUser) {
    const rows = this.list<StatusHistoryEntry>('statusHistory');
    rows.push({ id: uid(), orderId, from, to, note, at: this.now(), byId: me.id, byName: me.name });
    this.save('statusHistory', rows);
  }

  async createOrder(input: OrderInput) {
    const me = await this.requireStaff();
    this.validateOrderInput(input);
    const customer = this.resolveCustomer(input.customer);
    const orders = this.list<Order>('orders');
    const codes = new Set(orders.map((o) => o.code));
    let code = generateCode();
    while (codes.has(code)) code = generateCode();
    const now = this.now();
    const products = input.products.map((p) => ({ ...p, subtotal: p.unitPrice * p.qty }));
    const items = input.items && input.items.length > 0
      ? input.items.map((it) => ({
          ...it,
          id: it.id || uid(),
          services: it.services.map((s) => ({ ...s })),
        }))
      : undefined;
    const order: Order = {
      id: uid(),
      code,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items,
      itemType: input.itemType.trim(),
      brand: input.brand.trim(),
      model: input.model.trim(),
      color: input.color.trim(),
      conditionNotes: input.conditionNotes.trim(),
      services: input.services.map((s) => ({ ...s })),
      products,
      fragranceId: input.fragranceId,
      fragranceName: this.fragranceName(input.fragranceId),
      receivedAt: input.receivedAt || now,
      estimatedEarliestAt: input.estimate.earliestAt,
      estimatedAt: input.estimate.estimatedAt,
      estimateSource: input.estimate.source,
      completedAt: null,
      pickedUpAt: null,
      status: 'menunggu',
      total: computeTotal(input.services, products),
      payment: {
        method: input.payment.method,
        status: input.payment.status,
        paidAt: input.payment.status === 'lunas' ? input.payment.paidAt || now : null,
        recordedById: me.id,
        recordedByName: me.name,
      },
      internalNotes: input.internalNotes.trim(),
      createdById: me.id,
      createdAt: now,
      updatedAt: now,
    };
    orders.push(order);
    this.save('orders', orders);
    this.addStatusHistory(order.id, null, 'menunggu', 'Pesanan diterima', me);
    if (input.estimate.source === 'manual') {
      this.addEstimateHistory(order.id, input.estimate.autoAt, order.estimatedAt, 'manual', input.estimate.reason || 'Penyesuaian manual saat input', me);
    } else {
      this.addEstimateHistory(order.id, null, order.estimatedAt, 'auto', 'Estimasi otomatis saat input', me);
    }
    this.audit(me, 'order.create', 'order', order.id, `Pesanan ${order.code} dibuat, total ${order.total}`);
    this.audit(me, 'payment.record', 'order', order.id, `${order.payment.status} via ${order.payment.method}, total ${order.total}`);
    return order;
  }

  async updateOrder(id: ID, input: OrderInput) {
    const me = await this.requireStaff();
    this.validateOrderInput(input);
    const orders = this.list<Order>('orders');
    const i = orders.findIndex((o) => o.id === id);
    if (i < 0) throw new Error('Pesanan tidak ditemukan.');
    const prev = orders[i];
    const customer = this.resolveCustomer(input.customer);
    const products = input.products.map((p) => ({ ...p, subtotal: p.unitPrice * p.qty }));
    const items = input.items && input.items.length > 0
      ? input.items.map((it) => ({
          ...it,
          id: it.id || uid(),
          services: it.services.map((s) => ({ ...s })),
        }))
      : undefined;
    const total = computeTotal(input.services, products);
    const paymentChanged =
      prev.payment.method !== input.payment.method || prev.payment.status !== input.payment.status || prev.total !== total;
    const next: Order = {
      ...prev,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items,
      itemType: input.itemType.trim(),
      brand: input.brand.trim(),
      model: input.model.trim(),
      color: input.color.trim(),
      conditionNotes: input.conditionNotes.trim(),
      services: input.services.map((s) => ({ ...s })),
      products,
      fragranceId: input.fragranceId,
      fragranceName: input.fragranceId === prev.fragranceId ? prev.fragranceName : this.fragranceName(input.fragranceId),
      receivedAt: input.receivedAt || prev.receivedAt,
      estimatedEarliestAt: input.estimate.earliestAt,
      estimatedAt: input.estimate.estimatedAt,
      estimateSource: input.estimate.source,
      total,
      payment: paymentChanged
        ? {
            method: input.payment.method,
            status: input.payment.status,
            paidAt: input.payment.status === 'lunas' ? input.payment.paidAt || prev.payment.paidAt || this.now() : null,
            recordedById: me.id,
            recordedByName: me.name,
          }
        : prev.payment,
      internalNotes: input.internalNotes.trim(),
      updatedAt: this.now(),
    };
    orders[i] = next;
    this.save('orders', orders);
    if (prev.estimatedAt !== next.estimatedAt) {
      this.addEstimateHistory(id, prev.estimatedAt, next.estimatedAt, input.estimate.source, input.estimate.reason || 'Diubah saat edit pesanan', me);
    }
    if (paymentChanged) this.audit(me, 'payment.update', 'order', id, `${next.payment.status} via ${next.payment.method}, total ${prev.total} -> ${total}`);
    this.audit(me, 'order.update', 'order', id, `Pesanan ${next.code} diperbarui`);
    return next;
  }

  async deleteOrder(id: ID) {
    const me = await this.requireStaff();
    const order = this.list<Order>('orders').find((o) => o.id === id);
    if (!order) throw new Error('Pesanan tidak ditemukan.');
    const photos = this.list<OrderPhoto>('photos').filter((p) => p.orderId === id && p.status !== 'deleted');
    if (photos.length) throw new Error('Hapus foto dokumentasi pesanan ini terlebih dahulu.');
    this.remove('orders', id);
    this.audit(me, 'order.delete', 'order', id, `Pesanan ${order.code} dihapus`, 'warning');
  }

  async updateStatus(id: ID, to: OrderStatus, note: string) {
    const me = await this.requireStaff();
    if (!ORDER_STATUSES.includes(to)) throw new Error('Status tidak valid.');
    const orders = this.list<Order>('orders');
    const i = orders.findIndex((o) => o.id === id);
    if (i < 0) throw new Error('Pesanan tidak ditemukan.');
    const prev = orders[i];
    if (prev.status === to) return prev;
    const now = this.now();
    const o = { ...prev, status: to, updatedAt: now };
    if (to === 'selesai') {
      o.completedAt = o.completedAt ?? now;
      o.pickedUpAt = null;
    } else if (to === 'diambil') {
      o.completedAt = o.completedAt ?? now;
      o.pickedUpAt = now;
    } else {
      o.completedAt = null;
      o.pickedUpAt = null;
    }
    orders[i] = o;
    this.save('orders', orders);
    this.addStatusHistory(id, prev.status, to, note.trim(), me);
    this.audit(me, 'order.status', 'order', id, `${prev.code}: ${prev.status} -> ${to}`);
    return o;
  }

  async adjustEstimate(id: ID, input: { estimatedAt: string; earliestAt?: string | null; reason: string }) {
    const me = await this.requireStaff();
    req(input.reason, 'Alasan perubahan estimasi wajib diisi.');
    if (!input.estimatedAt || Number.isNaN(Date.parse(input.estimatedAt))) throw new Error('Tanggal estimasi tidak valid.');
    const orders = this.list<Order>('orders');
    const i = orders.findIndex((o) => o.id === id);
    if (i < 0) throw new Error('Pesanan tidak ditemukan.');
    const prev = orders[i];
    orders[i] = {
      ...prev,
      estimatedAt: input.estimatedAt,
      estimatedEarliestAt: input.earliestAt === undefined ? null : input.earliestAt,
      estimateSource: 'manual',
      updatedAt: this.now(),
    };
    this.save('orders', orders);
    this.addEstimateHistory(id, prev.estimatedAt, input.estimatedAt, 'manual', input.reason.trim(), me);
    this.audit(me, 'order.estimate', 'order', id, `${prev.estimatedAt ?? '-'} -> ${input.estimatedAt}`);
    return orders[i];
  }

  async recordPayment(id: ID, input: PaymentInput & { total?: number }) {
    const me = await this.requireStaff();
    if (input.status === 'lunas' && !input.confirmed) throw new Error('Konfirmasi bahwa pembayaran penuh sudah diterima sebelum menandai lunas.');
    const orders = this.list<Order>('orders');
    const i = orders.findIndex((o) => o.id === id);
    if (i < 0) throw new Error('Pesanan tidak ditemukan.');
    const prev = orders[i];
    orders[i] = {
      ...prev,
      payment: {
        method: input.method,
        status: input.status,
        paidAt: input.status === 'lunas' ? input.paidAt || this.now() : null,
        recordedById: me.id,
        recordedByName: me.name,
      },
      updatedAt: this.now(),
    };
    this.save('orders', orders);
    this.audit(me, 'payment.update', 'order', id, `${prev.payment.status}/${prev.payment.method} -> ${input.status}/${input.method}`);
    return orders[i];
  }

  async statusHistory(orderId: ID) {
    await this.requireStaff();
    return this.list<StatusHistoryEntry>('statusHistory').filter((h) => h.orderId === orderId).sort((a, b) => a.at.localeCompare(b.at));
  }

  async estimateHistory(orderId: ID) {
    await this.requireStaff();
    return this.list<EstimateHistoryEntry>('estimateHistory').filter((h) => h.orderId === orderId).sort((a, b) => a.at.localeCompare(b.at));
  }

  // ------------------------------------------------------------------- photos
  photoIntegration(): PhotoIntegrationStatus {
    return {
      provider: 'local',
      configured: false,
      label: 'Google Drive belum dikonfigurasi',
      detail:
        'Mode demo: kolase disimpan di browser ini (IndexedDB) untuk uji coba. Upload ke Google Drive aktif setelah akun Google bisnis, Apps Script, dan Supabase dikonfigurasi (lihat docs/GOOGLE_DRIVE.md).',
    };
  }

  async listPhotos(orderId?: ID) {
    await this.requireStaff();
    const rows = this.list<OrderPhoto>('photos');
    return (orderId ? rows.filter((p) => p.orderId === orderId) : rows).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  async uploadCollage(orderId: ID, blob: Blob, meta: CollageMeta) {
    const me = await this.requireStaff();
    const order = this.list<Order>('orders').find((o) => o.id === orderId);
    if (!order) throw new Error('Pesanan tidak ditemukan.');
    if (!ALLOWED_MIME.includes(blob.type)) throw new Error('Tipe file tidak didukung.');
    if (blob.size > MAX_PHOTO_BYTES) throw new Error('Ukuran kolase melebihi 5 MB.');
    const id = uid();
    const fileId = `local-${id}`;
    try {
      await this.blobs.put(fileId, blob);
    } catch (e) {
      this.audit(me, 'photo.upload', 'photo', id, `Gagal upload untuk ${order.code}: ${String(e)}`, 'error');
      throw new Error('Gagal menyimpan foto: ' + String(e));
    }
    const photo: OrderPhoto = {
      id,
      orderId,
      provider: 'local',
      fileId,
      folderId: null,
      mimeType: blob.type,
      sizeBytes: blob.size,
      width: meta.width,
      height: meta.height,
      labels: meta.labels,
      caption: meta.caption,
      status: 'active',
      uploadedAt: this.now(),
      uploadedById: me.id,
      uploadedByName: me.name,
      deletedAt: null,
      deleteNote: '',
    };
    const rows = this.list<OrderPhoto>('photos');
    rows.push(photo);
    this.save('photos', rows);
    this.audit(me, 'photo.upload', 'photo', id, `Kolase untuk ${order.code} (${Math.round(blob.size / 1024)} KB, penyimpanan lokal)`);
    return photo;
  }

  private async blobUrl(photo: OrderPhoto): Promise<string | null> {
    if (photo.status !== 'active') return null;
    const b = await this.blobs.get(photo.fileId);
    return b ? URL.createObjectURL(b) : null;
  }

  async photoUrl(photoId: ID) {
    await this.requireStaff();
    const p = this.list<OrderPhoto>('photos').find((x) => x.id === photoId);
    return p ? this.blobUrl(p) : null;
  }

  private async deletePhotoInternal(photo: OrderPhoto, note: string, actor: StaffUser | null): Promise<OrderPhoto> {
    const rows = this.list<OrderPhoto>('photos');
    const i = rows.findIndex((r) => r.id === photo.id);
    try {
      await this.blobs.delete(photo.fileId);
      rows[i] = { ...rows[i], status: 'deleted', deletedAt: this.now(), deleteNote: note };
      this.save('photos', rows);
      this.audit(actor, 'photo.delete', 'photo', photo.id, `File ${photo.fileId} dihapus: ${note}`);
    } catch (e) {
      rows[i] = { ...rows[i], status: 'delete_failed', deleteNote: `${note} — gagal: ${String(e)}` };
      this.save('photos', rows);
      this.audit(actor, 'photo.delete', 'photo', photo.id, `Gagal menghapus ${photo.fileId}: ${String(e)}`, 'error');
      throw e;
    }
    return rows[i];
  }

  async deletePhoto(photoId: ID, note: string) {
    const me = await this.requireStaff();
    const p = this.list<OrderPhoto>('photos').find((x) => x.id === photoId);
    if (!p) throw new Error('Foto tidak ditemukan.');
    if (p.status === 'deleted') throw new Error('Foto sudah dihapus.');
    return this.deletePhotoInternal(p, note.trim() || 'Dihapus manual oleh pegawai', me);
  }

  async runRetention(dryRun: boolean, now: Date = this.clock()): Promise<RetentionReport> {
    const me = await this.requireStaff();
    const settings = await this.getSettings();
    const orders = new Map(this.list<Order>('orders').map((o) => [o.id, o]));
    const photos = this.list<OrderPhoto>('photos').filter((p) => p.status !== 'deleted');
    const items: RetentionItem[] = [];
    let deleted = 0;
    let failed = 0;
    for (const photo of photos) {
      const order = orders.get(photo.orderId);
      const r = checkPhotoEligibility(photo, order, settings, now);
      const item: RetentionItem = {
        photo,
        orderCode: order?.code ?? null,
        expiresAt: r.expiresAt?.toISOString() ?? null,
        eligible: r.eligible,
        reason: r.reason,
      };
      if (r.eligible && !dryRun) {
        try {
          await this.deletePhotoInternal(photo, `Retensi otomatis: kedaluwarsa ${item.expiresAt}`, me);
          item.result = 'deleted';
          deleted++;
        } catch (e) {
          item.result = 'failed';
          item.error = String(e);
          failed++;
        }
      }
      items.push(item);
    }
    this.audit(me, 'photo.retention', 'photo', null, `${dryRun ? 'Simulasi' : 'Eksekusi'}: diperiksa ${photos.length}, memenuhi syarat ${items.filter((i) => i.eligible).length}, dihapus ${deleted}, gagal ${failed}`, failed ? 'error' : 'info');
    return { ranAt: now.toISOString(), dryRun, checked: photos.length, items, deleted, failed };
  }

  // ------------------------------------------------------------ announcements
  async listAnnouncements() {
    await this.requireStaff();
    return this.list<Announcement>('announcements').sort((a, b) => b.publishAt.localeCompare(a.publishAt));
  }

  async listPublicAnnouncements() {
    const now = this.now();
    return this.list<Announcement>('announcements')
      .filter((a) => a.status === 'published' && a.publishAt <= now && (!a.expiresAt || a.expiresAt > now))
      .sort((a, b) => Number(b.important) - Number(a.important) || b.publishAt.localeCompare(a.publishAt));
  }

  async saveAnnouncement(a: SaveInput<Announcement>) {
    const me = await this.requireStaff();
    req(a.title, 'Judul wajib diisi.');
    req(a.body, 'Isi pengumuman wajib diisi.');
    if (a.expiresAt && a.expiresAt <= a.publishAt) throw new Error('Tanggal kedaluwarsa harus setelah tanggal publikasi.');
    const row = this.upsert<Announcement>('announcements', a);
    this.audit(me, a.id ? 'announcement.update' : 'announcement.create', 'announcement', row.id, `${row.title} (${row.status})`);
    return row;
  }

  async deleteAnnouncement(id: ID) {
    const me = await this.requireStaff();
    this.remove('announcements', id);
    this.audit(me, 'announcement.delete', 'announcement', id, '');
  }

  // ----------------------------------------------------------------- tracking
  private trackLimited(): boolean {
    const cutoff = this.clock().getTime() - TRACK_WINDOW_MS;
    const fails = (this.kv.get<number[]>('trackFailures') ?? []).filter((t) => t > cutoff);
    this.kv.set('trackFailures', fails);
    return fails.length >= TRACK_MAX_FAILURES;
  }
  private trackFail() {
    const fails = this.kv.get<number[]>('trackFailures') ?? [];
    fails.push(this.clock().getTime());
    this.kv.set('trackFailures', fails.slice(-50));
  }

  private findTrackable(code: string, phoneSuffix: string | undefined, settings: Settings): Order | null {
    const norm = normalizeCode(code);
    if (!norm) return null;
    const order = this.list<Order>('orders').find((o) => o.code === norm);
    if (!order) return null;
    if (settings.trackingRequirePhoneSuffix) {
      const suf = (phoneSuffix ?? '').replace(/\D/g, '');
      if (suf.length !== 4 || !order.customerPhone.endsWith(suf)) return null;
    }
    return order;
  }

  async trackOrder(code: string, phoneSuffix?: string): Promise<TrackResult> {
    if (this.trackLimited())
      return { ok: false, error: 'rate_limited', message: 'Terlalu banyak percobaan. Silakan coba lagi dalam 15 menit.' };
    if (!normalizeCode(code)) {
      this.trackFail();
      return { ok: false, error: 'invalid', message: 'Format kode pesanan tidak valid. Contoh: SS-7K3QX-9MPRA.' };
    }
    const settings = await this.getSettings();
    const order = this.findTrackable(code, phoneSuffix, settings);
    if (!order) {
      this.trackFail();
      return { ok: false, error: 'not_found', message: 'Pesanan tidak ditemukan. Periksa kembali kode pesanan Anda atau hubungi customer service.' };
    }
    return { ok: true, order: this.toPublic(order) };
  }

  private toPublic(o: Order): PublicOrderView {
    const timeline = this.list<StatusHistoryEntry>('statusHistory')
      .filter((h) => h.orderId === o.id)
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((h) => ({ status: h.to, at: h.at }));
    const photos = this.list<OrderPhoto>('photos')
      .filter((p) => p.orderId === o.id)
      .map((p) => ({ id: p.id, labels: p.labels, caption: p.caption, uploadedAt: p.uploadedAt, available: p.status === 'active' }));
    return {
      code: o.code,
      customerDisplayName: maskName(o.customerName),
      items: o.items?.map((it) => ({
        id: it.id,
        itemType: it.itemType,
        brand: it.brand,
        model: it.model,
        color: it.color,
        conditionNotes: it.conditionNotes,
        services: it.services.map((s) => ({ name: s.name, category: s.category, price: s.price })),
      })),
      itemType: o.itemType,
      brand: o.brand,
      model: o.model,
      color: o.color,
      services: o.services.map((s) => ({ name: s.name, category: s.category, price: s.price })),
      products: o.products.map((p) => ({ name: p.name, qty: p.qty, subtotal: p.subtotal })),
      fragranceName: o.fragranceName,
      receivedAt: o.receivedAt,
      estimatedEarliestAt: o.estimatedEarliestAt,
      estimatedAt: o.estimatedAt,
      completedAt: o.completedAt,
      pickedUpAt: o.pickedUpAt,
      status: o.status,
      timeline,
      total: o.total,
      paymentMethod: o.payment.method,
      paymentStatus: o.payment.status,
      paidAt: o.payment.paidAt,
      photos,
    };
  }

  async publicPhotoUrl(code: string, photoId: ID, phoneSuffix?: string) {
    const settings = await this.getSettings();
    const order = this.findTrackable(code, phoneSuffix, settings);
    if (!order) return null;
    const p = this.list<OrderPhoto>('photos').find((x) => x.id === photoId && x.orderId === order.id);
    return p ? this.blobUrl(p) : null;
  }

  // -------------------------------------------------------------------- audit
  async listAudit(limit = 300) {
    await this.requireStaff();
    return this.list<AuditLog>('audit').slice(0, limit);
  }
}
