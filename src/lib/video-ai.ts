import type { AnimalGroup, DraftListing, PropertyType, SectionId } from "./types";
import { JOB_ROLE_RU, JOB_ROWS, type JobType } from "./vacancies";
import { housingTypeToRealtyGroup } from "./realty";

export const DEMO_VIDEO_URL = "/demo/listing-sample.mp4";
export const DEMO_POSTER_URL = "/demo/listing-poster.jpg";

export const DEMO_TRANSCRIPT =
  "Ассалаумаалейкум. Продаю iPhone 13, 128 гигабайт, состояние хорошее. Бишкек, тридцать пять тысяч сом. Можно встретиться у ЦУМа, предоплату не прошу. Я хозяин.";

export const DEMO_VOICE_TRANSCRIPT =
  "Продаю кожаный диван, Ош, восемнадцать тысяч пятьсот сом. Самовывоз, поможем спустить. Предоплату не прошу.";

export type AiGuess = {
  section: SectionId;
  kind: "rent" | "goods";
  category?: string;
  goodsKind?: string;
  housingKind?: PropertyType;
  carMake?: string;
  carModel?: string;
  vehicleGroup?: "passenger" | "special";
  vehicleType?: string;
  techBrand?: string;
  techModel?: string;
  animalGroup?: AnimalGroup;
  animalKind?: string;
  jobSphere?: string;
  jobSub?: string;
  jobRole?: string;
  jobType?: JobType;
  title: string;
  description: string;
  price?: string;
  city?: string;
  rooms?: string;
  area?: string;
  dealKind?: "buy" | "short" | "long" | "share";
  meetupSpot?: DraftListing["meetupSpot"];
};

type Rule = {
  keys: string[];
  section: SectionId;
  kind: "rent" | "goods";
  category?: string;
  goodsKind?: string;
  housingKind?: PropertyType;
  carMake?: string;
  carModel?: string;
  vehicleGroup?: "passenger" | "special";
  vehicleType?: string;
  techBrand?: string;
  techModel?: string;
  animalGroup?: AnimalGroup;
  animalKind?: string;
  jobSphere?: string;
  jobSub?: string;
  jobRole?: string;
  jobType?: JobType;
  title?: string;
};

const RULES: Rule[] = [
  {
    keys: ["iphone", "айфон", "iphone 13", "айфон 13"],
    section: "secondhand",
    kind: "goods",
    category: "phones",
    goodsKind: "smartphone",
    techBrand: "apple",
    techModel: "iphone-13",
    title: "iPhone 13",
  },
  {
    keys: ["samsung", "самсунг", "galaxy", "галакси"],
    section: "secondhand",
    kind: "goods",
    category: "phones",
    goodsKind: "smartphone",
    techBrand: "samsung",
    title: "Samsung",
  },
  {
    keys: ["xiaomi", "сяоми", "редми", "redmi"],
    section: "secondhand",
    kind: "goods",
    category: "phones",
    goodsKind: "smartphone",
    techBrand: "xiaomi",
    title: "Xiaomi",
  },
  {
    keys: ["телефон", "смартфон", "планшет"],
    section: "secondhand",
    kind: "goods",
    category: "phones",
    goodsKind: "smartphone",
    title: "Телефон",
  },
  {
    keys: ["ноутбук", "macbook", "макбук", "lenovo", "леново", "asus"],
    section: "secondhand",
    kind: "goods",
    category: "laptops",
    goodsKind: "office-laptop",
    title: "Ноутбук",
  },
  {
    keys: ["холодильник", "стирал", "микроволн", "телевизор", "бытов"],
    section: "secondhand",
    kind: "goods",
    category: "appliances",
    goodsKind: "appliance",
    title: "Бытовая техника",
  },
  {
    keys: ["диван", "шкаф", "стол", "мебел", "эмерек", "кровать", "стул"],
    section: "secondhand",
    kind: "goods",
    category: "furniture",
    goodsKind: "sofa",
    title: "Мебель",
  },
  {
    keys: ["квартир", "батир", "студи", "комнатн", "комн", "сдаю квартир", "ижара батир"],
    section: "rent",
    kind: "rent",
    category: "rent",
    housingKind: "apartment",
    title: "Квартира",
  },
  {
    keys: ["дом ", " үй", "дача", "коттедж"],
    section: "rent",
    kind: "rent",
    category: "rent",
    housingKind: "house",
    title: "Дом",
  },
  {
    keys: ["офис", "магазин", "коммерц"],
    section: "rent",
    kind: "rent",
    category: "rent",
    housingKind: "commercial",
    title: "Коммерческая",
  },
  {
    keys: ["экскаватор-погрузчик", "jcb", "3cx"],
    section: "cars",
    kind: "goods",
    vehicleGroup: "special",
    vehicleType: "backhoe",
    carMake: "jcb",
    carModel: "3cx",
    title: "Экскаватор-погрузчик",
  },
  {
    keys: ["экскаватор", "excavator", "бульдозер", "самосвал", "камаз", "kamaz", "трактор", "погрузчик", "автокран"],
    section: "cars",
    kind: "goods",
    vehicleGroup: "special",
    title: "Спецтехника",
  },
  {
    keys: ["тойота", "toyota", "camry", "камри", "honda", "mercedes", "мерседес", "машин", "авто ", "машина"],
    section: "cars",
    kind: "goods",
    vehicleGroup: "passenger",
    carMake: "toyota",
    title: "Авто",
  },
  {
    keys: ["котёнок", "котенок", "щенок", "собак", "кошк", "кот ", "питомец"],
    section: "animals",
    kind: "goods",
    animalGroup: "pets",
    animalKind: "cats",
    title: "Питомец",
  },
  {
    keys: ["козу", "кой ", "жылкы", "лошад", "крс", "бараны", "куры"],
    section: "animals",
    kind: "goods",
    animalGroup: "farm",
    title: "Сельхозживотные",
  },
  {
    keys: ["цемент", "кирпич", "пиломатериал", "арматур", "кровл"],
    section: "construction",
    kind: "goods",
    category: "cement",
    title: "Стройматериалы",
  },
  {
    keys: ["мастер", "репетитор", "услуг", "кызмат", "уборк", "ремонт квартир"],
    section: "services",
    kind: "goods",
    category: "repairs-finish",
    title: "Услуга",
  },
  {
    keys: ["ваканси", "требуется", "ищем сотрудника", "жумуш", "работа "],
    section: "vacancies",
    kind: "goods",
    jobType: "full",
    title: "Вакансия",
  },
  {
    keys: ["гостиниц", "хостел", "посуточн", "суточн", "гостевой дом"],
    section: "stays",
    kind: "rent",
    title: "Жильё посуточно",
  },
  {
    keys: ["кафе", "ресторан", "меню", "ашкана"],
    section: "restaurants",
    kind: "goods",
    category: "national",
    title: "Кафе",
  },
];

const CITIES: { id: string; keys: string[] }[] = [
  { id: "bishkek", keys: ["бишкек", "bishkek"] },
  { id: "osh", keys: ["ош", "osh"] },
  { id: "jalal-abad", keys: ["джалал", "жалал"] },
  { id: "karakol", keys: ["каракол"] },
  { id: "cholpon-ata", keys: ["чолпон"] },
  { id: "naryn", keys: ["нарын"] },
  { id: "talas", keys: ["талас"] },
  { id: "batken", keys: ["баткен"] },
  { id: "tokmok", keys: ["токмок"] },
  { id: "kochkor", keys: ["кочкор"] },
];

const SPOTS: { id: NonNullable<DraftListing["meetupSpot"]>; keys: string[] }[] = [
  { id: "tsum", keys: ["цум", "tsum"] },
  { id: "dordoi", keys: ["дордой"] },
  { id: "philharmonic", keys: ["филармон"] },
  { id: "ala-too", keys: ["ала-тоо", "ала тоо"] },
  { id: "globus", keys: ["глобус"] },
  { id: "osh-bazaar", keys: ["ош базар", "ошбазар"] },
];

function norm(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function score(text: string, keys: string[]): number {
  let total = 0;
  for (const key of keys) {
    if (text.includes(key)) total += Math.max(2, key.length);
  }
  return total;
}

function firstSentence(text: string): string {
  const cut = text.split(/(?<=[.!?])\s+/)[0] ?? text;
  const clean = cut.replace(/^ассалаумаалейкум[.,]?\s*/i, "").trim();
  return clean.slice(0, 80);
}

function extractPrice(text: string): string | undefined {
  const phrase: [RegExp, number][] = [
    [/пятьдесят\s+тысяч/, 50000],
    [/сорок\s+пять\s+тысяч/, 45000],
    [/сорок\s+тысяч/, 40000],
    [/тридцать\s+пять\s+тысяч/, 35000],
    [/тридцать\s+две\s+тысяч/, 32000],
    [/тридцать\s+восемь\s+тысяч/, 38000],
    [/двадцать\s+пять\s+тысяч/, 25000],
    [/двадцать\s+тысяч/, 20000],
    [/восемнадцать\s+тысяч\s+пятьсот/, 18500],
    [/восемнадцать\s+тысяч/, 18000],
    [/пятнадцать\s+тысяч/, 15000],
    [/десять\s+тысяч/, 10000],
    [/он\s+сегиз\s+миң\s+беш\s+ж[үу]з/, 18500],
    [/отуз\s+беш\s+миң/, 35000],
    [/отуз\s+эки\s+миң/, 32000],
  ];
  for (const [re, n] of phrase) {
    if (re.test(text)) return String(n);
  }
  const withWord = text.match(/(\d[\d\s]{0,6})\s*(?:тысяч|тыс|миң)/);
  if (withWord) {
    const n = Number(withWord[1].replace(/\s/g, ""));
    if (n > 0) return String(n < 1000 ? n * 1000 : n);
  }
  const withSom = text.match(/(\d[\d\s]{2,8})\s*(?:сом|som|kgs)/);
  if (withSom) {
    const n = Number(withSom[1].replace(/\s/g, ""));
    if (n > 0) return String(n);
  }
  const digits = text.match(/\b(\d{4,7})\b/);
  if (digits) return digits[1];
  return undefined;
}

function extractCity(text: string): string | undefined {
  for (const city of CITIES) {
    if (city.keys.some((k) => text.includes(k))) return city.id;
  }
  return undefined;
}

function extractRooms(text: string): string | undefined {
  if (/студи/.test(text)) return "0";
  if (/двухкомнат|2[- ]?комн|эки бөлмө|2\s*xona/.test(text)) return "2";
  if (/трехкомнат|трёхкомнат|3[- ]?комн/.test(text)) return "3";
  if (/однокомнат|1[- ]?комн/.test(text)) return "1";
  const m = text.match(/(\d)\s*(?:комнат|комн|бөлмө|xona)/);
  return m ? m[1] : undefined;
}

function extractArea(text: string): string | undefined {
  const m = text.match(/(\d{2,3})\s*(?:м²|м2|кв\.?м|m2)/);
  return m ? m[1] : undefined;
}

function extractDealKind(text: string): "buy" | "short" | "long" | "share" | undefined {
  if (/посуточн|суткалык|kunlik/.test(text)) return "short";
  if (/совместн|койко|birga yasha/.test(text)) return "share";
  if (/продаю|продажа|сатам|sotaman|sotiladi/.test(text)) return "buy";
  if (/сдам|сдаётся|ижара|ijara/.test(text)) return "long";
  return undefined;
}

function extractSpot(text: string): DraftListing["meetupSpot"] | undefined {
  for (const spot of SPOTS) {
    if (spot.keys.some((k) => text.includes(k))) return spot.id;
  }
  return undefined;
}

function extractJob(text: string) {
  let best: { row: (typeof JOB_ROWS)[number]; score: number } | null = null;
  for (const row of JOB_ROWS) {
    const label = JOB_ROLE_RU[row.role] ?? row.role;
    const keys = [norm(label), norm(label.replace(/-/g, " ")), row.role.replace(/-/g, " ")];
    const s = score(text, keys);
    if (s > 0 && (!best || s > best.score)) best = { row, score: s };
  }
  return best?.row;
}

function extractJobType(text: string): JobType | undefined {
  if (/(удаленн|удалённ|алыстан|remote|masofaviy)/.test(text)) return "remote";
  if (/(вахт|vaxta)/.test(text)) return "shift";
  if (/(стажир|stajir|intern)/.test(text)) return "intern";
  if (/(подработ|кошумча иш|qoshimcha)/.test(text)) return "gig";
  if (/(частичн|неполн|жарым ставка|qisman)/.test(text)) return "part";
  if (/(полн(ая|ый)|толук жумуш|toʻliq)/.test(text)) return "full";
  return undefined;
}

export function classifyListingSpeech(raw: string): AiGuess {
  const text = norm(raw);
  let best: { rule: Rule; score: number } | null = null;
  for (const rule of RULES) {
    const s = score(text, rule.keys);
    if (s > 0 && (!best || s > best.score)) best = { rule, score: s };
  }
  const rule = best?.rule;
  const price = extractPrice(text);
  const city = extractCity(text);
  const rooms = extractRooms(text);
  const area = extractArea(text);
  const dealKind = extractDealKind(text);
  const meetupSpot = extractSpot(text);
  const titleBase = rule?.title ?? firstSentence(raw) ?? "Видеообъявление";
  let title = titleBase;
  if (rule?.techModel === "iphone-13" && /128/.test(text)) title = "iPhone 13, 128 ГБ";
  if (price && !/\d/.test(title)) title = `${title}, ${price} сом`;
  const description = raw.replace(/\s+/g, " ").trim() || title;
  const section = rule?.section ?? "secondhand";
  const job = section === "vacancies" ? extractJob(text) : undefined;
  const jobType = section === "vacancies" ? extractJobType(text) ?? rule?.jobType ?? "full" : rule?.jobType;
  if (job && titleBase === "Вакансия") {
    title = JOB_ROLE_RU[job.role] ?? job.role;
    if (price && !/\d/.test(title)) title = `${title}, ${price} сом`;
  }
  return {
    section,
    kind: rule?.kind ?? "goods",
    category: rule?.category,
    goodsKind: rule?.goodsKind,
    housingKind: rule?.housingKind,
    carMake: rule?.carMake,
    carModel: rule?.carModel,
    vehicleGroup: rule?.vehicleGroup,
    vehicleType: rule?.vehicleType,
    techBrand: rule?.techBrand,
    techModel: rule?.techModel,
    animalGroup: rule?.animalGroup,
    animalKind: rule?.animalKind,
    jobSphere: job?.sphere ?? rule?.jobSphere,
    jobSub: job?.sub ?? rule?.jobSub,
    jobRole: job?.role ?? rule?.jobRole,
    jobType,
    title: title.slice(0, 80),
    description,
    price,
    city,
    rooms,
    area,
    dealKind,
    meetupSpot,
  };
}

export function aiToDraftPatch(guess: AiGuess): Partial<DraftListing> {
  const patch: Partial<DraftListing> = {
    section: guess.section,
    kind: guess.kind,
    title: guess.title,
    description: guess.description,
    aiConfirmed: false,
  };
  if (guess.category) patch.category = guess.category;
  if (guess.goodsKind) patch.goodsKind = guess.goodsKind;
  if (guess.housingKind) {
    patch.housingKind = guess.housingKind;
    const group = housingTypeToRealtyGroup(guess.housingKind);
    if (group !== "any") patch.realtyGroup = group;
  }
  if (guess.carMake) patch.carMake = guess.carMake;
  if (guess.carModel) patch.carModel = guess.carModel;
  if (guess.vehicleGroup) patch.vehicleGroup = guess.vehicleGroup;
  if (guess.vehicleType) patch.vehicleType = guess.vehicleType;
  if (guess.techBrand) patch.techBrand = guess.techBrand;
  if (guess.techModel) patch.techModel = guess.techModel;
  if (guess.animalGroup) patch.animalGroup = guess.animalGroup;
  if (guess.animalKind) patch.animalKind = guess.animalKind;
  if (guess.jobSphere) patch.jobSphere = guess.jobSphere;
  if (guess.jobSub) patch.jobSub = guess.jobSub;
  if (guess.jobRole) patch.jobRole = guess.jobRole;
  if (guess.jobType) patch.jobType = guess.jobType;
  if (guess.price) patch.price = guess.price;
  if (guess.city) patch.city = guess.city;
  if (guess.rooms) {
    patch.rooms = guess.rooms;
    if (guess.housingKind === "apartment" || !guess.housingKind) {
      patch.realtyGroup = patch.realtyGroup ?? "apartments";
      patch.realtySub = "by-rooms";
      patch.realtyKind = guess.rooms === "0" ? "studio" : guess.rooms === "5" ? "5plus" : guess.rooms;
    }
  }
  if (guess.area) patch.area = guess.area;
  if (guess.dealKind) patch.dealKind = guess.dealKind;
  if (guess.meetupSpot) patch.meetupSpot = guess.meetupSpot;
  return patch;
}

export function isSpokenListing(listing: { mediaKind?: string; videoUrl?: string; voiceUrl?: string }) {
  return listing.mediaKind === "video" || listing.mediaKind === "voice" || Boolean(listing.videoUrl);
}

export function isVideoListing(listing: { mediaKind?: string; videoUrl?: string }) {
  return listing.mediaKind === "video" || Boolean(listing.videoUrl);
}

export function isVoiceListing(listing: { mediaKind?: string; voiceUrl?: string; videoUrl?: string }) {
  if (listing.mediaKind === "voice") return true;
  return Boolean(listing.voiceUrl) && !listing.videoUrl && listing.mediaKind !== "video";
}
