import { beforeEach, describe, expect, it } from 'vitest';
import { LocalRepo } from './localRepo';
import { MemoryBlobStore, MemoryKV } from './storage';
import type { OrderInput } from '../repo';
import { lineFromService } from '../../lib/pricing';
import { displayCode, generateCode } from '../../lib/code';

let clock = new Date(2026, 9, 19, 10, 0);
let repo: LocalRepo;
let blobs: MemoryBlobStore;

async function draft(over: Partial<OrderInput> = {}): Promise<OrderInput> {
  const services = await repo.listServices();
  const basic = services.find((s) => s.name === 'Basic Clean')!;
  return {
    customer: { name: 'Budi Santoso', phone: '0812-3456-7890' },
    itemType: 'Sepatu',
    brand: 'Converse',
    model: 'Chuck 70',
    color: 'Putih',
    conditionNotes: '',
    services: [lineFromService(basic)],
    products: [],
    fragranceId: null,
    receivedAt: clock.toISOString(),
    estimate: { earliestAt: null, estimatedAt: '2026-10-20T11:00:00.000Z', source: 'auto', autoAt: '2026-10-20T11:00:00.000Z', reason: '' },
    payment: { method: 'qris', status: 'lunas', paidAt: null, confirmed: true },
    internalNotes: 'catatan rahasia',
    ...over,
  };
}

beforeEach(async () => {
  clock = new Date(2026, 9, 19, 10, 0);
  blobs = new MemoryBlobStore();
  repo = new LocalRepo(new MemoryKV(), blobs, () => clock);
});

describe('LocalRepo', () => {
  it('requires login for staff operations', async () => {
    await expect(repo.listOrders()).rejects.toThrow(/login/i);
    await expect(repo.createOrder(await draft())).rejects.toThrow();
    await expect(repo.listServices(true)).rejects.toThrow();
  });

  it('first-admin setup, login, logout', async () => {
    expect(await repo.needsSetup()).toBe(true);
    await repo.setupFirstAdmin({ name: 'Admin', email: 'admin@example.com', password: 'rahasia123' });
    expect(await repo.needsSetup()).toBe(false);
    await expect(repo.setupFirstAdmin({ name: 'X', email: 'x@example.com', password: 'rahasia123' })).rejects.toThrow();
    await repo.signOut();
    expect(await repo.currentUser()).toBeNull();
    await expect(repo.signIn('admin@example.com', 'salah')).rejects.toThrow();
    const u = await repo.signIn('ADMIN@example.com', 'rahasia123');
    expect(u.name).toBe('Admin');
  });

  describe('as staff', () => {
    beforeEach(async () => {
      await repo.setupFirstAdmin({ name: 'Admin', email: 'admin@example.com', password: 'rahasia123' });
    });

    it('creates order with price snapshot, payment and history', async () => {
      const o = await repo.createOrder(await draft());
      expect(o.total).toBe(35000);
      expect(o.payment).toMatchObject({ status: 'lunas', method: 'qris', recordedByName: 'Admin' });
      expect(o.payment.paidAt).toBeTruthy();
      expect(o.customerPhone).toBe('6281234567890');
      expect((await repo.statusHistory(o.id)).length).toBe(1);

      // Catalog price change must not alter the order
      const basic = (await repo.listServices()).find((s) => s.name === 'Basic Clean')!;
      await repo.saveService({ ...basic, priceMin: 99999 });
      await repo.deleteService(basic.id);
      const again = await repo.getOrder(o.id);
      expect(again!.services[0].price).toBe(35000);
      expect(again!.total).toBe(35000);
    });

    it('refuses "lunas" without explicit staff confirmation', async () => {
      await expect(repo.createOrder(await draft({ payment: { method: 'qris', status: 'lunas', paidAt: null, confirmed: false } }))).rejects.toThrow(/Konfirmasi/);
      const o = await repo.createOrder(await draft({ payment: { method: 'qris', status: 'belum_lunas', paidAt: null, confirmed: false } }));
      expect(o.payment.paidAt).toBeNull();
    });

    it('products are snapshotted with qty and subtotal', async () => {
      const p = await repo.saveProduct({ name: 'Tali sepatu', description: '', price: 15000, active: true });
      const o = await repo.createOrder(await draft({ products: [{ productId: p.id, name: p.name, unitPrice: 15000, qty: 2, subtotal: 0 }] }));
      expect(o.products[0].subtotal).toBe(30000);
      expect(o.total).toBe(65000);
      await repo.saveProduct({ ...p, price: 20000 });
      expect((await repo.getOrder(o.id))!.products[0].unitPrice).toBe(15000);
    });

    it('supports multiple items in a single order', async () => {
      const basic = (await repo.listServices()).find((s) => s.name === 'Basic Clean')!;
      const deep = (await repo.listServices()).find((s) => s.name === 'Deep Clean')!;
      const item1 = {
        id: 'it-1',
        itemType: 'Sepatu',
        brand: 'Nike',
        model: 'Air Jordan 1',
        color: 'Merah Putih',
        conditionNotes: 'Kotor ringan',
        services: [{ serviceId: basic.id, name: basic.name, category: basic.category, price: 35000, priceMin: 35000, priceMax: null, workloadWeight: 1, durationMinDays: 1, durationMaxDays: 2, expressHours: null }],
      };
      const item2 = {
        id: 'it-2',
        itemType: 'Sepatu',
        brand: 'Converse',
        model: 'Chuck 70',
        color: 'Hitam',
        conditionNotes: 'Midsole kotor',
        services: [{ serviceId: deep.id, name: deep.name, category: deep.category, price: 50000, priceMin: 50000, priceMax: null, workloadWeight: 1.5, durationMinDays: 2, durationMaxDays: 3, expressHours: null }],
      };

      const orderInput = await draft({
        itemType: '2 Barang',
        brand: 'Nike, Converse',
        model: 'Air Jordan 1, Chuck 70',
        items: [item1, item2],
        services: [...item1.services, ...item2.services],
      });

      const o = await repo.createOrder(orderInput);
      expect(o.items?.length).toBe(2);
      expect(o.total).toBe(85000);

      const tracked = await repo.trackOrder(displayCode(o.code));
      expect(tracked.ok).toBe(true);
      if (tracked.ok) {
        expect(tracked.order.items?.length).toBe(2);
        expect(tracked.order.total).toBe(85000);
      }
    });

    it('status changes are recorded and visible to the customer', async () => {
      const o = await repo.createOrder(await draft());
      await repo.updateStatus(o.id, 'pencucian', '');
      clock = new Date(2026, 9, 20, 15, 0);
      expect(await repo.currentUser()).toBeNull(); // session expired (12h)
      await repo.signIn('admin@example.com', 'rahasia123');
      const done = await repo.updateStatus(o.id, 'selesai', 'siap');
      expect(done.completedAt).toBe(clock.toISOString());
      const h = await repo.statusHistory(o.id);
      expect(h.map((x) => x.to)).toEqual(['menunggu', 'pencucian', 'selesai']);
      expect(h[2].byName).toBe('Admin');

      await repo.signOut(); // public visitor
      const t = await repo.trackOrder(displayCode(o.code));
      expect(t.ok).toBe(true);
      if (t.ok) {
        expect(t.order.status).toBe('selesai');
        expect(t.order.timeline.length).toBe(3);
        const json = JSON.stringify(t.order);
        expect(json).not.toContain('6281234567890');
        expect(json).not.toContain('catatan rahasia');
        expect(json).not.toContain('Admin');
        expect(t.order.customerDisplayName).not.toBe('Budi Santoso');
      }
    });

    it('manual estimate keeps previous and new values', async () => {
      const o = await repo.createOrder(await draft());
      await expect(repo.adjustEstimate(o.id, { estimatedAt: '2026-10-23T11:00:00.000Z', reason: '' })).rejects.toThrow();
      await repo.adjustEstimate(o.id, { estimatedAt: '2026-10-23T11:00:00.000Z', reason: 'Sepatu perlu cuci ulang' });
      const h = await repo.estimateHistory(o.id);
      expect(h[1]).toMatchObject({ previousAt: '2026-10-20T11:00:00.000Z', newAt: '2026-10-23T11:00:00.000Z', source: 'manual' });
    });

    it('guessing codes does not reveal other orders and is rate limited', async () => {
      await repo.createOrder(await draft());
      await repo.signOut();
      for (let i = 0; i < 10; i++) {
        const r = await repo.trackOrder(displayCode(generateCode()));
        expect(r.ok).toBe(false);
      }
      const blocked = await repo.trackOrder(displayCode(generateCode()));
      expect(blocked.ok === false && blocked.error).toBe('rate_limited');
    });

    it('optional phone-suffix verification', async () => {
      await repo.updateSettings({ trackingRequirePhoneSuffix: true });
      const o = await repo.createOrder(await draft());
      expect((await repo.trackOrder(o.code)).ok).toBe(false);
      expect((await repo.trackOrder(o.code, '0000')).ok).toBe(false);
      expect((await repo.trackOrder(o.code, '7890')).ok).toBe(true);
    });

    it('capacity and prices are editable via settings/catalog', async () => {
      const s = await repo.updateSettings({ dailyCapacity: 30 });
      expect(s.dailyCapacity).toBe(30);
      await expect(repo.updateSettings({ closedWeekdays: [0, 1, 2, 3, 4, 5, 6] })).rejects.toThrow();
    });

    it('photo retention deletes only eligible files and keeps order history', async () => {
      const a = await repo.createOrder(await draft());
      const b = await repo.createOrder(await draft({ customer: { name: 'Sari', phone: '081299998888' } }));
      const blob = new Blob([new Uint8Array(1000)], { type: 'image/jpeg' });
      const pa = await repo.uploadCollage(a.id, blob, { labels: ['1', '2', '3', '4'], caption: 'Sebelum', width: 1600, height: 1600 });
      const pb = await repo.uploadCollage(b.id, blob, { labels: ['1', '2', '3', '4'], caption: 'Sebelum', width: 1600, height: 1600 });
      await expect(repo.uploadCollage(a.id, new Blob(['x'], { type: 'text/plain' }), { labels: [], caption: '', width: 1, height: 1 })).rejects.toThrow();

      await repo.updateStatus(a.id, 'diambil', '');
      // b still in progress

      const relogin = () => repo.signIn('admin@example.com', 'rahasia123');
      clock = new Date(2027, 3, 1, 10); // ~5.5 months later: nothing eligible
      await relogin();
      let rep = await repo.runRetention(false);
      expect(rep.deleted).toBe(0);

      clock = new Date(2027, 4, 1, 10); // > 6 months after pickup
      await relogin();
      const dry = await repo.runRetention(true);
      expect(dry.items.filter((i) => i.eligible).length).toBe(1);
      expect(blobs.has(pa.fileId)).toBe(true); // dry run deletes nothing

      rep = await repo.runRetention(false);
      expect(rep.deleted).toBe(1);
      expect(blobs.has(pa.fileId)).toBe(false);
      expect(blobs.has(pb.fileId)).toBe(true);

      const photos = await repo.listPhotos(a.id);
      expect(photos[0].status).toBe('deleted');
      expect(photos[0].deletedAt).toBeTruthy();
      const order = await repo.getOrder(a.id);
      expect(order!.total).toBe(35000);
      expect((await repo.statusHistory(a.id)).length).toBe(2);
      expect((await repo.listAudit()).some((l) => l.action === 'photo.retention')).toBe(true);
    });

    it('public announcements respect status and dates', async () => {
      await repo.saveAnnouncement({ title: 'Draft', body: 'x', category: 'promosi', publishAt: clock.toISOString(), expiresAt: null, status: 'draft', important: false });
      await repo.saveAnnouncement({ title: 'Libur', body: 'x', category: 'libur', publishAt: clock.toISOString(), expiresAt: '2026-10-25T00:00:00.000Z', status: 'published', important: true });
      expect((await repo.listPublicAnnouncements()).map((a) => a.title)).toEqual(['Libur']);
      clock = new Date(2026, 9, 26);
      expect((await repo.listPublicAnnouncements()).length).toBe(0);
    });
  });
});
