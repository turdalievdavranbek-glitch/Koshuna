import { expect, test, type Page, type Route } from "@playwright/test";
import { suggestCategories } from "../src/lib/category-suggest";
import { normalizePhoneInput } from "../src/lib/phone";
import { attachNativeBack, decideHardwareBack } from "../src/lib/native-back";
import { formatShopHours, hoursFromLegacy, sanitizeShopHours, shopOpenNow, type ShopHoursLabels } from "../src/lib/shops";

const USER = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Давран",
  phone: "",
  email: "davran@example.com",
  method: "google",
  joinedYear: 2026,
  verified: false,
  rating: 0,
  views: 0,
};

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function demoListing(over: Record<string, unknown> = {}) {
  return {
    id: "step10-demo",
    section: "secondhand",
    category: "phones",
    title: "Телефон",
    titleKy: "Телефон",
    titleEn: "Phone",
    price: 2500,
    city: "bishkek",
    postedAgo: "1h",
    photos: ["/sections/secondhand.jpg"],
    description: "Описание",
    descriptionKy: "сүрөттөмө",
    descriptionEn: "description",
    ownerId: "seed",
    verified: false,
    hasPhoto: true,
    noAgent: true,
    status: "active",
    views: 1,
    favCount: 0,
    lat: 42.87,
    lng: 74.56,
    ...over,
  };
}

async function installApi(page: Page, opts?: { phone?: string; contact?: string | null; listings?: unknown[]; shops?: unknown[] }) {
  let phone = opts?.phone ?? "";
  let name = USER.name;
  const calls: string[] = [];
  const shopPuts: unknown[] = [];
  await page.route("**/api/**", async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    calls.push(`${method} ${path}`);
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/me" && method === "PATCH") {
      const raw = route.request().postDataJSON() as { name?: string; phone?: string };
      if (typeof raw?.name === "string") name = raw.name;
      if (typeof raw?.phone === "string") phone = raw.phone;
      await json({ user: { ...USER, name, phone } });
      return;
    }
    if (path === "/api/me") {
      await json({ user: { ...USER, name, phone } });
      return;
    }
    if (path === "/api/listings" && method === "GET") {
      await json({ listings: opts?.listings ?? [], counts: {}, nextCursor: null });
      return;
    }
    if (path === "/api/shops" && method === "GET") {
      await json({ shops: opts?.shops ?? [] });
      return;
    }
    if (method === "PUT" && path.startsWith("/api/shops/")) {
      const body = route.request().postDataJSON() as { shop?: { id?: string } };
      shopPuts.push(body);
      await json({ ok: true, shop: body?.shop ?? { id: path.split("/").pop() } });
      return;
    }
    if (path === "/api/config") {
      await json({ config: {} });
      return;
    }
    if (path.endsWith("/contact")) {
      await json({ phone: opts?.contact === undefined ? null : opts.contact });
      return;
    }
    if (path === "/api/uploads" && method === "POST") {
      await json({ uploadId: "up-step10", chunkSize: 2_097_152 });
      return;
    }
    if (path.startsWith("/api/uploads/") && path.endsWith("/complete")) {
      await json({ mediaId: "m-step10", url: "/media/step10.jpg" });
      return;
    }
    if (path.startsWith("/api/uploads/") && method === "PUT") {
      const offset = Number(url.searchParams.get("offset") || 0);
      await json({ received: offset + 2_097_152 });
      return;
    }
    if (path.startsWith("/api/uploads/") && method === "GET") {
      await json({ status: "uploading", received: 0 });
      return;
    }
    if (method === "PUT" && path.startsWith("/api/listings/")) {
      const body = route.request().postDataJSON() as { id?: string };
      await json({ listing: body, counts: {} });
      return;
    }
    await json({});
  });
  return {
    calls,
    phone: () => phone,
    shopPuts: () => shopPuts,
  };
}

function sampleShop(over: Record<string, unknown> = {}) {
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
    hoursNote: "старая заметка",
    hours: {
      weekdays: { open: "09:00", close: "18:00" },
      saturday: null,
      sunday: null,
    },
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
  };
}

const HOUR_LABELS: ShopHoursLabels = {
  days: { mon: "Пн", tue: "Вт", wed: "Ср", thu: "Чт", fri: "Пт", sat: "Сб", sun: "Вс" },
  daily: "Ежедневно",
  allDay: "Круглосуточно",
};

async function signedIn(page: Page, phone = "") {
  const user = { ...USER, phone };
  await page.addInitScript((stored) => {
    const key = "konshu-state-v1";
    const prev = localStorage.getItem(key);
    const data = prev ? (JSON.parse(prev) as Record<string, unknown>) : {};
    data.lang = "ru";
    data.langChosen = true;
    if (!data.user) data.user = stored;
    localStorage.setItem(key, JSON.stringify(data));
  }, user);
  return installApi(page, { phone });
}

test("suggestCategories and phone numbers", async () => {
  const top = (text: string) => suggestCategories(text, { personal: true })[0];
  expect(top("Айфон 12, 128 ГБ")?.section).toBe("secondhand");
  expect(top("Айфон 12, 128 ГБ")?.category).toBe("phones");
  expect(top("Сатылат уй, саан уй")?.section).toBe("animals");
  expect(top("Сатылат уй, саан уй")?.animalKind).toBe("cow");
  expect(top("Батир ижарага")?.section).toBe("rent");
  expect(top("Самовар старинный")?.section).toBe("secondhand");
  expect(top("Самовар старинный")?.category).toBeFalsy();
  expect(top("Самовар старинный")?.score).toBe(0);
  const meds = suggestCategories("Парацетамол таблетки", { personal: true });
  expect(meds.some((row) => row.category === "health" || row.category === "health-pharmacy")).toBe(false);
  expect(meds[0]?.section).toBe("secondhand");
  expect(top("диван угловой")?.category).toBe("furniture");
  expect(top("кирпич красный")?.category).toBe("brick");
  expect(top("репетитор английский")?.category).toBe("education");
  expect(top("Тойота Камри 2012")?.section).toBe("cars");
  expect(top("жумуртка 100 даана")?.animalKind).toBe("chickens");
  expect(top("бала арабасы")?.goodsKind).toBe("stroller");
  expect(normalizePhoneInput("0555123456")).toBe("+996555123456");
  expect(normalizePhoneInput("555 12 34 56")).toBe("+996555123456");
  expect(normalizePhoneInput("+996 (555) 12-34-56")).toBe("+996555123456");
  expect(normalizePhoneInput("+79161234567")).toBe("+79161234567");
  expect(normalizePhoneInput("12345")).toBeNull();
});

test("native back is a no-op without the plugin", async () => {
  let listened = false;
  const wired = await attachNativeBack({
    isNativePlatform: () => false,
    isPluginAvailable: () => false,
    addListener: async () => {
      listened = true;
    },
    minimizeApp: async () => undefined,
  });
  expect(wired).toBe("noop");
  expect(listened).toBe(false);
  expect(decideHardwareBack({ pluginAvailable: false, overlayOpen: true, leaveGuard: true, canGoBack: true })).toBe("noop");
});

test.describe("publish flow", () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test("sheet has two choices and no seek option", async ({ page }) => {
    await signedIn(page, "+996555123456");
    await page.goto("/");
    await page.getByTestId("tab-post").click();
    const sheet = page.getByTestId("post-sheet");
    await expect(sheet.getByTestId("post-choice-personal")).toBeVisible();
    await expect(sheet.getByTestId("post-choice-business")).toBeVisible();
    await expect(sheet.getByText("Я ищу")).toHaveCount(0);
  });

  test("personal publish asks for a phone before the listing", async ({ page }) => {
    const api = await signedIn(page, "");
    await page.goto("/post?type=personal");
    await page.getByTestId("post-photo-file").setInputFiles({ name: "a.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByTestId("post-reshoot")).toBeVisible();
    await page.getByTestId("post-title").fill("Куртка зимняя, 42");
    await page.getByTestId("post-price").fill("2500");
    await page.getByTestId("post-publish").click();
    await expect(page.getByTestId("post-error")).toBeVisible();
    expect(api.calls.some((row) => row.startsWith("PATCH /api/me"))).toBe(false);
    await page.getByTestId("post-phone").fill("0555123456");
    await page.getByTestId("post-publish").click();
    await page.waitForURL(/published=/);
    const patchAt = api.calls.findIndex((row) => row.startsWith("PATCH /api/me"));
    expect(patchAt).toBeGreaterThanOrEqual(0);
    await expect.poll(() => api.calls.findIndex((row) => row.startsWith("PUT /api/listings/"))).toBeGreaterThan(patchAt);
    expect(api.phone()).toBe("+996555123456");
  });

  test("negotiable price, units and promotion on the card", async ({ page }) => {
    await signedIn(page, "+996555112233");
    await page.goto("/post?type=personal");
    await page.getByTestId("post-photo-file").setInputFiles({ name: "a.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByTestId("post-reshoot")).toBeVisible();
    await page.getByTestId("post-title").fill("Куртка зимняя");
    await page.getByTestId("post-negotiable").click();
    await page.getByTestId("post-publish").click();
    await page.waitForURL(/published=/);
    await page.getByRole("button", { name: "Смотреть объявление" }).click();
    await expect(page.getByText("Договорная").first()).toBeVisible();
    await expect(page.getByText("От соседа", { exact: true })).toHaveCount(0);

    await page.goto("/post?type=personal");
    await page.getByTestId("post-photo-file").setInputFiles({ name: "b.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByTestId("post-reshoot")).toBeVisible();
    await page.getByTestId("post-title").fill("Картошка");
    await page.getByTestId("post-price").fill("900");
    await page.getByTestId("unit-kg").click();
    await page.getByRole("button", { name: "+ Старая цена (акция)" }).click();
    await page.getByTestId("post-old-price").fill("800");
    await page.getByTestId("post-publish").click();
    await expect(page.getByTestId("post-error")).toContainText("больше");
    await page.getByTestId("post-old-price").fill("1200");
    await page.getByTestId("post-publish").click();
    await page.waitForURL(/published=/);
    await page.getByRole("button", { name: "Смотреть объявление" }).click();
    await expect(page.getByText("/ кг").first()).toBeVisible();
    await expect(page.getByText("Акция").first()).toBeVisible();
    await expect(page.locator(".line-through").first()).toBeVisible();
  });

  test("personal sections hide shops and restaurants and services need no leaf", async ({ page }) => {
    await signedIn(page, "+996555112233");
    await page.goto("/post?type=personal");
    await page.getByTestId("cat-other").click();
    const sections = page.getByTestId("post-sections");
    await expect(sections.getByText("Базар и магазины")).toHaveCount(0);
    await expect(sections.getByText("Еда и кафе")).toHaveCount(0);
    await sections.getByTestId("section-services").click();
    await expect(page.getByTestId("post-publish")).toBeEnabled();
  });

  test("profile edit saves and returns", async ({ page }) => {
    await signedIn(page, "");
    await page.goto("/profile/edit");
    await expect(page.getByTestId("profile-name")).toHaveValue("Давран");
    await page.getByTestId("profile-name").fill("Давранбек");
    await page.getByTestId("profile-phone").fill("0555112233");
    await page.getByTestId("profile-save").click();
    await page.waitForURL(/\/profile$/);
    await expect(page.getByText("Давранбек")).toBeVisible();
  });

  test("listing hides contact buttons without a phone and uses the real number", async ({ page }) => {
    const hidden = demoListing({ id: "no-phone", ownerId: "22222222-2222-4222-8222-222222222222" });
    await signedIn(page, "+996555112233");
    await page.unroute("**/api/**").catch(() => undefined);
    await installApi(page, {
      phone: "+996555112233",
      contact: null,
      listings: [hidden],
    });
    await page.goto("/listing/no-phone");
    await expect(page.getByTestId("listing-contact")).toBeVisible();
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
    await expect(page.locator('a[href*="t.me/share"]')).toHaveCount(0);

    const shown = demoListing({ id: "has-phone", ownerId: "22222222-2222-4222-8222-222222222222", price: 100 });
    await page.unroute("**/api/**");
    await installApi(page, { phone: "+996555112233", contact: "+996700111222", listings: [shown] });
    await page.goto("/listing/has-phone");
    await expect(page.getByTestId("listing-phone")).toHaveAttribute("href", "tel:+996700111222");
    await expect(page.getByTestId("listing-wa")).toHaveAttribute("href", "https://wa.me/996700111222");
  });

  test("draft survives reload and back asks before leaving", async ({ page }) => {
    await signedIn(page, "+996555112233");
    await page.goto("/");
    await page.goto("/post?type=personal");
    await page.getByTestId("post-back").click();
    await expect(page.getByTestId("leave-dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/post?type=personal");
    await page.getByTestId("post-photo-file").setInputFiles({ name: "a.png", mimeType: "image/png", buffer: PNG });
    await page.getByTestId("post-title").fill("Куртка на черновик");
    await page.getByTestId("post-price").fill("1500");
    await page.waitForFunction(() => (localStorage.getItem("konshu-state-v1") || "").includes("kmedia:"));
    await page.reload();
    await page.goto("/");
    await page.getByTestId("tab-post").click();
    await expect(page.getByTestId("draft-continue")).toBeVisible();
    await page.getByTestId("draft-continue").click();
    await expect(page.getByTestId("post-title")).toHaveValue("Куртка на черновик");
    await expect(page.getByTestId("post-reshoot")).toBeVisible();

    await page.getByTestId("post-back").click();
    await expect(page.getByTestId("leave-dialog")).toBeVisible();
    await page.getByTestId("leave-stay").click();
    await expect(page.getByTestId("post-title")).toHaveValue("Куртка на черновик");

    await page.evaluate(() => history.back());
    await expect(page.getByTestId("leave-dialog")).toBeVisible();
    await expect(page).toHaveURL(/type=personal/);
    await page.getByTestId("leave-stay").click();

    await page.getByTestId("tab-home").click();
    await expect(page.getByTestId("leave-dialog")).toBeVisible();
    await page.getByTestId("leave-save").click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("card review goes back to the filled step", async ({ page }) => {
    await signedIn(page, "+996555112233");
    await page.goto("/post?card=cafe");
    await page.getByPlaceholder("Заголовок").fill("Обед");
    await page.getByPlaceholder("38 000").fill("500");
    await page.getByTestId("post-next").click();
    await expect(page).toHaveURL(/step=2/);
    await page.getByTestId("post-back").click();
    await expect(page).not.toHaveURL(/step=2/);
    await expect(page.getByPlaceholder("Заголовок")).toHaveValue("Обед");
  });
});

test("hours format, legacy weekend and server sanitize", () => {
  const week = { open: "09:00", close: "18:00" };
  expect(
    formatShopHours({ days: ["mon", "tue", "wed", "thu", "fri"], slot: week }, HOUR_LABELS),
  ).toBe("Пн–Пт 09:00–18:00");
  expect(
    formatShopHours(
      { days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], slot: week },
      HOUR_LABELS,
    ),
  ).toBe("Ежедневно 09:00–18:00");
  expect(
    formatShopHours({ days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], allDay: true }, HOUR_LABELS),
  ).toBe("Круглосуточно");
  expect(
    formatShopHours({ days: ["mon", "wed", "thu", "fri"], slot: week }, HOUR_LABELS),
  ).toBe("Пн, Ср–Пт 09:00–18:00");
  expect(
    formatShopHours(
      { days: ["mon", "tue", "wed", "thu", "fri"], slot: { open: "20:00", close: "02:00" } },
      HOUR_LABELS,
    ),
  ).toBe("Пн–Пт 20:00–02:00");

  // sunday omitted means “same as weekdays”. Both weekend days null is Пн–Пт.
  const legacy = { weekdays: week, saturday: null, sunday: null };
  expect(formatShopHours(legacy, HOUR_LABELS)).toBe("Пн–Пт 09:00–18:00");
  const opened = hoursFromLegacy(legacy);
  expect(opened.days).toEqual(["mon", "tue", "wed", "thu", "fri"]);
  expect(opened.slot).toEqual(week);
  expect(opened.allDay).toBe(false);

  const saturday = new Date("2026-10-10T12:00:00Z");
  expect(shopOpenNow(legacy, saturday)).toBe(false);
  expect(
    shopOpenNow({ days: ["mon", "tue", "wed", "thu", "fri"], slot: { open: "00:00", close: "23:59" } }, saturday),
  ).toBe(false);
  expect(
    shopOpenNow(
      { days: ["mon", "tue", "wed", "thu", "fri"], slot: { open: "00:00", close: "23:59" } },
      new Date("2026-10-12T06:00:00Z"),
    ),
  ).toBe(true);

  expect(sanitizeShopHours("garbage")).toBeUndefined();
  expect(
    sanitizeShopHours({
      weekdays: "nope",
      saturday: { open: "99:00", close: "10:00" },
      days: ["mon", "bogus", "fri"],
      slot: { open: "25:00", close: "18:00" },
      allDay: "yes",
      note: "drop",
    }),
  ).toEqual({ days: ["mon", "fri"] });
});

test.describe("point registration", () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test("shop and stall cards register a point, not a product", async ({ page }) => {
    const api = await signedIn(page, "+996555123456");
    for (const card of ["shop", "stall"] as const) {
      await page.goto(`/shops/quick?card=${card}`);
      await expect(page.getByText("Сфотографируйте фасад вашего здания")).toBeVisible();
      await expect(page.getByRole("button", { name: "Только фото" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Видео", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Фото и голос" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Текстом" })).toHaveCount(0);
      await expect(page.getByText("Наименование")).toHaveCount(0);
      await expect(page.getByText("Наведите на товар и ценник")).toHaveCount(0);
      await expect(page.getByText("Пример ценника для ИИ")).toHaveCount(0);
      await expect(page.getByText("Пример: проход по прилавку")).toHaveCount(0);
    }

    await page.getByTestId("point-photo").setInputFiles({
      name: "facade.png",
      mimeType: "image/png",
      buffer: PNG,
    });
    await page.getByTestId("point-name").fill("Лавка у дома");
    await page.getByTestId("point-address").fill("Чуй 10");
    await page.getByRole("button", { name: "Продукты питания" }).click();
    await page.getByTestId("hours-918").click();
    await page.getByTestId("point-publish").click();
    await expect(page.getByTestId("point-created")).toBeVisible();
    await expect(page.getByText("Точка создана")).toBeVisible();

    await expect.poll(() => api.shopPuts().length).toBeGreaterThan(0);
    const body = api.shopPuts().at(-1) as {
      action?: string;
      shop?: { id?: string; coverUrl?: string; products?: unknown[]; videoUrl?: string };
    };
    expect(body.action).toBe("publish");
    expect(body.shop?.coverUrl).toBeTruthy();
    expect(body.shop?.products ?? []).toEqual([]);
    expect(body.shop?.id).not.toBe("shop-existing");
  });

  test("a second point is new even when one already exists", async ({ page }) => {
    await signedIn(page, "+996555123456");
    await page.unroute("**/api/**");
    const api = await installApi(page, { phone: "+996555123456", shops: [sampleShop()] });
    await page.goto("/shops/quick?card=shop");
    await expect(page.getByText("Наименование")).toHaveCount(0);
    await page.getByTestId("point-photo").setInputFiles({
      name: "facade.png",
      mimeType: "image/png",
      buffer: PNG,
    });
    await page.getByTestId("point-name").fill("Вторая точка");
    await page.getByTestId("point-address").fill("Московская 5");
    await page.getByRole("button", { name: "Другое" }).click();
    await page.getByTestId("point-publish").click();
    await page.getByTestId("hours-soft-skip").click();
    await expect(page.getByTestId("point-created")).toBeVisible();
    await expect.poll(() => api.shopPuts().length).toBeGreaterThan(0);
    const published = (api.shopPuts().at(-1) as { shop?: { id?: string; products?: unknown[] } }).shop;
    expect(published?.id).not.toBe("shop-existing");
    expect(published?.products ?? []).toEqual([]);
  });

  test("adding a product to an existing point still shows product fields", async ({ page }) => {
    await signedIn(page, "+996555123456");
    await page.unroute("**/api/**");
    await installApi(page, { phone: "+996555123456", shops: [sampleShop()] });
    await page.goto("/shops/quick?shop=shop-existing");
    await expect(page.getByText("Наименование")).toBeVisible();
    await expect(page.getByText("Стоимость, KGS")).toBeVisible();
    await expect(page.getByRole("button", { name: "Фото и голос" })).toBeVisible();
  });

  test("cafe card can publish without a price line", async ({ page }) => {
    await signedIn(page, "+996555112233");
    await page.goto("/post?card=cafe");
    await expect(page.getByText("Сфотографируйте фасад вашего здания")).toBeVisible();
    await expect(page.getByText("Фасад, прилавок или контейнер")).toBeVisible();
    await expect(page.getByText("Средний чек, сом (по желанию)")).toBeVisible();
    await page.getByPlaceholder("Заголовок").fill("Обед");
    await page.getByTestId("post-next").click();
    await expect(page).toHaveURL(/step=2/);
    await expect(page.getByText(/KGS/)).toHaveCount(0);
    await page.getByTestId("post-publish").click();
    await expect(page.getByText("Объявление опубликовано")).toBeVisible();
    await page.getByRole("button", { name: "Смотреть объявление" }).click();
    await expect(page).toHaveURL(/\/listing\//);
    await expect(page.getByText("Договорная")).toHaveCount(0);
    await expect(page.getByText("Уточнить цену")).toHaveCount(0);
  });

  test("hours picker writes days and legacy slots, and skip still saves", async ({ page }) => {
    const api = await signedIn(page, "+996555123456");
    await page.goto("/shops/new");
    await expect(page.getByTestId("hours-block")).toBeVisible();
    await page.getByRole("button", { name: "Сохранить черновик" }).click();
    await expect(page.getByTestId("hours-soft")).toBeVisible();
    await page.getByTestId("hours-soft-skip").click();
    await expect.poll(() => api.shopPuts().length).toBeGreaterThan(0);
    const skipped = api.shopPuts().at(-1) as { action?: string; shop?: { hours?: unknown } };
    expect(skipped.action).toBe("save-draft");
    expect(skipped.shop?.hours).toBeFalsy();

    await page.getByTestId("day-sat").click();
    await expect(page.getByTestId("day-sat")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("hours-weekend").click();
    await expect(page.getByTestId("day-sat")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("day-sun")).toHaveAttribute("aria-pressed", "false");
    await page.getByTestId("hours-918").click();
    const before = api.shopPuts().length;
    await page.getByRole("button", { name: "Сохранить черновик" }).click();
    await expect.poll(() => api.shopPuts().length).toBeGreaterThan(before);
    const saved = api.shopPuts().at(-1) as { action?: string; shop?: { hours?: Record<string, unknown> } };
    expect(saved.action).toBe("save-draft");
    expect(saved.shop?.hours).toMatchObject({
      days: ["mon", "tue", "wed", "thu", "fri"],
      slot: { open: "09:00", close: "18:00" },
      weekdays: { open: "09:00", close: "18:00" },
      saturday: null,
      sunday: null,
    });
  });

  test("legacy hours open in the picker and print as weekdays", async ({ page }) => {
    await signedIn(page, "+996555123456");
    await page.unroute("**/api/**");
    await installApi(page, { phone: "+996555123456", shops: [sampleShop()] });
    await page.goto("/shops/shop-existing");
    await expect(page.getByText("Пн–Пт 09:00–18:00")).toBeVisible();
    await page.goto("/shops/shop-existing/edit");
    await expect(page.getByTestId("hours-from")).toHaveValue("09:00");
    await expect(page.getByTestId("hours-to")).toHaveValue("18:00");
    await expect(page.getByTestId("day-mon")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("day-sat")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("Прежняя запись о часах")).toBeVisible();
    await expect(page.getByText("старая заметка")).toBeVisible();
  });
});

test("home area chips stay on one row at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "konshu-state-v1",
      JSON.stringify({
        lang: "ru",
        langChosen: true,
        city: "talas",
        filters: { city: "talas", scope: "area" },
      }),
    );
  });
  await page.goto("/");
  const row = page.getByTestId("scope-chips");
  await expect(row).toBeVisible();
  await expect(row.getByRole("button", { name: "Рядом", exact: true })).toBeVisible();
  await expect(row.getByRole("button", { name: "Весь Кыргызстан", exact: true })).toBeVisible();
  const area = page.getByTestId("scope-area");
  await expect(area).toContainText("Талас, район, айыл");
  const metrics = await row.evaluate((el) => {
    const buttons = [...el.querySelectorAll("button")];
    const tops = buttons.map((button) => Math.round(button.getBoundingClientRect().top));
    const span = buttons[1]?.querySelector("span");
    return {
      wrap: getComputedStyle(el).flexWrap,
      height: el.getBoundingClientRect().height,
      tops,
      truncated: Boolean(span && span.scrollWidth > span.clientWidth + 1),
    };
  });
  expect(metrics.wrap).toBe("nowrap");
  expect(Math.max(...metrics.tops) - Math.min(...metrics.tops)).toBeLessThan(4);
  expect(metrics.height).toBeLessThan(48);
  expect(metrics.truncated).toBe(true);
});

test.describe("back controls", () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test("legal pages and non-tab screens show a back control", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("konshu-state-v1", JSON.stringify({ lang: "ru", langChosen: true }));
    });
    await page.goto("/terms");
    await expect(page.locator("[data-legal-back]")).toHaveText("‹ Назад");
    await expect(page.locator("[data-legal-back]")).toHaveAttribute("href", "/profile");
    await page.goto("/privacy");
    await expect(page.locator("[data-legal-back]")).toHaveText("‹ Назад");
    await page.goto("/delete-account");
    await expect(page.locator("[data-legal-back]")).toHaveText("‹ Назад");
    await page.goto("/offline.html");
    await expect(page.locator("#back")).toHaveText("‹ Назад");

    await page.goto("/login");
    await expect(page.getByTestId("screen-back")).toBeVisible();
    await page.goto("/selling");
    await expect(page.getByTestId("screen-back")).toBeVisible();
    await page.goto("/help");
    await expect(page.getByLabel("Назад")).toBeVisible();
    await page.goto("/notifications");
    await expect(page.getByLabel("Назад")).toBeVisible();
    await page.goto("/map");
    await expect(page.getByTestId("screen-back")).toBeVisible();
  });
});
