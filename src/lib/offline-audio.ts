/**
 * Écoute hors ligne protégée : l'audio est chiffré (AES-GCM, clé non
 * extractible propre à l'appareil) et stocké en morceaux dans IndexedDB.
 * Aucun fichier en clair n'est écrit (ni Cache Storage, ni système de fichiers).
 */
export const OFFLINE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CHUNK_BYTES = 4 * 1024 * 1024;
const DB_NAME = "indi-offline-audio";

export type OfflineMeta = {
  id: string;
  title: string;
  mime: string;
  size: number;
  chunks: number;
  savedAt: number;
  expiresAt: number;
};

export function isExpired(meta: Pick<OfflineMeta, "expiresAt">, now = Date.now()) {
  return now >= meta.expiresAt;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore("keys");
      db.createObjectStore("meta", { keyPath: "id" });
      db.createObjectStore("chunks");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const r = fn(t.objectStore(store));
        t.oncomplete = () => { db.close(); resolve(r ? (r.result as T) : (undefined as T)); };
        t.onerror = () => { db.close(); reject(t.error); };
      }),
  );
}

async function deviceKey(): Promise<CryptoKey> {
  const existing = await tx<CryptoKey | undefined>("keys", "readonly", (s) => s.get("device"));
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await tx("keys", "readwrite", (s) => s.put(key, "device"));
  return key;
}

export async function listOffline(): Promise<OfflineMeta[]> {
  const all = await tx<OfflineMeta[]>("meta", "readonly", (s) => s.getAll());
  const live: OfflineMeta[] = [];
  for (const m of all) {
    if (isExpired(m)) await removeOffline(m.id);
    else live.push(m);
  }
  return live;
}

export async function getOffline(id: string): Promise<OfflineMeta | undefined> {
  const m = await tx<OfflineMeta | undefined>("meta", "readonly", (s) => s.get(id));
  if (m && isExpired(m)) { await removeOffline(id); return undefined; }
  return m;
}

export async function removeOffline(id: string) {
  const m = await tx<OfflineMeta | undefined>("meta", "readonly", (s) => s.get(id));
  const n = m?.chunks ?? 0;
  await tx("chunks", "readwrite", (s) => { for (let i = 0; i < Math.max(n, 1000); i++) s.delete(`${id}:${i}`); });
  await tx("meta", "readwrite", (s) => s.delete(id));
}

export async function renewOffline(id: string, sourceUrl: string) {
  const m = await getOffline(id);
  if (!m) throw new Error("not-found");
  const res = await fetch(sourceUrl, { method: "HEAD", cache: "no-store" });
  if (!res.ok) throw new Error("source-unavailable");
  const now = Date.now();
  await tx("meta", "readwrite", (s) => s.put({ ...m, savedAt: now, expiresAt: now + OFFLINE_TTL_MS }));
}

export async function saveOffline(
  ep: { id: string; title: string; url: string; mime: string },
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
) {
  try { await navigator.storage?.persist?.(); } catch { /* facultatif */ }
  const key = await deviceKey();
  await removeOffline(ep.id);
  // Direct : la source renvoie Access-Control-Allow-Origin: *
  const res = await fetch(ep.url, { cache: "no-store", signal });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const total = Number(res.headers.get("content-length") ?? 0);
  const reader = res.body.getReader();
  let buf = new Uint8Array(CHUNK_BYTES);
  let fill = 0, done = 0, index = 0;
  const flush = async () => {
    if (!fill) return;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, buf.subarray(0, fill));
    const i = index++;
    await tx("chunks", "readwrite", (s) => s.put({ iv, data }, `${ep.id}:${i}`));
    buf = new Uint8Array(CHUNK_BYTES);
    fill = 0;
  };
  try {
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      let off = 0;
      while (off < value.length) {
        const n = Math.min(CHUNK_BYTES - fill, value.length - off);
        buf.set(value.subarray(off, off + n), fill);
        fill += n; off += n; done += n;
        if (fill === CHUNK_BYTES) await flush();
      }
      onProgress(done, total);
    }
    await flush();
  } catch (e) {
    await removeOffline(ep.id);
    throw e;
  }
  const now = Date.now();
  const meta: OfflineMeta = { id: ep.id, title: ep.title, mime: ep.mime, size: done, chunks: index, savedAt: now, expiresAt: now + OFFLINE_TTL_MS };
  await tx("meta", "readwrite", (s) => s.put(meta));
  return meta;
}

/** Déchiffre en mémoire et renvoie une URL blob: à révoquer par l'appelant. */
export async function openOfflineUrl(id: string): Promise<string> {
  const m = await getOffline(id);
  if (!m) throw new Error("not-found");
  const key = await deviceKey();
  const parts: ArrayBuffer[] = [];
  for (let i = 0; i < m.chunks; i++) {
    const c = await tx<{ iv: Uint8Array<ArrayBuffer>; data: ArrayBuffer } | undefined>("chunks", "readonly", (s) => s.get(`${id}:${i}`));
    if (!c) throw new Error("corrupt");
    parts.push(await crypto.subtle.decrypt({ name: "AES-GCM", iv: c.iv }, key, c.data));
  }
  return URL.createObjectURL(new Blob(parts, { type: m.mime }));
}
