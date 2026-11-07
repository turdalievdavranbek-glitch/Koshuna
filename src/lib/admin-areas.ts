/** Official rayons and cities of oblast significance. Old city/oblast records stay valid. */

export const ADMIN_OBLASTS = [
  "bishkek",
  "chuy",
  "issyk-kul",
  "naryn",
  "talas",
  "jalal-abad",
  "osh-oblast",
  "batken",
] as const;

export type AdminOblastId = (typeof ADMIN_OBLASTS)[number];

export type AdminArea = {
  id: string;
  oblast: AdminOblastId;
  kind: "district" | "city";
  name: string;
  nameKy: string;
  lat: number;
  lng: number;
  /** Existing `CITIES` id, when this place is already that city. */
  cityId?: string;
  /** Existing settlement id. Used to match older records. */
  settlementId?: string;
  /** Extra strings already stored on listings (`district`). */
  aliases?: string[];
};

export const ADMIN_AREAS: readonly AdminArea[] = [
  { id: "leninsky", oblast: "bishkek", kind: "district", name: "Ленинский район", nameKy: "Ленин району", lat: 42.8726, lng: 74.5898, aliases: ["Ленинский"] },
  { id: "oktyabr", oblast: "bishkek", kind: "district", name: "Октябрьский район", nameKy: "Октябрь району", lat: 42.852, lng: 74.62, aliases: ["Октябрьский"] },
  { id: "pervomai", oblast: "bishkek", kind: "district", name: "Первомайский район", nameKy: "Биринчи май району", lat: 42.882, lng: 74.58, aliases: ["Первомайский"] },
  { id: "sverdlov", oblast: "bishkek", kind: "district", name: "Свердловский район", nameKy: "Свердлов району", lat: 42.882, lng: 74.635, aliases: ["Свердловский"] },

  { id: "alamudun", oblast: "chuy", kind: "district", name: "Аламудунский район", nameKy: "Аламудун району", lat: 42.83, lng: 74.63, aliases: ["Аламудунский", "Аламединский"] },
  { id: "jayil", oblast: "chuy", kind: "district", name: "Жайылский район", nameKy: "Жайыл району", lat: 42.82, lng: 73.85, aliases: ["Жайылский", "Жайыльский"] },
  { id: "kemin", oblast: "chuy", kind: "district", name: "Кеминский район", nameKy: "Кемин району", lat: 42.78, lng: 75.69, aliases: ["Кеминский"] },
  { id: "moskva", oblast: "chuy", kind: "district", name: "Московский район", nameKy: "Москва району", lat: 42.83, lng: 74.12, aliases: ["Московский"] },
  { id: "panfilov", oblast: "chuy", kind: "district", name: "Панфиловский район", nameKy: "Панфилов району", lat: 42.83, lng: 73.68, aliases: ["Панфиловский"] },
  { id: "sokuluk-rayon", oblast: "chuy", kind: "district", name: "Сокулукский район", nameKy: "Сокулук району", lat: 42.86, lng: 74.3, settlementId: "sokuluk", aliases: ["Сокулукский", "Сокулук"] },
  { id: "chuy-rayon", oblast: "chuy", kind: "district", name: "Чуйский район", nameKy: "Чүй району", lat: 42.84, lng: 75.24, aliases: ["Чуйский"] },
  { id: "ysyk-ata", oblast: "chuy", kind: "district", name: "Ысык-Атинский район", nameKy: "Ысык-Ата району", lat: 42.88, lng: 75.0, aliases: ["Ысык-Атинский", "Ысык-Ата"] },
  { id: "tokmok", oblast: "chuy", kind: "city", name: "Токмок", nameKy: "Токмок", lat: 42.8417, lng: 75.301, cityId: "tokmok", aliases: ["Токмок"] },
  { id: "kara-balta", oblast: "chuy", kind: "city", name: "Кара-Балта", nameKy: "Кара-Балта", lat: 42.814, lng: 73.848, aliases: ["Кара-Балта"] },
  { id: "kant", oblast: "chuy", kind: "city", name: "Кант", nameKy: "Кант", lat: 42.891, lng: 74.85, settlementId: "kant", aliases: ["Кант"] },

  { id: "ak-suu", oblast: "issyk-kul", kind: "district", name: "Ак-Суйский район", nameKy: "Ак-Суу району", lat: 42.5, lng: 78.53, aliases: ["Ак-Суйский", "Ак-Суу"] },
  { id: "jeti-oguz", oblast: "issyk-kul", kind: "district", name: "Жети-Огузский район", nameKy: "Жети-Өгүз району", lat: 42.35, lng: 78.23, aliases: ["Жети-Огузский", "Джети-Огузский"] },
  { id: "issyk-kul-rayon", oblast: "issyk-kul", kind: "district", name: "Иссык-Кульский район", nameKy: "Ысык-Көл району", lat: 42.65, lng: 77.08, aliases: ["Иссык-Кульский"] },
  { id: "ton", oblast: "issyk-kul", kind: "district", name: "Тонский район", nameKy: "Тоң району", lat: 42.11, lng: 76.99, aliases: ["Тонский"] },
  { id: "tyup", oblast: "issyk-kul", kind: "district", name: "Тюпский район", nameKy: "Түп району", lat: 42.73, lng: 78.36, aliases: ["Тюпский"] },
  { id: "karakol", oblast: "issyk-kul", kind: "city", name: "Каракол", nameKy: "Каракол", lat: 42.4906, lng: 78.393, cityId: "karakol" },
  { id: "balykchy", oblast: "issyk-kul", kind: "city", name: "Балыкчы", nameKy: "Балыкчы", lat: 42.46, lng: 76.18, settlementId: "balykchy", aliases: ["Балыкчы", "Балыкчи"] },
  { id: "cholpon-ata", oblast: "issyk-kul", kind: "city", name: "Чолпон-Ата", nameKy: "Чолпон-Ата", lat: 42.6494, lng: 77.0806, cityId: "cholpon-ata" },

  { id: "ak-talaa", oblast: "naryn", kind: "district", name: "Ак-Талинский район", nameKy: "Ак-Талаа району", lat: 41.27, lng: 75.15, aliases: ["Ак-Талинский"] },
  { id: "at-bashy-rayon", oblast: "naryn", kind: "district", name: "Ат-Башинский район", nameKy: "Ат-Башы району", lat: 41.17, lng: 75.8, settlementId: "at-bashy", aliases: ["Ат-Башинский", "Ат-Башы"] },
  { id: "jumgal", oblast: "naryn", kind: "district", name: "Жумгальский район", nameKy: "Жумгал району", lat: 41.93, lng: 74.55, aliases: ["Жумгальский", "Джумгальский"] },
  { id: "kochkor-rayon", oblast: "naryn", kind: "district", name: "Кочкорский район", nameKy: "Кочкор району", lat: 42.216, lng: 75.689, cityId: "kochkor", aliases: ["Кочкорский", "Кочкор"] },
  { id: "naryn-rayon", oblast: "naryn", kind: "district", name: "Нарынский район", nameKy: "Нарын району", lat: 41.35, lng: 76.15, aliases: ["Нарынский"] },
  { id: "naryn", oblast: "naryn", kind: "city", name: "Нарын", nameKy: "Нарын", lat: 41.428, lng: 76.001, cityId: "naryn" },

  { id: "bakai-ata", oblast: "talas", kind: "district", name: "Бакай-Атинский район", nameKy: "Бакай-Ата району", lat: 42.49, lng: 71.93, aliases: ["Бакай-Атинский"] },
  { id: "kara-buura", oblast: "talas", kind: "district", name: "Кара-Бууринский район", nameKy: "Кара-Буура району", lat: 42.62, lng: 71.55, aliases: ["Кара-Бууринский"] },
  { id: "manas", oblast: "talas", kind: "district", name: "Манасский район", nameKy: "Манас району", lat: 42.52, lng: 72.5, aliases: ["Манасский"] },
  { id: "talas-rayon", oblast: "talas", kind: "district", name: "Таласский район", nameKy: "Талас району", lat: 42.48, lng: 72.15, aliases: ["Таласский"] },
  { id: "talas", oblast: "talas", kind: "city", name: "Талас", nameKy: "Талас", lat: 42.522, lng: 72.242, cityId: "talas" },

  { id: "aksy", oblast: "jalal-abad", kind: "district", name: "Аксыйский район", nameKy: "Аксы району", lat: 41.5, lng: 71.75, aliases: ["Аксыйский"] },
  { id: "ala-buka", oblast: "jalal-abad", kind: "district", name: "Ала-Букинский район", nameKy: "Ала-Бука району", lat: 41.35, lng: 71.48, aliases: ["Ала-Букинский"] },
  { id: "bazar-korgon", oblast: "jalal-abad", kind: "district", name: "Базар-Коргонский район", nameKy: "Базар-Коргон району", lat: 41.03, lng: 72.75, aliases: ["Базар-Коргонский"] },
  { id: "nooken", oblast: "jalal-abad", kind: "district", name: "Ноокенский район", nameKy: "Ноокен району", lat: 41.1, lng: 72.62, aliases: ["Ноокенский"] },
  { id: "suzak-rayon", oblast: "jalal-abad", kind: "district", name: "Сузакский район", nameKy: "Сузак району", lat: 40.9, lng: 72.9, settlementId: "suzak", aliases: ["Сузакский", "Сузак"] },
  { id: "toguz-toro", oblast: "jalal-abad", kind: "district", name: "Тогуз-Тороуский район", nameKy: "Тогуз-Торо району", lat: 41.4, lng: 74.04, aliases: ["Тогуз-Тороуский"] },
  { id: "toktogul", oblast: "jalal-abad", kind: "district", name: "Токтогульский район", nameKy: "Токтогул району", lat: 41.87, lng: 72.94, aliases: ["Токтогульский"] },
  { id: "chatkal", oblast: "jalal-abad", kind: "district", name: "Чаткальский район", nameKy: "Чаткал району", lat: 41.75, lng: 71.05, aliases: ["Чаткальский"] },
  { id: "jalal-abad", oblast: "jalal-abad", kind: "city", name: "Манас", nameKy: "Манас", lat: 40.933, lng: 73.002, cityId: "jalal-abad", aliases: ["Джалал-Абад", "Жалал-Абад", "Jalal-Abad"] },
  { id: "kara-kul", oblast: "jalal-abad", kind: "city", name: "Кара-Куль", nameKy: "Кара-Көл", lat: 41.62, lng: 72.67, aliases: ["Кара-Куль", "Кара-Көл"] },
  { id: "mailuu-suu", oblast: "jalal-abad", kind: "city", name: "Майлуу-Суу", nameKy: "Майлуу-Суу", lat: 41.26, lng: 72.45, aliases: ["Майлуу-Суу", "Майли-Сай"] },
  { id: "tash-komur", oblast: "jalal-abad", kind: "city", name: "Таш-Кумыр", nameKy: "Таш-Көмүр", lat: 41.35, lng: 72.22, aliases: ["Таш-Кумыр", "Таш-Көмүр"] },

  { id: "osh-city", oblast: "osh-oblast", kind: "city", name: "г. Ош", nameKy: "Ош шаары", lat: 40.5283, lng: 72.7985, cityId: "osh", aliases: ["Ош", "г. Ош", "Ош шаары"] },
  { id: "alay", oblast: "osh-oblast", kind: "district", name: "Алайский район", nameKy: "Алай району", lat: 40.31, lng: 73.44, aliases: ["Алайский"] },
  { id: "aravan", oblast: "osh-oblast", kind: "district", name: "Араванский район", nameKy: "Араван району", lat: 40.52, lng: 72.5, aliases: ["Араванский"] },
  { id: "kara-kulja", oblast: "osh-oblast", kind: "district", name: "Кара-Кульджинский район", nameKy: "Кара-Кулжа району", lat: 40.25, lng: 73.55, aliases: ["Кара-Кульджинский", "Кара-Кулджинский"] },
  { id: "kara-suu-rayon", oblast: "osh-oblast", kind: "district", name: "Кара-Суйский район", nameKy: "Кара-Суу району", lat: 40.7, lng: 72.87, settlementId: "kara-suu", aliases: ["Кара-Суйский", "Кара-Суу"] },
  { id: "nookat", oblast: "osh-oblast", kind: "district", name: "Ноокатский район", nameKy: "Ноокат району", lat: 40.26, lng: 72.62, aliases: ["Ноокатский"] },
  { id: "uzgen-rayon", oblast: "osh-oblast", kind: "district", name: "Узгенский район", nameKy: "Өзгөн району", lat: 40.77, lng: 73.3, aliases: ["Узгенский"] },
  { id: "chon-alay", oblast: "osh-oblast", kind: "district", name: "Чон-Алайский район", nameKy: "Чоң-Алай району", lat: 39.55, lng: 72.2, aliases: ["Чон-Алайский"] },
  { id: "uzgen", oblast: "osh-oblast", kind: "city", name: "Узген", nameKy: "Өзгөн", lat: 40.77, lng: 73.3, settlementId: "uzgen", aliases: ["Узген", "Өзгөн"] },

  { id: "batken-rayon", oblast: "batken", kind: "district", name: "Баткенский район", nameKy: "Баткен району", lat: 40.06, lng: 70.82, aliases: ["Баткенский"] },
  { id: "kadamjay", oblast: "batken", kind: "district", name: "Кадамжайский район", nameKy: "Кадамжай району", lat: 40.13, lng: 71.73, aliases: ["Кадамжайский"] },
  { id: "leilek", oblast: "batken", kind: "district", name: "Лейлекский район", nameKy: "Лейлек району", lat: 39.83, lng: 69.53, aliases: ["Лейлекский"] },
  { id: "batken", oblast: "batken", kind: "city", name: "Баткен", nameKy: "Баткен", lat: 40.062, lng: 70.819, cityId: "batken" },
  { id: "kyzyl-kiya", oblast: "batken", kind: "city", name: "Кызыл-Кия", nameKy: "Кызыл-Кыя", lat: 40.26, lng: 72.13, aliases: ["Кызыл-Кия", "Кызыл-Кыя"] },
  { id: "sulukta", oblast: "batken", kind: "city", name: "Сулюкта", nameKy: "Сүлүктү", lat: 39.94, lng: 69.57, aliases: ["Сулюкта", "Сүлүктү"] },
];

const BY_ID = new Map(ADMIN_AREAS.map((area) => [area.id, area]));

export function adminAreaById(id: string | null | undefined): AdminArea | undefined {
  if (!id) return undefined;
  return BY_ID.get(id);
}

export function areasOfOblast(oblast: string): { districts: AdminArea[]; cities: AdminArea[] } {
  const rows = ADMIN_AREAS.filter((area) => area.oblast === oblast);
  return {
    districts: rows.filter((area) => area.kind === "district"),
    cities: rows.filter((area) => area.kind === "city"),
  };
}

export function adminAreaLabel(area: AdminArea, lang: string): string {
  return lang === "ky" ? area.nameKy : area.name;
}

function samePlace(value: string, expected: string): boolean {
  return value.trim().toLowerCase() === expected.trim().toLowerCase();
}

/** A district pick matches that district. An oblast pick (no rayon) still matches the whole oblast. */
export function adminAreaMatchesListing(
  area: AdminArea,
  item: { city: string; district?: string | null; settlement?: string | null },
): boolean {
  const district = (item.district ?? "").trim();
  if (district) {
    if (samePlace(district, area.id) || samePlace(district, area.name) || samePlace(district, area.nameKy)) return true;
    if ((area.aliases ?? []).some((alias) => samePlace(district, alias))) return true;
  }
  if (area.kind === "city" && area.cityId && item.city === area.cityId) return true;
  if (area.settlementId && item.settlement === area.settlementId) return true;
  if (area.kind === "district" && area.cityId && item.city === area.cityId) return true;
  return false;
}
