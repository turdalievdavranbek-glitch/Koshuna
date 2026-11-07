#!/usr/bin/env node
/**
 * Run on the server after deploy. Reads TELEGRAM_BOT_TOKEN and
 * TELEGRAM_WEBHOOK_SECRET from the environment and prints only "ok"
 * or Telegram's error description. Never prints the token or the request URL.
 */
const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
const secret = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();

function say(text) {
  const hidden = token && text.includes(token) ? text.split(token).join("[redacted]") : text;
  console.log(hidden);
}

if (!token || !secret) {
  say("missing TELEGRAM_BOT_TOKEN or TELEGRAM_WEBHOOK_SECRET");
  process.exit(1);
}

try {
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: "https://koshuna.ru/api/auth/telegram/webhook",
      secret_token: secret,
      allowed_updates: ["message", "callback_query"],
    }),
  });
  const data = await res.json().catch(() => null);
  if (data && data.ok === true) {
    say("ok");
  } else {
    say(typeof data?.description === "string" && data.description ? data.description : "telegram error");
    process.exit(1);
  }
} catch {
  say("telegram error");
  process.exit(1);
}
