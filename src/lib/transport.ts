export const VEHICLE_GROUPS = ["passenger", "special"] as const;
export type VehicleGroup = (typeof VEHICLE_GROUPS)[number];

export const PASSENGER_TYPES = ["sedan", "crossover", "suv", "pickup", "wagon"] as const;
export const SPECIAL_TYPES = ["excavator", "backhoe", "bulldozer", "loader", "crane", "dump", "tractor"] as const;

export type TransportRow = {
  group: VehicleGroup;
  type: string;
  make: string;
  model: string;
};

/** Type / make / model from Konshu_Transport_spravochnik (Легковые авто + Спецтехника), plus a few models already in the demo feed. */
export const TRANSPORT_ROWS: TransportRow[] = [
  { group: "passenger", type: "sedan", make: "toyota", model: "camry" },
  { group: "passenger", type: "sedan", make: "toyota", model: "corolla" },
  { group: "passenger", type: "crossover", make: "toyota", model: "rav4" },
  { group: "passenger", type: "suv", make: "toyota", model: "land-cruiser" },
  { group: "passenger", type: "suv", make: "toyota", model: "prado" },
  { group: "passenger", type: "pickup", make: "toyota", model: "hilux" },
  { group: "passenger", type: "crossover", make: "lexus", model: "rx" },
  { group: "passenger", type: "suv", make: "lexus", model: "lx" },
  { group: "passenger", type: "sedan", make: "lexus", model: "es" },
  { group: "passenger", type: "crossover", make: "honda", model: "cr-v" },
  { group: "passenger", type: "sedan", make: "honda", model: "civic" },
  { group: "passenger", type: "sedan", make: "honda", model: "accord" },
  { group: "passenger", type: "suv", make: "honda", model: "pilot" },
  { group: "passenger", type: "crossover", make: "nissan", model: "x-trail" },
  { group: "passenger", type: "crossover", make: "nissan", model: "qashqai" },
  { group: "passenger", type: "sedan", make: "nissan", model: "almera" },
  { group: "passenger", type: "suv", make: "nissan", model: "patrol" },
  { group: "passenger", type: "sedan", make: "mazda", model: "mazda-6" },
  { group: "passenger", type: "crossover", make: "mazda", model: "cx-5" },
  { group: "passenger", type: "crossover", make: "subaru", model: "forester" },
  { group: "passenger", type: "wagon", make: "subaru", model: "outback" },
  { group: "passenger", type: "crossover", make: "mitsubishi", model: "outlander" },
  { group: "passenger", type: "suv", make: "mitsubishi", model: "pajero" },
  { group: "passenger", type: "sedan", make: "hyundai", model: "solaris" },
  { group: "passenger", type: "sedan", make: "hyundai", model: "elantra" },
  { group: "passenger", type: "sedan", make: "hyundai", model: "sonata" },
  { group: "passenger", type: "crossover", make: "hyundai", model: "tucson" },
  { group: "passenger", type: "suv", make: "hyundai", model: "santa-fe" },
  { group: "passenger", type: "crossover", make: "hyundai", model: "creta" },
  { group: "passenger", type: "sedan", make: "kia", model: "rio" },
  { group: "passenger", type: "sedan", make: "kia", model: "cerato" },
  { group: "passenger", type: "sedan", make: "kia", model: "k5" },
  { group: "passenger", type: "crossover", make: "kia", model: "sportage" },
  { group: "passenger", type: "suv", make: "kia", model: "sorento" },
  { group: "passenger", type: "sedan", make: "chevrolet", model: "cobalt" },
  { group: "passenger", type: "sedan", make: "chevrolet", model: "lacetti" },
  { group: "passenger", type: "suv", make: "chevrolet", model: "chevy-niva" },
  { group: "passenger", type: "sedan", make: "daewoo", model: "nexia" },
  { group: "passenger", type: "sedan", make: "volkswagen", model: "passat" },
  { group: "passenger", type: "sedan", make: "volkswagen", model: "polo" },
  { group: "passenger", type: "crossover", make: "volkswagen", model: "tiguan" },
  { group: "passenger", type: "sedan", make: "bmw", model: "3-series" },
  { group: "passenger", type: "suv", make: "bmw", model: "x5" },
  { group: "passenger", type: "sedan", make: "mercedes", model: "e-class" },
  { group: "passenger", type: "sedan", make: "mercedes", model: "c-class" },
  { group: "passenger", type: "suv", make: "mercedes", model: "gle" },
  { group: "passenger", type: "sedan", make: "audi", model: "a4" },
  { group: "passenger", type: "crossover", make: "audi", model: "q5" },
  { group: "passenger", type: "sedan", make: "lada", model: "granta" },
  { group: "passenger", type: "sedan", make: "lada", model: "vesta" },
  { group: "passenger", type: "suv", make: "lada", model: "niva" },
  { group: "passenger", type: "crossover", make: "renault", model: "duster" },
  { group: "passenger", type: "sedan", make: "renault", model: "logan" },
  { group: "special", type: "excavator", make: "caterpillar", model: "320d" },
  { group: "special", type: "excavator", make: "komatsu", model: "pc200" },
  { group: "special", type: "excavator", make: "hitachi", model: "zx200" },
  { group: "special", type: "excavator", make: "hyundai", model: "r210" },
  { group: "special", type: "excavator", make: "doosan", model: "dx225" },
  { group: "special", type: "excavator", make: "jcb", model: "js220" },
  { group: "special", type: "excavator", make: "sdlg", model: "e6210f" },
  { group: "special", type: "backhoe", make: "jcb", model: "3cx" },
  { group: "special", type: "backhoe", make: "case", model: "case-580" },
  { group: "special", type: "backhoe", make: "caterpillar", model: "cat-428" },
  { group: "special", type: "bulldozer", make: "caterpillar", model: "d6" },
  { group: "special", type: "bulldozer", make: "komatsu", model: "d65" },
  { group: "special", type: "bulldozer", make: "shantui", model: "sd16" },
  { group: "special", type: "bulldozer", make: "chtz", model: "t-11" },
  { group: "special", type: "loader", make: "caterpillar", model: "cat-950" },
  { group: "special", type: "loader", make: "komatsu", model: "wa380" },
  { group: "special", type: "loader", make: "xcmg", model: "lw300" },
  { group: "special", type: "loader", make: "lonking", model: "cdm833" },
  { group: "special", type: "loader", make: "sdlg", model: "lg936" },
  { group: "special", type: "crane", make: "liebherr", model: "ltm-1030" },
  { group: "special", type: "crane", make: "ivanovets", model: "ks-45717" },
  { group: "special", type: "crane", make: "zoomlion", model: "qy25" },
  { group: "special", type: "crane", make: "xcmg", model: "qy50" },
  { group: "special", type: "dump", make: "kamaz", model: "kamaz-65115" },
  { group: "special", type: "dump", make: "sinotruk", model: "howo-a7" },
  { group: "special", type: "dump", make: "shacman", model: "f3000" },
  { group: "special", type: "dump", make: "maz", model: "maz-5551" },
  { group: "special", type: "tractor", make: "mtz", model: "mtz-82" },
  { group: "special", type: "tractor", make: "john-deere", model: "5075e" },
  { group: "special", type: "tractor", make: "new-holland", model: "td5" },
  { group: "special", type: "tractor", make: "foton", model: "te-244" },
];

function unique(ids: string[]) {
  return [...new Set(ids)];
}

export function isVehicleGroup(id: string | null | undefined): id is VehicleGroup {
  return id === "passenger" || id === "special";
}

export function vehicleTypesOf(group: string | null | undefined): readonly string[] {
  if (group === "passenger") return PASSENGER_TYPES;
  if (group === "special") return SPECIAL_TYPES;
  return [];
}

export function vehicleMakesOf(group?: string | null, type?: string | null): string[] {
  return unique(
    TRANSPORT_ROWS.filter((row) => {
      if (group && group !== "any" && row.group !== group) return false;
      if (type && type !== "any" && row.type !== type) return false;
      return true;
    }).map((row) => row.make),
  );
}

export function vehicleModelsOf(make?: string | null, group?: string | null, type?: string | null): string[] {
  if (!make || make === "any") return [];
  return unique(
    TRANSPORT_ROWS.filter((row) => {
      if (row.make !== make) return false;
      if (group && group !== "any" && row.group !== group) return false;
      if (type && type !== "any" && row.type !== type) return false;
      return true;
    }).map((row) => row.model),
  );
}

export const CAR_MAKES = vehicleMakesOf() as readonly string[];
export type CarMake = string;

export function carModelsOf(make: string | null | undefined): readonly string[] {
  return vehicleModelsOf(make);
}

const MAKE_ALIASES: Record<string, string[]> = {
  toyota: ["toyota", "тойота"],
  lexus: ["lexus", "лексус"],
  honda: ["honda", "хонда"],
  nissan: ["nissan", "ниссан"],
  mazda: ["mazda", "мазда"],
  subaru: ["subaru", "субару"],
  mitsubishi: ["mitsubishi", "митсубиси", "мицубиси"],
  hyundai: ["hyundai", "хендай", "хундай"],
  kia: ["kia", "киа"],
  chevrolet: ["chevrolet", "шевроле"],
  daewoo: ["daewoo", "дэу", "деу"],
  volkswagen: ["volkswagen", "фольксваген", "vw"],
  bmw: ["bmw", "бмв"],
  mercedes: ["mercedes", "мерседес", "mercedes-benz"],
  audi: ["audi", "ауди"],
  lada: ["lada", "лада", "ваз"],
  renault: ["renault", "рено"],
  caterpillar: ["caterpillar", "cat", "катерпиллар"],
  komatsu: ["komatsu", "комацу"],
  hitachi: ["hitachi", "хитачи"],
  jcb: ["jcb"],
  kamaz: ["kamaz", "камаз"],
};

const MODEL_ALIASES: Record<string, string[]> = {
  camry: ["camry", "камри"],
  corolla: ["corolla", "королла"],
  rav4: ["rav4", "rav 4", "рав4", "рав 4"],
  "land-cruiser": ["land cruiser", "landcruiser", "ленд крузер", "крузер 200"],
  prado: ["prado", "прадо"],
  hilux: ["hilux", "хайлюкс"],
  "cr-v": ["cr-v", "crv", "cr v"],
  "x-trail": ["x-trail", "xtrail", "икс трейл"],
  qashqai: ["qashqai", "кашкай"],
  "cx-5": ["cx-5", "cx5", "cx 5"],
  "santa-fe": ["santa fe", "santa-fe", "санта фе"],
  "3-series": ["3 series", "3 серии", "320"],
  "e-class": ["e-class", "e class", "е класс", "e200", "e220"],
  "c-class": ["c-class", "c class", "с класс"],
  "3cx": ["3cx", "3 cx"],
};

const TYPE_ALIASES: Record<string, string[]> = {
  sedan: ["седан", "sedan"],
  crossover: ["кроссовер", "crossover", "кросс"],
  suv: ["внедорожник", "suv", "джип"],
  pickup: ["пикап", "pickup"],
  wagon: ["универсал", "wagon"],
  excavator: ["экскаватор", "excavator"],
  backhoe: ["экскаватор-погрузчик", "3cx"],
  bulldozer: ["бульдозер", "bulldozer"],
  loader: ["погрузчик", "loader"],
  crane: ["кран", "автокран"],
  dump: ["самосвал", "dump"],
  tractor: ["трактор", "tractor"],
};

function aliasKeys(id: string, extra?: string[]) {
  const spaced = id.replace(/-/g, " ");
  return unique([id, spaced, ...(extra ?? [])].map((k) => k.toLowerCase()).filter((k) => k.length >= 2));
}

function textHas(text: string, keys: string[]) {
  return keys.some((k) => text.includes(k));
}

export function matchTransport(raw: string): TransportRow | undefined {
  const text = raw.toLowerCase().replace(/ё/g, "е");
  let best: { row: TransportRow; score: number } | null = null;
  for (const row of TRANSPORT_ROWS) {
    const makeKeys = aliasKeys(row.make, MAKE_ALIASES[row.make]);
    const modelKeys = aliasKeys(row.model, MODEL_ALIASES[row.model]);
    const makeHit = textHas(text, makeKeys);
    const modelHits = modelKeys.filter((k) => text.includes(k));
    const modelHit = modelHits.length > 0;
    if (!makeHit && !modelHit) continue;
    const longestModel = modelHits.reduce((n, k) => Math.max(n, k.length), 0);
    if (modelHit && !makeHit && longestModel < 4) continue;
    let score = 0;
    if (makeHit) score += 12;
    if (modelHit) score += 40 + longestModel;
    if (textHas(text, TYPE_ALIASES[row.type] ?? [row.type])) score += 8;
    if (!best || score > best.score) best = { row, score };
  }
  if (!best || best.score < 12) return undefined;
  return best.row;
}
