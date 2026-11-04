import { NextResponse } from "next/server";
import { readPoint } from "@/lib/delivery";
import type { Lang } from "@/lib/types";
import { courierBoard } from "@/server/delivery";
import { json, requireUser } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const url = new URL(req.url);
  const point = readPoint(url.searchParams.get("lat"), url.searchParams.get("lng"));
  const lang: Lang = user.lang === "ky" ? "ky" : "ru";
  const board = await courierBoard(user.id, lang, point?.lat ?? null, point?.lng ?? null);
  if ("error" in board) return json({ error: board.error }, board.status);
  return json(board, 200, { "Cache-Control": "no-store" });
}
