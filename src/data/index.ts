import type { Repo } from './repo';
import { LocalRepo } from './local/localRepo';
import { SheetsRepo } from './sheets/sheetsRepo';
import { IndexedDBBlobStore, LocalStorageKV } from './local/storage';

function createRepo(): Repo {
  const scriptUrl =
    import.meta.env.VITE_GOOGLE_SCRIPT_URL ||
    'https://script.google.com/macros/s/AKfycbxgFLmYNXb8X1EN_20wEC8j7NsES9F7DpDMO2-wVlMEq1e9RrCX3L2Rxmcqr_9KPqAu/exec';

  const kv = new LocalStorageKV();
  const blobs = new IndexedDBBlobStore();

  if (scriptUrl) {
    return new SheetsRepo(kv, blobs, scriptUrl);
  }

  return new LocalRepo(kv, blobs);
}

export const repo: Repo = createRepo();
