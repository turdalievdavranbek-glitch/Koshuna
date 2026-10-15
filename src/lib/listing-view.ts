"use client";

import { api } from "./api/client";

const DEVICE_KEY = "konshu.deviceId";
const sent = new Map<string, Promise<number | null>>();

/** Anonymous id for guests, so a guest is counted once a day like a signed-in person. */
function deviceId(): string | undefined {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

/** Tell the server someone opened the listing. Once per page session; the server keeps one per day. Returns the new count. */
export function reportListingView(listingId: string): Promise<number | null> {
  const hit = sent.get(listingId);
  if (hit) return hit;
  const job = api<{ views: number }>(`/api/listings/${encodeURIComponent(listingId)}/view`, {
    method: "POST",
    json: { device: deviceId() },
  }).then((res) => (res.ok && typeof res.data?.views === "number" ? res.data.views : null));
  sent.set(listingId, job);
  return job;
}
