import type { Category, Listing } from "./types";

export const ROOT_TILES: Category[] = [
  { slug: "auto", title: "Авто", emoji: "🚗", tint: "#E8F1FF" },
  { slug: "realty", title: "Недвижимость", emoji: "🏠", tint: "#E8F6EE" },
  { slug: "electronics", title: "Электроника", emoji: "📱", tint: "#F3EEFF" },
  { slug: "jobs", title: "Работа", emoji: "💼", tint: "#FFF4E0" },
  { slug: "services", title: "Услуги", emoji: "🔧", tint: "#FFEFE6" },
  { slug: "things", title: "Вещи", emoji: "👕", tint: "#FDE8F0" },
  { slug: "home", title: "Для дома", emoji: "🛋️", tint: "#EAF4F6" },
  { slug: "pets", title: "Животные", emoji: "🐾", tint: "#F7F0E6" },
  { slug: "hobby", title: "Хобби", emoji: "🎸", tint: "#EEF0FF" },
  { slug: "hotels", title: "Гостиницы", emoji: "🏨", tint: "#E8F7F4" },
];

export const NESTED: Record<string, Category[]> = {
  auto: [
    { slug: "cars", title: "Легковые", emoji: "🚘", tint: "#E8F1FF", parent: "auto" },
    { slug: "trucks", title: "Грузовые", emoji: "🚚", tint: "#EAF3FF", parent: "auto" },
    { slug: "moto", title: "Мото", emoji: "🏍️", tint: "#F0F4FF", parent: "auto" },
    { slug: "parts", title: "Запчасти", emoji: "⚙️", tint: "#EEF2F8", parent: "auto" },
    { slug: "tires", title: "Шины и диски", emoji: "🛞", tint: "#E9EEF5", parent: "auto" },
    { slug: "spec", title: "Спецтехника", emoji: "🚜", tint: "#E7F3E9", parent: "auto" },
  ],
  cars: [
    { slug: "cars-sale", title: "Продажа", emoji: "🔑", tint: "#E8F1FF", parent: "cars" },
    { slug: "cars-rent", title: "Аренда", emoji: "📅", tint: "#EAF6FF", parent: "cars" },
    { slug: "cars-new", title: "Новые", emoji: "✨", tint: "#FFF6E5", parent: "cars" },
  ],
  realty: [
    { slug: "flats", title: "Квартиры", emoji: "🏢", tint: "#E8F6EE", parent: "realty" },
    { slug: "houses", title: "Дома", emoji: "🏡", tint: "#EAF8F0", parent: "realty" },
    { slug: "land", title: "Участки", emoji: "🌳", tint: "#E7F4E4", parent: "realty" },
    { slug: "commercial", title: "Коммерческая", emoji: "🏬", tint: "#EEF6F1", parent: "realty" },
  ],
  electronics: [
    { slug: "phones", title: "Телефоны", emoji: "📱", tint: "#F3EEFF", parent: "electronics" },
    { slug: "laptops", title: "Ноутбуки", emoji: "💻", tint: "#EEE8FF", parent: "electronics" },
    { slug: "tv", title: "ТВ и аудио", emoji: "📺", tint: "#F6F0FF", parent: "electronics" },
  ],
  jobs: [
    { slug: "vacancy", title: "Вакансии", emoji: "📋", tint: "#FFF4E0", parent: "jobs" },
    { slug: "resume", title: "Резюме", emoji: "🧑‍💼", tint: "#FFF8EA", parent: "jobs" },
  ],
  services: [
    { slug: "repair", title: "Ремонт", emoji: "🛠️", tint: "#FFEFE6", parent: "services" },
    { slug: "beauty", title: "Красота", emoji: "✂️", tint: "#FFF0F3", parent: "services" },
    { slug: "delivery", title: "Доставка", emoji: "📦", tint: "#FFF4E8", parent: "services" },
  ],
  things: [
    { slug: "clothes", title: "Одежда", emoji: "👗", tint: "#FDE8F0", parent: "things" },
    { slug: "kids", title: "Детское", emoji: "🧸", tint: "#FFF0E8", parent: "things" },
  ],
  home: [
    { slug: "furniture", title: "Мебель", emoji: "🪑", tint: "#EAF4F6", parent: "home" },
    { slug: "appliances", title: "Бытовая техника", emoji: "🧺", tint: "#E8F0F4", parent: "home" },
  ],
  pets: [
    { slug: "dogs", title: "Собаки", emoji: "🐕", tint: "#F7F0E6", parent: "pets" },
    { slug: "cats", title: "Кошки", emoji: "🐈", tint: "#F8F2EA", parent: "pets" },
  ],
  hobby: [
    { slug: "sport", title: "Спорт", emoji: "⚽", tint: "#EEF0FF", parent: "hobby" },
    { slug: "music", title: "Музыка", emoji: "🎹", tint: "#F0EEFF", parent: "hobby" },
  ],
  hotels: [
    { slug: "bishkek-hotels", title: "Бишкек", emoji: "🏙️", tint: "#E8F7F4", parent: "hotels" },
    { slug: "issyk-hotels", title: "Иссык-Куль", emoji: "🌊", tint: "#E4F4FA", parent: "hotels" },
  ],
};

export const CATEGORIES: Record<string, Category> = Object.fromEntries(
  [
    ...ROOT_TILES,
    ...Object.values(NESTED).flat(),
  ].map((c) => [c.slug, c]),
);

export function childrenOf(slug?: string): Category[] {
  if (!slug) return ROOT_TILES;
  return NESTED[slug] ?? [];
}

export function trailOf(slug?: string): Category[] {
  if (!slug) return [];
  const trail: Category[] = [];
  let current = CATEGORIES[slug];
  const guard = new Set<string>();
  while (current && !guard.has(current.slug)) {
    guard.add(current.slug);
    trail.unshift(current);
    current = current.parent ? CATEGORIES[current.parent] : undefined;
  }
  return trail;
}

export const SEED_LISTINGS: Listing[] = [
  {
    id: "camry",
    title: "Toyota Camry 70, 2018",
    price: "1 450 000 сом",
    city: "Бишкек",
    category: "cars-sale",
    path: ["auto", "cars", "cars-sale"],
    emoji: "🚗",
    tint: "#E8F1FF",
    desc: "Камри 70, 2.5, автомат, один хозяин. Сервисная книжка, зимняя резина в комплекте.",
    createdAt: Date.now() - 1000 * 60 * 40,
  },
  {
    id: "honda",
    title: "Honda Fit 2015, автомат",
    price: "620 000 сом",
    city: "Ош",
    category: "cars-sale",
    path: ["auto", "cars", "cars-sale"],
    emoji: "🚗",
    tint: "#E8F1FF",
    desc: "Экономичный городской авто, кондиционер, без ДТП по кузову.",
    createdAt: Date.now() - 1000 * 60 * 90,
  },
  {
    id: "rent-car",
    title: "Аренда Hyundai Accent, сутки",
    price: "3 500 сом/сутки",
    city: "Бишкек",
    category: "cars-rent",
    path: ["auto", "cars", "cars-rent"],
    emoji: "📅",
    tint: "#EAF6FF",
    desc: "Без залога для граждан КР. Страховка включена, подача в аэропорт.",
    createdAt: Date.now() - 1000 * 60 * 20,
  },
  {
    id: "new-kia",
    title: "Kia K5, новый, 2025",
    price: "от 2 180 000 сом",
    city: "Бишкек",
    category: "cars-new",
    path: ["auto", "cars", "cars-new"],
    emoji: "✨",
    tint: "#FFF6E5",
    desc: "Официальный дилер, гарантия 5 лет, кредит и trade-in.",
    createdAt: Date.now() - 1000 * 60 * 200,
  },
  {
    id: "tires",
    title: "Зимние шины R16, комплект",
    price: "18 000 сом",
    city: "Каракол",
    category: "tires",
    path: ["auto", "tires"],
    emoji: "🛞",
    tint: "#E9EEF5",
    desc: "Nokian Hakkapeliitta, остаток 7 мм, без шишек.",
    createdAt: Date.now() - 1000 * 60 * 300,
  },
  {
    id: "parts",
    title: "Фара Camry 70, оригинал",
    price: "14 500 сом",
    city: "Бишкек",
    category: "parts",
    path: ["auto", "parts"],
    emoji: "⚙️",
    tint: "#EEF2F8",
    desc: "Правая фара, без трещин, сниму с донора.",
    createdAt: Date.now() - 1000 * 60 * 50,
  },
  {
    id: "moto",
    title: "Yamaha R3, 2019",
    price: "390 000 сом",
    city: "Бишкек",
    category: "moto",
    path: ["auto", "moto"],
    emoji: "🏍️",
    tint: "#F0F4FF",
    desc: "Спорт, два комплекта резины, сигнализация.",
    createdAt: Date.now() - 1000 * 60 * 400,
  },
  {
    id: "truck",
    title: "Isuzu NQR, рефрижератор",
    price: "1 980 000 сом",
    city: "Джалал-Абад",
    category: "trucks",
    path: ["auto", "trucks"],
    emoji: "🚚",
    tint: "#EAF3FF",
    desc: "Холод до −18, документы чистые, готов к работе.",
    createdAt: Date.now() - 1000 * 60 * 800,
  },
  {
    id: "flat",
    title: "2-комн, центр, 68 м²",
    price: "95 000 $",
    city: "Бишкек",
    category: "flats",
    path: ["realty", "flats"],
    emoji: "🏢",
    tint: "#E8F6EE",
    desc: "Филармония, 8 этаж, светлая, с мебелью. Торг уместный.",
    createdAt: Date.now() - 1000 * 60 * 15,
  },
  {
    id: "house",
    title: "Дом 180 м², Арча-Бешик",
    price: "185 000 $",
    city: "Бишкек",
    category: "houses",
    path: ["realty", "houses"],
    emoji: "🏡",
    tint: "#EAF8F0",
    desc: "Участок 6 соток, гараж, баня, газ.",
    createdAt: Date.now() - 1000 * 60 * 600,
  },
  {
    id: "iphone",
    title: "iPhone 14, 128 GB",
    price: "52 000 сом",
    city: "Бишкек",
    category: "phones",
    path: ["electronics", "phones"],
    emoji: "📱",
    tint: "#F3EEFF",
    desc: "Аккумулятор 89%, Face ID ок, коробка и кабель.",
    createdAt: Date.now() - 1000 * 60 * 25,
  },
  {
    id: "mac",
    title: "MacBook Air M2, 2023",
    price: "78 000 сом",
    city: "Ош",
    category: "laptops",
    path: ["electronics", "laptops"],
    emoji: "💻",
    tint: "#EEE8FF",
    desc: "8/256, почти без следов использования.",
    createdAt: Date.now() - 1000 * 60 * 70,
  },
  {
    id: "job",
    title: "Курьер на авто, Бишкек",
    price: "от 35 000 сом",
    city: "Бишкек",
    category: "vacancy",
    path: ["jobs", "vacancy"],
    emoji: "📋",
    tint: "#FFF4E0",
    desc: "Ежедневные выплаты, свой авто. График свободный.",
    createdAt: Date.now() - 1000 * 60 * 12,
  },
  {
    id: "repair",
    title: "Ремонт стиральных машин",
    price: "от 800 сом",
    city: "Токмок",
    category: "repair",
    path: ["services", "repair"],
    emoji: "🛠️",
    tint: "#FFEFE6",
    desc: "Выезд в день обращения, гарантия на работу.",
    createdAt: Date.now() - 1000 * 60 * 180,
  },
  {
    id: "jacket",
    title: "Зимняя парка, L",
    price: "2 400 сом",
    city: "Нарын",
    category: "clothes",
    path: ["things", "clothes"],
    emoji: "👕",
    tint: "#FDE8F0",
    desc: "Тёплая, носили один сезон.",
    createdAt: Date.now() - 1000 * 60 * 240,
  },
  {
    id: "sofa",
    title: "Диван-кровать, серый",
    price: "12 000 сом",
    city: "Бишкек",
    category: "furniture",
    path: ["home", "furniture"],
    emoji: "🛋️",
    tint: "#EAF4F6",
    desc: "Самовывоз с Джала, торг.",
    createdAt: Date.now() - 1000 * 60 * 55,
  },
  {
    id: "cat",
    title: "Котёнок шотландец",
    price: "8 000 сом",
    city: "Бишкек",
    category: "cats",
    path: ["pets", "cats"],
    emoji: "🐈",
    tint: "#F8F2EA",
    desc: "2 месяца, привит, лоток знает.",
    createdAt: Date.now() - 1000 * 60 * 33,
  },
  {
    id: "hotel",
    title: "Гостевой дом, Чолпон-Ата",
    price: "2 000 сом/ночь",
    city: "Иссык-Куль",
    category: "issyk-hotels",
    path: ["hotels", "issyk-hotels"],
    emoji: "🏨",
    tint: "#E4F4FA",
    desc: "5 минут до пляжа, завтрак, мангал.",
    createdAt: Date.now() - 1000 * 60 * 9,
  },
];

export function listingsFor(slug?: string, all: Listing[] = SEED_LISTINGS): Listing[] {
  if (!slug) return [...all].sort((a, b) => b.createdAt - a.createdAt);
  return all
    .filter((item) => item.category === slug || item.path.includes(slug))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function listingById(id: string, all: Listing[] = SEED_LISTINGS): Listing | undefined {
  return all.find((item) => item.id === id);
}
