import { NextResponse } from "next/server";
import { pickPriceFromText } from "@/lib/photo-price";
import { shopAiConfigured } from "@/lib/shop-ai";

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
  let body: { image?: string; local?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-json" }, { status: 400 });
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
