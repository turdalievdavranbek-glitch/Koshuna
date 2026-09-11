import type { Lang } from "./types";

const MONTHS: Record<Lang, string[]> = {
  ru: [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ],
  ky: [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ],
  uz: [
    "Yanvar",
    "Fevral",
    "Mart",
    "Aprel",
    "May",
    "Iyun",
    "Iyul",
    "Avgust",
    "Sentabr",
    "Oktabr",
    "Noyabr",
    "Dekabr",
  ],
};

const MONTHS_SHORT: Record<Lang, string[]> = {
  ru: ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
  ky: ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
  uz: ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"],
};

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = parseKey(checkIn).getTime();
  const b = parseKey(checkOut).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function monthLabel(cursor: Date, lang: Lang): string {
  return `${MONTHS[lang][cursor.getMonth()]} ${cursor.getFullYear()}`;
}

export function formatStayDay(key: string, lang: Lang): string {
  const d = parseKey(key);
  return `${d.getDate()} ${MONTHS_SHORT[lang][d.getMonth()]}`;
}

export function formatStayRange(checkIn: string, checkOut: string, lang: Lang): string {
  return `${formatStayDay(checkIn, lang)} — ${formatStayDay(checkOut, lang)}`;
}

export function monthCells(cursor: Date): (string | null)[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const pad = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: pad }, () => null);
  for (let d = 1; d <= days; d++) cells.push(dateKey(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
