import { api } from "./client";
import { releaseRefs, resolveRefs, UploadFatal } from "@/lib/media-queue";

const KEY = "konshu-outbox-v1";

type OutboxBase = { id: string; attempts: number; failed?: boolean; error?: string };

export type OutboxOp =
  | (OutboxBase & { kind: "putListing"; listingId: string; body: unknown })
  | (OutboxBase & { kind: "patchListing"; listingId: string; body: unknown })
  | (OutboxBase & { kind: "putShop"; shopId: string; body: unknown });

export type OutboxInput =
  | { kind: "putListing"; listingId: string; body: unknown; failed?: boolean; error?: string }
  | { kind: "patchListing"; listingId: string; body: unknown; failed?: boolean; error?: string }
  | { kind: "putShop"; shopId: string; body: unknown; failed?: boolean; error?: string };

export type OutboxSnapshot = {
  pending: number;
  sending: { sent: number; total: number } | null;
  waitingNetwork: boolean;
  failed: { id: string; error: string; kind: string }[];
};

type Listener = (op: OutboxOp, data: unknown) => void;

let listener: Listener | null = null;
let flushing = false;
let timer: number | null = null;
let sending: { sent: number; total: number } | null = null;
let waitingNetwork = false;
let lastProgressAt = 0;
let progressTimer: number | null = null;

const subscribers = new Set<(snap: OutboxSnapshot) => void>();

function load(): OutboxOp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as OutboxOp[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(ops: OutboxOp[]) {
  localStorage.setItem(KEY, JSON.stringify(ops));
}

function snapshot(): OutboxSnapshot {
  const ops = load();
  return {
    pending: ops.filter((op) => !op.failed).length,
    sending,
    waitingNetwork,
    failed: ops.filter((op) => op.failed).map((op) => ({ id: op.id, error: op.error || "network", kind: op.kind })),
  };
}

function emit(progress = false) {
  if (progress) {
    const now = Date.now();
    if (now - lastProgressAt < 250) {
      if (progressTimer == null && typeof window !== "undefined") {
        progressTimer = window.setTimeout(() => {
          progressTimer = null;
          lastProgressAt = Date.now();
          const snap = snapshot();
          for (const fn of subscribers) fn(snap);
        }, 250 - (now - lastProgressAt));
      }
      return;
    }
    lastProgressAt = now;
  }
  const snap = snapshot();
  for (const fn of subscribers) fn(snap);
}

function targetOf(op: OutboxOp) {
  return op.kind === "putShop" ? `shop:${op.shopId}` : `listing:${op.listingId}`;
}

async function send(op: OutboxOp) {
  if (op.kind === "putListing") {
    return api(`/api/listings/${encodeURIComponent(op.listingId)}`, { method: "PUT", json: op.body });
  }
  if (op.kind === "patchListing") {
    return api(`/api/listings/${encodeURIComponent(op.listingId)}`, { method: "PATCH", json: op.body });
  }
  return api(`/api/shops/${encodeURIComponent(op.shopId)}`, { method: "PUT", json: op.body });
}

function fatalStatus(status: number) {
  return status === 400 || status === 403 || status === 404 || status === 409;
}

export async function flushOutbox() {
  if (flushing || typeof window === "undefined") return;
  flushing = true;
  try {
    const ops = load();
    const keep: OutboxOp[] = [];
    const blocked = new Set<string>();
    for (const op of ops) {
      const target = targetOf(op);
      if (op.failed || blocked.has(target)) {
        blocked.add(target);
        keep.push(op);
        continue;
      }
      const originalBody = op.body;
      let body = op.body;
      try {
        sending = { sent: 0, total: 0 };
        emit(true);
        body = await resolveRefs(
          op.body,
          (progress) => {
            sending = progress;
            emit(true);
          },
          (waiting) => {
            waitingNetwork = waiting;
            emit();
          },
        );
      } catch (err) {
        sending = null;
        if (err instanceof UploadFatal) {
          keep.push({ ...op, failed: true, error: err.code });
          blocked.add(target);
        } else {
          waitingNetwork = navigator.onLine === false;
          keep.push(op);
          blocked.add(target);
        }
        continue;
      }
      const resolved = { ...op, body };
      const fresh = load();
      const known = new Set(ops.map((item) => item.id));
      const added = fresh.filter((item) => !known.has(item.id));
      save([...keep, resolved, ...ops.slice(ops.indexOf(op) + 1), ...added]);
      const res = await send(resolved);
      sending = null;
      if (res.ok) {
        waitingNetwork = false;
        await releaseRefs(originalBody);
        listener?.(resolved, res.data);
        continue;
      }
      if (res.error === "daily-limit") {
        listener?.(resolved, { limit: true });
        keep.push({ ...resolved, failed: true, error: "daily-limit" });
        blocked.add(target);
        continue;
      }
      if (res.status === 0 || !fatalStatus(res.status)) {
        if (res.status >= 500) {
          const attempts = op.attempts + 1;
          if (attempts >= 20) keep.push({ ...resolved, attempts, failed: true, error: res.error || "server" });
          else keep.push({ ...resolved, attempts });
        } else {
          waitingNetwork = res.status === 0 || navigator.onLine === false;
          keep.push(resolved);
        }
        blocked.add(target);
        continue;
      }
      keep.push({ ...resolved, failed: true, error: res.error || String(res.status) });
      blocked.add(target);
    }
    const fresh = load();
    const known = new Set(ops.map((item) => item.id));
    for (const item of fresh) {
      if (!known.has(item.id) && !keep.some((op) => op.id === item.id)) keep.push(item);
    }
    save(keep);
    if (!keep.some((op) => !op.failed)) waitingNetwork = false;
    emit();
    const followUp = keep.some((op) => !op.failed && !known.has(op.id));
    if (followUp) queueMicrotask(() => void flushOutbox());
  } finally {
    flushing = false;
  }
}

export function enqueue(op: OutboxInput) {
  const next = load();
  next.push({ ...op, id: crypto.randomUUID(), attempts: 0 } as OutboxOp);
  save(next);
  emit();
  if (!op.failed) void flushOutbox();
}

export function subscribeOutbox(fn: (snap: OutboxSnapshot) => void) {
  subscribers.add(fn);
  fn(snapshot());
  return () => {
    subscribers.delete(fn);
  };
}

export function retryOp(id: string) {
  const next = load().map((op) => (op.id === id ? { ...op, failed: false, error: undefined, attempts: 0 } : op));
  save(next);
  emit();
  void flushOutbox();
}

export function discardOp(id: string) {
  const ops = load();
  const op = ops.find((item) => item.id === id);
  if (!op) return;
  save(ops.filter((item) => item.id !== id));
  void releaseRefs(op.body).finally(() => {
    listener?.(op, { discarded: true });
    emit();
  });
}

export function pendingOps(): OutboxOp[] {
  return load();
}

export function startOutbox(onDone: Listener) {
  listener = onDone;
  const run = () => {
    if (load().some((op) => !op.failed)) void flushOutbox();
  };
  window.addEventListener("online", run);
  timer = window.setInterval(run, 30_000);
  void flushOutbox();
  return () => {
    window.removeEventListener("online", run);
    if (timer != null) window.clearInterval(timer);
    if (listener === onDone) listener = null;
  };
}
