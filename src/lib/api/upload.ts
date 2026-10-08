import type { Listing, Shop, ShopProduct } from "@/lib/types";
import { stashMedia, type MediaKind } from "@/lib/media-queue";
import { api } from "./client";

type Kind = MediaKind;

const MIME: Record<Kind, string> = {
  photo: "image/jpeg",
  poster: "image/jpeg",
  video: "video/mp4",
  voice: "audio/webm",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Шаг 4 in-session upload. Shops stay on this path until Шаг 11. */
export async function materializeMedia(url: string, kind: Kind, durationSec?: number): Promise<string> {
  if (!url || (!url.startsWith("blob:") && !url.startsWith("data:"))) return url;
  const blob = await fetch(url).then((res) => res.blob());
  const mime = blob.type || MIME[kind];
  const created = await api<{ uploadId: string; chunkSize: number }>("/api/uploads", {
    method: "POST",
    json: { kind, mime, size: blob.size, durationSec },
  });
  if (!created.ok || !created.data?.uploadId) throw new Error(created.error || "upload");
  const { uploadId, chunkSize } = created.data;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let offset = 0;
  while (offset < bytes.length) {
    const end = Math.min(offset + (chunkSize || 2_097_152), bytes.length);
    const chunk = bytes.slice(offset, end);
    let attempt = 0;
    let advanced = false;
    while (!advanced) {
      const res = await fetch(`/api/uploads/${uploadId}?offset=${offset}`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/octet-stream" },
        body: chunk,
      });
      const data = (await res.json().catch(() => ({}))) as { received?: number; error?: string };
      if (res.status === 409 && typeof data.received === "number") {
        offset = data.received;
        advanced = true;
        break;
      }
      if (!res.ok) {
        attempt += 1;
        if (attempt >= 3) throw new Error(data.error || "chunk");
        await sleep([1000, 3000, 9000][attempt - 1] ?? 9000);
        continue;
      }
      offset = typeof data.received === "number" ? data.received : end;
      advanced = true;
    }
  }
  const done = await api<{ mediaId: string; url: string }>(`/api/uploads/${uploadId}/complete`, {
    method: "POST",
    json: {},
  });
  if (!done.ok || !done.data?.url) throw new Error(done.error || "complete");
  return done.data.url;
}

export function stashListing(listing: Listing, videoSec?: number): Promise<Listing> {
  const photos = listing.photos.map((src, i) => stashMedia(src, listing.videoUrl && i === 0 ? "poster" : "photo"));
  const videoUrl = listing.videoUrl ? stashMedia(listing.videoUrl, "video", videoSec) : Promise.resolve(listing.videoUrl);
  const voiceUrl = listing.voiceUrl ? stashMedia(listing.voiceUrl, "voice", listing.voiceSec) : Promise.resolve(listing.voiceUrl);
  return Promise.all([Promise.all(photos), videoUrl, voiceUrl]).then(([nextPhotos, nextVideo, nextVoice]) => ({
    ...listing,
    photos: nextPhotos,
    videoUrl: nextVideo,
    voiceUrl: nextVoice,
  }));
}

async function mediaField(url: string | undefined, kind: Kind, durationSec?: number): Promise<string | undefined> {
  if (!url) return url;
  return materializeMedia(url, kind, durationSec);
}

export async function materializeShop(shop: Shop): Promise<Shop> {
  const products: ShopProduct[] = [];
  for (const product of shop.products ?? []) {
    products.push({
      ...product,
      photo: await mediaField(product.photo, "photo"),
      videoUrl: await mediaField(product.videoUrl, "video"),
    });
  }
  return {
    ...shop,
    coverUrl: await mediaField(shop.coverUrl, "poster"),
    videoUrl: await mediaField(shop.videoUrl, "video"),
    products,
  };
}
