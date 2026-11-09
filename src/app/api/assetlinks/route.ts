import { json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Comma-separated SHA-256 fingerprints. Empty env → [] so Play signing can be added later without a deploy. */
function sha256Fingerprints(raw: string | undefined): string[] {
  return (raw || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function assetLinksBody(fingerprints: string[]) {
  if (fingerprints.length === 0) return [];
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.koshuna.app",
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}

/** https://koshuna.ru/.well-known/assetlinks.json (rewrite). Content-Type application/json. */
export async function GET() {
  const body = assetLinksBody(sha256Fingerprints(process.env.ANDROID_SHA256_FINGERPRINTS));
  return json(body, 200, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });
}
