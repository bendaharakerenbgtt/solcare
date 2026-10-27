// Storage adapters for demo (local) mode.

export interface KV {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
}

export interface BlobStore {
  put(id: string, blob: Blob): Promise<void>;
  get(id: string): Promise<Blob | undefined>;
  delete(id: string): Promise<void>;
}

export class MemoryKV implements KV {
  private m = new Map<string, string>();
  get<T>(key: string): T | undefined {
    const v = this.m.get(key);
    return v === undefined ? undefined : (JSON.parse(v) as T);
  }
  set<T>(key: string, value: T): void {
    this.m.set(key, JSON.stringify(value));
  }
}

export class LocalStorageKV implements KV {
  constructor(private prefix = 'soleful:') {}
  get<T>(key: string): T | undefined {
    const v = localStorage.getItem(this.prefix + key);
    return v == null ? undefined : (JSON.parse(v) as T);
  }
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (e) {
      throw new Error('Penyimpanan browser penuh. Hapus data demo lama atau gunakan Supabase. (' + String(e) + ')');
    }
  }
}

export class MemoryBlobStore implements BlobStore {
  private m = new Map<string, Blob>();
  async put(id: string, blob: Blob) {
    this.m.set(id, blob);
  }
  async get(id: string) {
    return this.m.get(id);
  }
  async delete(id: string) {
    if (!this.m.has(id)) throw new Error('File tidak ditemukan di penyimpanan');
    this.m.delete(id);
  }
  has(id: string) {
    return this.m.has(id);
  }
}

export class IndexedDBBlobStore implements BlobStore {
  private dbp: Promise<IDBDatabase>;
  constructor(name = 'soleful-photos') {
    this.dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(name, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('files');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  private async tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.dbp;
    return new Promise((resolve, reject) => {
      const t = db.transaction('files', mode);
      const r = fn(t.objectStore('files'));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async put(id: string, blob: Blob) {
    await this.tx('readwrite', (s) => s.put(blob, id));
  }
  async get(id: string) {
    return (await this.tx<Blob | undefined>('readonly', (s) => s.get(id))) ?? undefined;
  }
  async delete(id: string) {
    const existing = await this.get(id);
    if (!existing) throw new Error('File tidak ditemukan di penyimpanan');
    await this.tx('readwrite', (s) => s.delete(id));
  }
}
