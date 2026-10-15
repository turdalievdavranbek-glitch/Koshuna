import { personalLimitReached } from "@/server/moderation";
import { getDb } from "@/server/db";
import { json, requireUser } from "@/server/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hint for the publish form. The insert itself enforces the same rule. */
export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const limited = await personalLimitReached(getDb(), user.id);
  return json({ limited });
}
