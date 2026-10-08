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

function assert(cond, message, extra) {
  if (!cond) {
    console.error("FAIL", message, extra ?? "");
    process.exit(1);
  }
  console.log("ok", message);
}

async function call(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  return { status: res.status };
}

async function main() {
  const okPaths = [
    "/section/services",
    "/section/services/c/svc-health",
    "/section/services/c/svc-health/all",
    "/section/services/c/svc-leisure/sauna",
    "/section/animals/c/plants/potato",
    "/section/cars/c/special/truck",
    "/shops/c/health/health-pharmacy",
    "/shops/new",
    "/post",
  ];
  for (const path of okPaths) {
    const res = await call(path);
    assert(res.status === 200, `GET ${path} 200`, res.status);
  }

  const unknown = await call("/section/services/c/svc-unknown");
  const redirected = unknown.status >= 300 && unknown.status < 400;
  assert(unknown.status === 404 || redirected, "GET /section/services/c/svc-unknown 404 or redirect", unknown.status);
  console.log("smoke step7 passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
