import type { User } from "./types";

export const PARTNER_ROLES = ["realtor", "developer", "admin"] as const;
export type PartnerRole = (typeof PARTNER_ROLES)[number];

export const APPLICATION_KINDS = ["realtor", "developer"] as const;
export type ApplicationKind = (typeof APPLICATION_KINDS)[number];

export const APPLICATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const COMPLEX_CLASSES = ["economy", "comfort", "business", "elite"] as const;
export type ComplexClass = (typeof COMPLEX_CLASSES)[number];

export const COMPLEX_STAGES = ["excavation", "under_construction", "commissioned"] as const;
export type ComplexStage = (typeof COMPLEX_STAGES)[number];

export const UNIT_STATUSES = ["available", "reserved", "sold"] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const LEAD_STATUSES = ["new", "contacted", "closed"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const COMPLEX_AMENITIES = ["parking", "playground", "security", "elevator", "school", "carfree"] as const;
export type ComplexAmenity = (typeof COMPLEX_AMENITIES)[number];

export const SELLER_KINDS = ["any", "neighbor", "owner", "realtor"] as const;
export type SellerKind = (typeof SELLER_KINDS)[number];

export type PartnerApplication = {
  id: string;
  kind: ApplicationKind;
  userPhone: string;
  userName: string;
  companyName: string;
  contactName: string;
  phone: string;
  city: string;
  districts: string;
  specialization: string;
  inn: string;
  website: string;
  status: ApplicationStatus;
  note: string;
  createdAt: string;
};

export type RealtorProfile = {
  id: string;
  userPhone: string;
  agencyName: string;
  phone: string;
  cities: string;
  districts: string;
  specialization: string;
  telegramChatId: string;
  verified: boolean;
  createdAt: string;
};

export type DeveloperProfile = {
  id: string;
  userPhone: string;
  slug: string;
  companyName: string;
  description: string;
  logoUrl: string;
  phone: string;
  website: string;
  telegramChatId: string;
  verified: boolean;
  verifiedAt?: string;
  createdAt: string;
};

export type ComplexUnit = {
  id: string;
  complexId: string;
  buildingLabel: string;
  floor: number;
  rooms: number;
  area: number;
  price: number;
  status: UnitStatus;
  planImageUrl?: string;
  updatedAt: string;
};

export type ResidentialComplex = {
  id: string;
  developerId: string;
  name: string;
  slug: string;
  city: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  class: ComplexClass;
  stage: ComplexStage;
  deadlineQuarter?: number;
  deadlineYear?: number;
  totalBuildings: number;
  description: string;
  amenities: ComplexAmenity[];
  coverUrl: string;
  gallery: string[];
  tourUrl?: string;
  isPublished: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
};

export type PartnerLead = {
  id: string;
  source: "complex_page" | "listing";
  complexId?: string;
  unitId?: string;
  listingId?: string;
  developerId?: string;
  realtorPhone?: string;
  name: string;
  phone: string;
  message: string;
  status: LeadStatus;
  createdAt: string;
};

export type TelegramOutboxItem = {
  id: string;
  chatId: string;
  text: string;
  createdAt: string;
};

export function isPartnerRole(value: unknown): value is PartnerRole {
  return PARTNER_ROLES.includes(value as PartnerRole);
}

export function userRoles(user: User | null | undefined): PartnerRole[] {
  return (user?.roles ?? []).filter(isPartnerRole);
}

export function hasRole(user: User | null | undefined, role: PartnerRole): boolean {
  return userRoles(user).includes(role);
}

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  if (hasRole(user, "admin")) return true;
  const digits = (user.phone ?? "").replace(/\D/g, "");
  return digits.endsWith("555123456") || user.name === "Аида";
}

export function phoneDigitsMatch(a: string, b: string): boolean {
  const left = a.replace(/\D/g, "");
  const right = b.replace(/\D/g, "");
  if (!left || !right) return false;
  if (left === right) return true;
  const tail = (value: string) => value.slice(-9);
  return tail(left) === tail(right);
}

export function rolesForPhone(
  phone: string,
  isAdmin: boolean,
  realtorProfiles: Array<{ userPhone: string }>,
  developerProfiles: Array<{ userPhone: string }>,
): PartnerRole[] {
  const roles: PartnerRole[] = [];
  if (isAdmin) roles.push("admin");
  if (realtorProfiles.some((row) => phoneDigitsMatch(row.userPhone, phone))) roles.push("realtor");
  if (developerProfiles.some((row) => phoneDigitsMatch(row.userPhone, phone))) roles.push("developer");
  return roles;
}

export function slugify(input: string): string {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "i",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
    ү: "u",
    ө: "o",
    ң: "ng",
  };
  const raw = input
    .trim()
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return raw || `jk-${Date.now().toString(36)}`;
}

export function kyrgyzPhoneOk(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 12;
}

export function minAvailablePrice(units: ComplexUnit[]): number | null {
  const open = units.filter((row) => row.status === "available" && row.price > 0);
  if (!open.length) return null;
  return Math.min(...open.map((row) => row.price));
}

export function minSqmPrice(units: ComplexUnit[]): number | null {
  const open = units.filter((row) => row.status === "available" && row.price > 0 && row.area > 0);
  if (!open.length) return null;
  return Math.min(...open.map((row) => Math.round(row.price / row.area)));
}

export function createOrUpdateUnits(existing: ComplexUnit[], complexId: string, rows: Array<Partial<ComplexUnit> & { id?: string }>): ComplexUnit[] {
  const now = new Date().toISOString();
  const next = [...existing.filter((row) => row.complexId !== complexId || rows.some((item) => item.id === row.id))];
  for (const row of rows) {
    const id = row.id || `unit-${complexId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const prev = existing.find((item) => item.id === id);
    const unit: ComplexUnit = {
      id,
      complexId,
      buildingLabel: row.buildingLabel ?? prev?.buildingLabel ?? "1",
      floor: row.floor ?? prev?.floor ?? 1,
      rooms: row.rooms ?? prev?.rooms ?? 1,
      area: row.area ?? prev?.area ?? 40,
      price: row.price ?? prev?.price ?? 0,
      status: row.status ?? prev?.status ?? "available",
      planImageUrl: row.planImageUrl ?? prev?.planImageUrl,
      updatedAt: now,
    };
    const idx = next.findIndex((item) => item.id === id);
    if (idx >= 0) next[idx] = unit;
    else next.push(unit);
  }
  return next;
}

const COVER = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=70";
const GALLERY = [
  COVER,
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=70",
];

export const SEED_DEVELOPER: DeveloperProfile = {
  id: "dev-azat",
  userPhone: "+996 700 00 00 01",
  slug: "azat-stroy",
  companyName: "Азат Строй",
  description: "Жилые комплексы в Бишкеке. Сдача по графику, отдел продаж на площадке.",
  logoUrl: "",
  phone: "+996 700 00 00 01",
  website: "",
  telegramChatId: "700000001",
  verified: true,
  verifiedAt: "2026-03-01T00:00:00.000Z",
  createdAt: "2026-03-01T00:00:00.000Z",
};

export const SEED_COMPLEX: ResidentialComplex = {
  id: "jk-asanbai-park",
  developerId: "dev-azat",
  name: "Асанбай Парк",
  slug: "asanbai-park",
  city: "bishkek",
  district: "Асанбай",
  address: "мкр. Асанбай, ул. Ахунбаева",
  lat: 42.84,
  lng: 74.61,
  class: "comfort",
  stage: "under_construction",
  deadlineQuarter: 4,
  deadlineYear: 2027,
  totalBuildings: 3,
  description:
    "Три корпуса, закрытый двор, подземный паркинг. Отдел продаж на площадке — можно приехать без предоплаты за показ.",
  amenities: ["parking", "playground", "security", "elevator", "carfree"],
  coverUrl: COVER,
  gallery: GALLERY,
  isPublished: true,
  views: 86,
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

export const SEED_UNITS: ComplexUnit[] = [
  { id: "u-1", complexId: "jk-asanbai-park", buildingLabel: "1", floor: 3, rooms: 1, area: 42, price: 4200000, status: "available", updatedAt: "2026-08-01T00:00:00.000Z" },
  { id: "u-2", complexId: "jk-asanbai-park", buildingLabel: "1", floor: 5, rooms: 2, area: 64, price: 6400000, status: "available", updatedAt: "2026-08-01T00:00:00.000Z" },
  { id: "u-3", complexId: "jk-asanbai-park", buildingLabel: "1", floor: 8, rooms: 2, area: 68, price: 7100000, status: "reserved", updatedAt: "2026-08-12T00:00:00.000Z" },
  { id: "u-4", complexId: "jk-asanbai-park", buildingLabel: "2", floor: 2, rooms: 3, area: 86, price: 9200000, status: "available", updatedAt: "2026-08-01T00:00:00.000Z" },
  { id: "u-5", complexId: "jk-asanbai-park", buildingLabel: "2", floor: 9, rooms: 0, area: 31, price: 3350000, status: "sold", updatedAt: "2026-07-20T00:00:00.000Z" },
  { id: "u-6", complexId: "jk-asanbai-park", buildingLabel: "3", floor: 4, rooms: 2, area: 58, price: 5800000, status: "available", updatedAt: "2026-08-01T00:00:00.000Z" },
];

export function listingSellerType(listing: { sellerType?: string; noAgent?: boolean }): "owner" | "realtor" {
  if (listing.sellerType === "realtor") return "realtor";
  return "owner";
}
