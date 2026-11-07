import { existsSync, readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { refreshStoredCourierPhoto } from "../src/server/courier-image";
import { getDb } from "../src/server/db";
import { courierApplications } from "../src/server/db/schema";

function loadEnvFile(file: string) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const cut = trimmed.indexOf("=");
    if (cut <= 0) continue;
    const key = trimmed.slice(0, cut).trim();
    let value = trimmed.slice(cut + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing");
    process.exit(1);
  }
  if (!process.env.PRIVATE_MEDIA_DIR && !process.env.MEDIA_DIR) {
    console.error("PRIVATE_MEDIA_DIR or MEDIA_DIR is missing");
    process.exit(1);
  }
  const db = getDb();
  const rows = await db
    .select({
      id: courierApplications.id,
      passportPath: courierApplications.passportPath,
      selfiePath: courierApplications.selfiePath,
    })
    .from(courierApplications);
  let updated = 0;
  for (const row of rows) {
    const passport = await refreshStoredCourierPhoto(row.passportPath);
    const selfie = await refreshStoredCourierPhoto(row.selfiePath);
    if (passport !== row.passportPath || selfie !== row.selfiePath) {
      await db
        .update(courierApplications)
        .set({ passportPath: passport, selfiePath: selfie })
        .where(eq(courierApplications.id, row.id));
      updated += 1;
    }
  }
  console.log(`courier photos ${rows.length * 2}, applications rewritten ${updated}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
