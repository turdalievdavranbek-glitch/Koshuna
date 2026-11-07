/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");

function readEnv(file) {
  try {
    const text = fs.readFileSync(file, "utf8");
    const env = {};
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
      env[key] = value;
    }
    return env;
  } catch {
    console.warn(`backend env file missing: ${file}`);
    return {};
  }
}

module.exports = {
  apps: [
    {
      name: "koshuna",
      cwd: "/var/www/koshuna",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 43123",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "700M",
      env: {
        NODE_ENV: "production",
        ...readEnv("/etc/koshuna/backend.env"),
      },
    },
    {
      // Telegram's servers time out before they can open the public webhook.
      // One long-poller posts each update to the local webhook instead.
      name: "koshuna-telegram-relay",
      cwd: "/var/www/koshuna",
      script: "scripts/telegram-relay.mjs",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
        ...readEnv("/etc/koshuna/backend.env"),
      },
    },
  ],
};
