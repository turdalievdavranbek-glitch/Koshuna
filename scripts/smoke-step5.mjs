import { spawnSync } from "node:child_process";
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

function assert(cond, message, extra) {
  if (!cond) {
    console.error("FAIL", message, extra ?? "");
    process.exit(1);
  }
  console.log("ok", message);
}

async function call(session, method, path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.csrf !== false && method !== "GET" && method !== "HEAD") {
    headers["sec-fetch-site"] = headers["sec-fetch-site"] || "same-origin";
  }
  if (session) {
    const cookie = session.header();
    if (cookie) headers.cookie = cookie;
  }
  let body = options.body;
  if (options.json !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(options.json);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body });
  if (session) session.take(res);
  const text = await res.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}

function ffmpeg30(dest) {
  const run = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "testsrc=size=320x240:rate=15",
      "-f",
      "lavfi",
      "-i",
      "sine",
      "-t",
      "30",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-b:v",
      "2500k",
      "-minrate",
      "2500k",
      "-maxrate",
      "2500k",
      "-bufsize",
      "2500k",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-pix_fmt",
      "yuv420p",
      dest,
    ],
    { stdio: "pipe" },
  );
  if (run.status !== 0 || !existsSync(dest)) {
    console.error(run.stderr?.toString());
    throw new Error("ffmpeg 30s mp4 failed");
  }
}

async function main() {
  const shops = await call(null, "GET", "/shops/new");
  assert(shops.status === 200, "GET /shops/new 200", shops.status);
  assert(typeof shops.data === "string" && !shops.data.includes("window is not defined"), "shops/new has no window crash");

  const sw = await call(null, "GET", "/sw.js");
  const swType = sw.headers.get("content-type") || "";
  const swCache = sw.headers.get("cache-control") || "";
  assert(sw.status === 200 && swType.includes("javascript"), "GET /sw.js javascript", `${sw.status} ${swType}`);
  assert(swCache.includes("no-cache"), "sw.js cache-control no-cache", swCache);
  const offline = await call(null, "GET", "/offline.html");
  assert(offline.status === 200 && typeof offline.data === "string" && offline.data.includes("Нет интернета"), "GET /offline.html", offline.status);

  ffmpeg30("/tmp/step5-30.mp4");
  const bytes = readFileSync("/tmp/step5-30.mp4");
  assert(bytes.length > 512 * 1024 * 2, "30s mp4 is larger than two chunks", bytes.length);

  const A = jar();
  const login = await call(A, "POST", "/api/auth/demo", {
    json: { method: "sms", phone: "555333005", name: "Smoke Step5" },
  });
  assert(login.status === 200, "demo login", login.status);

  const start = await call(A, "POST", "/api/uploads", {
    json: { kind: "video", mime: "video/mp4", size: bytes.length, durationSec: 30 },
  });
  assert(start.status === 200 && start.data?.uploadId, "POST /api/uploads", start);
  const id = start.data.uploadId;
  const chunk = 512 * 1024;
  for (let i = 0; i < 2; i += 1) {
    const offset = i * chunk;
    const part = bytes.subarray(offset, offset + chunk);
    const put = await call(A, "PUT", `/api/uploads/${id}?offset=${offset}`, {
      body: part,
      headers: { "content-type": "application/octet-stream" },
    });
    assert(put.status === 200, `chunk ${i + 1}`, put);
  }

  const B = jar();
  const again = await call(B, "POST", "/api/auth/demo", {
    json: { method: "sms", phone: "555333005", name: "Smoke Step5" },
  });
  assert(again.status === 200, "second demo login", again.status);
  const probe = await call(B, "GET", `/api/uploads/${id}`);
  assert(probe.status === 200 && probe.data?.received === 1048576, "resume received 1048576", probe);

  let offset = probe.data.received;
  while (offset < bytes.length) {
    const end = Math.min(offset + chunk, bytes.length);
    const part = bytes.subarray(offset, end);
    const put = await call(B, "PUT", `/api/uploads/${id}?offset=${offset}`, {
      body: part,
      headers: { "content-type": "application/octet-stream" },
    });
    assert(put.status === 200, `resume chunk at ${offset}`, put.status);
    offset = put.data.received;
  }
  const done = await call(B, "POST", `/api/uploads/${id}/complete`);
  assert(done.status === 200 && typeof done.data?.url === "string" && done.data.url.startsWith("/media/"), "complete", done);
  const media = await fetch(`${BASE}${done.data.url}`);
  const buf = Buffer.from(await media.arrayBuffer());
  assert(media.status === 200 && buf.length === bytes.length, "GET media size", `${media.status} ${buf.length} vs ${bytes.length}`);
  console.log("smoke step5 passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
