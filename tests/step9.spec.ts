import { expect, test, type Page } from "@playwright/test";

async function dismissLanguage(page: Page) {
  const chosen = await page
    .evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem("konshu-state-v1") || "{}").langChosen === true;
      } catch {
        return false;
      }
    })
    .catch(() => false);
  if (chosen) return;
  const ru = page.getByRole("button", { name: "RU / Русский" });
  await ru.waitFor({ state: "visible", timeout: 15000 });
  await ru.click();
}

function demoListings() {
  const sections = ["secondhand", "restaurants", "animals", "rent", "cars", "services", "construction"] as const;
  return Array.from({ length: 22 }, (_, i) => {
    const potato = i === 0;
    const fridge = i === 1;
    return {
      id: potato ? "step9-potato" : `step9-${i}`,
      section: potato ? "animals" : sections[i % sections.length],
      title: potato ? "Картошка с грядки" : fridge ? "Холодильник степ 9" : `Объявление степ ${i}`,
      titleKy: potato ? "Картошка" : `Жарнама ${i}`,
      titleEn: potato ? "Potato" : `Listing ${i}`,
      price: 100 + i,
      city: "bishkek",
      postedAgo: "1h",
      photos: ["/sections/shops.jpg"],
      description: potato ? "Картошка с грядки. ".repeat(80) : "Короткое описание объявления для ленты.",
      descriptionKy: "сүрөттөмө",
      descriptionEn: "description",
      ownerId: "seed",
      verified: false,
      hasPhoto: true,
      noAgent: true,
      status: "active",
      views: 1,
      favCount: 0,
      lat: 42.8746,
      lng: 74.5698,
    };
  });
}

async function installFeed(page: Page) {
  const listings = demoListings();
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/listings") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ listings, counts: {}, nextCursor: null }),
      });
      return;
    }
    if (path === "/api/shops") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ shops: [] }) });
      return;
    }
    if (path === "/api/config") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ config: {} }) });
      return;
    }
    if (path === "/api/me") {
      await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "auth" }) });
      return;
    }
    await route.continue();
  });
}

async function navHeight(page: Page) {
  return page.locator("#konshu-phone nav").evaluate((el) => el.getBoundingClientRect().height);
}

for (const viewport of [
  { width: 360, height: 800 },
  { width: 412, height: 915 },
]) {
  test(`tabs at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await dismissLanguage(page);
    const nav = page.locator("#konshu-phone nav");
    await expect(nav.locator("button")).toHaveCount(5);
    await expect(page.getByTestId("tab-home")).toContainText("Лента");
    await expect(page.getByTestId("tab-search")).toContainText("Поиск");
    await expect(page.getByTestId("tab-favorites")).toContainText("Корзина");
    await expect(page.getByTestId("tab-profile")).toContainText("Кабинет");
    await expect(page.getByTestId("tab-post")).toHaveAttribute("aria-label", "Новое объявление");
    await expect(nav.getByText("Карта", { exact: true })).toHaveCount(0);
    await expect(nav.getByText("Покупаю")).toHaveCount(0);
    await expect(nav.getByText("Продаю")).toHaveCount(0);

    const plus = await page.getByTestId("tab-post").boundingBox();
    const icon = await page.getByTestId("tab-home").locator("svg").boundingBox();
    const bar = await nav.boundingBox();
    expect(plus).toBeTruthy();
    expect(icon).toBeTruthy();
    expect(bar).toBeTruthy();
    expect(plus!.height).toBeGreaterThanOrEqual(icon!.height * 1.15);
    expect(plus!.y).toBeLessThan(bar!.y);

    const homeColor = await page.getByTestId("tab-home").locator("span").evaluate((el) => getComputedStyle(el).color);
    expect(homeColor).toBe("rgb(184, 69, 47)");

    await page.goto("/section/animals");
    await dismissLanguage(page);
    const sectionColor = await page.getByTestId("tab-home").locator("span").evaluate((el) => getComputedStyle(el).color);
    expect(sectionColor).toBe("rgb(184, 69, 47)");

    await page.goto("/search");
    const searchColor = await page.getByTestId("tab-search").locator("span").evaluate((el) => getComputedStyle(el).color);
    expect(searchColor).toBe("rgb(184, 69, 47)");

    await page.goto("/selling");
    await dismissLanguage(page);
    const cabinetColor = await page.getByTestId("tab-profile").locator("span").evaluate((el) => getComputedStyle(el).color);
    expect(cabinetColor).toBe("rgb(184, 69, 47)");

    await page.goto("/");
    await dismissLanguage(page);
    await page.getByTestId("tab-favorites").click();
    await expect(page).toHaveURL(/\/login/);
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const raw = localStorage.getItem("konshu-state-v1");
          if (!raw) return "";
          return JSON.parse(raw).pendingPath || "";
        }),
      )
      .toBe("/favorites");

    await page.goto("/");
    await dismissLanguage(page);
    await page.getByTestId("tab-search").click();
    await expect(page).toHaveURL(/\/search$/);
  });

  test(`scroll hides the bar at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await installFeed(page);
    await page.goto("/");
    await dismissLanguage(page);
    await expect(page.getByText("Картошка с грядки").first()).toBeVisible();
    const feed = page.getByTestId("home-feed-scroll");
    const room = await feed.evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(room).toBeGreaterThanOrEqual(600);
    await feed.evaluate((el) => {
      el.scrollTop = 600;
    });
    await expect.poll(() => navHeight(page)).toBe(0);
    await feed.evaluate((el) => {
      el.scrollTop = 400;
    });
    await expect.poll(() => navHeight(page)).toBeGreaterThan(60);
    await feed.evaluate((el) => {
      el.scrollTop = 0;
    });
    await expect.poll(() => navHeight(page)).toBeGreaterThan(60);
  });

  test(`search and listing bar at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await installFeed(page);
    await page.goto("/");
    await dismissLanguage(page);
    await expect(page.getByText("Холодильник степ 9").first()).toBeVisible();
    await page.locator("[data-testid='home-search'] input").fill("Картошка");
    await expect(page.getByText("Картошка с грядки").first()).toBeVisible();
    await expect(page.getByText("Холодильник степ 9")).toHaveCount(0);
    await page.locator("[data-testid='home-search'] input").fill("");

    const opened = await page.goto("/search");
    expect(opened?.status()).toBe(200);
    await expect(page.getByText("Разделы")).toBeVisible();
    await expect(page.getByTestId("search-section-animals")).toBeVisible();
    await page.getByTestId("search-query").fill("Картошка");
    await expect(page.getByText("Картошка с грядки").first()).toBeVisible();
    await expect(page.getByText("Разделы")).toHaveCount(0);
    await page.getByTestId("search-query").fill("");
    await expect(page.getByTestId("search-section-animals")).toBeVisible();
    await page.getByTestId("search-section-animals").click();
    await expect(page).toHaveURL(/\/section\/animals/);

    await page.goto("/listing/step9-potato");
    await expect(page.getByTestId("listing-contact")).toBeVisible();
    await page.evaluate(() => {
      const phone = document.getElementById("konshu-phone");
      if (!phone) return;
      const nodes = Array.from(phone.querySelectorAll<HTMLElement>("*"));
      let best = phone;
      let room = phone.scrollHeight - phone.clientHeight;
      for (const el of nodes) {
        const extra = el.scrollHeight - el.clientHeight;
        if (extra > room) {
          room = extra;
          best = el;
        }
      }
      best.scrollTop = Math.min(600, best.scrollHeight);
    });
    await expect.poll(() => navHeight(page)).toBe(0);
    const edges = await page.evaluate(() => {
      const phone = document.getElementById("konshu-phone")!.getBoundingClientRect();
      const bar = document.querySelector("[data-testid='listing-contact']")!.getBoundingClientRect();
      return { phoneBottom: phone.bottom, barBottom: bar.bottom };
    });
    expect(Math.abs(edges.barBottom - edges.phoneBottom)).toBeLessThanOrEqual(2);
  });
}

test("ky tab label and map entries", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await installFeed(page);
  await page.goto("/");
  await dismissLanguage(page);
  await page.getByTestId("home-lang").getByRole("button", { name: "KG" }).click();
  await expect(page.getByTestId("tab-favorites")).toContainText("Себет");
  await expect(page.getByTestId("tab-search")).toContainText("Издөө");
  await expect(page.getByTestId("tab-profile")).toContainText("Кабинет");
  await page.getByTestId("home-lang").getByRole("button", { name: "RU" }).click();
  await expect(page.getByTestId("tab-favorites")).toContainText("Корзина");

  await page.context().grantPermissions(["geolocation"], { origin: "http://localhost:43123" });
  await page.context().setGeolocation({ latitude: 42.8746, longitude: 74.5698 });
  await page.goto("http://localhost:43123/");
  await dismissLanguage(page);
  await page.getByRole("button", { name: "Рядом", exact: true }).click();
  await expect(page.getByTestId("home-map-link")).toBeVisible();
  await page.getByTestId("home-map-link").click();
  await expect(page).toHaveURL(/\/map/);

  await page.goto("/section/restaurants");
  await page.getByRole("button", { name: "Выбрать на карте" }).click();
  await expect(page).toHaveURL(/\/map$/);

  await page.goto("/section/rent/c/all");
  await page.getByRole("button", { name: "Выбрать на карте" }).click();
  await expect(page).toHaveURL(/\/map$/);

  await page.goto("/filters");
  await page.getByRole("button", { name: "Выбрать на карте" }).click();
  await expect(page).toHaveURL(/\/map$/);

  await page.goto("/location");
  await page.getByRole("button", { name: "Выбрать на карте" }).click();
  await expect(page).toHaveURL(/\/map$/);

  await page.goto("/listing/step9-potato");
  await page.getByRole("link", { name: "Показать на карте" }).click();
  await expect(page).toHaveURL(/\/map\?listing=step9-potato/);

  await page.goto("/profile");
  await expect(page.getByText("Покупаю")).toHaveCount(0);
  await expect(page.getByText("Продаю")).toHaveCount(0);
  await expect(page.getByText("1 284")).toHaveCount(0);
  await expect(page.getByText("4,9")).toHaveCount(0);
});
