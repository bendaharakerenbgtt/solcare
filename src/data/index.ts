import type { Repo } from './repo';
import { LocalRepo } from './local/localRepo';
import { IndexedDBBlobStore, LocalStorageKV } from './local/storage';

function createRepo(): Repo {
  const mode = import.meta.env.VITE_DATA_MODE ?? 'local';
  if (mode === 'supabase') {
    // Supabase repository is not implemented yet (see docs/SUPABASE.md).
    console.warn('VITE_DATA_MODE=supabase belum tersedia, menggunakan mode lokal (demo).');
  }
  return new LocalRepo(new LocalStorageKV(), new IndexedDBBlobStore());
}

export const repo: Repo = createRepo();
