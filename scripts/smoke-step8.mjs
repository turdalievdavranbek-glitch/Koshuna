import { existsSync, readFileSync, writeFileSync } from "node:fs";

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:43123";
const COOKIE_FILE = process.env.SMOKE_DEMO_COOKIE || "/tmp/koshuna-step8-demo-cookie.txt";
const ORIGIN = new URL(BASE).origin;

function assert(cond, message, extra) {
  if (!cond) {
    console.error("FAIL", message, extra ?? "");
    process.exit(1);
  }
  console.log("ok", message);
}

function jar(seed) {
  const cookies = new Map();
  if (seed) {
    for (const part of seed.split(";")) {
      const eq = part.indexOf("=");
      if (eq > 0) cookies.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
    }
  }
  return {
    header() {
      return [...cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
    },
    take(res) {
      const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
      for (const line of list) {
        const pair = line.split(";")[0];
        const eq = pair.indexOf("=");
        if (eq > 0) cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
    },
  };
}

async function api(session, method, path, jsonBody, extraHeaders) {
  const headers = { "sec-fetch-site": "same-origin", origin: ORIGIN, ...(extraHeaders || {}) };
  const cookie = session?.header();
  if (cookie) headers.cookie = cookie;
  if (jsonBody !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: jsonBody !== undefined ? JSON.stringify(jsonBody) : undefined,
    redirect: "manual",
  });
  session?.take(res);
  const text = await res.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}

function product(id, shopId, title, category, kind) {
  const now = new Date().toISOString();
  const row = {
    id,
    shopId,
    title,
    currency: "KGS",
    unit: "piece",
    stock: "in",
    price: 50,
    quantity: 1,
    updatedAt: now,
    createdAt: now,
    published: true,
  };
  if (category !== undefined) row.category = category;
  if (kind !== undefined) row.kind = kind;
  return row;
}

function shopBody(id, phone, name, kinds, category, item) {
  const now = new Date().toISOString();
  return {
    action: "upsert-product",
    shop: {
      id,
      name,
      ownerPhone: phone,
      ownerName: name,
      category,
      extraCategories: [],
      kinds,
      description: "",
      city: "bishkek",
      address: "Чуй",
      contacts: { phone: phone || "555000999" },
      pickup: true,
      delivery: false,
      status: "draft",
      products: [item],
      createdAt: now,
      updatedAt: now,
      aiConfirmed: false,
    },
    product: item,
  };
}

async function fix2() {
  const session = jar();
  const phone = "555888008";
  const login = await api(session, "POST", "/api/auth/demo", { method: "sms", phone, name: "Fix2" });
  assert(login.status === 200 && login.data?.user?.id, "fix2 demo login", login.data);
  const stamp = Date.now();
  const bakeryId = `shop-s8-bakery-${stamp}`;
  const meds = product(`prod-s8-meds-${stamp}`, bakeryId, "Аспирин", "health-pharmacy", undefined);
  const bakery = await api(session, "PUT", `/api/shops/${bakeryId}`, shopBody(bakeryId, phone, "Пекарня", ["food-bakery"], "food", meds));
  assert(bakery.status === 400 && bakery.data?.error === "pharmacy-only", "bakery category health-pharmacy", bakery.data);

  const health = product(`prod-s8-health-${stamp}`, bakeryId, "Здоровье", "health", "health");
  const bakeryHealth = await api(
    session,
    "PUT",
    `/api/shops/${bakeryId}`,
    shopBody(bakeryId, phone, "Пекарня", ["food-bakery"], "food", health),
  );
  assert(bakeryHealth.status === 400 && bakeryHealth.data?.error === "pharmacy-only", "bakery kind health", bakeryHealth.data);

  const clinicId = `shop-s8-clinic-${stamp}`;
  const bare = product(`prod-s8-bare-${stamp}`, clinicId, "Приём", undefined, undefined);
  const clinic = await api(
    session,
    "PUT",
    `/api/shops/${clinicId}`,
    shopBody(clinicId, phone, "Клиника", ["health-clinic"], "health", bare),
  );
  assert(clinic.status === 400 && clinic.data?.error === "pharmacy-only", "clinic without kind", clinic.data);

  const pharmacyId = `shop-s8-pharm-${stamp}`;
  const aspirin = product(`prod-s8-asp-${stamp}`, pharmacyId, "Аспирин", "health", "health-pharmacy");
  const pharmacy = await api(
    session,
    "PUT",
    `/api/shops/${pharmacyId}`,
    shopBody(pharmacyId, phone, "Аптека", ["health-pharmacy"], "health", aspirin),
  );
  assert(pharmacy.status === 200 && pharmacy.data?.ok === true, "pharmacy aspirin 200", pharmacy.data);

  const visit = product(`prod-s8-visit-${stamp}`, clinicId, "Приём", "health", "health-clinic");
  const clinicOk = await api(
    session,
    "PUT",
    `/api/shops/${clinicId}-ok`,
    shopBody(`${clinicId}-ok`, phone, "Клиника 2", ["health-clinic"], "health", visit),
  );
  assert(clinicOk.status === 200 && clinicOk.data?.ok === true, "clinic health-clinic 200", clinicOk.data);
}

async function phoneLessShops() {
  const stamp = Date.now();
  const a = jar();
  const loginA = await api(a, "POST", "/api/auth/demo", { method: "google", email: `a-${stamp}@example.com`, name: "Айгуль" });
  assert(loginA.status === 200 && loginA.data?.user?.id, "phone-less demo A", loginA.data);
  assert(!loginA.data.user.phone, "user A has no phone");
  const shopId = `shop-s8-owner-${stamp}`;
  const item = product(`prod-s8-bread-${stamp}`, shopId, "Нан", "food", "food-bakery");
  const created = await api(a, "PUT", `/api/shops/${shopId}`, shopBody(shopId, "", "Нан", ["food-bakery"], "food", item));
  assert(created.status === 200 && created.data?.ok === true, "phone-less user creates a shop", created.data);

  const edited = product(`prod-s8-bread2-${stamp}`, shopId, "Боорсок", "food", "food-bakery");
  const edit = await api(a, "PUT", `/api/shops/${shopId}`, shopBody(shopId, "", "Нан", ["food-bakery"], "food", edited));
  assert(edit.status === 200, "phone-less owner edits the shop", edit.data);

  const b = jar();
  const loginB = await api(b, "POST", "/api/auth/demo", { method: "google", email: `b-${stamp}@example.com`, name: "Бакыт" });
  assert(loginB.status === 200 && loginB.data.user.id !== loginA.data.user.id, "phone-less demo B");
  const stolen = await api(b, "PUT", `/api/shops/${shopId}`, shopBody(shopId, "", "Чужое", ["food-bakery"], "food", edited));
  assert(stolen.status === 403, "other user cannot edit the shop", stolen.data);

  const me = await api(a, "GET", "/api/me");
  assert(me.status === 200 && me.data?.user?.id === loginA.data.user.id, "demo session is a user while the flag is on", me.data);
}

async function redirectsAndHtml() {
  for (const path of ["/otp", "/password"]) {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    assert(res.status === 307 || res.status === 308, `${path} redirects`, res.status);
    const loc = res.headers.get("location") || "";
    assert(loc.includes("/login"), `${path} goes to /login`, loc);
  }
  const login = await fetch(`${BASE}/login`);
  assert(login.status === 200, "/login 200", login.status);
  const html = await login.text();
  const banned = [
    "davran@gmail.com",
    "Сначала сосед",
    "Не агентство",
    "Учебный вход",
    "facebook",
    "instagram",
    "whatsapp",
    "telegram",
    "ВКонтакте",
    "Получить код",
  ];
  for (const word of banned) {
    assert(!html.toLowerCase().includes(word.toLowerCase()), `login HTML has no «${word}»`);
  }
  const chunks = [...html.matchAll(/\/_next\/static\/chunks\/[^"]+\.js/g)].map((m) => m[0]);
  assert(chunks.some((path) => path.includes("/app/login/page-")), "login page chunk is linked");
  let js = "";
  for (const path of chunks) js += await (await fetch(`${BASE}${path}`)).text();
  assert(js.includes("google-login") && js.includes("Продолжить без авторизации"), "login scripts have the Google block and skip link");
  for (const word of ["davran@gmail.com", "Сначала сосед", "Не агентство", "Учебный вход", "Получить код"]) {
    assert(!js.includes(word), `login scripts have no «${word}»`);
  }
}

async function main() {
  const probe = await api(jar(), "POST", "/api/auth/demo", { method: "sms", phone: "555000000", name: "probe" });
  const demoOn = probe.status !== 404;
  console.log(demoOn ? "mode AUTH_DEMO_ENABLED=true" : "mode AUTH_DEMO_ENABLED=false");

  await redirectsAndHtml();

  if (!demoOn) {
    assert(probe.status === 404, "/api/auth/demo 404", probe.status);
    const config = await api(null, "GET", "/api/auth/config");
    assert(config.status === 200 && config.data && "google" in config.data, "/api/auth/config", config.data);
    assert(config.headers.get("cache-control")?.includes("no-store"), "config no-store");
    const clientId = config.data.google?.clientId ?? null;
    if (!clientId) {
      const empty = await api(jar(), "POST", "/api/auth/google", { credential: "garbage" });
      assert(empty.status === 503 && empty.data?.error === "not-configured", "empty client id 503", empty.data);
    } else {
      assert(typeof clientId === "string" && clientId.length > 0, "config reflects GOOGLE_WEB_CLIENT_ID");
      console.log("ok empty-env 503 is covered by test:auth while this server has a client id");
    }

    const nonceJar = jar();
    const nonce = await api(nonceJar, "GET", "/api/auth/google/nonce");
    assert(nonce.status === 200 && typeof nonce.data?.nonce === "string" && nonce.data.nonce.length >= 32, "nonce body");
    const setCookie = nonce.headers.get("set-cookie") || "";
    assert(/kgn=/.test(setCookie) && /HttpOnly/i.test(setCookie) && /Max-Age=600/i.test(setCookie), "nonce sets kgn", setCookie);
    assert(nonce.headers.get("cache-control")?.includes("no-store"), "nonce no-store");

    const garbage = await api(nonceJar, "POST", "/api/auth/google", { credential: "not-a-jwt" });
    assert(garbage.status === 401, "garbage token 401", garbage.data);

    const noNonce = await api(jar(), "POST", "/api/auth/google", { credential: "not-a-jwt" });
    assert(noNonce.status === 401, "no nonce 401", noNonce.data);

    const badOrigin = await api(nonceJar, "POST", "/api/auth/google", { credential: "not-a-jwt" }, { origin: "https://evil.example" });
    assert(badOrigin.status === 403 && badOrigin.data?.error === "bad-origin", "bad origin 403", badOrigin.data);

    if (existsSync(COOKIE_FILE)) {
      const saved = jar(readFileSync(COOKIE_FILE, "utf8").trim());
      const me = await api(saved, "GET", "/api/me");
      const user = me.data?.user;
      assert(me.status === 401 || user == null, "earlier demo session is not a user", me.status);
    } else {
      console.error("FAIL missing demo cookie file", COOKIE_FILE, "(run smoke once with AUTH_DEMO_ENABLED=true first)");
      process.exit(1);
    }
    console.log("smoke step8 (demo off) passed");
    return;
  }

  assert(probe.status === 200, "demo login while flag is on", probe.status);
  const saved = jar();
  saved.take({ headers: probe.headers });
  writeFileSync(COOKIE_FILE, saved.header());
  assert(saved.header().includes("ksid="), "saved demo session cookie");

  await fix2();
  await phoneLessShops();
  console.log("smoke step8 (demo on) passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
