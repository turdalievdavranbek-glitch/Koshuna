import { createHash, createHmac } from "crypto";
import { expect, test, type Page } from "@playwright/test";
import { signInWithIdentity } from "../src/server/auth";
import {
  beginTelegramAppLogin,
  handleTelegramUpdate,
  handleTelegramWebhook,
  pollTelegramLogin,
  publicAuthConfig,
  resetTelegramLoginsForTests,
  safeNextPath,
  telegramApi,
  verifyTelegramLogin,
} from "../src/server/telegram";

const FAKE_TOKEN = "123456789:AAFakeTokenForTestsOnly";
const FAKE_USERNAME = "ExampleBot";
const FAKE_SECRET = "test-webhook-secret";

function independentHash(params: Record<string, string>, token: string): string {
  const data = Object.keys(params)
    .filter((key) => key !== "hash")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("\n");
  const secret = createHash("sha256").update(token).digest();
  return createHmac("sha256", secret).update(data).digest("hex");
}

function fields(nowSec: number): Record<string, string> {
  return {
    id: "42",
    first_name: "Айбек",
    last_name: "НеСохраняем",
    username: "aibek",
    photo_url: "https://t.me/i/userpic/320/aibek.jpg",
    auth_date: String(nowSec),
  };
}

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

test("hash check accepts a real signature and rejects a bad one", () => {
  const nowSec = 1_700_000_000;
  const params = fields(nowSec);
  const hash = independentHash(params, FAKE_TOKEN);
  expect(verifyTelegramLogin({ ...params, hash }, FAKE_TOKEN, nowSec)).toEqual({ id: "42", firstName: "Айбек" });
  expect(verifyTelegramLogin({ ...params, hash }, FAKE_TOKEN, nowSec + 3600)).toEqual({ id: "42", firstName: "Айбек" });

  const wrong = hash.slice(0, -1) + (hash.endsWith("0") ? "1" : "0");
  expect(verifyTelegramLogin({ ...params, hash: wrong }, FAKE_TOKEN, nowSec)).toBeNull();
  expect(verifyTelegramLogin({ ...params, hash: "abc" }, FAKE_TOKEN, nowSec)).toBeNull();
  expect(verifyTelegramLogin({ ...params, hash: independentHash(params, "999:OTHER") }, FAKE_TOKEN, nowSec)).toBeNull();
  expect(verifyTelegramLogin({ ...params, hash }, FAKE_TOKEN, nowSec + 3601)).toBeNull();
  expect(verifyTelegramLogin({ ...params, hash: independentHash({ ...params, auth_date: String(nowSec + 301) }, FAKE_TOKEN), auth_date: String(nowSec + 301) }, FAKE_TOKEN, nowSec)).toBeNull();

  const noId = { ...params };
  delete noId.id;
  expect(verifyTelegramLogin({ ...noId, hash: independentHash(noId, FAKE_TOKEN) }, FAKE_TOKEN, nowSec)).toBeNull();
  expect(verifyTelegramLogin({ ...params, id: "not-a-user", hash }, FAKE_TOKEN, nowSec)).toBeNull();
});

test("open redirect destinations fall back to /", () => {
  expect(safeNextPath("/post")).toBe("/post");
  expect(safeNextPath("%2Fpost")).toBe("/post");
  expect(safeNextPath("//evil.example")).toBe("/");
  expect(safeNextPath("/%2F%2Fevil.example")).toBe("/");
  expect(safeNextPath("https://evil.example")).toBe("/");
  expect(safeNextPath(null)).toBe("/");
});

test("config never contains the token", () => {
  const prevToken = process.env.TELEGRAM_BOT_TOKEN;
  const prevUser = process.env.TELEGRAM_BOT_USERNAME;
  try {
    process.env.TELEGRAM_BOT_TOKEN = FAKE_TOKEN;
    process.env.TELEGRAM_BOT_USERNAME = FAKE_USERNAME;
    const on = publicAuthConfig();
    const raw = JSON.stringify(on);
    expect(raw).not.toContain("AAFakeTokenForTestsOnly");
    expect(raw).not.toContain("TELEGRAM_BOT_TOKEN");
    expect(on.telegram).toEqual({ enabled: true, botUsername: FAKE_USERNAME, botId: "123456789" });
    expect(on.google).toHaveProperty("clientId");

    delete process.env.TELEGRAM_BOT_USERNAME;
    const half = publicAuthConfig();
    expect(half.telegram.enabled).toBe(false);
    expect(half.telegram.botId).toBeNull();
    expect(JSON.stringify(half)).not.toContain("AAFakeTokenForTestsOnly");

    delete process.env.TELEGRAM_BOT_TOKEN;
    const off = publicAuthConfig();
    expect(off.telegram).toEqual({ enabled: false, botUsername: null, botId: null });
  } finally {
    if (prevToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = prevToken;
    if (prevUser === undefined) delete process.env.TELEGRAM_BOT_USERNAME;
    else process.env.TELEGRAM_BOT_USERNAME = prevUser;
  }
});

test("webhook rejects a missing or wrong secret", async () => {
  const prev = process.env.TELEGRAM_WEBHOOK_SECRET;
  process.env.TELEGRAM_WEBHOOK_SECRET = FAKE_SECRET;
  try {
    const url = "https://koshuna.ru/api/auth/telegram/webhook";
    expect((await handleTelegramWebhook(new Request(url, { method: "POST", body: "{}" }))).status).toBe(401);
    expect(
      (
        await handleTelegramWebhook(
          new Request(url, { method: "POST", headers: { "x-telegram-bot-api-secret-token": "wrong-secret" }, body: "{}" }),
        )
      ).status,
    ).toBe(401);
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    expect(
      (
        await handleTelegramWebhook(
          new Request(url, { method: "POST", headers: { "x-telegram-bot-api-secret-token": FAKE_SECRET }, body: "{}" }),
        )
      ).status,
    ).toBe(401);
  } finally {
    if (prev === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET;
    else process.env.TELEGRAM_WEBHOOK_SECRET = prev;
  }
});

test("start, confirm, poll succeeds once, then expires", async () => {
  const prevToken = process.env.TELEGRAM_BOT_TOKEN;
  const prevUser = process.env.TELEGRAM_BOT_USERNAME;
  const prevSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  process.env.TELEGRAM_BOT_TOKEN = FAKE_TOKEN;
  process.env.TELEGRAM_BOT_USERNAME = FAKE_USERNAME;
  process.env.TELEGRAM_WEBHOOK_SECRET = FAKE_SECRET;
  resetTelegramLoginsForTests();
  const calls: Array<{ method: string; body: Record<string, unknown> }> = [];
  const original = telegramApi.call;
  telegramApi.call = async (method, body) => {
    calls.push({ method, body });
    return { ok: true, result: { message_id: 7 } };
  };
  let signs = 0;
  const signIn: typeof signInWithIdentity = async (input) => {
    signs += 1;
    expect(input.provider).toBe("telegram");
    expect(input.providerUserId).toBe("777");
    expect(input.profile.name).toBe("Айбек");
    expect(input.profile.phone).toBeUndefined();
    expect(input.profile.email).toBeUndefined();
    return {
      cookie: "ksid=test-session",
      isNew: true,
      user: {
        id: "user-1",
        name: "Айбек",
        phone: null,
        email: null,
        createdAt: new Date("2026-10-08T00:00:00Z"),
        lang: "ru",
        city: null,
        district: null,
        method: "telegram",
      },
    };
  };
  try {
    const started = beginTelegramAppLogin(
      new Request("https://koshuna.ru/api/auth/telegram/start", {
        method: "POST",
        headers: { origin: "https://koshuna.ru", host: "koshuna.ru", "x-forwarded-for": "203.0.113.10" },
      }),
    );
    expect(started.status).toBe(200);
    if (started.status !== 200) return;
    expect(started.link.startsWith("https://t.me/ExampleBot?start=")).toBe(true);
    expect(started.cookie).toContain("ktg=");
    expect(started.cookie).toContain("HttpOnly");
    expect(started.cookie).toContain("Secure");
    expect(started.cookie).toContain("Path=/api/auth/telegram");
    expect(started.cookie).toContain("SameSite=Lax");
    expect(started.cookie).toContain("Max-Age=600");
    expect(started.cookie).not.toContain("AAFakeTokenForTestsOnly");
    const id = new URL(started.link).searchParams.get("start") || "";
    expect(id).toMatch(/^[A-Za-z0-9_-]{22,64}$/);

    const blocked = beginTelegramAppLogin(
      new Request("https://koshuna.ru/api/auth/telegram/start", {
        method: "POST",
        headers: { origin: "https://evil.example", host: "koshuna.ru" },
      }),
    );
    expect(blocked.status).toBe(403);

    await handleTelegramUpdate({
      message: {
        text: `/start ${id}`,
        chat: { id: 50, type: "private" },
        from: { id: 1, first_name: "Bot", is_bot: true },
      },
    });
    expect(calls).toHaveLength(0);

    const pending = await pollTelegramLogin(id, "app", signIn);
    expect(pending).toEqual({ ok: false, status: "pending" });
    expect(signs).toBe(0);

    const startedHook = await handleTelegramWebhook(
      new Request("https://koshuna.ru/api/auth/telegram/webhook", {
        method: "POST",
        headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": FAKE_SECRET },
        body: JSON.stringify({
          message: {
            text: `/start ${id}`,
            chat: { id: 50, type: "private" },
            from: { id: 777, first_name: "Айбек", is_bot: false },
          },
        }),
      }),
    );
    expect(startedHook.status).toBe(200);
    expect(calls.some((call) => call.method === "sendMessage" && String(call.body.text).includes("Подтвердить"))).toBe(true);
    const keyboard = JSON.stringify(calls.find((call) => call.method === "sendMessage")?.body.reply_markup);
    expect(keyboard).toContain("Подтвердить вход");
    expect(keyboard).toContain("Кирүүнү ырастоо");
    expect(keyboard).toContain(`ok:${id}`);

    const still = await pollTelegramLogin(id, "app", signIn);
    expect(still).toEqual({ ok: false, status: "pending" });

    const confirmed = await handleTelegramWebhook(
      new Request("https://koshuna.ru/api/auth/telegram/webhook", {
        method: "POST",
        headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": FAKE_SECRET },
        body: JSON.stringify({
          callback_query: {
            id: "cb1",
            data: `ok:${id}`,
            from: { id: 777, first_name: "Айбек", is_bot: false },
            message: { message_id: 7, chat: { id: 50, type: "private" } },
          },
        }),
      }),
    );
    expect(confirmed.status).toBe(200);
    expect(calls.some((call) => call.method === "editMessageText" && String(call.body.text).includes("Готово! Вернитесь в приложение Коңшу."))).toBe(true);

    const ok = await pollTelegramLogin(id, "app", signIn);
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.user.name).toBe("Айбек");
    expect(ok.user.method).toBe("telegram");
    expect(ok.cookie).toContain("ksid=");
    expect(signs).toBe(1);

    const again = await pollTelegramLogin(id, "app", signIn);
    expect(again).toEqual({ ok: false, status: "expired", clearCookie: true });
    expect(signs).toBe(1);

    for (let i = 0; i < 5; i += 1) {
      const next = beginTelegramAppLogin(
        new Request("https://koshuna.ru/api/auth/telegram/start", {
          method: "POST",
          headers: { origin: "https://koshuna.ru", host: "koshuna.ru", "x-forwarded-for": "203.0.113.50" },
        }),
      );
      expect(next.status).toBe(200);
    }
    const limited = beginTelegramAppLogin(
      new Request("https://koshuna.ru/api/auth/telegram/start", {
        method: "POST",
        headers: { origin: "https://koshuna.ru", host: "koshuna.ru", "x-forwarded-for": "203.0.113.50" },
      }),
    );
    expect(limited.status).toBe(429);
  } finally {
    telegramApi.call = original;
    resetTelegramLoginsForTests();
    if (prevToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = prevToken;
    if (prevUser === undefined) delete process.env.TELEGRAM_BOT_USERNAME;
    else process.env.TELEGRAM_BOT_USERNAME = prevUser;
    if (prevSecret === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET;
    else process.env.TELEGRAM_WEBHOOK_SECRET = prevSecret;
  }
});

test("login page hides Telegram when the config is off and shows it when on", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });

  const fulfill = (enabled: boolean) => {
    return page.route("**/api/auth/config", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "cache-control": "no-store" },
        body: JSON.stringify({
          google: { clientId: null },
          telegram: enabled
            ? { enabled: true, botUsername: FAKE_USERNAME, botId: "123456789" }
            : { enabled: false, botUsername: null, botId: null },
        }),
      }),
    );
  };

  await fulfill(false);
  await page.goto("/login?tg=error");
  await dismissLanguage(page);
  await expect(page.getByTestId("google-login")).toBeVisible();
  await expect(page.getByTestId("telegram-login")).toHaveCount(0);
  await expect(page.getByText("Не получилось войти через Telegram. Попробуйте ещё раз.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Продолжить без авторизации" })).toBeVisible();
  await expect(page.locator("input[type='email'], input[type='tel'], input[inputmode='numeric']")).toHaveCount(0);

  await page.unroute("**/api/auth/config");
  await fulfill(true);
  await page.route("https://telegram.org/**", (route) => route.abort());
  await page.goto("/login");
  await dismissLanguage(page);
  const block = page.getByTestId("telegram-login");
  await expect(block).toBeVisible();
  await expect(block.getByRole("button", { name: "Войти через Telegram" })).toBeVisible();
  await expect(block.getByText("или")).toBeVisible();
  await expect(block.getByText("Если вы уже входили через Google — входите через Google, иначе будет второй аккаунт.")).toBeVisible();
  await expect(page.getByTestId("google-login")).toBeVisible();
  await page.getByRole("button", { name: "KG" }).click();
  await expect(block.getByRole("button", { name: "Telegram аркылуу кирүү" })).toBeVisible();
  await expect(block.getByText("же")).toBeVisible();
  await page.getByRole("button", { name: "RU" }).click();
  const telegramButton = block.getByRole("button", { name: "Войти через Telegram" });
  await expect(telegramButton).toBeEnabled();
  await telegramButton.click();
  const script = page.locator("script[src*='telegram-widget.js']");
  await expect(script).toHaveCount(1);
  await expect(script).toHaveAttribute("data-telegram-login", FAKE_USERNAME);
  await expect(script).toHaveAttribute("data-size", "large");
  await expect(script).toHaveAttribute("data-lang", "ru");
  await expect(script).toHaveAttribute("data-auth-url", /\/api\/auth\/telegram\/callback$/);
  expect(await script.evaluate((el) => el.getAttribute("data-request-access"))).toBeNull();
  await expect(page.locator("body")).not.toContainText(FAKE_TOKEN);
  await expect(page.locator("body")).not.toContainText("AAFakeTokenForTestsOnly");
});
