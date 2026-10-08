import { expect, test, type Page } from "@playwright/test";

async function dismissLanguage(page: Page) {
  const ru = page.getByRole("button", { name: "RU / Русский" });
  if (await ru.isVisible().catch(() => false)) await ru.click();
}

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

for (const viewport of [
  { width: 360, height: 800 },
  { width: 412, height: 915 },
]) {
  test(`home language switch at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await dismissLanguage(page);
    const lang = page.getByTestId("home-lang");
    const location = page.getByTestId("home-location");
    const bell = page.getByTestId("home-bell");
    await expect(lang).toBeVisible();
    const boxes = {
      lang: await lang.boundingBox(),
      location: await location.boundingBox(),
      bell: await bell.boundingBox(),
    };
    expect(boxes.lang).toBeTruthy();
    expect(boxes.location).toBeTruthy();
    expect(boxes.bell).toBeTruthy();
    const langBox = boxes.lang!;
    const locationBox = boxes.location!;
    const bellBox = boxes.bell!;
    expect(langBox.x).toBeGreaterThanOrEqual(0);
    expect(langBox.y).toBeGreaterThanOrEqual(0);
    expect(langBox.x + langBox.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(langBox.y + langBox.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(overlaps(langBox, locationBox)).toBe(false);
    expect(overlaps(langBox, bellBox)).toBe(false);
    expect(overlaps(locationBox, bellBox)).toBe(false);
    const scroll = await page.evaluate(() => {
      const phone = document.getElementById("konshu-phone");
      const root = document.documentElement;
      return {
        doc: root.scrollWidth <= root.clientWidth + 1,
        phone: !phone || phone.scrollWidth <= phone.clientWidth + 1,
      };
    });
    expect(scroll.doc).toBe(true);
    expect(scroll.phone).toBe(true);

    await lang.getByRole("button", { name: "KG" }).click();
    await expect(page.getByText("Райондогу жаңылыктар").first()).toBeVisible();
    await page.reload();
    await expect(page.getByText("Райондогу жаңылыктар").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "RU / Русский" })).toHaveCount(0);
  });
}

test("login is Google only and + asks to sign in", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/login");
  await dismissLanguage(page);
  await expect(page.getByTestId("google-login")).toBeVisible();
  await expect(page.getByRole("link", { name: "Продолжить без авторизации" })).toBeVisible();
  await expect(page.locator("input[type='email'], input[type='tel'], input[inputmode='numeric']")).toHaveCount(0);
  await page.getByRole("link", { name: "Продолжить без авторизации" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/");
  await dismissLanguage(page);
  await page.getByRole("button", { name: "Новое объявление" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const raw = localStorage.getItem("konshu-state-v1");
        if (!raw) return "";
        return JSON.parse(raw).pendingPath || "";
      });
    })
    .toBe("/post");
});
