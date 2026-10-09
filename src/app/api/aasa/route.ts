import { appleAppSiteAssociation } from "@/server/apple-auth";
import { json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** https://koshuna.ru/.well-known/apple-app-site-association (rewrite, no redirect). */
export async function GET() {
  return json(appleAppSiteAssociation(), 200, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });
}
