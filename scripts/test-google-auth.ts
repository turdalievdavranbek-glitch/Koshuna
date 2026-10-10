import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT, type JWTPayload } from "jose";
import { isOwnShop } from "../src/lib/shops";
import { validateShopAction } from "../src/server/shops";
import { verifyGoogleIdToken, GoogleAuthError } from "../src/server/google-auth";
import type { Shop, ShopProduct, User } from "../src/lib/types";

const AUD = "test-client.apps.googleusercontent.com";
const NONCE = "nonce-ok";

function assert(cond: unknown, message: string): void {
  if (!cond) {
    console.error("FAIL", message);
    process.exit(1);
  }
  console.log("ok", message);
}

async function expectFail(run: () => Promise<unknown>, message: string) {
  try {
    await run();
  } catch (err) {
    assert(err instanceof GoogleAuthError, `${message} throws GoogleAuthError`);
    return;
  }
  assert(false, `${message} rejected`);
}

const now = new Date().toISOString();

function user(partial: Partial<User> & { id?: string }): User {
  return {
    name: "A",
    phone: "",
    joinedYear: 2026,
    verified: false,
    rating: 0,
    views: 0,
    ...partial,
  };
}

function product(
  partial: Omit<Partial<ShopProduct>, "category" | "kind"> & { category?: string; kind?: string },
): ShopProduct {
  return {
    id: "p1",
    shopId: "s1",
    title: "Товар",
    category: "food",
    currency: "KGS",
    unit: "piece",
    stock: "in",
    price: 50,
    published: true,
    createdAt: now,
    updatedAt: now,
    ...partial,
  } as ShopProduct;
}

function shop(partial: Partial<Shop> & { products?: ShopProduct[] }): Shop {
  return {
    id: "s1",
    name: "Точка",
    ownerPhone: "555000111",
    ownerId: "u1",
    ownerName: "A",
    category: "food",
    extraCategories: [],
    kinds: ["food-bakery"],
    description: "",
    city: "bishkek",
    address: "Чуй",
    contacts: { phone: "555000111" },
    pickup: true,
    delivery: false,
    status: "draft",
    products: [],
    createdAt: now,
    updatedAt: now,
    aiConfirmed: false,
    ...partial,
  };
}

async function sign(privateKey: CryptoKey, claims: JWTPayload) {
  const iss = typeof claims.iss === "string" ? claims.iss : "https://accounts.google.com";
  const aud = typeof claims.aud === "string" ? claims.aud : AUD;
  const exp = typeof claims.exp === "number" ? claims.exp : "10m";
  const sub = claims.sub;
  const rest: JWTPayload = { ...claims };
  delete rest.iss;
  delete rest.aud;
  delete rest.exp;
  delete rest.sub;
  const jwt = new SignJWT(rest)
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .setIssuer(iss)
    .setAudience(aud)
    .setExpirationTime(exp);
  if (typeof sub === "string" && sub) jwt.setSubject(sub);
  return jwt.sign(privateKey);
}

async function main() {
  const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
  const jwk = await exportJWK(publicKey);
  jwk.alg = "RS256";
  jwk.kid = "test";
  jwk.use = "sig";
  const keySet = createLocalJWKSet({ keys: [jwk] });

  const base = {
    email: "a@b.c",
    email_verified: true,
    nonce: NONCE,
    name: "Ann Example",
    given_name: "Ann",
    sub: "google-sub-1",
  };

  const valid = await verifyGoogleIdToken(await sign(privateKey, base), { audience: AUD, nonce: NONCE, keySet });
  assert(valid.sub === "google-sub-1" && valid.given_name === "Ann" && valid.email === "a@b.c", "valid token");

  await expectFail(
    async () => verifyGoogleIdToken(await sign(privateKey, base), { audience: "other", nonce: NONCE, keySet }),
    "wrong aud",
  );
  await expectFail(
    async () =>
      verifyGoogleIdToken(await sign(privateKey, { ...base, iss: "https://evil.example" }), {
        audience: AUD,
        nonce: NONCE,
        keySet,
      }),
    "wrong iss",
  );
  await expectFail(
    async () =>
      verifyGoogleIdToken(await sign(privateKey, { ...base, exp: Math.floor(Date.now() / 1000) - 180 }), {
        audience: AUD,
        nonce: NONCE,
        keySet,
      }),
    "expired",
  );
  await expectFail(
    async () =>
      verifyGoogleIdToken(await sign(privateKey, { ...base, email_verified: false }), {
        audience: AUD,
        nonce: NONCE,
        keySet,
      }),
    "email_verified false",
  );
  await expectFail(
    async () => verifyGoogleIdToken(await sign(privateKey, base), { audience: AUD, nonce: "other", keySet }),
    "nonce mismatch",
  );
  await expectFail(
    async () => verifyGoogleIdToken(await sign(privateKey, { ...base, sub: undefined }), { audience: AUD, nonce: NONCE, keySet }),
    "missing sub",
  );

  const none = `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${Buffer.from(
    JSON.stringify({ ...base, iss: "https://accounts.google.com", aud: AUD, exp: Math.floor(Date.now() / 1000) + 600 }),
  ).toString("base64url")}.`;
  await expectFail(() => verifyGoogleIdToken(none, { audience: AUD, nonce: NONCE, keySet }), "alg none");

  const { sub: hsSub, ...hsClaims } = base;
  const hs = await new SignJWT(hsClaims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("https://accounts.google.com")
    .setAudience(AUD)
    .setSubject(hsSub)
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode("test-secret-test-secret-test-secret"));
  await expectFail(() => verifyGoogleIdToken(hs, { audience: AUD, nonce: NONCE, keySet }), "HS256");

  const accountsIssuer = await verifyGoogleIdToken(
    await sign(privateKey, { ...base, iss: "accounts.google.com" }),
    { audience: AUD, nonce: NONCE, keySet },
  );
  assert(accountsIssuer.sub === "google-sub-1", "issuer accounts.google.com");

  const owner = user({ id: "u1", phone: "" });
  assert(isOwnShop({ ownerPhone: "", ownerId: "u1" }, owner) === true, "isOwnShop by id");
  assert(isOwnShop({ ownerPhone: "", ownerId: "u2" }, owner) === false, "isOwnShop other id");
  assert(
    isOwnShop({ ownerPhone: "+996 555 000 111" }, user({ phone: "555000111" })) === true,
    "isOwnShop phone fallback",
  );
  assert(isOwnShop({ ownerPhone: "555000111" }, user({ phone: "" })) === false, "isOwnShop empty phone is not owner");

  const phoneUser = user({ id: "u1", phone: "555000111" });
  const bakeryMeds = validateShopAction(
    {
      action: "upsert-product",
      shop: shop({
        products: [product({ category: "health-pharmacy", kind: undefined, title: "Аспирин" })],
      }),
      product: product({ category: "health-pharmacy", kind: undefined, title: "Аспирин" }),
    },
    phoneUser,
  );
  assert(bakeryMeds?.status === 400 && bakeryMeds.body.error === "pharmacy-only", "bakery health-pharmacy category");

  const bakeryHealth = validateShopAction(
    {
      action: "upsert-product",
      shop: shop({ products: [product({ category: "health", kind: "health" as ShopProduct["kind"], title: "Здоровье" })] }),
      product: product({ category: "health", kind: "health" as ShopProduct["kind"], title: "Здоровье" }),
    },
    phoneUser,
  );
  assert(bakeryHealth?.status === 400 && bakeryHealth.body.error === "pharmacy-only", "bakery kind health");

  const clinicBare = validateShopAction(
    {
      action: "upsert-product",
      shop: shop({
        category: "health",
        kinds: ["health-clinic"],
        products: [product({ category: undefined as unknown as ShopProduct["category"], kind: undefined, title: "Приём" })],
      }),
      product: product({ category: undefined as unknown as ShopProduct["category"], kind: undefined, title: "Приём" }),
    },
    phoneUser,
  );
  assert(clinicBare?.status === 400 && clinicBare.body.error === "pharmacy-only", "clinic product without kind");

  const pharmacy = validateShopAction(
    {
      action: "upsert-product",
      shop: shop({
        category: "health",
        kinds: ["health-pharmacy"],
        products: [product({ category: "health", kind: "health-pharmacy", title: "Аспирин" })],
      }),
      product: product({ category: "health", kind: "health-pharmacy", title: "Аспирин" }),
    },
    phoneUser,
  );
  assert(pharmacy === null, "pharmacy aspirin passes validation");

  const clinicKind = validateShopAction(
    {
      action: "upsert-product",
      shop: shop({
        category: "health",
        kinds: ["health-clinic"],
        products: [product({ category: "health", kind: "health-clinic", title: "Приём" })],
      }),
      product: product({ category: "health", kind: "health-clinic", title: "Приём" }),
    },
    phoneUser,
  );
  assert(clinicKind === null, "clinic health-clinic product passes validation");

  const phoneLess = user({ id: "u1", phone: "" });
  const ownBakery = validateShopAction(
    {
      action: "save-draft",
      shop: shop({ ownerPhone: "", ownerId: "u1", contacts: { phone: "555111222" } }),
    },
    phoneLess,
  );
  assert(ownBakery === null, "phone-less owner passes shop validation");

  const prev = process.env.GOOGLE_WEB_CLIENT_ID;
  delete process.env.GOOGLE_WEB_CLIENT_ID;
  const { POST } = await import("../src/app/api/auth/google/route");
  const empty = await POST(
    new Request("http://127.0.0.1/api/auth/google", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://127.0.0.1" },
      body: JSON.stringify({ credential: "garbage" }),
    }),
  );
  assert(empty.status === 503, "empty GOOGLE_WEB_CLIENT_ID is 503");
  const emptyBody = (await empty.json()) as { error?: string };
  assert(emptyBody.error === "not-configured", "503 not-configured");
  if (prev === undefined) delete process.env.GOOGLE_WEB_CLIENT_ID;
  else process.env.GOOGLE_WEB_CLIENT_ID = prev;

  console.log("test:auth passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
