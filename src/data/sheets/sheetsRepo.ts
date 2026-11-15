// Repository implementation using Google Sheets via Google Apps Script Web App.
// Stores all business data (orders, services, staff, announcements, settings)
// in Google Spreadsheet, with local caching for instant UX and offline tolerance.

import type {
  Announcement,
  ID,
  Order,
  OrderStatus,
  Role,
  Service,
  Settings,
  StaffUser,
} from '../types';
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

export class SheetsRepo extends LocalRepo implements Repo {
  private scriptUrl: string;
  private syncing = false;

  constructor(kv: KV, blobs: BlobStore, scriptUrl: string) {
    super(kv, blobs);
    this.scriptUrl = scriptUrl;
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

  /**
   * Pull all current data from Google Sheets into local cache.
   */
  async syncFromSheet(): Promise<void> {
    if (this.syncing || !this.scriptUrl) return;
    this.syncing = true;
    try {
      const res = await fetch(`${this.scriptUrl}?action=readAll`);
      const json = await res.json();
      if (json && json.ok && json.data) {
        const { orders, services, staff, announcements, settings } = json.data;

        if (Array.isArray(orders) && orders.length > 0) {
          // Merge or replace orders
          (this as unknown as { save: (k: string, v: unknown) => void }).save('orders', orders);
        }
        if (Array.isArray(services) && services.length > 0) {
          (this as unknown as { save: (k: string, v: unknown) => void }).save('services', services);
        }
        if (Array.isArray(staff) && staff.length > 0) {
          (this as unknown as { save: (k: string, v: unknown) => void }).save('staff', staff);
        }
        if (Array.isArray(announcements) && announcements.length > 0) {
          (this as unknown as { save: (k: string, v: unknown) => void }).save('announcements', announcements);
        }
        if (settings && Object.keys(settings).length > 0) {
          const cur = await super.getSettings();
          (this as unknown as { kv: { set: (k: string, v: unknown) => void } }).kv.set('settings', { ...cur, ...settings });
        }
      } else {
        // If sheet is fresh/empty, seed current initial data up to Google Sheets
        await this.pushInitialDataToSheet();
      }
    } catch (err) {
      console.warn('Gagal sinkron dari Google Sheets, menggunakan cache lokal:', err);
    } finally {
      this.syncing = false;
    }
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
  // OVERRIDES: Orders
  // -----------------------------------------------------------------
  override async createOrder(input: OrderInput): Promise<Order> {
    const order = await super.createOrder(input);
    void this.callScript({ action: 'saveOrder', order });
    return order;
  }

  override async updateOrder(id: ID, input: OrderInput): Promise<Order> {
    const order = await super.updateOrder(id, input);
    void this.callScript({ action: 'saveOrder', order });
    return order;
  }

  override async updateStatus(id: ID, to: OrderStatus, note: string): Promise<Order> {
    const order = await super.updateStatus(id, to, note);
    void this.callScript({ action: 'saveOrder', order });
    return order;
  }

  override async recordPayment(id: ID, input: PaymentInput & { total?: number }): Promise<Order> {
    const order = await super.recordPayment(id, input);
    void this.callScript({ action: 'saveOrder', order });
    return order;
  }

  override async deleteOrder(id: ID): Promise<void> {
    const order = await super.getOrder(id);
    await super.deleteOrder(id);
    if (order) {
      void this.callScript({ action: 'delete', table: 'orders', keyField: 'code', keyValue: order.code });
    }
  }

  // -----------------------------------------------------------------
  // OVERRIDES: Services
  // -----------------------------------------------------------------
  override async saveService(s: SaveInput<Service>): Promise<Service> {
    const svc = await super.saveService(s);
    void this.callScript({ action: 'saveService', service: svc });
    return svc;
  }

  override async deleteService(id: ID): Promise<void> {
    await super.deleteService(id);
    void this.callScript({ action: 'delete', table: 'services', keyField: 'id', keyValue: id });
  }

  // -----------------------------------------------------------------
  // OVERRIDES: Staff & Password
  // -----------------------------------------------------------------
  override async createStaff(input: { name: string; email: string; password: string; role: Role }): Promise<StaffUser> {
    const user = await super.createStaff(input);
    void this.callScript({ action: 'saveStaff', staff: user });
    return user;
  }

  override async changePassword(id: ID, newPassword: string): Promise<void> {
    await super.changePassword(id, newPassword);
    void this.callScript({ action: 'changeStaffPassword', id, newPassword });
  }

  // -----------------------------------------------------------------
  // OVERRIDES: Announcements
  // -----------------------------------------------------------------
  override async saveAnnouncement(a: SaveInput<Announcement>): Promise<Announcement> {
    const ann = await super.saveAnnouncement(a);
    void this.callScript({ action: 'saveAnnouncement', announcement: ann });
    return ann;
  }

  override async deleteAnnouncement(id: ID): Promise<void> {
    await super.deleteAnnouncement(id);
    void this.callScript({ action: 'delete', table: 'announcements', keyField: 'id', keyValue: id });
  }

  // -----------------------------------------------------------------
  // OVERRIDES: Settings
  // -----------------------------------------------------------------
  override async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    const s = await super.updateSettings(patch);
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
