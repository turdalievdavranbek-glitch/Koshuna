import { getDb } from "@/server/db";
import { appConfig } from "@/server/db/schema";
import { json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await getDb().select().from(appConfig);
  const config: Record<string, unknown> = {};
  for (const row of rows) config[row.key] = row.value;
  return json({ config });
}
