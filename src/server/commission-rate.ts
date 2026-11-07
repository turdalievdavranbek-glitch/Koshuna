import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { appSettings } from "./db/schema";

const KEY = "commission_percent";

/** 0–50, at most two decimal places. Anything else is rejected. */
export function parseCommissionPercent(value: unknown): number | null {
  const raw = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim().replace(",", ".")) : NaN;
  if (!Number.isFinite(raw) || raw < 0 || raw > 50) return null;
  return Math.round(raw * 100) / 100;
}

/** Live rate. Missing row or a bad value stays at 0. */
export async function readCommissionPercent(): Promise<number> {
  const rows = await getDb().select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, KEY)).limit(1);
  return parseCommissionPercent(rows[0]?.value) ?? 0;
}

export async function writeCommissionPercent(percent: number): Promise<void> {
  const value = percent.toFixed(2);
  await getDb()
    .insert(appSettings)
    .values({ key: KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
}
