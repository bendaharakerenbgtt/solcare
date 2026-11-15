// Repository implementation using Google Sheets via Google Apps Script Web App.
// Stores all business data (orders, services, staff, announcements, settings)
// in Google Spreadsheet, with local caching for instant UX and offline tolerance.

import type {
  Announcement,
  Customer,
  ID,
  Order,
  OrderItem,
  OrderProductLine,
  OrderServiceLine,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Role,
  Service,
  ServiceCategory,
  Settings,
  StaffUser,
  StatusHistoryEntry,
} from '../types';
import { ORDER_STATUSES } from '../types';
import type {
  OrderInput,
  PaymentInput,
  Repo,
  SaveInput,
  TrackResult,
} from '../repo';
import { LocalRepo } from '../local/localRepo';
import type { BlobStore, KV } from '../local/storage';

interface SheetPayload {
  action: string;
  [key: string]: unknown;
}

const VALID_CATEGORIES = new Set<string>(['main', 'express', 'additional', 'other']);

export class SheetsRepo extends LocalRepo implements Repo {
  private sheetKv: KV;
  private scriptUrl: string;
  private syncPromise: Promise<void> | null = null;
  private lastSyncAt = 0;

  constructor(kv: KV, blobs: BlobStore, scriptUrl: string) {
    super(kv, blobs);
    this.sheetKv = kv;
    this.scriptUrl = scriptUrl;
    void this.ensureDefaultAdmin();
    // Initial sync in background
    void this.syncFromSheet();
  }

  private async callScript<T>(payload: SheetPayload): Promise<T | null> {
    if (!this.scriptUrl) return null;
    try {
      const res = await fetch(this.scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      return json as T;
    } catch (err) {
      console.warn('Sheets API request error:', err);
      return null;
    }
  }

  private normalizeOrderRow(o: Record<string, unknown>): Order | null {
    let raw: Record<string, unknown> = o;
    if (o._rawJson && typeof o._rawJson === 'object') {
      raw = o._rawJson as Record<string, unknown>;
    } else if (o._rawJson && typeof o._rawJson === 'string') {
      try {
        const parsed = JSON.parse(o._rawJson);
        if (parsed && typeof parsed === 'object') {
          raw = parsed as Record<string, unknown>;
        }
      } catch {}
    }

    const id = String(raw.id || o._id || '').trim();
    const code = String(raw.code || o['No Resi'] || '').trim();
    if (!id || !code) return null;

    const nowIso = new Date().toISOString();
    const rawPhone = raw.customerPhone ?? o['No WhatsApp'] ?? '-';
    const customerPhone = rawPhone === '' || rawPhone == null ? '-' : String(rawPhone);
    const customerName = String(raw.customerName ?? o['Nama Pelanggan'] ?? 'Pelanggan');
    const total = Number(raw.total ?? o['Total Biaya']) || 0;
    const rawStatus = String(raw.status || o['Status Pengerjaan'] || 'menunggu');
    const status: OrderStatus = ORDER_STATUSES.includes(rawStatus as OrderStatus)
      ? (rawStatus as OrderStatus)
      : 'menunggu';
    const createdAt = String(raw.createdAt || raw.receivedAt || nowIso);
    const receivedAt = String(raw.receivedAt || createdAt);
    const updatedAt = String(raw.updatedAt || createdAt);

    let payment: Order['payment'];
    if (raw.payment && typeof raw.payment === 'object') {
      const p = raw.payment as Record<string, unknown>;
      payment = {
        method: (p.method === 'qris' ? 'qris' : 'tunai') as PaymentMethod,
        status: (p.status === 'lunas' ? 'lunas' : 'belum_lunas') as PaymentStatus,
        paidAt: p.paidAt ? String(p.paidAt) : null,
        recordedById: p.recordedById ? String(p.recordedById) : null,
        recordedByName: String(p.recordedByName || 'Staff'),
      };
    } else {
      const payStr = String(o['Status Pembayaran'] || '').toLowerCase();
      payment = {
        method: (payStr.includes('qris') ? 'qris' : 'tunai') as PaymentMethod,
        status: (payStr.includes('lunas') && !payStr.includes('belum') ? 'lunas' : 'belum_lunas') as PaymentStatus,
        paidAt: null,
        recordedById: null,
        recordedByName: 'Staff',
      };
    }

    return {
      id,
      code,
      customerId: String(raw.customerId || `cust-${id}`),
      customerName,
      customerPhone,
      items: Array.isArray(raw.items) ? (raw.items as OrderItem[]) : undefined,
      itemType: String(raw.itemType || 'Sepatu'),
      brand: String(raw.brand ?? o['Merek Sepatu'] ?? '-'),
      model: String(raw.model ?? o['Model Sepatu'] ?? '-'),
      color: String(raw.color || ''),
      conditionNotes: String(raw.conditionNotes ?? o['Kondisi Sepatu'] ?? ''),
      services: Array.isArray(raw.services) ? (raw.services as OrderServiceLine[]) : [],
      products: Array.isArray(raw.products) ? (raw.products as OrderProductLine[]) : [],
      fragranceId: raw.fragranceId ? String(raw.fragranceId) : null,
      fragranceName: String(raw.fragranceName ?? o['Parfum'] ?? ''),
      receivedAt,
      estimatedEarliestAt: raw.estimatedEarliestAt ? String(raw.estimatedEarliestAt) : null,
      estimatedAt: raw.estimatedAt ? String(raw.estimatedAt) : null,
      estimateSource: raw.estimateSource === 'manual' ? 'manual' : 'auto',
      completedAt: raw.completedAt ? String(raw.completedAt) : null,
      pickedUpAt: raw.pickedUpAt ? String(raw.pickedUpAt) : null,
      status,
      total,
      payment,
      internalNotes: String(raw.internalNotes ?? o['Catatan Kasir'] ?? ''),
      createdById: raw.createdById ? String(raw.createdById) : null,
      createdAt,
      updatedAt,
    };
  }

  private reconstructOrderRelations(parsedOrders: Order[]) {
    const existingCustomers = this.sheetKv.get<Customer[]>('customers') ?? [];
    const custMap = new Map(existingCustomers.map((c) => [c.id, c]));
    let custChanged = false;
    for (const ord of parsedOrders) {
      if (ord.customerId && !custMap.has(ord.customerId)) {
        custMap.set(ord.customerId, {
          id: ord.customerId,
          name: ord.customerName,
          phone: ord.customerPhone,
          notes: '',
          createdAt: ord.createdAt,
          updatedAt: ord.updatedAt,
        });
        custChanged = true;
      }
    }
    if (custChanged) {
      this.sheetKv.set('customers', Array.from(custMap.values()));
    }

    const existingHistory = this.sheetKv.get<StatusHistoryEntry[]>('statusHistory') ?? [];
    const histOrderIds = new Set(existingHistory.map((h) => h.orderId));
    let histChanged = false;
    for (const ord of parsedOrders) {
      if (!histOrderIds.has(ord.id)) {
        existingHistory.push({
          id: `hist-${ord.id}-init`,
          orderId: ord.id,
          from: null,
          to: 'menunggu',
          note: 'Pesanan diterima',
          at: ord.receivedAt || ord.createdAt,
          byId: ord.createdById ?? null,
          byName: ord.payment?.recordedByName || 'Staff',
        });
        if (ord.status !== 'menunggu') {
          existingHistory.push({
            id: `hist-${ord.id}-${ord.status}`,
            orderId: ord.id,
            from: 'menunggu',
            to: ord.status,
            note: 'Sinkronisasi status',
            at: ord.updatedAt || ord.completedAt || ord.receivedAt,
            byId: ord.createdById ?? null,
            byName: ord.payment?.recordedByName || 'Staff',
          });
        }
        histChanged = true;
      }
    }
    if (histChanged) {
      this.sheetKv.set('statusHistory', existingHistory);
    }
  }

  /**
   * Pull all current data from Google Sheets into local cache.
   */
  async syncFromSheet(): Promise<void> {
    if (!this.scriptUrl) return;
    if (this.syncPromise) return this.syncPromise;

    this.syncPromise = (async () => {
      try {
        const res = await fetch(`${this.scriptUrl}?action=readAll`);
        const json = await res.json();
        if (json && json.ok && json.data) {
          const { orders, services, staff, announcements, settings } = json.data;
          const nowIso = new Date().toISOString();

          if (Array.isArray(orders) && orders.length > 0) {
            const parsedOrders = orders
              .map((o: Record<string, unknown>) => this.normalizeOrderRow(o))
              .filter((o): o is Order => o !== null);
            if (parsedOrders.length > 0) {
              this.sheetKv.set('orders', parsedOrders);
              this.reconstructOrderRelations(parsedOrders);
            }
          }

          if (Array.isArray(services) && services.length >= 10) {
            const parsedServices: Service[] = services
              .map((s: Record<string, unknown>, idx: number) => ({
                id: String(s.id || `svc-${idx}`),
                name: String(s.name || '').trim(),
                category: (VALID_CATEGORIES.has(String(s.category)) ? String(s.category) : 'main') as ServiceCategory,
                description: String(s.description || ''),
                terms: String(s.terms || ''),
                priceMin: Number(s.priceMin) || 0,
                priceMax: s.priceMax === '' || s.priceMax == null ? null : Number(s.priceMax),
                durationMinDays: Number(s.durationMinDays) || 0,
                durationMaxDays: Number(s.durationMaxDays) || 0,
                workloadWeight: Number(s.workloadWeight) || 1,
                expressHours: s.expressHours === '' || s.expressHours == null ? null : Number(s.expressHours),
                expressEligible: s.expressEligible === true || s.expressEligible === 'true',
                active: s.active !== false && s.active !== 'false',
                sortOrder: Number(s.sortOrder) || idx,
                createdAt: String(s.createdAt || nowIso),
                updatedAt: String(s.updatedAt || nowIso),
              }))
              .filter((s) => s.id && s.name);
            if (parsedServices.length >= 10) {
              this.sheetKv.set('services', parsedServices);
            }
          }

          if (Array.isArray(staff) && staff.length > 0) {
            const prevStaff = this.sheetKv.get<StaffUser[]>('staff') ?? [];
            const parsedStaff: StaffUser[] = staff
              .map((st: Record<string, unknown>) => ({
                id: String(st.id || '').trim(),
                email: String(st.email || '').trim().toLowerCase(),
                name: String(st.name || '').trim(),
                role: (st.role === 'admin' ? 'admin' : 'staff') as Role,
                active: st.active !== false && st.active !== 'false',
                plainPassword: String(st.plainPassword || ''),
                createdAt: String(st.createdAt || nowIso),
              }))
              .filter((st) => st.id && st.email);

            if (parsedStaff.length > 0) {
              const session = this.sheetKv.get<{ userId: string; expiresAt: string } | null>('session');
              if (session && !parsedStaff.some((s) => s.id === session.userId)) {
                const prevUser = prevStaff.find((s) => s.id === session.userId);
                const matched = prevUser && parsedStaff.find((s) => s.email === prevUser.email);
                if (matched) {
                  this.sheetKv.set('session', { ...session, userId: matched.id });
                }
              }
              this.sheetKv.set('staff', parsedStaff);
            }
          }

          if (Array.isArray(announcements) && announcements.length > 0) {
            const parsedAnnouncements: Announcement[] = announcements
              .map((a: Record<string, unknown>) => ({
                id: String(a.id || '').trim(),
                title: String(a.title || '').trim(),
                body: String(a.body ?? a.content ?? '').trim(),
                category: String(a.category || 'promosi').trim(),
                publishAt: String(a.publishAt || a.createdAt || nowIso),
                expiresAt: a.expiresAt ? String(a.expiresAt) : null,
                status: (a.status === 'draft' ? 'draft' : 'published') as Announcement['status'],
                important: a.important === true || a.important === 'true' || (a.important === undefined && Boolean(a.active)),
                createdAt: String(a.createdAt || nowIso),
                updatedAt: String(a.updatedAt || a.createdAt || nowIso),
              }))
              .filter((a) => a.id && a.title);
            if (parsedAnnouncements.length > 0) {
              this.sheetKv.set('announcements', parsedAnnouncements);
            }
          }

          if (settings && typeof settings === 'object' && Object.keys(settings).length > 0) {
            const cur = await super.getSettings();
            const rawSettings = settings as Record<string, unknown>;
            const normalizeTime = (val: unknown, fallback: string) => {
              const s = String(val || '').trim();
              if (/^\d{1,2}:\d{2}$/.test(s)) return s.padStart(5, '0');
              if (s.includes('T') && !s.startsWith('1899-')) {
                const d = new Date(s);
                if (!Number.isNaN(d.getTime())) {
                  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                }
              }
              return fallback;
            };
            const rawWa = rawSettings.whatsappNumber != null ? String(rawSettings.whatsappNumber).trim() : cur.whatsappNumber;
            const whatsappNumber = rawWa && rawWa.startsWith('8') ? '0' + rawWa : rawWa;
            const merged: Settings = {
              ...cur,
              ...(rawSettings as Partial<Settings>),
              openTime: normalizeTime(rawSettings.openTime, cur.openTime),
              closeTime: normalizeTime(rawSettings.closeTime, cur.closeTime),
              dailyCapacity: Number(rawSettings.dailyCapacity ?? cur.dailyCapacity) || cur.dailyCapacity,
              estimateHorizonDays: Number(rawSettings.estimateHorizonDays ?? cur.estimateHorizonDays) || cur.estimateHorizonDays,
              retentionMonths: Number(rawSettings.retentionMonths ?? cur.retentionMonths) || cur.retentionMonths,
              trackingRequirePhoneSuffix:
                rawSettings.trackingRequirePhoneSuffix !== undefined
                  ? rawSettings.trackingRequirePhoneSuffix === true || rawSettings.trackingRequirePhoneSuffix === 'true'
                  : cur.trackingRequirePhoneSuffix,
              closedWeekdays: Array.isArray(rawSettings.closedWeekdays)
                ? rawSettings.closedWeekdays.map(Number)
                : cur.closedWeekdays,
              holidays: Array.isArray(rawSettings.holidays)
                ? rawSettings.holidays.map(String)
                : cur.holidays,
              whatsappNumber,
            };
            this.sheetKv.set('settings', merged);
          }

          this.lastSyncAt = Date.now();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('solecare:sheet-synced'));
          }
        } else {
          await this.pushInitialDataToSheet();
        }
      } catch (err) {
        console.warn('Gagal sinkron dari Google Sheets, menggunakan cache lokal:', err);
      } finally {
        this.syncPromise = null;
      }
    })();

    return this.syncPromise;
  }

  private async pushInitialDataToSheet(): Promise<void> {
    try {
      const services = await super.listServices(true);
      for (const s of services) {
        await this.callScript({ action: 'saveService', service: s });
      }
      const staff = await super.listStaff();
      for (const st of staff) {
        await this.callScript({ action: 'saveStaff', staff: st });
      }
      const announcements = await super.listAnnouncements();
      for (const a of announcements) {
        await this.callScript({ action: 'saveAnnouncement', announcement: a });
      }
      const settings = await super.getSettings();
      await this.callScript({ action: 'saveSettings', settings });
    } catch (e) {
      console.warn('Initial push to sheet error:', e);
    }
  }

  // -----------------------------------------------------------------
  // HELPER: Format Order agar kolom di Spreadsheet rapi & manusiawi
  // -----------------------------------------------------------------
  private formatOrderForSheet(order: Order) {
    const serviceNames = (order.services || []).map((s) => s.name).join(', ') || '-';
    const paymentStatus = order.payment
      ? `${order.payment.status.toUpperCase()} (${order.payment.method})`
      : 'BELUM BAYAR';

    return {
      code: order.code,
      'No Resi': order.code,
      'Nama Pelanggan': order.customerName || '-',
      'No WhatsApp': order.customerPhone || '-',
      'Total Biaya': order.total || 0,
      'Status Pengerjaan': order.status,
      'Status Pembayaran': paymentStatus,
      'Layanan': serviceNames,
      'Merek Sepatu': order.brand || '-',
      'Model Sepatu': order.model || '-',
      'Kondisi Sepatu': order.conditionNotes || '-',
      'Parfum': order.fragranceName || '-',
      'Catatan Kasir': order.internalNotes || '-',
      'Tanggal Masuk': order.createdAt ? new Date(order.createdAt).toLocaleString('id-ID') : '-',
      'Estimasi Selesai': order.estimatedAt ? new Date(order.estimatedAt).toLocaleString('id-ID') : '-',
      // Kolom sistem (disimpan di belakang untuk sinkronisasi internal)
      '_id': order.id,
      '_rawJson': JSON.stringify(order),
    };
  }

  // -----------------------------------------------------------------
  // OVERRIDES: Auth
  // -----------------------------------------------------------------
  override async needsSetup(): Promise<boolean> {
    const staff = this.sheetKv.get<StaffUser[]>('staff') ?? [];
    if (staff.length === 0) {
      await this.ensureDefaultAdmin();
    }
    return false;
  }

  override async signIn(email: string, password: string): Promise<StaffUser> {
    try {
      return await super.signIn(email, password);
    } catch {
      await this.syncFromSheet();
      return super.signIn(email, password);
    }
  }

  // -----------------------------------------------------------------
  // OVERRIDES: Orders
  // -----------------------------------------------------------------
  override async listOrders(): Promise<Order[]> {
    if (Date.now() - this.lastSyncAt > 15_000) {
      void this.syncFromSheet();
    }
    return super.listOrders();
  }

  override async createOrder(input: OrderInput): Promise<Order> {
    const order = await super.createOrder(input);
    this.lastSyncAt = Date.now();
    void this.callScript({ action: 'saveOrder', order: this.formatOrderForSheet(order), code: order.code });
    return order;
  }

  override async updateOrder(id: ID, input: OrderInput): Promise<Order> {
    const order = await super.updateOrder(id, input);
    this.lastSyncAt = Date.now();
    void this.callScript({ action: 'saveOrder', order: this.formatOrderForSheet(order), code: order.code });
    return order;
  }

  override async updateStatus(id: ID, to: OrderStatus, note: string): Promise<Order> {
    const order = await super.updateStatus(id, to, note);
    this.lastSyncAt = Date.now();
    void this.callScript({ action: 'saveOrder', order: this.formatOrderForSheet(order), code: order.code });
    return order;
  }

  override async adjustEstimate(
    id: ID,
    input: { estimatedAt: string; earliestAt?: string | null; reason: string },
  ): Promise<Order> {
    const order = await super.adjustEstimate(id, input);
    this.lastSyncAt = Date.now();
    void this.callScript({ action: 'saveOrder', order: this.formatOrderForSheet(order), code: order.code });
    return order;
  }

  override async recordPayment(id: ID, input: PaymentInput & { total?: number }): Promise<Order> {
    const order = await super.recordPayment(id, input);
    this.lastSyncAt = Date.now();
    void this.callScript({ action: 'saveOrder', order: this.formatOrderForSheet(order), code: order.code });
    return order;
  }

  override async deleteOrder(id: ID): Promise<void> {
    const order = await super.getOrder(id);
    await super.deleteOrder(id);
    this.lastSyncAt = Date.now();
    if (order) {
      void this.callScript({ action: 'delete', table: 'orders', keyField: 'code', keyValue: order.code });
    }
  }

  // -----------------------------------------------------------------
  // OVERRIDES: Services
  // -----------------------------------------------------------------
  override async saveService(s: SaveInput<Service>): Promise<Service> {
    const svc = await super.saveService(s);
    this.lastSyncAt = Date.now();
    void this.callScript({ action: 'saveService', service: svc });
    return svc;
  }

  override async deleteService(id: ID): Promise<void> {
    await super.deleteService(id);
    this.lastSyncAt = Date.now();
    void this.callScript({ action: 'delete', table: 'services', keyField: 'id', keyValue: id });
  }

  // -----------------------------------------------------------------
  // OVERRIDES: Staff & Password
  // -----------------------------------------------------------------
  override async createStaff(input: { name: string; email: string; password: string; role: Role }): Promise<StaffUser> {
    const user = await super.createStaff(input);
    this.lastSyncAt = Date.now();
    void this.callScript({ action: 'saveStaff', staff: user });
    return user;
  }

  override async updateStaff(
    id: ID,
    patch: Partial<Pick<StaffUser, 'name' | 'role' | 'active'>>,
  ): Promise<StaffUser> {
    const user = await super.updateStaff(id, patch);
    this.lastSyncAt = Date.now();
    void this.callScript({ action: 'saveStaff', staff: user });
    return user;
  }

  override async changePassword(id: ID, newPassword: string): Promise<void> {
    await super.changePassword(id, newPassword);
    this.lastSyncAt = Date.now();
    void this.callScript({ action: 'changeStaffPassword', id, newPassword });
  }

  // -----------------------------------------------------------------
  // OVERRIDES: Announcements
  // -----------------------------------------------------------------
  override async saveAnnouncement(a: SaveInput<Announcement>): Promise<Announcement> {
    const ann = await super.saveAnnouncement(a);
    this.lastSyncAt = Date.now();
    void this.callScript({ action: 'saveAnnouncement', announcement: ann });
    return ann;
  }

  override async deleteAnnouncement(id: ID): Promise<void> {
    await super.deleteAnnouncement(id);
    this.lastSyncAt = Date.now();
    void this.callScript({ action: 'delete', table: 'announcements', keyField: 'id', keyValue: id });
  }

  // -----------------------------------------------------------------
  // OVERRIDES: Settings
  // -----------------------------------------------------------------
  override async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    const s = await super.updateSettings(patch);
    this.lastSyncAt = Date.now();
    void this.callScript({ action: 'saveSettings', settings: s });
    return s;
  }

  // -----------------------------------------------------------------
  // OVERRIDES: Public Tracking
  // -----------------------------------------------------------------
  override async trackOrder(code: string, phoneSuffix?: string): Promise<TrackResult> {
    // Fast path: try local first
    const localRes = await super.trackOrder(code, phoneSuffix);
    if (localRes.ok) return localRes;

    // If not found locally, trigger quick sync from sheet and retry
    await this.syncFromSheet();
    return super.trackOrder(code, phoneSuffix);
  }
}
