import { NextResponse } from "next/server";
import { handleTelegramWebhook } from "@/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Telegram → us. Rejects a missing or wrong X-Telegram-Bot-Api-Secret-Token. */
export async function POST(req: Request) {
  const result = await handleTelegramWebhook(req);
  return new NextResponse(null, { status: result.status, headers: { "cache-control": "no-store" } });
}
