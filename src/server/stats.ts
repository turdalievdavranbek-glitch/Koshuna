import { sql } from "drizzle-orm";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/delivery";
import type { OwnerAccount, OwnerStats } from "@/lib/owner";
import { getDb } from "./db";

const ZONE = "Asia/Bishkek";

const STATUS_RU: Record<OrderStatus, string> = {
  new: "Новый",
  accepted: "Принят",
  assembled: "Собран",
  assigned: "Курьер назначен",
  picked_up: "В пути",
  delivered: "Доставлен",
  rejected: "Отклонён",
  cancelled: "Отменён",
  refused: "Отказ",
  returned: "Возврат",
};

function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function dayKey(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value ?? "").slice(0, 10);
}

function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: Record<string, unknown>[] }).rows;
  }
  return [];
}

export async function ownerStats(): Promise<OwnerStats> {
  const db = getDb();
  const [totalsRaw, ordersRaw, daysRaw] = await Promise.all([
    db.execute(sql`
      WITH b AS (
        SELECT (now() AT TIME ZONE ${ZONE})::date AS today
      )
      SELECT
        (SELECT count(*)::int FROM users WHERE deleted_at IS NULL) AS accounts_total,
        (SELECT count(*)::int FROM users WHERE deleted_at IS NULL
          AND (created_at AT TIME ZONE ${ZONE})::date = (SELECT today FROM b)) AS accounts_today,
        (SELECT count(*)::int FROM users WHERE deleted_at IS NULL
          AND (created_at AT TIME ZONE ${ZONE})::date >= (SELECT today FROM b) - 6) AS accounts_7,
        (SELECT count(*)::int FROM users WHERE deleted_at IS NULL
          AND (created_at AT TIME ZONE ${ZONE})::date >= (SELECT today FROM b) - 29) AS accounts_30,
        (SELECT count(*)::int FROM users WHERE deleted_at IS NULL AND last_seen_at IS NOT NULL
          AND (last_seen_at AT TIME ZONE ${ZONE})::date = (SELECT today FROM b)) AS active_today,
        (SELECT count(*)::int FROM users WHERE deleted_at IS NULL AND last_seen_at IS NOT NULL
          AND (last_seen_at AT TIME ZONE ${ZONE})::date >= (SELECT today FROM b) - 6) AS active_7,
        (SELECT count(*)::int FROM users WHERE deleted_at IS NULL AND last_seen_at IS NOT NULL
          AND (last_seen_at AT TIME ZONE ${ZONE})::date >= (SELECT today FROM b) - 29) AS active_30,
        (SELECT count(*)::int FROM listings
          WHERE status IN ('active','promoted') AND under_review = false) AS listings_active,
        (SELECT count(*)::int FROM listings WHERE status <> 'hidden'
          AND (created_at AT TIME ZONE ${ZONE})::date = (SELECT today FROM b)) AS listings_today,
        (SELECT count(*)::int FROM listings WHERE status <> 'hidden'
          AND (created_at AT TIME ZONE ${ZONE})::date >= (SELECT today FROM b) - 6) AS listings_7,
        (SELECT count(*)::int FROM listings WHERE status <> 'hidden'
          AND (created_at AT TIME ZONE ${ZONE})::date >= (SELECT today FROM b) - 29) AS listings_30,
        (SELECT count(*)::int FROM listings
          WHERE has_video = true AND status IN ('active','promoted') AND under_review = false) AS listings_video,
        (SELECT count(*)::int FROM shops WHERE status <> 'hidden') AS shops_total,
        (SELECT count(*)::int FROM shops WHERE status <> 'hidden'
          AND (created_at AT TIME ZONE ${ZONE})::date >= (SELECT today FROM b) - 6) AS shops_7
    `),
    db.execute(sql`SELECT status, count(*)::int AS n FROM orders GROUP BY status`),
    db.execute(sql`
      WITH b AS (
        SELECT (now() AT TIME ZONE ${ZONE})::date AS today
      ),
      days AS (
        SELECT generate_series((SELECT today FROM b) - 29, (SELECT today FROM b), interval '1 day')::date AS day
      ),
      accounts AS (
        SELECT (created_at AT TIME ZONE ${ZONE})::date AS day, count(*)::int AS n
        FROM users
        WHERE deleted_at IS NULL
          AND (created_at AT TIME ZONE ${ZONE})::date >= (SELECT today FROM b) - 29
        GROUP BY 1
      ),
      seen AS (
        SELECT (last_seen_at AT TIME ZONE ${ZONE})::date AS day, count(*)::int AS n
        FROM users
        WHERE deleted_at IS NULL AND last_seen_at IS NOT NULL
          AND (last_seen_at AT TIME ZONE ${ZONE})::date >= (SELECT today FROM b) - 29
        GROUP BY 1
      ),
      posts AS (
        SELECT (created_at AT TIME ZONE ${ZONE})::date AS day, count(*)::int AS n
        FROM listings
        WHERE status <> 'hidden'
          AND (created_at AT TIME ZONE ${ZONE})::date >= (SELECT today FROM b) - 29
        GROUP BY 1
      )
      SELECT d.day,
        coalesce(a.n, 0) AS accounts,
        coalesce(s.n, 0) AS active,
        coalesce(p.n, 0) AS listings
      FROM days d
      LEFT JOIN accounts a ON a.day = d.day
      LEFT JOIN seen s ON s.day = d.day
      LEFT JOIN posts p ON p.day = d.day
      ORDER BY d.day DESC
    `),
  ]);
  const totals = rowsOf(totalsRaw)[0] ?? {};
  const byStatus = new Map<string, number>();
  for (const row of rowsOf(ordersRaw)) byStatus.set(String(row.status), num(row.n));
  const orders = ORDER_STATUSES.map((status) => ({ status, label: STATUS_RU[status], count: byStatus.get(status) ?? 0 }));
  const days = rowsOf(daysRaw).map((row) => {
    const date = dayKey(row.day);
    return { date, label: dayLabel(date), accounts: num(row.accounts), active: num(row.active), listings: num(row.listings) };
  });
  return {
    accounts: {
      total: num(totals.accounts_total),
      today: num(totals.accounts_today),
      days7: num(totals.accounts_7),
      days30: num(totals.accounts_30),
    },
    active: { today: num(totals.active_today), days7: num(totals.active_7), days30: num(totals.active_30) },
    listings: {
      active: num(totals.listings_active),
      today: num(totals.listings_today),
      days7: num(totals.listings_7),
      days30: num(totals.listings_30),
      videos: num(totals.listings_video),
    },
    shops: { total: num(totals.shops_total), days7: num(totals.shops_7) },
    orders: { total: orders.reduce((sum, row) => sum + row.count, 0), byStatus: orders },
    days,
  };
}

function cell(value: string | number): string {
  const text = String(value);
  if (/[;"\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function line(values: Array<string | number>): string {
  return values.map(cell).join(";");
}

const METHOD_RU: Record<string, string> = {
  google: "Google",
  email: "Email",
  sms: "Телефон",
  telegram: "Telegram",
  apple: "Apple",
  tiktok: "TikTok",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  demo: "Демо",
};

function methodLabel(value: unknown): string {
  const key = String(value ?? "").trim().toLowerCase();
  if (!key) return "";
  return METHOD_RU[key] ?? "";
}

function bishkekStamp(value: unknown): string {
  if (value == null || value === "") return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("day")}.${part("month")}.${part("year")} ${part("hour")}:${part("minute")}`;
}

function flag(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

/** Registered accounts, newest first. Phone and password are not selected. */
export async function ownerAccounts(): Promise<OwnerAccount[]> {
  const db = getDb();
  const raw = await db.execute(sql`
    SELECT
      coalesce(u.email, '') AS email,
      coalesce(u.name, '') AS name,
      u.created_at,
      u.last_seen_at,
      method.provider AS method,
      coalesce(posts.n, 0) AS listings,
      coalesce(points.n, 0) > 0 AS has_shop
    FROM users u
    LEFT JOIN LATERAL (
      SELECT provider
      FROM user_auth
      WHERE user_id = u.id
      ORDER BY created_at DESC
      LIMIT 1
    ) method ON true
    LEFT JOIN (
      SELECT owner_id, count(*)::int AS n
      FROM listings
      WHERE status <> 'hidden'
      GROUP BY owner_id
    ) posts ON posts.owner_id = u.id
    LEFT JOIN (
      SELECT owner_id, count(*)::int AS n
      FROM shops
      WHERE status <> 'hidden'
      GROUP BY owner_id
    ) points ON points.owner_id = u.id
    WHERE u.deleted_at IS NULL
    ORDER BY u.created_at DESC, u.id DESC
  `);
  return rowsOf(raw).map((row) => ({
    email: String(row.email ?? "").trim(),
    name: String(row.name ?? "").trim(),
    method: methodLabel(row.method),
    registeredAt: bishkekStamp(row.created_at),
    lastSeenAt: bishkekStamp(row.last_seen_at),
    listings: num(row.listings),
    shop: flag(row.has_shop),
  }));
}

/** UTF-8 CSV with a BOM so Excel opens the Russian headers. */
export function accountsCsv(accounts: OwnerAccount[]): string {
  const rows = [
    line(["Email", "Имя", "Вход", "Регистрация", "Последний визит", "Объявления", "Точка"]),
    ...accounts.map((row) =>
      line([row.email, row.name, row.method, row.registeredAt, row.lastSeenAt, row.listings, row.shop ? "Да" : "Нет"]),
    ),
  ];
  return `\uFEFF${rows.join("\r\n")}\r\n`;
}

/** UTF-8 CSV with a BOM so Excel opens the Russian headers. */
export function statsCsv(stats: OwnerStats): string {
  const rows = [
    line(["Показатель", "Значение"]),
    line(["Аккаунтов всего", stats.accounts.total]),
    line(["Новых аккаунтов сегодня", stats.accounts.today]),
    line(["Новых аккаунтов за 7 дней", stats.accounts.days7]),
    line(["Новых аккаунтов за 30 дней", stats.accounts.days30]),
    line(["Активных сегодня", stats.active.today]),
    line(["Активных за 7 дней", stats.active.days7]),
    line(["Активных за 30 дней", stats.active.days30]),
    line(["Активных объявлений", stats.listings.active]),
    line(["Новых объявлений сегодня", stats.listings.today]),
    line(["Новых объявлений за 7 дней", stats.listings.days7]),
    line(["Новых объявлений за 30 дней", stats.listings.days30]),
    line(["Видеообъявлений", stats.listings.videos]),
    line(["Точек всего", stats.shops.total]),
    line(["Новых точек за 7 дней", stats.shops.days7]),
    line(["Заказов доставки всего", stats.orders.total]),
    ...stats.orders.byStatus.map((row) => line([`Заказы: ${row.label}`, row.count])),
    "",
    line(["Дата", "Новые аккаунты", "Активные", "Новые объявления"]),
    ...stats.days.map((row) => line([row.label, row.accounts, row.active, row.listings])),
  ];
  return `\uFEFF${rows.join("\r\n")}\r\n`;
}
