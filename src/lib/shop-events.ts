"use client";

import { api } from "./api/client";
import { viewerDeviceId } from "./listing-view";

const seenViews = new Set<string>();

/** Shop page view (once per session; the server keeps one per viewer per day) or a call / WhatsApp tap. */
export function reportShopEvent(shopId: string, kind: "view" | "call" | "whatsapp") {
  if (!shopId) return;
  if (kind === "view") {
    if (seenViews.has(shopId)) return;
    seenViews.add(shopId);
  }
  void api(`/api/shops/${encodeURIComponent(shopId)}/events`, {
    method: "POST",
    json: { kind, device: viewerDeviceId() },
  });
}
