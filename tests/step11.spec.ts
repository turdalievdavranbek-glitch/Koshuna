import { expect, test, type Page, type Route } from "@playwright/test";
import { listingCategoryError } from "../src/lib/listing-rules";
import { publishErrors } from "../src/lib/shop-rules";
import {
  landmarksFromText,
  pointGroupsFor,
  pointKindsFor,
  sanitizeShopPointFields,
  shopPointSubtitle,
} from "../src/lib/shops";
import { shopToColumns } from "../src/server/mappers";
import type { Shop } from "../src/lib/types";

const USER = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Давран",
  phone: "+996555123456",
  email: "davran@example.com",
  method: "google",
  joinedYear: 2026,
  verified: false,
  rating: 0,
  views: 0,
};

function shop(over: Record<string, unknown> = {}): Shop {
  return {
    id: "shop-existing",
    name: "Старая точка",
    ownerPhone: "+996555123456",
    ownerId: USER.id,
    ownerName: USER.name,
    category: "food",
    extraCategories: [],
    kinds: [],
    description: "",
    city: "bishkek",
    address: "Чуй 1",
    lat: 42.87,
    lng: 74.56,
    hoursNote: "",
    hours: { days: ["mon", "tue", "wed", "thu", "fri"], slot: { open: "09:00", close: "18:00" } },
    contacts: { phone: "+996555123456", whatsapp: true, telegram: false },
    pickup: true,
    delivery: false,
    deliveryNote: "",
    status: "active",
    products: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    aiConfirmed: true,
    ...over,
  } as Shop;
}

async function installApi(page: Page, initial: Shop[] = []) {
  const saved = [...initial];
  const puts: Array<{ action?: string; shop?: Shop }> = [];
  await page.route("**/api/**", async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/me") {
      await json({ user: USER });
      return;
    }
    if (path === "/api/listings" && method === "GET") {
      await json({ listings: [], counts: {}, nextCursor: null });
      return;
    }
    if (path === "/api/shops" && method === "GET") {
      await json({ shops: saved });
      return;
    }
    if (method === "PUT" && path.startsWith("/api/shops/")) {
      const body = route.request().postDataJSON() as { action?: string; shop?: Shop };
      puts.push(body);
      const next = body.shop;
      if (next?.id) {
        const index = saved.findIndex((item) => item.id === next.id);
        if (index >= 0) saved[index] = next;
        else saved.unshift(next);
      }
      await json({ ok: true, shop: next ?? { id: path.split("/").pop() } });
      return;
    }
    if (path === "/api/config") {
      await json({ config: {} });
      return;
    }
    await json({});
  });
  return { puts, saved };
}

async function signedIn(page: Page, initial: Shop[] = []) {
  await page.addInitScript((stored) => {
    const key = "konshu-state-v1";
    const prev = localStorage.getItem(key);
    const data = prev ? (JSON.parse(prev) as Record<string, unknown>) : {};
    data.lang = "ru";
    data.langChosen = true;
    data.user = stored;
    localStorage.setItem(key, JSON.stringify(data));
  }, USER);
  return installApi(page, initial);
}

async function noSideScroll(page: Page) {
  const box = await page.locator("#konshu-phone").evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth + 1);
}

test("point fields, groups and the pharmacy rule", () => {
  expect(landmarksFromText("Чуй 1")).toEqual(["Чуй 1"]);
  expect(landmarksFromText("ряд 12 · у входа · лишнее · четвёртое")).toEqual(["ряд 12", "у входа", "лишнее"]);
  const kept = sanitizeShopPointFields(shop({ landmarks: undefined, address: "Чуй 1" }));
  expect(kept.address).toBe("Чуй 1");
  expect(kept.landmarks).toBeUndefined();
  const messy = sanitizeShopPointFields(
    shop({
      delivery: true,
      deliveryFree: "yes" as unknown as boolean,
      landmarks: ["  ряд 12  ", "", "у входа", "ещё", "хвост"],
      kindOther: "я".repeat(50),
      district: "  Ленинский  ",
      deliveryDistricts: Array.from({ length: 12 }, (_, i) => `d${i}`),
    }),
  );
  expect(messy.deliveryFree).toBeUndefined();
  expect(messy.landmarks).toEqual(["ряд 12", "у входа", "ещё"]);
  expect(messy.address).toBe("ряд 12 · у входа · ещё");
  expect(messy.kindOther).toHaveLength(40);
  expect(messy.district).toBe("Ленинский");
  expect(messy.deliveryDistricts).toHaveLength(10);
  const off = sanitizeShopPointFields(shop({ delivery: false, deliveryFree: true, deliveryDistricts: ["leninsky"] }));
  expect(off.deliveryFree).toBeUndefined();
  expect(off.deliveryDistricts).toEqual([]);

  const columns = shopToColumns(
    shop({
      landmarks: ["у входа"],
      district: "leninsky",
      kindOther: "лавка",
      delivery: true,
      deliveryFree: false,
      deliveryDistricts: ["oktyabr"],
      address: "у входа",
    }),
    USER.id,
  );
  expect(columns.district).toBe("leninsky");
  expect(columns.landmarks).toEqual(["у входа"]);
  expect(columns.kindOther).toBe("лавка");
  expect(columns.deliveryFree).toBe(false);
  expect(columns.deliveryDistricts).toEqual(["oktyabr"]);
  const legacy = shopToColumns(shop({ address: "Чуй 1" }), USER.id);
  expect(legacy.landmarks).toEqual(["Чуй 1"]);
  expect(legacy.deliveryFree).toBeNull();
  expect(shopToColumns(shop({ delivery: false, deliveryFree: true, deliveryDistricts: ["a"] }), USER.id).deliveryDistricts).toEqual([]);

  const errors = publishErrors(shop({ address: "", contacts: { phone: "", whatsapp: true }, aiConfirmed: true }));
  expect(errors).not.toContain("address");
  expect(pointGroupsFor(shop(), true)).not.toContain("beauty");
  expect(pointGroupsFor(shop(), true)).not.toContain("repair");
  expect(pointGroupsFor(shop(), true)).not.toContain("travel");
  expect(pointGroupsFor(shop({ category: "beauty" }), false)).toContain("beauty");
  expect(pointKindsFor("health", [], true)).toEqual(["health-pharmacy"]);
  expect(pointKindsFor("health", ["health-clinic"], false)).toContain("health-clinic");
  expect(pointKindsFor("health", ["health-pharmacy"], false)).not.toContain("health-dentist");
  expect(listingCategoryError({ section: "shops", category: "health-pharmacy" }, ["health-pharmacy"])).toBeNull();
  expect(listingCategoryError({ section: "shops", category: "health" }, ["health-pharmacy"])).toBeNull();
  expect(listingCategoryError({ section: "shops", category: "health-pharmacy" }, ["food-bakery"])).toBe("pharmacy-only");
  expect(shopPointSubtitle(shop({ venueKind: "stall", district: "leninsky", landmarks: ["ряд 12"] }), "Магазин", "Прилавок", "Бишкек", "ru")).toBe(
    "Прилавок · Ленинский район · ряд 12",
  );
  expect(shopPointSubtitle(shop({ venueKind: "shop", address: "Чуй 1" }), "Магазин", "Прилавок", "Бишкек", "ru")).toBe("Магазин · Бишкек · Чуй 1");
});

test.describe("point screen", () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test("soft offer shows for 0 points and hides once a point exists", async ({ page }) => {
    await signedIn(page);
    await page.goto("/post?type=business");
    await expect(page.getByTestId("point-offer")).toBeVisible();
    await expect(page.getByText("Давайте запишем вашу точку")).toBeVisible();
    await expect(page.getByTestId("point-offer-no")).toBeVisible();
    await expect(page.getByTestId("point-row")).toHaveCount(0);
    await noSideScroll(page);

    await page.unroute("**/api/**");
    await installApi(page, [shop({ id: "shop-one", name: "Первая точка" })]);
    await page.goto("/post?type=business");
    await expect(page.getByTestId("point-offer")).toHaveCount(0);
    await expect(page.getByTestId("point-row")).toHaveCount(1);
    await expect(page.getByText("Первая точка")).toBeVisible();
    await noSideScroll(page);
  });

  test("one screen: group required, kind optional, no street, Другое, pharmacy, two points", async ({ page }) => {
    const api = await signedIn(page);
    await page.goto("/shops/new");
    const form = page.getByTestId("point-form");
    await expect(form).toBeVisible();
    await expect(form.getByText("улица, дом")).toHaveCount(0);
    await expect(form.locator("input[placeholder*='улиц'], input[placeholder*='дом']")).toHaveCount(0);
    await expect(page.getByTestId("point-group-beauty")).toHaveCount(0);
    await expect(page.getByTestId("point-group-repair")).toHaveCount(0);
    await expect(page.getByTestId("point-group-travel")).toHaveCount(0);
    await expect(page.getByTestId("point-service-link")).toBeVisible();
    await expect(page.getByText("Частная клиника")).toHaveCount(0);
    await expect(page.getByText("Стоматология")).toHaveCount(0);
    await expect(page.getByText("Турагентство")).toHaveCount(0);
    await noSideScroll(page);

    await page.getByTestId("point-create").click();
    await expect(page.getByTestId("point-error")).toHaveText("Выберите раздел.");

    await page.getByTestId("point-group-other").click();
    await expect(page.getByTestId("point-kind-other")).toBeVisible();

    await page.getByTestId("point-group-health").click();
    await expect(page.getByTestId("point-kind-health-pharmacy")).toBeVisible();
    await expect(page.getByTestId("point-kind-health-clinic")).toHaveCount(0);
    await expect(page.getByTestId("point-kind-health-dentist")).toHaveCount(0);
    await page.getByTestId("point-kind-health-pharmacy").click();
    await page.getByTestId("point-name").fill("Аптека у входа");
    await page.getByTestId("point-create").click();
    await page.getByTestId("hours-soft-skip").click();
    await expect(page.getByTestId("point-created")).toBeVisible();
    await expect.poll(() => api.puts.length).toBeGreaterThan(0);
    const pharmacy = api.puts.at(-1)?.shop;
    expect(pharmacy?.category).toBe("health");
    expect(pharmacy?.kinds).toContain("health-pharmacy");
    expect(pharmacy?.address ?? "").not.toMatch(/улица|дом/);

    await page.goto("/shops/new");
    await expect(page.getByTestId("point-form")).toBeVisible();
    await page.getByTestId("point-group-food").click();
    await page.getByTestId("point-name").fill("Семья Дордой");
    await page.getByTestId("point-create").click();
    await page.getByTestId("hours-soft-skip").click();
    await expect(page.getByTestId("point-created")).toBeVisible();

    await page.goto("/post?type=business");
    await expect(page.getByTestId("point-offer")).toHaveCount(0);
    await expect(page.getByTestId("point-row")).toHaveCount(2);
    await expect(page.getByText("Аптека у входа")).toBeVisible();
    await expect(page.getByText("Семья Дордой")).toBeVisible();
    await noSideScroll(page);
  });

  test("an old address is kept and a beauty point still shows its group", async ({ page }) => {
    const old = shop({ id: "shop-old", name: "Старая точка", address: "Чуй 1" });
    const beauty = shop({
      id: "shop-beauty",
      name: "Салон",
      category: "beauty",
      kinds: ["beauty-hair"],
      address: "угол",
    });
    const api = await signedIn(page, [old, beauty]);
    await page.goto("/shops/shop-old/edit");
    await expect(page.getByTestId("point-landmark")).toHaveValue("Чуй 1");
    await expect(page.getByTestId("point-group-food")).toBeVisible();
    await page.getByTestId("point-save").click();
    await expect.poll(() => api.puts.length).toBeGreaterThan(0);
    expect(api.puts.at(-1)?.shop?.address).toBe("Чуй 1");

    await page.goto("/shops/shop-beauty/edit");
    await expect(page.getByTestId("point-group-beauty")).toBeVisible();
    await expect(page.getByText("Красота").first()).toBeVisible();
  });
});
