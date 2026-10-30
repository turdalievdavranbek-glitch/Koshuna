import { sealChat } from "@/lib/chat";
import { listChats } from "@/server/chat";
import { json, requireUser } from "@/server/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  return json(sealChat(await listChats(user.id)), 200, { "Cache-Control": "no-store" });
}
