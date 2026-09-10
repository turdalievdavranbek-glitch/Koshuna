export const LANGS = ["ru", "ky", "uz", "en"] as const;
export type Lang = (typeof LANGS)[number];

export type AuthMethod =
  | "sms"
  | "email"
  | "google"
  | "facebook"
  | "apple"
  | "whatsapp"
  | "telegram"
  | "instagram"
  | "vk";

export type SectionId =
  | "rent"
  | "secondhand"
  | "animals"
  | "cars"
  | "car-rental"
  | "stays"
  | "services"
  | "vacancies"
  | "construction"
  | "restaurants"
  | "shops";

export type ListingStatus = "active" | "draft" | "withdrawn" | "promoted" | "reserved" | "closed";

export type DealStage = "active" | "reserved" | "closed" | "withdrawn";

export type ReserveAccount = {
  id: string;
  name: string;
  phone: string;
};

export type MeetParty = "seller" | "buyer";

export type MeetPhase = "wait-buyer" | "wait-meet" | "wait-reply" | "agreed" | "declined";

export type MeetOffer = {
  date: string;
  time: string;
  spot: MeetupSpot;
  from: MeetParty;
};

export type MeetDeal = {
  listingId: string;
  reservedById: string;
  buyerConfirmed: boolean;
  phase: MeetPhase;
  offer?: MeetOffer;
  viewAs: MeetParty;
  buyerLeft: boolean;
  calendarSaved: boolean;
};

export type SortMode = "new" | "price-asc" | "price-desc";

export type ListingLayout = "large" | "medium" | "small";

export type ViewSlot = "now" | "today-eve" | "tomorrow-am" | "weekend";

export type MeetupSpot =
  | "tsum"
  | "philharmonic"
  | "dordoi"
  | "ala-too"
  | "globus"
  | "osh-bazaar"
  | "navoi"
  | "market"
  | "home";

export type PayAfter = "cash" | "mbank" | "odengi" | "elsom";

export type ReportReason = "agent" | "prepay" | "currency" | "photos" | "other";

export type GoLookKind = "view" | "meet" | "none";

export type MediaKind = "photos" | "video" | "voice";

export type PropertyType =
  | "apartment"
  | "house"
  | "room"
  | "parking"
  | "commercial"
  | "land"
  | "dacha";

export type AnimalGroup = "pets" | "farm";

export const SELLER_CHANNELS = ["instagram", "facebook", "telegram", "whatsapp"] as const;
export type SellerChannel = (typeof SELLER_CHANNELS)[number];

export type User = {
  name: string;
  phone: string;
  email?: string;
  method?: AuthMethod;
  linkedChannels?: SellerChannel[];
  cardLinked?: boolean;
  joinedYear: number;
  verified: boolean;
  rating: number;
  views: number;
};

export type Owner = {
  id: string;
  name: string;
  initial: string;
  color: "ink" | "accent-dark";
  verified: boolean;
  since: string;
  replyTime?: string;
  listingsCount?: number;
  rating?: number;
  online?: boolean;
  method?: AuthMethod;
  cardLinked?: boolean;
};

export type SpecRow = { label: string; value: string };

export type Listing = {
  id: string;
  section: SectionId;
  category?: string;
  goodsKind?: string;
  title: string;
  titleKy: string;
  titleEn: string;
  price: number;
  previousPrice?: number;
  meetupSpot?: MeetupSpot;
  payAfter?: PayAfter[];
  unit?: "month" | "day" | "night" | "bag" | "service";
  city: string;
  district?: string;
  settlement?: string;
  voiceSec?: number;
  voiceText?: string;
  voiceTextKy?: string;
  voiceTextEn?: string;
  postedAgo: string;
  postedAt?: string;
  rooms?: number;
  area?: number;
  housingKind?: PropertyType;
  dealKind?: "long" | "short" | "buy";
  stockKind?: "newbuild" | "resale";
  lng?: number;
  lat?: number;
  bodyKind?: "sedan" | "suv";
  gearKind?: "auto" | "manual";
  carMake?: string;
  carModel?: string;
  techBrand?: string;
  techModel?: string;
  animalGroup?: AnimalGroup;
  animalKind?: string;
  year?: number;
  condition?: string;
  photos: string[];
  mediaKind?: MediaKind;
  videoUrl?: string;
  voiceUrl?: string;
  transcript?: string;
  photoCredit: string;
  description: string;
  descriptionKy: string;
  descriptionEn: string;
  ownerId: string;
  sellerName?: string;
  sellerMethod?: AuthMethod;
  sellerCardLinked?: boolean;
  shopId?: string;
  shopProductId?: string;
  reservedBy?: ReserveAccount;
  verified: boolean;
  hasPhoto: boolean;
  noAgent: boolean;
  status: ListingStatus;
  specs?: SpecRow[];
  utilitiesNote?: string;
  safetyKind: "home" | "goods";
  mapX: number;
  mapY: number;
  distance?: string;
  contact: "whatsapp" | "telegram";
  views: number;
  favCount: number;
};

export type Filters = {
  query: string;
  section: SectionId | null;
  category: string | null;
  goodsKind: string;
  housingType: string;
  city: string;
  priceMin: number | null;
  priceMax: number | null;
  rooms: number[];
  bodyType: string;
  gear: string;
  photosOnly: boolean;
  verifiedOnly: boolean;
  noAgents: boolean;
  neighborOnly: boolean;
  videoOnly: boolean;
  sort: SortMode;
  checkIn: string | null;
  checkOut: string | null;
  dealType: "any" | "long" | "short" | "buy";
  stockType: "any" | "newbuild" | "resale";
  autoType: "sale" | "rent";
  carMake: string;
  carModel: string;
  techBrand: string;
  techModel: string;
  animalGroup: AnimalGroup;
  animalKind: string;
  locLng: number | null;
  locLat: number | null;
  locLabel: string | null;
  settlement: string;
  aiylOnly: boolean;
  priceDroppedOnly: boolean;
};

export type SavedSearch = {
  id: string;
  title: string;
  newCount: number;
  notify: boolean;
};

export type ChatMessage = {
  id: string;
  from: "me" | "them" | "system";
  text: string;
  time: string;
  read?: boolean;
};

export type ListingReaction = "like" | "dislike";

export type ListingComment = {
  id: string;
  listingId: string;
  author: string;
  text: string;
  time: string;
};

export type Thread = {
  id: string;
  listingId: string;
  ownerId: string;
  preview: string;
  time: string;
  unread: boolean;
  messages: ChatMessage[];
};

export type DraftListing = {
  section: SectionId;
  kind: "rent" | "goods";
  title: string;
  city: string;
  price: string;
  rooms: string;
  area: string;
  name: string;
  phone: string;
  description: string;
  promote: boolean;
  neighborPledge?: boolean;
  meetupSpot?: MeetupSpot;
  photo?: string;
  category?: string;
  goodsKind?: string;
  housingKind?: PropertyType;
  animalGroup?: AnimalGroup;
  animalKind?: string;
  carMake?: string;
  carModel?: string;
  techBrand?: string;
  techModel?: string;
  mediaKind?: MediaKind;
  videoUrl?: string;
  voiceUrl?: string;
  transcript?: string;
  aiConfirmed?: boolean;
};

export const SHOP_CATEGORIES = [
  "food",
  "construction",
  "furniture",
  "electronics",
  "apparel",
  "home",
  "other",
] as const;
export type ShopCategory = (typeof SHOP_CATEGORIES)[number];

export const SHOP_KINDS = {
  food: [
    "food-bakery",
    "food-meat",
    "food-dairy",
    "food-produce",
    "food-staples",
    "food-drinks",
    "food-sweets",
    "food-frozen",
  ],
  construction: ["build-mix", "build-timber", "build-plumbing", "build-electrical", "build-tools", "build-finishes"],
  furniture: ["furn-sofa", "furn-bed", "furn-storage", "furn-table", "furn-kitchen"],
  electronics: ["el-phones", "el-computers", "el-tv", "el-appliances", "el-audio"],
  apparel: ["ap-men", "ap-women", "ap-kids", "ap-shoes", "ap-acc"],
  home: ["home-kitchen", "home-textile", "home-decor", "home-clean"],
  other: [],
} as const satisfies Record<ShopCategory, readonly string[]>;

export type ShopKind = (typeof SHOP_KINDS)[Exclude<ShopCategory, "other">][number];

export type ShopStatus = "draft" | "active" | "withdrawn";

export type ShopProductUnit = "piece" | "kg" | "meter" | "liter" | "pack" | "other";

export type ShopStock = "in" | "out" | "order" | "ask";

export type ShopHoursSlot = { open: string; close: string };

export type ShopHours = {
  weekdays?: ShopHoursSlot | null;
  saturday?: ShopHoursSlot | null;
  sunday?: ShopHoursSlot | null;
};

export type ShopContacts = {
  phone?: string;
  whatsapp?: boolean;
  telegram?: boolean;
};

export type ShopProduct = {
  id: string;
  shopId: string;
  title: string;
  description?: string;
  photo?: string;
  videoUrl?: string;
  category: ShopCategory;
  kind?: ShopKind;
  price?: number;
  currency: "KGS";
  unit: ShopProductUnit;
  stock: ShopStock;
  listingId?: string;
  sourceId?: string;
  priceFromPhoto?: boolean;
  updatedAt: string;
  createdAt: string;
  published: boolean;
};

export type Shop = {
  id: string;
  name: string;
  ownerPhone: string;
  ownerName: string;
  category: ShopCategory;
  extraCategories: ShopCategory[];
  kinds: ShopKind[];
  description: string;
  city: string;
  address: string;
  lat?: number;
  lng?: number;
  hours?: ShopHours;
  hoursNote?: string;
  contacts: ShopContacts;
  pickup: boolean;
  delivery: boolean;
  deliveryNote?: string;
  videoUrl?: string;
  coverUrl?: string;
  transcript?: string;
  status: ShopStatus;
  products: ShopProduct[];
  createdAt: string;
  updatedAt: string;
  aiConfirmed: boolean;
};

export type ShopDraft = Shop & {
  locked: Partial<Record<keyof Shop, true>>;
  pendingProducts?: Array<Partial<ShopProduct> & { title: string; price?: number }>;
};

export type ShopFilters = {
  query: string;
  city: string;
  category: ShopCategory | ShopKind | "all";
};
