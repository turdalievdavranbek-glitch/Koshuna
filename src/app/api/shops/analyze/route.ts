import { NextResponse } from "next/server";
import { applyShopAi, classifyShopSpeech, shopAiConfigured, type ShopAiGuess } from "@/lib/shop-ai";
import type { ShopDraft } from "@/lib/types";
import { requireUser } from "@/server/http";
import { limitOr429 } from "@/server/rate-limit";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_TRANSCRIPT = 4000;

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
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const limited = limitOr429(`ai-shop:${user.id}`, 30, 10 * 60_000);
  if (limited) return limited;
  if (Number(req.headers.get("content-length") || 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "too-large" }, { status: 413 });
  }
  let body: { transcript?: string; draft?: ShopDraft };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-json" }, { status: 400 });
  }
  const transcript = String(body.transcript ?? "").trim().slice(0, MAX_TRANSCRIPT);
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
