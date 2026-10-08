#!/usr/bin/env node
/**
 * Telegram's servers time out opening the public webhook, so this process
 * long-polls getUpdates and posts each update to the local app. A webhook
 * and getUpdates cannot run together, so the webhook is removed on start.
 *
 * TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET come only from the
 * environment. Never print the token, the secret, or the Bot API URL.
 */
const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
const secret = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();

/** Same port as `next start -p 43123` in ecosystem.config.cjs. */
const APP_PORT = 43123;
const LOCAL_WEBHOOK = `http://127.0.0.1:${APP_PORT}/api/auth/telegram/webhook`;
const POLL_SECONDS = 50;
const RETRY_MS = 3000;

function say(text) {
  let out = String(text ?? "");
  if (token) out = out.split(token).join("[redacted]");
  if (secret) out = out.split(secret).join("[redacted]");
  console.log(out);
}

if (!token || !secret) {
  say("missing TELEGRAM_BOT_TOKEN or TELEGRAM_WEBHOOK_SECRET");
  process.exit(1);
}

const shutdown = new AbortController();
process.on("SIGINT", () => shutdown.abort());
process.on("SIGTERM", () => shutdown.abort());

function sleep(ms) {
  return new Promise((resolve) => {
    if (shutdown.signal.aborted) {
      resolve();
      return;
    }
    const done = () => {
      clearTimeout(timer);
      shutdown.signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    shutdown.signal.addEventListener("abort", done);
  });
}

async function telegram(method, body, timeoutMs) {
  const ctrl = new AbortController();
  const onStop = () => ctrl.abort();
  shutdown.signal.addEventListener("abort", onStop, { once: true });
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch {
    if (shutdown.signal.aborted) {
      const stopped = new Error("stopped");
      stopped.stopped = true;
      throw stopped;
    }
    throw new Error("network error");
  } finally {
    clearTimeout(timer);
    shutdown.signal.removeEventListener("abort", onStop);
  }
  const data = await res.json().catch(() => null);
  if (!data || data.ok !== true) {
    const description =
      typeof data?.description === "string" && data.description ? data.description : "telegram error";
    const error = new Error(description);
    error.code = typeof data?.error_code === "number" ? data.error_code : 0;
    throw error;
  }
  return data;
}

async function postUpdate(update) {
  const ctrl = new AbortController();
  const onStop = () => ctrl.abort();
  shutdown.signal.addEventListener("abort", onStop, { once: true });
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let res;
  try {
    res = await fetch(LOCAL_WEBHOOK, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Telegram-Bot-Api-Secret-Token": secret,
      },
      body: JSON.stringify(update),
      signal: ctrl.signal,
    });
  } catch {
    if (shutdown.signal.aborted) {
      const stopped = new Error("stopped");
      stopped.stopped = true;
      throw stopped;
    }
    throw new Error("network error");
  } finally {
    clearTimeout(timer);
    shutdown.signal.removeEventListener("abort", onStop);
  }
  if (!res.ok) throw new Error(`local webhook ${res.status}`);
  await res.text().catch(() => "");
}

let offset;

async function pollOnce() {
  const body = {
    timeout: POLL_SECONDS,
    allowed_updates: ["message", "callback_query"],
  };
  if (typeof offset === "number") body.offset = offset;
  const data = await telegram("getUpdates", body, (POLL_SECONDS + 15) * 1000);
  const updates = Array.isArray(data.result) ? data.result : [];
  for (const update of updates) {
    if (shutdown.signal.aborted) return;
    const id = update && Number.isInteger(update.update_id) ? update.update_id : null;
    if (id === null) throw new Error("telegram error");
    await postUpdate(update);
    offset = id + 1;
  }
}

async function main() {
  let webhookCleared = false;
  while (!shutdown.signal.aborted) {
    try {
      if (!webhookCleared) {
        await telegram("deleteWebhook", { drop_pending_updates: false }, 15000);
        webhookCleared = true;
        say("webhook off, polling");
      }
      await pollOnce();
    } catch (err) {
      if (shutdown.signal.aborted || err?.stopped) break;
      const message = err instanceof Error ? err.message : "network error";
      if (err?.code === 409 || /webhook is active/i.test(message)) webhookCleared = false;
      say(message);
      await sleep(RETRY_MS);
    }
  }
}

await main();
