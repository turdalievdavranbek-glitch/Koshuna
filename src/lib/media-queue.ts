import { heldBlob } from "./blob-media";
import { compressImage } from "./media-compress";

export type MediaKind = "photo" | "poster" | "video" | "voice";

export class UploadFatal extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.name = "UploadFatal";
    this.code = code;
  }
}

type MediaRecord = {
  key: string;
  blob: Blob;
  kind: MediaKind;
  mime: string;
  size: number;
  durationSec?: number;
  uploadId?: string;
  received?: number;
  url?: string;
  createdAt: number;
};

const DB_NAME = "konshu-media";
const STORE = "items";
const PREFIX = "kmedia:";
const memory = new Map<string, MediaRecord>();
const displayUrls = new Map<string, string>();
let warned = false;
let chain: Promise<unknown> = Promise.resolve();
let smallChunks = false;

const FALLBACK_MIME: Record<MediaKind, string> = {
  photo: "image/jpeg",
  poster: "image/jpeg",
  video: "video/mp4",
  voice: "audio/webm",
};

function warnOnce(err: unknown) {
  if (warned) return;
  warned = true;
  console.warn("media queue persistence unavailable", err);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoff(attempt: number) {
  return [2000, 5000, 10000, 20000, 30000][Math.min(attempt, 4)] ?? 30000;
}

function baseMime(mime: string, kind: MediaKind) {
  const raw = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  return raw || FALLBACK_MIME[kind];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("no-idb"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbOp<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = run(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

async function persist(record: MediaRecord) {
  memory.set(record.key, record);
  try {
    await idbOp("readwrite", (store) => store.put(record));
  } catch (err) {
    warnOnce(err);
  }
}

async function readRecord(key: string): Promise<MediaRecord | undefined> {
  const cached = memory.get(key);
  if (cached) return cached;
  try {
    const row = await idbOp<MediaRecord | undefined>("readonly", (store) => store.get(key));
    if (row) memory.set(key, row);
    return row;
  } catch (err) {
    warnOnce(err);
    return undefined;
  }
}

async function deleteRecord(key: string) {
  memory.delete(key);
  const url = displayUrls.get(key);
  if (url) {
    URL.revokeObjectURL(url);
    displayUrls.delete(key);
  }
  try {
    await idbOp("readwrite", (store) => store.delete(key));
  } catch {
    /* memory copy is already gone */
  }
}

async function allRecords(): Promise<MediaRecord[]> {
  try {
    const rows = await idbOp<MediaRecord[]>("readonly", (store) => store.getAll());
    return rows ?? [];
  } catch (err) {
    warnOnce(err);
    return [...memory.values()];
  }
}

type NetInfo = { effectiveType?: string; saveData?: boolean };

function wantedChunk(serverChunk: number) {
  const nav = typeof navigator === "undefined" ? undefined : (navigator as Navigator & { connection?: NetInfo });
  const conn = nav?.connection;
  const slow =
    smallChunks ||
    Boolean(conn?.saveData) ||
    conn?.effectiveType === "slow-2g" ||
    conn?.effectiveType === "2g" ||
    conn?.effectiveType === "3g";
  const want = slow ? 512 * 1024 : 1024 * 1024;
  return Math.max(1, Math.min(want, serverChunk || want));
}

function waitOnline(): Promise<void> {
  if (navigator.onLine) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      window.clearInterval(timer);
      window.removeEventListener("online", done);
      resolve();
    };
    const timer = window.setInterval(() => {
      if (navigator.onLine) done();
    }, 15_000);
    window.addEventListener("online", done);
  });
}

async function waitForAuth() {
  const mod = await import("@/lib/store");
  const serial = mod.authSerialNow();
  await mod.waitAuthReady();
  if (mod.authSerialNow() === serial) await sleep(1500);
}

export type HttpResult = {
  ok: boolean;
  status: number;
  data: { received?: number; error?: string; uploadId?: string; chunkSize?: number; url?: string; status?: string };
  error?: string;
  retryAfter?: number;
};

function retryAfterSeconds(header: string | null): number | undefined {
  if (!header) return undefined;
  const n = Number(header);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(60, Math.max(0, n));
}

async function request(url: string, init: RequestInit): Promise<HttpResult> {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = window.setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, 60_000);
  try {
    const res = await fetch(url, { ...init, credentials: "same-origin", signal: ctrl.signal });
    const data = (await res.json().catch(() => ({}))) as HttpResult["data"];
    const retryAfter = retryAfterSeconds(res.headers.get("retry-after"));
    if (!res.ok) return { ok: false, status: res.status, data, error: data?.error || String(res.status), retryAfter };
    return { ok: true, status: res.status, data, retryAfter };
  } catch {
    if (timedOut) smallChunks = true;
    return { ok: false, status: 0, data: {}, error: timedOut ? "timeout" : "network" };
  } finally {
    window.clearTimeout(timer);
  }
}

export async function withRetry(run: () => Promise<HttpResult>, returnStatuses: number[], onWait?: (waiting: boolean) => void): Promise<HttpResult> {
  let netAttempt = 0;
  let serverFails = 0;
  for (;;) {
    const res = await run();
    if (res.ok) return res;
    if (returnStatuses.includes(res.status)) return res;
    if (res.status === 401) {
      onWait?.(false);
      await waitForAuth();
      continue;
    }
    if (res.status === 408 || res.status === 429) {
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      if (offline) {
        onWait?.(true);
        await waitOnline();
        onWait?.(false);
      } else {
        await sleep(res.retryAfter != null ? res.retryAfter * 1000 : backoff(netAttempt));
        netAttempt += 1;
      }
      continue;
    }
    if (res.status >= 400 && res.status <= 499) {
      throw new UploadFatal(res.error || res.data?.error || String(res.status));
    }
    if (res.status >= 500) {
      serverFails += 1;
      if (serverFails >= 10) throw new UploadFatal("server");
      await sleep(backoff(serverFails - 1));
      continue;
    }
    serverFails = 0;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      onWait?.(true);
      await waitOnline();
      onWait?.(false);
    } else {
      await sleep(backoff(netAttempt));
      netAttempt += 1;
    }
  }
}

export type UploadRequest = (url: string, init: RequestInit) => Promise<HttpResult>;

/** One upload from create through complete. A 404 on a chunk or complete restarts the session once. */
export async function uploadSession(args: {
  bytes: Uint8Array;
  meta: { kind: MediaKind; mime: string; size: number; durationSec?: number };
  request: UploadRequest;
  uploadId?: string;
  offset?: number;
  serverChunk?: number;
  remember: (patch: { uploadId?: string; received?: number; url?: string }) => Promise<void> | void;
  onBytes?: (sent: number) => void;
  onWait?: (waiting: boolean) => void;
}): Promise<string> {
  let uploadId = args.uploadId;
  let offset = args.offset ?? 0;
  let serverChunk = args.serverChunk ?? 2_097_152;
  let restarts = 0;

  const restart = async () => {
    restarts += 1;
    if (restarts > 1) throw new UploadFatal("expired");
    uploadId = undefined;
    offset = 0;
    await args.remember({ uploadId: undefined, received: 0 });
  };

  for (;;) {
    if (!uploadId) {
      const created = await withRetry(
        () =>
          args.request("/api/uploads", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              kind: args.meta.kind,
              mime: args.meta.mime,
              size: args.meta.size,
              ...(args.meta.durationSec != null ? { durationSec: args.meta.durationSec } : {}),
            }),
          }),
        [],
        args.onWait,
      );
      if (!created.ok || !created.data.uploadId) throw new UploadFatal(created.error || "upload");
      uploadId = created.data.uploadId;
      serverChunk = created.data.chunkSize || serverChunk;
      offset = 0;
      await args.remember({ uploadId, received: 0 });
    }

    let expired = false;
    while (offset < args.bytes.length) {
      const size = wantedChunk(serverChunk);
      const end = Math.min(offset + size, args.bytes.length);
      const chunk = args.bytes.slice(offset, end);
      const put = await withRetry(
        () =>
          args.request(`/api/uploads/${uploadId}?offset=${offset}`, {
            method: "PUT",
            headers: { "content-type": "application/octet-stream" },
            body: chunk,
          }),
        [409, 404],
        args.onWait,
      );
      if (put.status === 404) {
        await restart();
        expired = true;
        break;
      }
      if (put.status === 409 && typeof put.data.received === "number") {
        offset = put.data.received;
        await args.remember({ received: offset });
        args.onBytes?.(Math.min(offset, args.meta.size));
        continue;
      }
      if (!put.ok) throw new UploadFatal(put.error || "chunk");
      offset = typeof put.data.received === "number" ? put.data.received : end;
      await args.remember({ received: offset });
      args.onBytes?.(Math.min(offset, args.meta.size));
    }
    if (expired) continue;

    const done = await withRetry(
      () =>
        args.request(`/api/uploads/${uploadId}/complete`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        }),
      [404],
      args.onWait,
    );
    if (done.status === 404) {
      await restart();
      continue;
    }
    if (!done.ok || !done.data.url) throw new UploadFatal(done.error || "complete");
    await args.remember({ url: done.data.url });
    args.onBytes?.(args.meta.size);
    return done.data.url;
  }
}

function oneAtATime<T>(run: () => Promise<T>): Promise<T> {
  const job = chain.then(run, run);
  chain = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}

async function loadBlob(src: string, held: Blob | undefined): Promise<Blob> {
  if (held) return held;
  const res = await fetch(src);
  return res.blob();
}

export function stashMedia(src: string, kind: MediaKind, durationSec?: number): Promise<string> {
  if (!src || (!src.startsWith("blob:") && !src.startsWith("data:"))) return Promise.resolve(src);
  const held = src.startsWith("blob:") ? heldBlob(src) : undefined;
  return (async () => {
    const raw = await loadBlob(src, held);
    const blob = kind === "photo" || kind === "poster" ? await compressImage(raw, kind === "poster" ? 720 : 1600, kind === "poster" ? 0.72 : 0.8) : raw;
    const key = crypto.randomUUID();
    const record: MediaRecord = {
      key,
      blob,
      kind,
      mime: baseMime(blob.type || raw.type, kind),
      size: blob.size,
      durationSec: durationSec && durationSec > 0 ? durationSec : undefined,
      createdAt: Date.now(),
    };
    await persist(record);
    return `${PREFIX}${key}`;
  })();
}

async function uploadRecord(record: MediaRecord, onBytes?: (sent: number) => void, onWait?: (waiting: boolean) => void): Promise<string> {
  let current = record;
  const remember = async (patch: Partial<MediaRecord>) => {
    current = { ...current, ...patch };
    await persist(current);
  };

  if (current.url) {
    onBytes?.(current.size);
    return current.url;
  }

  const bytes = new Uint8Array(await current.blob.arrayBuffer());
  let uploadId = current.uploadId;
  let offset = current.received ?? 0;
  const serverChunk = 2_097_152;

  if (uploadId) {
    const probe = await withRetry(
      () => request(`/api/uploads/${uploadId}`, { method: "GET" }),
      [404],
      onWait,
    );
    if (probe.status === 404 || (probe.ok && probe.data.status && probe.data.status !== "uploading")) {
      uploadId = undefined;
      offset = 0;
      await remember({ uploadId: undefined, received: 0 });
    } else if (probe.ok && typeof probe.data.received === "number") {
      offset = probe.data.received;
      await remember({ received: offset });
    }
  }

  return uploadSession({
    bytes,
    meta: { kind: current.kind, mime: current.mime, size: current.size, durationSec: current.durationSec },
    request,
    uploadId,
    offset,
    serverChunk,
    remember,
    onBytes,
    onWait,
  });
}

export function uploadRef(ref: string, onBytes?: (sent: number) => void, onWait?: (waiting: boolean) => void): Promise<string> {
  if (!ref.startsWith(PREFIX)) return Promise.resolve(ref);
  return oneAtATime(async () => {
    const record = await readRecord(ref.slice(PREFIX.length));
    if (!record) throw new UploadFatal("missing");
    if (record.url) {
      onBytes?.(record.size);
      return record.url;
    }
    return uploadRecord(record, onBytes, onWait);
  });
}

export function collectRefKeys(value: unknown, into: Set<string>) {
  if (typeof value === "string") {
    if (value.startsWith(PREFIX)) into.add(value.slice(PREFIX.length));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectRefKeys(item, into);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectRefKeys(item, into);
  }
}

function collectRefs(value: unknown, into: string[]) {
  if (typeof value === "string") {
    if (value.startsWith(PREFIX) && !into.includes(value)) into.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, into);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectRefs(item, into);
  }
}

async function replaceRefs(value: unknown, urls: Map<string, string>): Promise<unknown> {
  if (typeof value === "string") return urls.get(value) ?? value;
  if (Array.isArray(value)) {
    const next = [];
    for (const item of value) next.push(await replaceRefs(item, urls));
    return next;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = await replaceRefs(item, urls);
    return out;
  }
  return value;
}

export async function resolveRefs(
  body: unknown,
  onProgress?: (progress: { sent: number; total: number }) => void,
  onWait?: (waiting: boolean) => void,
): Promise<unknown> {
  const refs: string[] = [];
  collectRefs(body, refs);
  const records = await Promise.all(refs.map((ref) => readRecord(ref.slice(PREFIX.length))));
  const total = records.reduce((sum, row) => sum + (row?.size ?? 0), 0);
  const urls = new Map<string, string>();
  let sentBase = 0;
  for (let i = 0; i < refs.length; i += 1) {
    const ref = refs[i];
    const size = records[i]?.size ?? 0;
    const url = await uploadRef(ref, (sent) => onProgress?.({ sent: sentBase + Math.min(sent, size), total }), onWait);
    urls.set(ref, url);
    sentBase += size;
    onProgress?.({ sent: sentBase, total });
  }
  return replaceRefs(body, urls);
}

export async function releaseRefs(body: unknown) {
  const keys = new Set<string>();
  collectRefKeys(body, keys);
  for (const key of keys) await deleteRecord(key);
}

export async function displayUrl(ref: string): Promise<string> {
  if (!ref.startsWith(PREFIX)) return ref;
  const key = ref.slice(PREFIX.length);
  const cached = displayUrls.get(key);
  if (cached) return cached;
  const record = await readRecord(key);
  if (!record) return ref;
  const url = URL.createObjectURL(record.blob);
  displayUrls.set(key, url);
  return url;
}

export async function hydrateRefs<T>(value: T): Promise<T> {
  if (typeof value === "string") {
    if (value.startsWith(PREFIX)) return (await displayUrl(value)) as T;
    return value;
  }
  if (Array.isArray(value)) {
    const next = [];
    for (const item of value) next.push(await hydrateRefs(item));
    return next as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) out[key] = await hydrateRefs(item);
    return out as T;
  }
  return value;
}

export async function sweepOrphans(liveKeys: Set<string>) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const row of await allRecords()) {
    if (liveKeys.has(row.key)) continue;
    if (row.createdAt < cutoff) await deleteRecord(row.key);
  }
}
