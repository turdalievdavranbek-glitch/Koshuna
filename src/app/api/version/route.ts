import { readFile } from "fs/promises";
import path from "path";
import { json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Build id of the running server; open tabs and the Android WebView compare it to reload after a deploy. */
export async function GET() {
  const id = await readFile(path.join(process.cwd(), ".next", "BUILD_ID"), "utf8").catch(() => "");
  return json({ build: id.trim() }, 200, { "cache-control": "no-store" });
}
