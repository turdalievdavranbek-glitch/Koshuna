import { expect, test, type Page, type Route } from "@playwright/test";
import { suggestCategories } from "../src/lib/category-suggest";
import { normalizePhoneInput } from "../src/lib/phone";
import { attachNativeBack, decideHardwareBack } from "../src/lib/native-back";

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

async function installApi(page: Page, opts?: { phone?: string; contact?: string | null; listings?: unknown[] }) {
  let phone = opts?.phone ?? "";
  let name = USER.name;
  const calls: string[] = [];
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
    if (path === "/api/shops") {
      await json({ shops: [] });
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
  };
}

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
