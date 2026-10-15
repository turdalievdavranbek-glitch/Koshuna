/** Quick check of the category guesser: `npx tsx scripts/category-sanity.ts`. Exits 1 on a miss. */
import { suggestCategories } from "../src/lib/category-suggest";

type Want = { section: string; category?: string };
const CASES: Array<[string, Want]> = [
  ["Ноутбук", { section: "secondhand", category: "laptops" }],
  ["Lenovo Think Pad", { section: "secondhand", category: "laptops" }],
  ["Lenovo", { section: "secondhand", category: "laptops" }],
  ["Ноутбук Lenovo ThinkPad стоит 20000", { section: "secondhand", category: "laptops" }],
  ["MacBook Air", { section: "secondhand", category: "laptops" }],
  ["ноут HP", { section: "secondhand", category: "laptops" }],
  ["Asus vivobook", { section: "secondhand", category: "laptops" }],
  ["Компьютер игровой", { section: "secondhand", category: "pcs" }],
  ["Монитор Samsung 24", { section: "secondhand", category: "pcs" }],
  ["Планшет", { section: "secondhand", category: "phones" }],
  ["Айфон 13", { section: "secondhand", category: "phones" }],
  ["Xiaomi Redmi Note", { section: "secondhand", category: "phones" }],
  ["Диван угловой", { section: "secondhand", category: "furniture" }],
  ["Стол кухонный", { section: "secondhand", category: "furniture" }],
  ["Холодильник", { section: "secondhand", category: "appliances" }],
  ["Детская коляска", { section: "secondhand", category: "kids" }],
  ["Велосипед", { section: "secondhand", category: "sport" }],
  ["Куртка зимняя", { section: "secondhand", category: "clothes" }],
  ["Машина Toyota Camry", { section: "cars" }],
  ["Корова", { section: "animals" }],
  ["Цемент М400", { section: "construction", category: "cement" }],
  ["СТО на Курманжан Датка", { section: "services", category: "auto-repair" }],
  ["Шиномонтаж", { section: "services", category: "tire-service" }],
];
// Must never become a service: «сто» inside «стоит», «шина» inside «машина».
const NOT_SERVICE = ["Продаю, стоит недорого", "Просто отдам", "Детская машинка", "Книга", "Think Pad", "Место у окна"];

let bad = 0;
for (const [text, want] of CASES) {
  const top = suggestCategories(text)[0];
  const ok = top && top.score > 0 && top.section === want.section && (!want.category || top.category === want.category);
  if (!ok) bad += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${text} -> ${top ? `${top.section}/${top.category ?? "-"} (${top.score})` : "none"}`);
}
for (const text of NOT_SERVICE) {
  const top = suggestCategories(text)[0];
  const ok = !top || top.section !== "services";
  if (!ok) bad += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${text} -> ${top ? `${top.section}/${top.category ?? "-"} (${top.score})` : "none"}`);
}
if (bad) {
  console.log(`${bad} miss(es)`);
  process.exit(1);
}
