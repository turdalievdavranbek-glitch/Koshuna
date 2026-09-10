import { NextResponse } from "next/server";
import { applyShopAi, classifyShopSpeech, shopAiConfigured, type ShopAiGuess } from "@/lib/shop-ai";
import type { ShopDraft } from "@/lib/types";

export const runtime = "nodejs";

async function cloudGuess(transcript: string): Promise<ShopAiGuess | null> {
  const url = process.env.SHOP_AI_URL;
  const key = process.env.SHOP_AI_KEY;
  if (!url) return null;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(key ? { authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({ transcript }),
  });
  if (!res.ok) throw new Error("cloud");
  return (await res.json()) as ShopAiGuess;
}

export async function POST(req: Request) {
  let body: { transcript?: string; draft?: ShopDraft };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-json" }, { status: 400 });
  }
  const transcript = (body.transcript ?? "").trim();
  if (!transcript) {
    return NextResponse.json({
      ok: false,
      error: "need-transcript",
      cloud: shopAiConfigured(),
    });
  }
  try {
    const guess = (await cloudGuess(transcript).catch(() => null)) ?? classifyShopSpeech(transcript);
    const patch = body.draft ? applyShopAi(body.draft, guess) : guess;
    return NextResponse.json({ ok: true, guess, patch, source: shopAiConfigured() ? "cloud-or-local" : "local" });
  } catch {
    const guess = classifyShopSpeech(transcript);
    const patch = body.draft ? applyShopAi(body.draft, guess) : guess;
    return NextResponse.json({ ok: true, guess, patch, source: "local" });
  }
}
