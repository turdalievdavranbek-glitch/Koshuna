import { normalizePhone } from "@/lib/shops";
import { assertSessionSecret, signInWithIdentity } from "@/server/auth";
import { guardCsrf, json, readJson } from "@/server/http";
import { publicUser } from "@/server/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { method?: string; phone?: string; email?: string; name?: string };

export async function POST(req: Request) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  if (process.env.AUTH_DEMO_ENABLED !== "true") return json({ error: "not-found" }, 404);
  try {
    assertSessionSecret();
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "SESSION_SECRET" }, 500);
  }
  const body = await readJson<Body>(req);
  if (!body) return json({ error: "bad-json" }, 400);
  const phone = body.phone?.trim() || "";
  const email = body.email?.trim().toLowerCase() || "";
  const name = body.name?.trim() || "";
  const method = (body.method || "demo").trim();
  const providerUserId = phone ? `phone:${normalizePhone(phone)}` : email ? `email:${email}` : `name:${method}:${name}`;
  if (providerUserId === "phone:" || providerUserId === "email:" || providerUserId === `name:${method}:`) {
    return json({ error: "bad-identity" }, 400);
  }
  try {
    const signed = await signInWithIdentity({
      provider: "demo",
      providerUserId,
      profile: { name, phone: phone || undefined, email: email || undefined },
      userAgent: req.headers.get("user-agent"),
    });
    return json({ user: publicUser(signed.user) }, 200, { "set-cookie": signed.cookie });
  } catch {
    return json({ error: "auth" }, 403);
  }
}
