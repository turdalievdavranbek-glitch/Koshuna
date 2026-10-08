import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

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

function assert(cond, message, extra) {
  if (!cond) {
    console.error("FAIL", message, extra ?? "");
    process.exit(1);
  }
  console.log("ok", message);
}

async function call(path) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith(".js")) out.push(path);
  }
  return out;
}

async function main() {
  for (const path of ["/", "/location", "/map", "/post"]) {
    const res = await call(path);
    assert(res.status === 200, `GET ${path} 200`, res.status);
  }

  const sw = await call("/sw.js");
  const cache = sw.headers.get("cache-control") || "";
  assert(sw.status === 200 && cache.includes("no-cache"), "sw.js cache-control no-cache", `${sw.status} ${cache}`);
  assert(
    typeof sw.data === "string" && sw.data.includes('const VERSION = "k5-1"') && sw.data.includes('const CACHE = "konshu-" + VERSION'),
    "sw.js CACHE name unchanged",
    sw.data?.slice?.(0, 80),
  );

  const files = walk(".next/static/chunks");
  assert(files.length > 0, "built chunks exist", files.length);
  const blob = files.map((file) => readFileSync(file, "utf8")).join("\n");
  assert(blob.includes("maps.2gis.com/tiles"), "chunks contain 2gis tiles");
  assert(blob.includes("tile.openstreetmap.org"), "chunks contain osm tile url");
  assert(!blob.includes('2gis.kg" target'), "chunks have no 2gis attribution link");

  const listings = await call("/api/listings");
  assert(listings.status === 200 && listings.data && Array.isArray(listings.data.listings), "GET /api/listings json 200", listings.status);
  console.log("smoke step6 passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
