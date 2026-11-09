import { NextResponse } from "next/server";
import { pickPriceFromText } from "@/lib/photo-price";
import { shopAiConfigured } from "@/lib/shop-ai";
import { requireUser } from "@/server/http";
import { limitOr429 } from "@/server/rate-limit";

/** ~1.5 MB data URL; the client sends a 480 px JPEG (well under 100 KB). */
const MAX_IMAGE_CHARS = 1_500_000;

export const runtime = "nodejs";

async function cloudPrice(image: string): Promise<{ price?: number; raw?: string } | null> {
  const url = process.env.SHOP_AI_URL;
  const key = process.env.SHOP_AI_KEY;
  if (!url) return null;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(key ? { authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({ image, task: "price" }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { price?: number; raw?: string; text?: string };
  const price = data.price ?? pickPriceFromText(data.raw || data.text || "");
  if (price == null) return null;
  return { price, raw: data.raw || data.text };
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const limited = limitOr429(`ai-price:${user.id}`, 20, 10 * 60_000);
  if (limited) return limited;
  if (Number(req.headers.get("content-length") || 0) > MAX_IMAGE_CHARS + 4096) {
    return NextResponse.json({ ok: false, error: "too-large" }, { status: 413 });
  }
  let body: { image?: string; local?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-json" }, { status: 400 });
  }
  if (body.image && (typeof body.image !== "string" || body.image.length > MAX_IMAGE_CHARS || !body.image.startsWith("data:image/"))) {
    return NextResponse.json({ ok: false, error: "too-large" }, { status: 413 });
  }
  if (!body.image) {
    return NextResponse.json({ ok: false, error: "need-photo", price: body.local, cloud: shopAiConfigured() });
  }
  try {
    const cloud = await cloudPrice(body.image);
    if (cloud?.price != null) return NextResponse.json({ ok: true, ...cloud, source: "cloud" });
  } catch {
    /* local already ran on the device */
  }
  if (body.local != null) return NextResponse.json({ ok: true, price: body.local, source: "local" });
  return NextResponse.json({ ok: false, error: "no-digits", cloud: shopAiConfigured() });
}
