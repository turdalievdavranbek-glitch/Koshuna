export const REALTY_GROUPS = ["apartments", "houses", "rooms", "land", "commercial", "garages"] as const;
export type RealtyGroupId = (typeof REALTY_GROUPS)[number];

export type RealtyRow = {
  group: RealtyGroupId;
  sub: string;
  kind: string;
};

/** Nested catalog from konshu_real_estate_data. Deal type is a feed chip, not a tree level. */
export const REALTY_ROWS: RealtyRow[] = [
  { group: "apartments", sub: "by-rooms", kind: "studio" },
  { group: "apartments", sub: "by-rooms", kind: "1" },
  { group: "apartments", sub: "by-rooms", kind: "2" },
  { group: "apartments", sub: "by-rooms", kind: "3" },
  { group: "apartments", sub: "by-rooms", kind: "4" },
  { group: "apartments", sub: "by-rooms", kind: "5plus" },
  { group: "apartments", sub: "by-stock", kind: "newbuild" },
  { group: "apartments", sub: "by-stock", kind: "resale" },
  { group: "apartments", sub: "elite", kind: "penthouse" },
  { group: "apartments", sub: "elite", kind: "apartments-elite" },
  { group: "houses", sub: "houses-living", kind: "detached" },
  { group: "houses", sub: "houses-living", kind: "part-house" },
  { group: "houses", sub: "houses-country", kind: "dacha" },
  { group: "houses", sub: "houses-country", kind: "cottage" },
  { group: "houses", sub: "houses-country", kind: "townhouse" },
  { group: "rooms", sub: "rooms-apt", kind: "room-in-apt" },
  { group: "rooms", sub: "rooms-dorm", kind: "room-in-dorm" },
  { group: "rooms", sub: "rooms-dorm", kind: "bunk" },
  { group: "land", sub: "land-residential", kind: "land-izhs" },
  { group: "land", sub: "land-farm", kind: "land-farm" },
  { group: "land", sub: "land-industrial", kind: "land-industrial" },
  { group: "land", sub: "land-garden", kind: "land-garden" },
  { group: "commercial", sub: "comm-office", kind: "office" },
  { group: "commercial", sub: "comm-office", kind: "office-bc" },
  { group: "commercial", sub: "comm-retail", kind: "shop" },
  { group: "commercial", sub: "comm-retail", kind: "retail-mall" },
  { group: "commercial", sub: "comm-warehouse", kind: "warehouse" },
  { group: "commercial", sub: "comm-warehouse", kind: "production" },
  { group: "commercial", sub: "comm-warehouse", kind: "hangar" },
  { group: "commercial", sub: "comm-universal", kind: "psn" },
  { group: "commercial", sub: "comm-building", kind: "standalone-building" },
  { group: "commercial", sub: "comm-building", kind: "hotel-building" },
  { group: "garages", sub: "garages-box", kind: "garage-brick" },
  { group: "garages", sub: "garages-box", kind: "garage-metal" },
  { group: "garages", sub: "garages-parking", kind: "parking-open" },
  { group: "garages", sub: "garages-parking", kind: "parking-underground" },
];

export const ROOM_COUNT_KINDS = ["studio", "1", "2", "3", "4", "5plus"] as const;
export type RoomCountKind = (typeof ROOM_COUNT_KINDS)[number];

export const AREA_PRESETS = [
  { id: "any", min: null, max: null },
  { id: "to40", min: null, max: 40 },
  { id: "r40-70", min: 40, max: 70 },
  { id: "r70-100", min: 70, max: 100 },
  { id: "from100", min: 100, max: null },
] as const;
export type AreaPresetId = (typeof AREA_PRESETS)[number]["id"];

export const ROOM_FILTERS = [
  { rooms: 0, kind: "studio" },
  { rooms: 1, kind: "1" },
  { rooms: 2, kind: "2" },
  { rooms: 3, kind: "3" },
  { rooms: 4, kind: "4" },
  { rooms: 5, kind: "5plus" },
] as const;

export const REALTY_GROUP_RU: Record<string, string> = {
  apartments: "Квартиры",
  houses: "Дома, дачи, коттеджи",
  rooms: "Комнаты",
  land: "Земельные участки",
  commercial: "Коммерческая недвижимость",
  garages: "Гаражи и машиноместа",
};
export const REALTY_GROUP_KY: Record<string, string> = {
  apartments: "Батирлер",
  houses: "Үйлөр, дачалар, коттедждер",
  rooms: "Бөлмөлөр",
  land: "Жер участоктору",
  commercial: "Коммерциялык кыймылсыз мүлк",
  garages: "Гараждар жана унаа орундары",
};
export const REALTY_GROUP_UZ: Record<string, string> = {
  apartments: "Kvartiralar",
  houses: "Uylar, dachalar, kottedjlar",
  rooms: "Xonalar",
  land: "Yer uchastkalari",
  commercial: "Tijorat koʻchmas mulki",
  garages: "Garajlar va mashina joylari",
};

export const REALTY_SUB_RU: Record<string, string> = {
  "by-rooms": "По количеству комнат",
  "by-stock": "По типу дома",
  elite: "Элитное жильё",
  "houses-living": "Жилые дома",
  "houses-country": "Загородная недвижимость",
  "rooms-apt": "В квартире",
  "rooms-dorm": "В общежитии",
  "land-residential": "Под жилую застройку",
  "land-farm": "Сельхозназначения",
  "land-industrial": "Промышленного назначения",
  "land-garden": "Садовые товарищества",
  "comm-office": "Офисные помещения",
  "comm-retail": "Торговые помещения",
  "comm-warehouse": "Складские и производственные",
  "comm-universal": "Универсальные помещения",
  "comm-building": "Здания целиком",
  "garages-box": "Гаражи",
  "garages-parking": "Паркинг",
};
export const REALTY_SUB_KY: Record<string, string> = {
  "by-rooms": "Бөлмө саны боюнча",
  "by-stock": "Үй түрү боюнча",
  elite: "Элиталык турак жай",
  "houses-living": "Турак үйлөр",
  "houses-country": "Шаар четиндеги мүлк",
  "rooms-apt": "Батирде",
  "rooms-dorm": "Жатаканада",
  "land-residential": "Турак курулуш үчүн",
  "land-farm": "Айыл чарба үчүн",
  "land-industrial": "Өнөр жай үчүн",
  "land-garden": "Бакча шериктештиги",
  "comm-office": "Офис жайлары",
  "comm-retail": "Соода жайлары",
  "comm-warehouse": "Склад жана өндүрүш",
  "comm-universal": "Универсал жайлар",
  "comm-building": "Бүтүндөй имараттар",
  "garages-box": "Гараждар",
  "garages-parking": "Паркинг",
};
export const REALTY_SUB_UZ: Record<string, string> = {
  "by-rooms": "Xonalar soni boʻyicha",
  "by-stock": "Uy turi boʻyicha",
  elite: "Elita uy-joy",
  "houses-living": "Yashash uylari",
  "houses-country": "Shahar tashqarisidagi mulk",
  "rooms-apt": "Kvartirada",
  "rooms-dorm": "Yotoqxonada",
  "land-residential": "Turarjoy qurilishi uchun",
  "land-farm": "Qishloq xoʻjaligi uchun",
  "land-industrial": "Sanoat uchun",
  "land-garden": "Bogʻsheriklik",
  "comm-office": "Ofis joylari",
  "comm-retail": "Savdo joylari",
  "comm-warehouse": "Ombor va ishlab chiqarish",
  "comm-universal": "Universal joylar",
  "comm-building": "Butun binolar",
  "garages-box": "Garajlar",
  "garages-parking": "Parking",
};

export const REALTY_KIND_RU: Record<string, string> = {
  studio: "Студия",
  "1": "1-комнатная",
  "2": "2-комнатная",
  "3": "3-комнатная",
  "4": "4-комнатная",
  "5plus": "5+ комнат",
  newbuild: "Новостройка",
  resale: "Вторичное жильё",
  penthouse: "Пентхаус",
  "apartments-elite": "Апартаменты",
  detached: "Отдельный дом",
  "part-house": "Часть дома",
  dacha: "Дача",
  cottage: "Коттедж",
  townhouse: "Таунхаус",
  "room-in-apt": "Комната в квартире",
  "room-in-dorm": "Комната в общежитии",
  bunk: "Койко-место",
  "land-izhs": "Участок ИЖС",
  "land-farm": "Участок сельхозназначения",
  "land-industrial": "Участок промназначения",
  "land-garden": "Садовый участок",
  office: "Офис",
  "office-bc": "Помещение в бизнес-центре",
  shop: "Магазин",
  "retail-mall": "Торговая точка (ТЦ, рынок)",
  warehouse: "Склад",
  production: "Производственное помещение",
  hangar: "Ангар",
  psn: "Помещение свободного назначения (ПСН)",
  "standalone-building": "Отдельно стоящее здание",
  "hotel-building": "Здание под гостиницу/общепит",
  "garage-brick": "Гараж капитальный (кирпичный)",
  "garage-metal": "Гараж металлический (ракушка)",
  "parking-open": "Машиноместо на открытой стоянке",
  "parking-underground": "Машиноместо в подземном паркинге",
};
export const REALTY_KIND_KY: Record<string, string> = {
  studio: "Студия",
  "1": "1 бөлмөлүү",
  "2": "2 бөлмөлүү",
  "3": "3 бөлмөлүү",
  "4": "4 бөлмөлүү",
  "5plus": "5+ бөлмө",
  newbuild: "Жаңы үй",
  resale: "Экинчи кол турак",
  penthouse: "Пентхаус",
  "apartments-elite": "Апартаменттер",
  detached: "Айрым үй",
  "part-house": "Үйдүн бир бөлүгү",
  dacha: "Дача",
  cottage: "Коттедж",
  townhouse: "Таунхаус",
  "room-in-apt": "Батирдеги бөлмө",
  "room-in-dorm": "Жатаканадагы бөлмө",
  bunk: "Көйкө-орун",
  "land-izhs": "ИЖС участогу",
  "land-farm": "Айыл чарба участогу",
  "land-industrial": "Өнөр жай участогу",
  "land-garden": "Бакча участогу",
  office: "Офис",
  "office-bc": "Бизнес-борбордогу жай",
  shop: "Дүкөн",
  "retail-mall": "Соода чекити (СБ, базар)",
  warehouse: "Склад",
  production: "Өндүрүш жайы",
  hangar: "Ангар",
  psn: "Эркин багыттагы жай (ПСН)",
  "standalone-building": "Айрым имарат",
  "hotel-building": "Мейманкана/ашкана үчүн имарат",
  "garage-brick": "Капиталдык гараж (кирпич)",
  "garage-metal": "Металл гараж (ракушка)",
  "parking-open": "Ачык токтоо орду",
  "parking-underground": "Жер төлөдөгү унаа орду",
};
export const REALTY_KIND_UZ: Record<string, string> = {
  studio: "Studiya",
  "1": "1 xonali",
  "2": "2 xonali",
  "3": "3 xonali",
  "4": "4 xonali",
  "5plus": "5+ xona",
  newbuild: "Yangi uy",
  resale: "Ikkilamchi uy-joy",
  penthouse: "Penthaus",
  "apartments-elite": "Apartamentlar",
  detached: "Alohida uy",
  "part-house": "Uyning bir qismi",
  dacha: "Dacha",
  cottage: "Kottedj",
  townhouse: "Taunhaus",
  "room-in-apt": "Kvartiradagi xona",
  "room-in-dorm": "Yotoqxonadagi xona",
  bunk: "Koʻyka-joy",
  "land-izhs": "IJHS uchastkasi",
  "land-farm": "Qishloq xoʻjaligi yer",
  "land-industrial": "Sanoat yer",
  "land-garden": "Bogʻ uchastkasi",
  office: "Ofis",
  "office-bc": "Biznes-markazdagi joy",
  shop: "Doʻkon",
  "retail-mall": "Savdo nuqtasi (SM, bozor)",
  warehouse: "Ombor",
  production: "Ishlab chiqarish joyi",
  hangar: "Angar",
  psn: "Erkin moʻljaldagi joy (PSN)",
  "standalone-building": "Alohida bino",
  "hotel-building": "Mehmonxona/ovqatlanish binosi",
  "garage-brick": "Kapital garaj (gʻisht)",
  "garage-metal": "Metall garaj (rakushka)",
  "parking-open": "Ochiq turargoh joyi",
  "parking-underground": "Yer osti parking joyi",
};

const HOUSING_TO_GROUP: Record<string, RealtyGroupId> = {
  apartment: "apartments",
  house: "houses",
  dacha: "houses",
  room: "rooms",
  land: "land",
  commercial: "commercial",
  parking: "garages",
};

function unique(ids: string[]) {
  return [...new Set(ids)];
}

export function isRealtyGroup(id: string | null | undefined): id is RealtyGroupId {
  return Boolean(id && (REALTY_GROUPS as readonly string[]).includes(id));
}

export function isRoomCountKind(id: string | null | undefined): id is RoomCountKind {
  return Boolean(id && (ROOM_COUNT_KINDS as readonly string[]).includes(id));
}

export function realtySubsOf(group?: string | null): string[] {
  return unique(
    REALTY_ROWS.filter((row) => !group || group === "any" || row.group === group).map((row) => row.sub),
  );
}

export function realtyKindsOf(group?: string | null, sub?: string | null): string[] {
  return unique(
    REALTY_ROWS.filter((row) => {
      if (group && group !== "any" && row.group !== group) return false;
      if (sub && sub !== "any" && row.sub !== sub) return false;
      return true;
    }).map((row) => row.kind),
  );
}

export function housingKindOfRealty(group?: string | null, kind?: string | null): string {
  if (kind === "dacha") return "dacha";
  switch (group) {
    case "apartments":
      return "apartment";
    case "houses":
      return "house";
    case "rooms":
      return "room";
    case "land":
      return "land";
    case "commercial":
      return "commercial";
    case "garages":
      return "parking";
    default:
      return "any";
  }
}

export function roomsOfRealtyKind(kind?: string | null): number[] {
  if (kind === "studio") return [0];
  if (kind === "1") return [1];
  if (kind === "2") return [2];
  if (kind === "3") return [3];
  if (kind === "4") return [4];
  if (kind === "5plus") return [5];
  return [];
}

export function stockOfRealtyKind(kind?: string | null): "any" | "newbuild" | "resale" {
  if (kind === "newbuild" || kind === "resale") return kind;
  return "any";
}

export function roomsKindOf(rooms?: number | null): RoomCountKind | undefined {
  if (rooms == null) return undefined;
  if (rooms === 0) return "studio";
  if (rooms >= 5) return "5plus";
  if (rooms === 1 || rooms === 2 || rooms === 3 || rooms === 4) return String(rooms) as RoomCountKind;
  return undefined;
}

export function listingRoomsMatch(rooms: number | undefined, wanted: number): boolean {
  if (rooms == null) return false;
  if (wanted === 0) return rooms === 0;
  if (wanted >= 5) return rooms >= 5;
  return rooms === wanted;
}

export function roomsMatchKind(rooms: number | undefined, kind: string): boolean {
  const wanted = roomsOfRealtyKind(kind);
  if (!wanted.length) return true;
  return listingRoomsMatch(rooms, wanted[0]);
}

export function areaPresetId(min: number | null | undefined, max: number | null | undefined): AreaPresetId | "custom" {
  const hit = AREA_PRESETS.find((p) => p.min === (min ?? null) && p.max === (max ?? null));
  return hit?.id ?? "custom";
}

export function realtyIsLiving(group?: string | null, housingType?: string | null): boolean {
  if (group && group !== "any") return group === "apartments" || group === "houses" || group === "rooms";
  return !housingType || housingType === "any" || housingType === "apartment" || housingType === "house" || housingType === "room" || housingType === "dacha";
}

export function realtyShowsRooms(group?: string | null, kind?: string | null, housingType?: string | null): boolean {
  if (isRoomCountKind(kind)) return false;
  if (group && group !== "any") return group === "apartments" || group === "houses";
  return !housingType || housingType === "any" || housingType === "apartment" || housingType === "house" || housingType === "dacha";
}

export function realtyShowsArea(group?: string | null): boolean {
  return group !== "garages";
}

export function realtyShowsStock(group?: string | null, sub?: string | null, housingType?: string | null): boolean {
  if (sub === "by-stock") return false;
  if (group && group !== "any") return group === "apartments" || group === "houses" || group === "commercial";
  return !housingType || housingType === "any" || housingType === "apartment" || housingType === "house" || housingType === "commercial" || housingType === "dacha";
}

export function housingTypeToRealtyGroup(housingType?: string | null): RealtyGroupId | "any" {
  if (!housingType || housingType === "any") return "any";
  return HOUSING_TO_GROUP[housingType] ?? "any";
}

type RealtyListing = {
  housingKind?: string;
  rooms?: number;
  stockKind?: string;
  realtyGroup?: string;
  realtySub?: string;
  realtyKind?: string;
};

function groupOfListing(item: RealtyListing): string | undefined {
  if (item.realtyGroup) return item.realtyGroup;
  if (item.housingKind && HOUSING_TO_GROUP[item.housingKind]) return HOUSING_TO_GROUP[item.housingKind];
  return undefined;
}

export function listingMatchesRealty(
  item: RealtyListing,
  filters: { realtyGroup?: string; realtySub?: string; realtyKind?: string },
): boolean {
  const group = filters.realtyGroup;
  if (!group || group === "any") return true;
  if (groupOfListing(item) !== group) return false;

  const sub = filters.realtySub;
  if (!sub || sub === "any") return true;

  if (group === "apartments") {
    if (item.housingKind && item.housingKind !== "apartment") return false;
    if (sub === "by-rooms") {
      if (!filters.realtyKind || filters.realtyKind === "any") return true;
      return roomsMatchKind(item.rooms, filters.realtyKind);
    }
    if (sub === "by-stock") {
      if (!filters.realtyKind || filters.realtyKind === "any") return true;
      return item.stockKind === filters.realtyKind;
    }
    if (sub === "elite") {
      if (!filters.realtyKind || filters.realtyKind === "any") {
        return item.realtyKind === "penthouse" || item.realtyKind === "apartments-elite";
      }
      return item.realtyKind === filters.realtyKind;
    }
    return false;
  }

  if (item.realtySub && item.realtySub !== sub) return false;
  if (!item.realtySub) {
    const inferred = inferredSub(item);
    if (inferred && inferred !== sub) return false;
  }

  const kind = filters.realtyKind;
  if (!kind || kind === "any") return true;
  if (item.realtyKind) return item.realtyKind === kind;
  return inferredKind(item) === kind;
}

function inferredSub(item: RealtyListing): string | undefined {
  switch (item.housingKind) {
    case "house":
      return "houses-living";
    case "dacha":
      return "houses-country";
    case "room":
      return "rooms-apt";
    case "land":
      return "land-residential";
    case "commercial":
      return "comm-office";
    case "parking":
      return "garages-parking";
    default:
      return undefined;
  }
}

function inferredKind(item: RealtyListing): string | undefined {
  switch (item.housingKind) {
    case "house":
      return "detached";
    case "dacha":
      return "dacha";
    case "room":
      return "room-in-apt";
    case "land":
      return "land-izhs";
    case "commercial":
      return "office";
    case "parking":
      return "parking-underground";
    default:
      return roomsKindOf(item.rooms);
  }
}
