import { existsSync, readFileSync } from "node:fs";

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
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

function assert(cond, message, extra) {
  if (!cond) {
    console.error("FAIL", message, extra ?? "");
    process.exit(1);
  }
  console.log("ok", message);
}

async function call(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  return { status: res.status };
}

function jar() {
  const cookies = new Map();
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

async function api(session, method, path, jsonBody) {
  const headers = { "sec-fetch-site": "same-origin" };
  const cookie = session.header();
  if (cookie) headers.cookie = cookie;
  if (jsonBody !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: jsonBody !== undefined ? JSON.stringify(jsonBody) : undefined,
    redirect: "manual",
  });
  session.take(res);
  const text = await res.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function shopBody(id, phone, name, kinds, category, product) {
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
      contacts: { phone },
      pickup: true,
      delivery: false,
      status: "draft",
      products: [product],
      createdAt: now,
      updatedAt: now,
      aiConfirmed: false,
    },
    product,
  };
}

function product(id, shopId, title, category, kind) {
  const now = new Date().toISOString();
  return {
    id,
    shopId,
    title,
    category,
    kind,
    currency: "KGS",
    unit: "piece",
    stock: "in",
    price: 50,
    quantity: 1,
    updatedAt: now,
    createdAt: now,
    published: true,
  };
}

async function main() {
  const okPaths = [
    "/section/services",
    "/section/services/c/svc-health",
    "/section/services/c/svc-health/all",
    "/section/services/c/svc-leisure/sauna",
    "/section/animals/c/plants/potato",
    "/section/cars/c/special/truck",
    "/shops/c/health/health-pharmacy",
    "/shops/new",
    "/post",
  ];
  for (const path of okPaths) {
    const res = await call(path);
    assert(res.status === 200, `GET ${path} 200`, res.status);
  }

  const unknown = await call("/section/services/c/svc-unknown");
  const redirected = unknown.status >= 300 && unknown.status < 400;
  assert(unknown.status === 404 || redirected, "GET /section/services/c/svc-unknown 404 or redirect", unknown.status);

  const session = jar();
  const phone = "555777007";
  const login = await api(session, "POST", "/api/auth/demo", { method: "sms", phone, name: "Smoke Catalog" });
  assert(login.status === 200 && login.data?.user?.id, "demo login", login);

  const stamp = Date.now();
  const put = (id, body) => api(session, "PUT", `/api/listings/${id}`, body);
  const pharmacy = await put(`user-smoke-pharm-${stamp}`, {
    section: "services",
    category: "pharmacy",
    title: "Таблетки",
    price: 10,
    city: "bishkek",
    status: "active",
  });
  assert(pharmacy.status === 400 && pharmacy.data?.error === "bad-category", "PUT services/pharmacy 400", pharmacy);

  const group = await put(`user-smoke-group-${stamp}`, {
    section: "services",
    category: "svc-health",
    title: "Группа",
    price: 10,
    city: "bishkek",
    status: "active",
  });
  assert(group.status === 400 && group.data?.error === "bad-category", "PUT services/svc-health 400", group);

  const looseMeds = await put(`user-smoke-meds-${stamp}`, {
    section: "shops",
    category: "health-pharmacy",
    title: "Аспирин мимо",
    price: 10,
    city: "bishkek",
    status: "active",
  });
  assert(looseMeds.status === 400 && looseMeds.data?.error === "pharmacy-only", "PUT shops/health-pharmacy without shop 400", looseMeds);

  const looseHealth = await put(`user-smoke-health-${stamp}`, {
    section: "shops",
    category: "health",
    title: "Здоровье мимо",
    price: 10,
    city: "bishkek",
    status: "active",
  });
  assert(looseHealth.status === 400 && looseHealth.data?.error === "pharmacy-only", "PUT shops/health without shop 400", looseHealth);

  const missingShop = await put(`user-smoke-shop-${stamp}`, {
    section: "services",
    category: "dentist",
    title: "Чужая точка",
    price: 10,
    city: "bishkek",
    status: "active",
    shopId: "shop-nope",
  });
  assert(missingShop.status === 403 && missingShop.data?.error === "forbidden-shop", "PUT shop-nope 403", missingShop);

  const dentistId = `user-smoke-dentist-${stamp}`;
  const dentist = await put(dentistId, {
    section: "services",
    category: "dentist",
    title: "Стоматолог",
    price: 10,
    city: "bishkek",
    status: "active",
  });
  assert(dentist.status === 200 && dentist.data?.listing?.id === dentistId, "PUT services/dentist 200", dentist);
  const withdrawn = await api(session, "PATCH", `/api/listings/${dentistId}`, { status: "withdrawn" });
  assert(withdrawn.status === 200 && withdrawn.data?.listing?.status === "withdrawn", "PATCH dentist withdrawn", withdrawn);

  const pharmacyId = `shop-smoke-pharm-${stamp}`;
  const aspirin = product(`prod-asp-${stamp}`, pharmacyId, "Аспирин", "health", "health-pharmacy");
  const pharmacyShop = await api(session, "PUT", `/api/shops/${pharmacyId}`, shopBody(pharmacyId, phone, "Аптека smoke", ["health-pharmacy"], "health", aspirin));
  assert(pharmacyShop.status === 200 && pharmacyShop.data?.ok === true, "PUT pharmacy shop with Аспирин 200", pharmacyShop);

  const bakeryId = `shop-smoke-bakery-${stamp}`;
  const fakeMeds = product(`prod-fake-${stamp}`, bakeryId, "Аспирин", "health", "health-pharmacy");
  const bakery = await api(session, "PUT", `/api/shops/${bakeryId}`, shopBody(bakeryId, phone, "Пекарня smoke", ["food-bakery"], "food", fakeMeds));
  assert(bakery.status === 400 && bakery.data?.error === "pharmacy-only", "PUT bakery medicine 400", bakery);

  console.log("smoke step7 passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
