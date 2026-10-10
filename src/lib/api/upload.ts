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

/** Local blob:/data: URL → server URL, so a file already sent this session is never sent again. */
const uploaded = new Map<string, string>();

function isLocal(url: string | undefined): url is string {
  return Boolean(url && (url.startsWith("blob:") || url.startsWith("data:")));
}

/** The local file behind a URL is gone (e.g. a revoked blob from an earlier item). Not a network error. */
export class LocalMediaGone extends Error {
  constructor() {
    super("local-media-gone");
  }
}

/** Шаг 4 in-session upload. Shops stay on this path until Шаг 11. */
export async function materializeMedia(url: string, kind: Kind, durationSec?: number): Promise<string> {
  if (!isLocal(url)) return url;
  const known = uploaded.get(url);
  if (known) return known;
  let blob: Blob;
  try {
    blob = await fetch(url).then((res) => res.blob());
  } catch {
    throw new LocalMediaGone();
  }
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
  uploaded.set(url, done.data.url);
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

async function mediaField(
  url: string | undefined,
  kind: Kind,
  durationSec?: number,
  fallback?: () => Promise<string | undefined>,
): Promise<string | undefined> {
  if (!url) return url;
  try {
    return await materializeMedia(url, kind, durationSec);
  } catch (err) {
    // A stale local file on an older item must not block saving the new one:
    // keep what the server already has for that field.
    if (err instanceof LocalMediaGone && fallback) return fallback();
    throw err;
  }
}

export async function materializeShop(shop: Shop): Promise<Shop> {
  let server: Promise<Shop | null> | null = null;
  const serverShop = () => {
    server ??= api<{ shop?: Shop }>(`/api/shops/${encodeURIComponent(shop.id)}`)
      .then((res) => res.data?.shop ?? null)
      .catch(() => null);
    return server;
  };
  const keepServer = (pick: (s: Shop) => string | undefined) => async () => {
    const remote = await serverShop();
    const value = remote ? pick(remote) : undefined;
    return isLocal(value) ? undefined : value;
  };
  const products: ShopProduct[] = [];
  for (const product of shop.products ?? []) {
    const fromServer = (field: "photo" | "videoUrl") =>
      keepServer((s) => s.products?.find((row) => row.id === product.id)?.[field]);
    products.push({
      ...product,
      photo: await mediaField(product.photo, "photo", undefined, fromServer("photo")),
      videoUrl: await mediaField(product.videoUrl, "video", undefined, fromServer("videoUrl")),
    });
  }
  return {
    ...shop,
    coverUrl: await mediaField(shop.coverUrl, "poster", undefined, keepServer((s) => s.coverUrl)),
    videoUrl: await mediaField(shop.videoUrl, "video", undefined, keepServer((s) => s.videoUrl)),
    products,
  };
}
