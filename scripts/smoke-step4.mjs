import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import postgres from "postgres";

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
const TINY_JPEG = Buffer.from(
  "ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda00080001000100003f00fbffd9",
  "hex",
);

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
  return { status: res.status, data };
}

async function upload(session, kind, mime, bytes, durationSec, { resume = false } = {}) {
  const start = await call(session, "POST", "/api/uploads", {
    json: { kind, mime, size: bytes.length, ...(durationSec != null ? { durationSec } : {}) },
  });
  if (start.status !== 200) return { start, done: null };
  const id = start.data.uploadId;
  const chunkSize = start.data.chunkSize || 2097152;
  let offset = 0;
  const stopAt = resume ? Math.max(1, Math.floor(bytes.length / 2)) : bytes.length;
  while (offset < stopAt) {
    const end = Math.min(offset + chunkSize, stopAt);
    const part = bytes.subarray(offset, end);
    const put = await call(session, "PUT", `/api/uploads/${id}?offset=${offset}`, {
      body: part,
      headers: { "content-type": "application/octet-stream" },
    });
    if (put.status === 409 && put.data && typeof put.data.received === "number") {
      offset = put.data.received;
      continue;
    }
    if (put.status !== 200) return { start, done: put, id };
    offset = put.data.received;
  }
  if (resume) {
    const probe = await call(session, "GET", `/api/uploads/${id}`);
    if (probe.status !== 200 || probe.data.received !== stopAt) return { start, done: probe, id };
    while (offset < bytes.length) {
      const end = Math.min(offset + chunkSize, bytes.length);
      const part = bytes.subarray(offset, end);
      const put = await call(session, "PUT", `/api/uploads/${id}?offset=${offset}`, {
        body: part,
        headers: { "content-type": "application/octet-stream" },
      });
      if (put.status !== 200) return { start, done: put, id };
      offset = put.data.received;
    }
  }
  const done = await call(session, "POST", `/api/uploads/${id}/complete`);
  return { start, done, id };
}

function ffmpegWebm(seconds, dest) {
  const run = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `testsrc=size=160x120:rate=10`,
      "-t",
      String(seconds),
      "-c:v",
      "libvpx",
      "-f",
      "webm",
      "-live",
      "1",
      dest,
    ],
    { stdio: "pipe" },
  );
  if (run.status !== 0 || !existsSync(dest)) {
    console.error(run.stderr?.toString());
    throw new Error(`ffmpeg webm failed for ${dest}`);
  }
}

function ffmpegFile(seconds, dest) {
  const exact = spawnSync(
    "ffmpeg",
    ["-y", "-f", "lavfi", "-i", "testsrc=size=160x120:rate=5", "-t", String(seconds), "-pix_fmt", "yuv420p", dest],
    { stdio: "pipe" },
  );
  if (exact.status === 0 && existsSync(dest)) return;
  const encoded = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "testsrc=size=160x120:rate=5",
      "-t",
      String(seconds),
      "-pix_fmt",
      "yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      dest,
    ],
    { stdio: "pipe" },
  );
  if (encoded.status !== 0 || !existsSync(dest)) {
    console.error(exact.stderr?.toString() || encoded.stderr?.toString());
    throw new Error(`ffmpeg failed for ${dest}`);
  }
}

async function main() {
  const A = jar();
  const B = jar();
  const loginA = await call(A, "POST", "/api/auth/demo", {
    json: { method: "sms", phone: "555111001", name: "Smoke A" },
  });
  assert(loginA.status === 200, "A demo login", loginA);
  const meA = await call(A, "GET", "/api/me");
  assert(meA.status === 200 && meA.data?.user?.id, "A GET /api/me", meA);

  const photo = await upload(A, "photo", "image/jpeg", TINY_JPEG);
  assert(photo.done?.status === 200 && typeof photo.done.data?.url === "string", "A photo upload", photo);
  const listingId = `user-smoke-${Date.now()}`;
  const saved = await call(A, "PUT", `/api/listings/${listingId}`, {
    json: {
      section: "secondhand",
      title: "Smoke apple",
      description: "smoke",
      price: 100,
      city: "bishkek",
      photos: [photo.done.data.url],
      status: "active",
    },
  });
  assert(saved.status === 200 && saved.data?.listing?.id === listingId, "A PUT listing", saved);

  const loginB = await call(B, "POST", "/api/auth/demo", {
    json: { method: "sms", phone: "555222002", name: "Smoke B" },
  });
  assert(loginB.status === 200, "B demo login", loginB);
  const meB = await call(B, "GET", "/api/me");
  assert(meB.status === 200 && meB.data?.user?.id, "B GET /api/me", meB);
  const bId = meB.data.user.id;

  const feed = await call(B, "GET", "/api/listings?limit=1000");
  assert(feed.status === 200 && feed.data.listings.some((row) => row.id === listingId), "B sees A's listing", feed.status);
  const media = await fetch(`${BASE}${photo.done.data.url}`);
  assert(media.status === 200, "GET photo /media", media.status);

  const like = await call(B, "PUT", `/api/listings/${listingId}/reaction`, { json: { value: "like" } });
  assert(like.status === 200 && like.data.likes === 1, "B like", like);
  const cartPut = await call(B, "PUT", `/api/me/cart/${listingId}`);
  assert(cartPut.status === 200, "cart put", cartPut);
  const cartDel = await call(B, "DELETE", `/api/me/cart/${listingId}`);
  assert(cartDel.status === 200, "cart delete", cartDel);
  const report = await call(B, "POST", "/api/reports", { json: { listingId, reason: "spam" } });
  assert(report.status === 201, "report 201", report);

  const longDeclared = await call(A, "POST", "/api/uploads", {
    json: { kind: "video", mime: "video/mp4", size: 1000, durationSec: 121 },
  });
  assert(longDeclared.status === 400 && longDeclared.data?.error === "video-duration", "declared 121s rejected", longDeclared);

  ffmpegFile(125, "/tmp/long.mp4");
  ffmpegFile(30, "/tmp/short.mp4");
  const longBytes = readFileSync("/tmp/long.mp4");
  const shortBytes = readFileSync("/tmp/short.mp4");
  const longVideo = await upload(A, "video", "video/mp4", longBytes, 60);
  assert(longVideo.done?.status === 400 && longVideo.done.data?.error === "video-duration", "125s file rejected", longVideo.done);
  const shortVideo = await upload(A, "video", "video/mp4", shortBytes, 30);
  assert(shortVideo.done?.status === 200 && shortVideo.done.data?.url, "30s file passes", shortVideo.done);

  ffmpegWebm(125, "/tmp/long-live.webm");
  ffmpegWebm(30, "/tmp/short-live.webm");
  const longWebm = await upload(A, "video", "video/webm", readFileSync("/tmp/long-live.webm"), 60);
  assert(longWebm.done?.status === 400 && longWebm.done.data?.error === "video-duration", "125s headerless webm rejected", longWebm.done);
  const shortWebm = await upload(A, "video", "video/webm", readFileSync("/tmp/short-live.webm"), 30);
  assert(shortWebm.done?.status === 200 && shortWebm.done.data?.url, "30s headerless webm passes", shortWebm.done);

  const resumeBytes = Buffer.concat([TINY_JPEG, Buffer.alloc(4000, 7)]);
  const resumed = await upload(A, "photo", "image/jpeg", resumeBytes, null, { resume: true });
  assert(resumed.done?.status === 200 && resumed.done.data?.url, "chunk resume complete", resumed.done);

  const forbidden = await call(B, "PUT", `/api/listings/${listingId}`, {
    json: { section: "secondhand", title: "stolen", price: 1, city: "bishkek", status: "active" },
  });
  assert(forbidden.status === 403, "non-owner PUT 403", forbidden);
  const csrf = await call(A, "POST", "/api/reports", {
    json: { listingId, reason: "csrf" },
    csrf: false,
  });
  assert(csrf.status === 403, "CSRF 403", csrf);

  const circlesOpen = await call(null, "POST", "/api/internal/jobs/circles", { csrf: false });
  assert(circlesOpen.status === 404, "circles without secret 404", circlesOpen);
  const reminders = await call(null, "POST", "/api/internal/jobs/listing-reminders", {
    csrf: false,
    headers: { "x-jobs-secret": process.env.JOBS_SECRET || "" },
  });
  assert(reminders.status === 200 && reminders.data?.ok === true, "listing-reminders 200", reminders);
  const circlesSecret = await call(null, "POST", "/api/internal/jobs/circles", {
    csrf: false,
    headers: { "x-jobs-secret": process.env.JOBS_SECRET || "" },
  });
  assert(circlesSecret.status === 200 && circlesSecret.data?.ok === true, "circles job 200", circlesSecret);

  const deleted = await call(B, "POST", "/api/me/delete", { json: { source: "app" } });
  assert(deleted.status === 200, "B delete request", deleted);
  const wipe = await call(null, "POST", "/api/internal/jobs/account-deletions", {
    csrf: false,
    headers: { "x-jobs-secret": process.env.JOBS_SECRET || "" },
  });
  assert(wipe.status === 200 && wipe.data?.counts?.completed >= 1, "account-deletions job", wipe);
  const meAfter = await call(B, "GET", "/api/me");
  assert(meAfter.status === 401, "B /api/me 401 after delete", meAfter);
  const after = await call(A, "GET", `/api/listings/${listingId}`);
  assert(after.status === 200 && after.data?.counts?.[listingId]?.likes === 0, "A listing likes 0", after);

  if (process.env.DATABASE_URL) {
    const sql = postgres(process.env.DATABASE_URL, { max: 1 });
    const auth = await sql`select count(*)::int as n from user_auth where user_id = ${bId}`;
    const reactions = await sql`select count(*)::int as n from reactions where user_id = ${bId}`;
    const user = await sql`select name, deleted_at is not null as gone from users where id = ${bId}`;
    await sql.end();
    assert(auth[0].n === 0 && reactions[0].n === 0, "B auth and reactions gone", { auth: auth[0], reactions: reactions[0] });
    assert(user[0]?.name === "" && user[0]?.gone === true, "B anonymised", user[0]);
  }

  console.log("smoke ok", listingId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
