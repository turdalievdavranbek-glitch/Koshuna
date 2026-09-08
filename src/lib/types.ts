export type Lang = "ru" | "ky" | "en";

export type SectionId =
  | "rent"
  | "secondhand"
  | "animals"
  | "cars"
  | "car-rental"
  | "stays"
  | "services"
  | "vacancies"
  | "construction";

export type ListingStatus = "active" | "draft" | "withdrawn" | "promoted";

export type SortMode = "new" | "price-asc" | "price-desc";

export type User = {
  name: string;
  phone: string;
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
};

export type SpecRow = { label: string; value: string };

export type Listing = {
  id: string;
  section: SectionId;
  category?: string;
  title: string;
  titleKy: string;
  titleEn: string;
  price: number;
  previousPrice?: number;
  unit?: "month" | "day" | "night" | "bag" | "service";
  city: string;
  district?: string;
  postedAgo: string;
  rooms?: number;
  area?: number;
  housingKind?: "apartment" | "house";
  dealKind?: "long" | "short" | "buy";
  stockKind?: "newbuild" | "resale";
  lng?: number;
  lat?: number;
  bodyKind?: "sedan" | "suv";
  gearKind?: "auto" | "manual";
  year?: number;
  condition?: string;
  photos: string[];
  photoCredit: string;
  description: string;
  descriptionKy: string;
  descriptionEn: string;
  ownerId: string;
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
  sort: SortMode;
  checkIn: string | null;
  checkOut: string | null;
  dealType: "any" | "long" | "short" | "buy";
  stockType: "any" | "newbuild" | "resale";
  autoType: "sale" | "rent";
  locLng: number | null;
  locLat: number | null;
  locLabel: string | null;
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
  photo?: string;
  category?: string;
};
