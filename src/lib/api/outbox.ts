import { api } from "./client";

const KEY = "konshu-outbox-v1";

export type OutboxOp =
  | { id: string; kind: "putListing"; listingId: string; body: unknown; attempts: number }
  | { id: string; kind: "patchListing"; listingId: string; body: unknown; attempts: number }
  | { id: string; kind: "putShop"; shopId: string; body: unknown; attempts: number };

export type OutboxInput =
  | { kind: "putListing"; listingId: string; body: unknown }
  | { kind: "patchListing"; listingId: string; body: unknown }
  | { kind: "putShop"; shopId: string; body: unknown };

type Listener = (op: OutboxOp, data: unknown) => void;

let listener: Listener | null = null;
let flushing = false;
let timer: number | null = null;

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

async function send(op: OutboxOp) {
  if (op.kind === "putListing") {
    return api(`/api/listings/${encodeURIComponent(op.listingId)}`, { method: "PUT", json: op.body });
  }
  if (op.kind === "patchListing") {
    return api(`/api/listings/${encodeURIComponent(op.listingId)}`, { method: "PATCH", json: op.body });
  }
  return api(`/api/shops/${encodeURIComponent(op.shopId)}`, { method: "PUT", json: op.body });
}

export async function flushOutbox() {
  if (flushing || typeof window === "undefined") return;
  flushing = true;
  try {
    const keep: OutboxOp[] = [];
    for (const op of load()) {
      const res = await send(op);
      if (res.ok) {
        listener?.(op, res.data);
        continue;
      }
      const attempts = op.attempts + 1;
      if (attempts >= 20) {
        console.warn("outbox drop", op.kind, op.id);
        continue;
      }
      keep.push({ ...op, attempts });
    }
    save(keep);
  } finally {
    flushing = false;
  }
}

export function enqueue(op: OutboxInput) {
  const next = load();
  next.push({ ...op, id: crypto.randomUUID(), attempts: 0 } as OutboxOp);
  save(next);
  void flushOutbox();
}

export function startOutbox(onDone: Listener) {
  listener = onDone;
  const run = () => {
    if (load().length) void flushOutbox();
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
