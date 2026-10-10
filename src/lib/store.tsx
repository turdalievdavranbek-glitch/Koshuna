"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, onceRetry } from "./api/client";
import { enableNativePush, forgetNativePush, resumeNativePush } from "./native-push";
import { mergeCartIds, savedCartIds } from "./cart";
import { enqueue, pendingOps, startOutbox } from "./api/outbox";
import { materializeShop, stashListing } from "./api/upload";
import { persistableUrl } from "./blob-media";
import { absorbMediaPatch, durableDraft, presentDraft } from "./draft-media";
import { isAnimalGroup, isKnownAnimalKind } from "./data";
import { clearFreshListPatch, hasPlaceFilter, scopeForSaved } from "./filter";
import { disableGoogleAutoSelect, GoogleLoginError, startGoogleSignIn } from "./google-login";
import { nativeGoogleSignOut } from "./native-auth";
import { collectRefKeys, displayUrl, hydrateRefs, releaseRefs, sweepOrphans, UploadFatal } from "./media-queue";
import { nearestDistrict, publishCoords } from "./geo";
import { sanitizeServiceListing } from "./service-listing";
import { channelsOf } from "./channels";
import { hiddenByBlock } from "./blocks";
import { isSectionVisible } from "./features";
import { isDbUserId } from "./phone";
import { DICT } from "./i18n";
import { setServerCounts, voterId, type ReactionsByVoter } from "./reactions";
import { isJobType } from "./vacancies";
import { isRealtyGroup } from "./realty";
import {
  SEED_COMPLEX,
  SEED_DEALER,
  SEED_DEALER_CARS,
  SEED_DEVELOPER,
  SEED_UNITS,
  createOrUpdateUnits,
  hasRole,
  isAdminUser,
  serverAdminFlag,
  kyrgyzPhoneOk,
  phoneDigitsMatch,
  rolesForPhone,
  slugify,
  type ComplexUnit,
  type DealerProfile,
  type DeveloperProfile,
  type PartnerApplication,
  type PartnerLead,
  type RealtorProfile,
  type ResidentialComplex,
  type TelegramOutboxItem,
} from "./partners";
import {
  type ChatMessage,
  type DraftListing,
  type Filters,
  type Lang,
  type Listing,
  type HonestyScore,
  type ListingComment,
  type ListingLayout,
  type ListingReaction,
  type MeetDeal,
  type MeetOffer,
  type MeetParty,
  type SavedSearch,
  type SellerChannel,
  type Shop,
  type ShopDraft,
  type ShopProduct,
  type Thread,
  type User,
  type AppSide,
  isAppSide,
  isLang,
} from "./types";
import { canReuseAssortment, emptyShopDraft, hydrateShop, isOwnShop, isShopKind, parentOfShopKind, pruneShopKinds, validPrice, validQuantity } from "./shops";
import { displayPhotoForProduct, sweepShopPriceTagPhotos } from "./shop-photos";
import { listingIdForProduct, syncProductListing, syncShopListings } from "./shop-listing";
import { showsNeighborPledge } from "./neighbor";
import { BrandMark } from "@/components/brand";

const STORAGE = "konshu-state-v1";
/** Last public feed + points, shown instantly on the next open while the fresh copy loads. */
const FEED_CACHE = "konshu-feed-cache-v2";
const FEED_CACHE_VERSION = 2;
const FEED_CACHE_MAX_AGE = 7 * 24 * 3600 * 1000;

function cachedListing(item: unknown): item is Listing {
  if (!item || typeof item !== "object") return false;
  const row = item as Partial<Listing>;
  return (
    typeof row.id === "string" &&
    typeof row.section === "string" &&
    typeof row.title === "string" &&
    typeof row.city === "string" &&
    typeof row.price === "number" &&
    Array.isArray(row.photos) &&
    typeof row.ownerId === "string"
  );
}

function cachedShop(item: unknown): item is Shop {
  if (!item || typeof item !== "object") return false;
  const row = item as Partial<Shop>;
  return typeof row.id === "string" && typeof row.name === "string" && typeof row.city === "string" && Array.isArray(row.products);
}

/** Never throws; anything unexpected (old version, other shape, broken JSON) is discarded. */
function readFeedCache(): { feed: Listing[]; shops: Shop[] } | null {
  try {
    localStorage.removeItem("konshu-feed-cache-v1");
    const raw = localStorage.getItem(FEED_CACHE);
    if (!raw) return null;
    const data = JSON.parse(raw) as { v?: number; at?: number; feed?: unknown; shops?: unknown };
    if (!data || data.v !== FEED_CACHE_VERSION || typeof data.at !== "number" || Date.now() - data.at > FEED_CACHE_MAX_AGE) {
      localStorage.removeItem(FEED_CACHE);
      return null;
    }
    if (!Array.isArray(data.feed) || !Array.isArray(data.shops)) throw new Error("cache shape");
    const feed = data.feed.filter(cachedListing);
    const shops = data.shops.filter(cachedShop);
    if (feed.length !== data.feed.length || shops.length !== data.shops.length) throw new Error("cache rows");
    return { feed, shops };
  } catch {
    dropFeedCache();
    return null;
  }
}

function writeFeedCache(feed: Listing[], shops: Shop[]) {
  try {
    const visible = feed.filter((item) => item.status !== "hidden" && !item.underReview).slice(0, 400);
    localStorage.setItem(FEED_CACHE, JSON.stringify({ v: FEED_CACHE_VERSION, at: Date.now(), feed: visible, shops: shops.slice(0, 200) }));
  } catch {
    try {
      localStorage.removeItem(FEED_CACHE);
    } catch {
      /* storage full or blocked */
    }
  }
}

function dropFeedCache() {
  try {
    localStorage.removeItem(FEED_CACHE);
  } catch {
    /* ignore */
  }
}

let authReady: Promise<void> = Promise.resolve();
let authSerial = 0;
let sessionEpoch = 0;

function trackAuth(task: Promise<unknown>) {
  authSerial += 1;
  const done = task.then(
    () => undefined,
    () => undefined,
  );
  authReady = done;
  return done;
}

export function waitAuthReady(): Promise<void> {
  return authReady;
}

export function authSerialNow(): number {
  return authSerial;
}

function applyCounts(
  counts: Record<string, { likes: number; dislikes: number }> | undefined,
  reactions: ReactionsByVoter,
  user: User | null,
) {
  const mine = voterId(user);
  const own = mine ? reactions[mine] ?? {} : {};
  const next: Record<string, { likes: number; dislikes: number }> = {};
  for (const [id, row] of Object.entries(counts ?? {})) {
    let likes = row?.likes ?? 0;
    let dislikes = row?.dislikes ?? 0;
    if (own[id] === "like") likes = Math.max(0, likes - 1);
    if (own[id] === "dislike") dislikes = Math.max(0, dislikes - 1);
    next[id] = { likes, dislikes };
  }
  setServerCounts(next);
}

const defaultFilters = (): Filters => ({
  query: "",
  section: null,
  category: null,
  goodsKind: "any",
  housingType: "any",
  realtyGroup: "any",
  realtySub: "any",
  realtyKind: "any",
  city: "all",
  priceMin: null,
  priceMax: null,
  areaMin: null,
  areaMax: null,
  rooms: [],
  bodyType: "any",
  gear: "any",
  photosOnly: false,
  verifiedOnly: false,
  noAgents: false,
  neighborOnly: false,
  sellerKind: "any",
  videoOnly: false,
  sort: "new",
  checkIn: null,
  checkOut: null,
  dealType: "any",
  stockType: "any",
  autoType: "sale",
  vehicleGroup: "any",
  carMake: "any",
  carModel: "any",
  techBrand: "any",
  techModel: "any",
  animalGroup: "pets",
  animalKind: "any",
  jobSphere: "any",
  jobSub: "any",
  jobRole: "any",
  jobType: "any",
  locLng: null,
  locLat: null,
  locLabel: null,
  nearLng: null,
  nearLat: null,
  oblast: "any",
  rayon: "any",
  settlement: "any",
  aiylOnly: false,
  priceDroppedOnly: false,
  postedWithin: "any",
  scope: "all",
});

const defaultDraft = (): DraftListing => ({
  section: "rent",
  kind: "rent",
  title: "",
  city: "bishkek",
  price: "",
  rooms: "",
  area: "",
  name: "",
  phone: "",
  description: "",
  promote: true,
  neighborPledge: true,
  mediaKind: "photos",
  aiConfirmed: false,
  housingKind: "apartment",
  realtyGroup: "apartments",
  dealKind: "long",
});

function categoryFromDraft(d: DraftListing): string | undefined {
  if (d.section === "vacancies") return undefined;
  if (d.section === "services" || d.section === "secondhand" || d.section === "construction") return d.category || undefined;
  if (d.section === "restaurants") return d.category ?? "national";
  if (d.section === "shops") return d.category ?? "food";
  if (d.section === "rent" || d.kind === "rent") return d.category || "rent";
  return d.category || undefined;
}

function unitFromDraft(d: DraftListing): Listing["unit"] | undefined {
  if (d.priceNegotiable) return undefined;
  if (d.section === "car-rental") return "day";
  if (d.section === "vacancies" || (d.kind === "rent" && d.dealKind !== "buy")) return "month";
  if (d.saleUnit === "kg" || d.saleUnit === "piece" || d.saleUnit === "hour" || d.saleUnit === "service") return d.saleUnit;
  return undefined;
}

function previousFromDraft(d: DraftListing): number | undefined {
  const price = Number(d.price.replace(/\s/g, "")) || 0;
  const old = Number((d.oldPrice || "").replace(/\s/g, "")) || 0;
  if (d.priceNegotiable || price <= 0 || old <= price) return undefined;
  return old;
}

function draftPhotos(d: DraftListing): string[] {
  if (d.photos && d.photos.length) return d.photos;
  if (d.photo) return [d.photo];
  return [`/sections/${d.section === "car-rental" ? "cars" : d.section}.jpg`];
}

function userListingFromDraft(
  d: DraftListing,
  ctx: {
    user: User | null;
    dealerProfiles: DealerProfile[];
    untitled: string;
    status: Listing["status"];
  },
): Listing {
  const isCar = d.section === "cars" || d.section === "car-rental";
  const dealer =
    isCar && hasRole(ctx.user, "dealer")
      ? ctx.dealerProfiles.find((row) => ctx.user && phoneDigitsMatch(row.userPhone, ctx.user.phone))
      : undefined;
  const asRealtor = !dealer && hasRole(ctx.user, "realtor") && d.section === "rent";
  const sellerType = dealer ? "dealer" : asRealtor ? "realtor" : "owner";
  const title = d.title.trim() || ctx.untitled;
  const listing: Listing = {
    id: d.id && d.id.startsWith("user-") ? d.id : `user-${crypto.randomUUID()}`,
    section: d.section,
    category: categoryFromDraft(d),
    goodsKind: d.section === "secondhand" ? d.goodsKind : undefined,
    housingKind: d.section === "rent" ? d.housingKind ?? "apartment" : undefined,
    dealKind: d.section === "rent" ? d.dealKind ?? "long" : undefined,
    realtyGroup: d.section === "rent" ? d.realtyGroup : undefined,
    realtySub: d.section === "rent" ? d.realtySub : undefined,
    realtyKind: d.section === "rent" ? d.realtyKind : undefined,
    sellerType,
    sellerPhone: dealer?.phone ?? ctx.user?.phone,
    dealerId: dealer?.id,
    animalGroup: d.section === "animals" ? d.animalGroup : undefined,
    animalKind: d.section === "animals" ? d.animalKind : undefined,
    carMake: isCar ? d.carMake : undefined,
    carModel: isCar ? d.carModel : undefined,
    vehicleGroup: isCar ? d.vehicleGroup ?? "passenger" : undefined,
    bodyKind: isCar ? d.vehicleType : undefined,
    year: isCar ? d.year : undefined,
    mileage: isCar ? d.mileage : undefined,
    gearKind: isCar ? d.gearKind : undefined,
    techBrand: d.section === "secondhand" ? d.techBrand : undefined,
    techModel: d.section === "secondhand" ? d.techModel : undefined,
    jobSphere: d.section === "vacancies" ? d.jobSphere : undefined,
    jobSub: d.section === "vacancies" ? d.jobSub : undefined,
    jobRole: d.section === "vacancies" ? d.jobRole : undefined,
    jobType: d.section === "vacancies" ? d.jobType : undefined,
    title,
    titleKy: title,
    titleEn: title,
    price: Number(d.price.replace(/\s/g, "")) || 0,
    previousPrice: previousFromDraft(d),
    unit: unitFromDraft(d),
    city: d.city,
    postedAgo: "2h",
    rooms: d.rooms ? Number(d.rooms) : undefined,
    area: d.area ? Number(d.area) : undefined,
    photos: draftPhotos(d),
    photoCredit: "",
    mediaKind: d.mediaKind ?? "photos",
    videoUrl: d.videoUrl,
    voiceUrl: d.voiceUrl,
    transcript: d.transcript,
    address: d.address,
    foodType: d.foodType,
    calories: d.calories,
    ingredients: d.ingredients,
    voiceText: d.transcript,
    voiceSec: d.voiceSec ?? (d.transcript ? Math.max(8, Math.round(d.transcript.split(/\s+/).length / 2.4)) : undefined),
    description: d.description || d.transcript || title,
    descriptionKy: d.description || title,
    descriptionEn: d.description || title,
    ownerId: ctx.user?.id ?? "",
    sellerName: ctx.user?.name,
    hasPhoto: true,
    verified: sellerType !== "owner" ? true : showsNeighborPledge(d.section) && d.neighborPledge !== false,
    noAgent: sellerType !== "owner" ? false : showsNeighborPledge(d.section) && d.neighborPledge !== false,
    status: ctx.status,
    safetyKind: d.kind === "rent" ? "home" : "goods",
    mapX: 40,
    mapY: 40,
    contact: dealer ? "telegram" : "whatsapp",
    views: 0,
    favCount: 0,
    serviceMode: d.section === "services" ? d.serviceMode : undefined,
    serviceArea: d.section === "services" ? d.serviceArea : undefined,
    priceFrom: d.section === "services" ? d.priceFrom === true : undefined,
    hours: d.section === "services" ? d.hours : undefined,
    ...(() => {
      if (d.serviceMode === "mobile") return { lat: undefined, lng: undefined, district: d.district };
      const coords = publishCoords({
        lat: d.lat,
        lng: d.lng,
        city: d.city,
        meetupSpot: d.meetupSpot,
        fallbackLat: dealer?.lat,
        fallbackLng: dealer?.lng,
      });
      const area = nearestDistrict(coords.lat, coords.lng, d.city);
      return {
        lat: coords.lat,
        lng: coords.lng,
        district: d.district ?? area?.name,
      };
    })(),
    meetupSpot: d.section === "services" ? undefined : d.meetupSpot,
    specs: isCar
      ? [
          d.year ? { label: "year", value: String(d.year) } : null,
          d.mileage ? { label: "mileage", value: `${d.mileage.toLocaleString("ru-RU")} км` } : null,
          d.gearKind ? { label: "gear", value: d.gearKind === "auto" ? "Автомат" : "Механика" } : null,
        ].filter((row): row is { label: string; value: string } => Boolean(row))
      : undefined,
  };
  return sanitizeServiceListing(listing);
}

function upsertExtraListing(extra: Listing[], listing: Listing): Listing[] {
  if (extra.some((item) => item.id === listing.id)) {
    return extra.map((item) => (item.id === listing.id ? listing : item));
  }
  return [listing, ...extra];
}

type State = {
  user: User | null;
  lang: Lang;
  langChosen: boolean;
  city: string;
  filters: Filters;
  favouriteIds: string[];
  savedSearches: SavedSearch[];
  draft: DraftListing;
  extraListings: Listing[];
  feed: Listing[];
  listingEdits: Record<string, Partial<Listing>>;
  threads: Thread[];
  pendingPath: string | null;
  notificationsOn: boolean;
  listingLayout: ListingLayout;
  elderMode: boolean;
  viewedIds: string[];
  reports: Record<string, string>;
  meetDeals: Record<string, MeetDeal>;
  reactions: ReactionsByVoter;
  comments: Record<string, ListingComment[]>;
  honesty: Record<string, Record<string, HonestyScore>>;
  shops: Shop[];
  shopDraft: ShopDraft | null;
  side: AppSide;
  applications: PartnerApplication[];
  realtorProfiles: RealtorProfile[];
  developerProfiles: DeveloperProfile[];
  dealerProfiles: DealerProfile[];
  complexes: ResidentialComplex[];
  complexUnits: ComplexUnit[];
  partnerLeads: PartnerLead[];
  telegramOutbox: TelegramOutboxItem[];
  blockedUserIds: string[];
};

const initial: State = {
  user: null,
  lang: "ru",
  langChosen: false,
  city: "all",
  filters: defaultFilters(),
  favouriteIds: [],
  savedSearches: [],
  draft: defaultDraft(),
  extraListings: [],
  feed: [],
  listingEdits: {},
  threads: [],
  pendingPath: null,
  notificationsOn: true,
  listingLayout: "medium",
  elderMode: false,
  viewedIds: [],
  reports: {},
  meetDeals: {},
  reactions: {},
  comments: {},
  honesty: {},
  shops: [],
  shopDraft: null,
  side: "buy",
  applications: [],
  realtorProfiles: [],
  developerProfiles: [SEED_DEVELOPER],
  dealerProfiles: [SEED_DEALER],
  complexes: [SEED_COMPLEX],
  complexUnits: SEED_UNITS,
  partnerLeads: [],
  telegramOutbox: [],
  blockedUserIds: [],
};

type Store = State & {
  t: (typeof DICT)["ru"];
  ready: boolean;
  synced: boolean;
  allListings: Listing[];
  blockedUserIds: string[];
  isBlocked: (ownerId?: string | null) => boolean;
  blockUser: (userId: string) => Promise<{ ok: boolean }>;
  unblockUser: (userId: string) => Promise<{ ok: boolean }>;
  recallListing: (id: string) => Listing | undefined;
  recallShop: (id: string) => Shop | undefined;
  signInWithGoogle: (opts: {
    locale: "ky" | "ru";
    container?: HTMLElement | null;
    navigate: (href: string) => void;
    dest: string;
  }) => Promise<"ok" | "cancelled" | "not-configured" | "open-in-browser" | "error">;
  acceptSignedInUser: (user: User, isNew: boolean, navigate: (href: string) => void, dest: string) => void;
  logout: () => void;
  linkCard: () => void;
  linkChannel: (channel: SellerChannel) => void;
  setLang: (lang: Lang) => void;
  setCity: (city: string) => void;
  setListingLayout: (layout: ListingLayout) => void;
  setElderMode: (on: boolean) => void;
  setSide: (side: AppSide) => void;
  markViewed: (id: string) => void;
  reportListing: (id: string, reason: string) => void;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
  toggleFav: (id: string) => boolean;
  isFav: (id: string) => boolean;
  reactionOf: (id: string) => ListingReaction | null;
  setReaction: (id: string, reaction: ListingReaction) => boolean;
  commentsOf: (id: string) => ListingComment[];
  addComment: (id: string, text: string) => boolean;
  honestyOf: (id: string) => { avg: number; count: number; mine: HonestyScore | null };
  rateHonesty: (id: string, score: HonestyScore) => boolean;
  requireAuth: (path: string) => boolean;
  setPendingPath: (path: string | null) => void;
  setDraft: (patch: Partial<DraftListing>) => void;
  updateProfile: (patch: { name?: string; phone?: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
  discardDraft: () => void;
  setLeaveGuard: (fn: ((intent: { proceed: () => void }) => void) | null) => void;
  askLeave: (proceed: () => void) => boolean;
  publishDraft: () => Listing | null;
  saveDraft: () => Listing | null;
  online: boolean;
  syncError: boolean;
  resync: () => void;
  markInboxRead: () => void;
  updateListing: (id: string, patch: Partial<Listing>) => void;
  noteListingFresh: (id: string) => void;
  ensureMeetDeal: (listingId: string, reservedById: string) => void;
  clearMeetDeal: (listingId: string) => void;
  patchMeetDeal: (listingId: string, patch: Partial<MeetDeal> | ((cur: MeetDeal) => MeetDeal)) => void;
  setMeetViewAs: (listingId: string, viewAs: MeetParty) => void;
  confirmMeetReserve: (listingId: string) => void;
  proposeMeet: (listingId: string, offer: MeetOffer) => void;
  acceptMeet: (listingId: string) => void;
  declineMeet: (listingId: string) => void;
  leaveForMeet: (listingId: string) => void;
  clearPostedDraft: () => void;
  addMessage: (threadId: string, text: string, from?: ChatMessage["from"]) => void;
  ensureThread: (listingId: string) => string;
  toggleSearchNotify: (id: string) => void;
  saveCurrentSearch: () => void;
  setNotificationsOn: (on: boolean) => void;
  startShopDraft: (id?: string, opts?: { fresh?: boolean }) => ShopDraft | null;
  setShopDraft: (patch: Partial<ShopDraft>) => void;
  lockShopField: (key: keyof Shop) => void;
  saveShopDraft: () => Shop | null;
  discardShopDraft: () => void;
  publishShop: (shop?: Shop) => Promise<{ shop: Shop | null; error?: string }>;
  withdrawShop: (id: string) => Promise<{ error?: string }>;
  deleteShop: (id: string) => Promise<{ error?: string }>;
  deleteListing: (id: string) => Promise<{ error?: string }>;
  upsertShopProduct: (
    shopId: string,
    product: Partial<ShopProduct> & { title: string },
  ) => Promise<{ error?: string; product?: ShopProduct }>;
  updateShopProduct: (shopId: string, productId: string, patch: Partial<ShopProduct>) => Promise<{ error?: string }>;
  hideShopProduct: (shopId: string, productId: string) => void;
  publishProductListing: (shopId: string, productId: string) => Listing | { missing: string[] } | null;
  reportShop: (id: string, reason: string) => void;
  submitPartnerApplication: (
    input: Omit<PartnerApplication, "id" | "status" | "createdAt" | "note" | "userPhone" | "userName" | "address" | "hours"> & {
      kind: PartnerApplication["kind"];
      address?: string;
      hours?: string;
    },
  ) => string | null;
  reviewApplication: (id: string, status: "approved" | "rejected", note?: string) => void;
  setRealtorTelegram: (chatId: string) => void;
  setDeveloperTelegram: (chatId: string) => void;
  setDealerTelegram: (chatId: string) => void;
  patchDeveloperProfile: (patch: Partial<DeveloperProfile>) => void;
  patchDealerProfile: (patch: Partial<DealerProfile>) => void;
  saveComplex: (input: Partial<ResidentialComplex> & { name: string }) => ResidentialComplex | null;
  setComplexUnits: (complexId: string, rows: Array<Partial<ComplexUnit> & { id?: string }>) => void;
  bumpComplexViews: (id: string) => void;
  submitLead: (input: Omit<PartnerLead, "id" | "createdAt" | "status"> & { honeypot?: string }) => { ok: boolean; error?: string };
  setLeadStatus: (id: string, status: PartnerLead["status"]) => void;
  setUnitStatus: (id: string, status: ComplexUnit["status"]) => void;
  duplicateListingToDraft: (listing: Listing) => void;
  /** Loads an own listing into the post form; publishing updates it (same id). */
  editListingToDraft: (listing: Listing) => void;
  toggleRealtorVerified: (id: string) => void;
  toggleDeveloperVerified: (id: string) => void;
  toggleDealerVerified: (id: string) => void;
  publishComplex: (id: string, published: boolean) => void;
};

const Ctx = createContext<Store | null>(null);

function migrateElectronicsCategory(filters: Filters): Filters {
  if (filters.category !== "electronics") return filters;
  if (filters.goodsKind === "laptop") {
    return { ...filters, category: "laptops", goodsKind: "any" };
  }
  if (filters.goodsKind === "appliance") {
    return { ...filters, category: "appliances", goodsKind: "any" };
  }
  if (filters.goodsKind === "phone") {
    return { ...filters, category: "phones", goodsKind: "smartphone" };
  }
  return { ...filters, category: "phones", goodsKind: "any" };
}

function freshOnOpen(filters: Filters): Filters {
  return { ...filters, ...clearFreshListPatch(filters) };
}

export function normalizeFilters(filters: Filters, savedScope?: unknown): Filters {
  if (filters.section === "car-rental") {
    return { ...filters, section: "cars", autoType: "rent" };
  }
  const next = migrateElectronicsCategory(filters);
  return {
    ...next,
    autoType: next.autoType === "rent" ? "rent" : "sale",
    vehicleGroup: next.vehicleGroup === "special" || next.vehicleGroup === "passenger" ? next.vehicleGroup : "any",
    goodsKind: next.goodsKind && next.goodsKind !== "any" ? next.goodsKind : "any",
    animalGroup: isAnimalGroup(next.animalGroup) || next.animalGroup === "any" ? next.animalGroup : "any",
    animalKind: isKnownAnimalKind(next.animalKind) ? next.animalKind : "any",
    carMake: next.carMake && next.carMake !== "any" ? next.carMake : "any",
    carModel: next.carModel && next.carModel !== "any" ? next.carModel : "any",
    techBrand: next.techBrand && next.techBrand !== "any" ? next.techBrand : "any",
    techModel: next.techModel && next.techModel !== "any" ? next.techModel : "any",
    jobSphere: next.jobSphere && next.jobSphere !== "any" ? next.jobSphere : "any",
    jobSub: next.jobSub && next.jobSub !== "any" ? next.jobSub : "any",
    jobRole: next.jobRole && next.jobRole !== "any" ? next.jobRole : "any",
    jobType: isJobType(next.jobType) ? next.jobType : "any",
    realtyGroup: isRealtyGroup(next.realtyGroup) ? next.realtyGroup : "any",
    realtySub: next.realtySub && next.realtySub !== "any" ? next.realtySub : "any",
    realtyKind: next.realtyKind && next.realtyKind !== "any" ? next.realtyKind : "any",
    areaMin: typeof next.areaMin === "number" ? next.areaMin : null,
    areaMax: typeof next.areaMax === "number" ? next.areaMax : null,
    neighborOnly: Boolean(next.neighborOnly),
    aiylOnly: Boolean(next.aiylOnly),
    priceDroppedOnly: Boolean(next.priceDroppedOnly),
    postedWithin:
      next.postedWithin === "today" || next.postedWithin === "3d" || next.postedWithin === "week" || next.postedWithin === "month"
        ? next.postedWithin
        : "any",
    videoOnly: Boolean(next.videoOnly),
    sellerKind:
      next.sellerKind === "neighbor" ||
      next.sellerKind === "owner" ||
      next.sellerKind === "realtor" ||
      next.sellerKind === "private" ||
      next.sellerKind === "dealer"
        ? next.sellerKind
        : "any",
    settlement: next.settlement && next.settlement !== "any" ? next.settlement : "any",
    oblast: next.oblast && next.oblast !== "any" ? next.oblast : "any",
    rayon: next.rayon && next.rayon !== "any" ? next.rayon : "any",
    nearLat: typeof next.nearLat === "number" ? next.nearLat : null,
    nearLng: typeof next.nearLng === "number" ? next.nearLng : null,
    scope: scopeForSaved({
      scope: typeof savedScope === "string" ? savedScope : undefined,
      locLat: next.locLat,
      nearLat: typeof next.nearLat === "number" ? next.nearLat : null,
      locLabel: next.locLabel,
      settlement: next.settlement && next.settlement !== "any" ? next.settlement : "any",
      city: next.city,
      oblast: next.oblast && next.oblast !== "any" ? next.oblast : "any",
      rayon: next.rayon && next.rayon !== "any" ? next.rayon : "any",
    }),
  };
}

function emptyMeetDeal(listingId: string, reservedById: string): MeetDeal {
  return {
    listingId,
    reservedById,
    buyerConfirmed: false,
    phase: "wait-buyer",
    viewAs: "seller",
    buyerLeft: false,
    calendarSaved: false,
  };
}

function mergeById<T extends { id: string }>(saved: T[], seed: T[]): T[] {
  const map = new Map<string, T>();
  for (const row of seed) map.set(row.id, row);
  for (const row of saved) map.set(row.id, row);
  return [...map.values()];
}

function publishGuestCart(ids: string[]) {
  for (const id of ids) {
    onceRetry(() => api(`/api/me/cart/${encodeURIComponent(id)}`, { method: "PUT", json: {} }));
  }
}

function persistShop(shop: Shop): Shop {
  return {
    ...shop,
    videoUrl: persistableUrl(shop.videoUrl),
    coverUrl: persistableUrl(shop.coverUrl),
    products: (shop.products ?? []).map((item) => ({
      ...item,
      photo: persistableUrl(item.photo),
      videoUrl: persistableUrl(item.videoUrl),
    })),
  };
}

function load(): State {
  if (typeof window === "undefined") return initial;
  try {
    const raw = localStorage.getItem(STORAGE);
    const cached = readFeedCache();
    if (!raw) return cached ? { ...initial, feed: cached.feed, shops: cached.shops } : initial;
    const saved = JSON.parse(raw) as Partial<State>;
    const { viewerPlace: _viewerPlace, extraListings: _extra, shops: _shops, favouriteIds: _favs, reactions: _reactions, feed: _feed, listingEdits: _edits, ...rest } =
      saved as Partial<State> & { viewerPlace?: unknown };
    return {
      ...initial,
      ...rest,
      listingLayout:
        saved.listingLayout === "large" || saved.listingLayout === "small" ? saved.listingLayout : "medium",
      viewedIds: Array.isArray(saved.viewedIds) ? saved.viewedIds.slice(0, 12) : [],
      reports: saved.reports && typeof saved.reports === "object" ? saved.reports : {},
      listingEdits: {},
      meetDeals: saved.meetDeals && typeof saved.meetDeals === "object" ? saved.meetDeals : {},
      reactions: {},
      comments: saved.comments && typeof saved.comments === "object" && !Array.isArray(saved.comments) ? saved.comments : {},
      honesty: saved.honesty && typeof saved.honesty === "object" ? saved.honesty : {},
      shops: cached?.shops ?? [],
      extraListings: [],
      feed: cached?.feed ?? [],
      favouriteIds: savedCartIds(saved.favouriteIds),
      threads: Array.isArray(saved.threads) ? saved.threads : [],
      savedSearches: Array.isArray(saved.savedSearches) ? saved.savedSearches : [],
      shopDraft: saved.shopDraft && typeof saved.shopDraft === "object" ? hydrateShop(saved.shopDraft as ShopDraft) : null,
      // Place and scope are remembered; the «Свежее» chips (section, category, sort…) start at «Все» on every open.
      filters: freshOnOpen(
        normalizeFilters(
          { ...defaultFilters(), ...saved.filters },
          saved.filters && "scope" in saved.filters ? saved.filters.scope : undefined,
        ),
      ),
      side: isAppSide(saved.side) ? saved.side : "buy",
      lang: isLang(saved.lang) ? saved.lang : "ru",
      langChosen: saved.langChosen === true,
      applications: Array.isArray(saved.applications) ? saved.applications : [],
      realtorProfiles: Array.isArray(saved.realtorProfiles) ? saved.realtorProfiles : [],
      developerProfiles: mergeById(Array.isArray(saved.developerProfiles) ? saved.developerProfiles : [], [SEED_DEVELOPER]),
      dealerProfiles: mergeById(Array.isArray(saved.dealerProfiles) ? saved.dealerProfiles : [], [SEED_DEALER]),
      complexes: mergeById(Array.isArray(saved.complexes) ? saved.complexes : [], [SEED_COMPLEX]),
      complexUnits: mergeById(Array.isArray(saved.complexUnits) ? saved.complexUnits : [], SEED_UNITS),
      partnerLeads: Array.isArray(saved.partnerLeads) ? saved.partnerLeads : [],
      telegramOutbox: Array.isArray(saved.telegramOutbox) ? saved.telegramOutbox : [],
      blockedUserIds: [],
    };
  } catch {
    return initial;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [ready, setReady] = useState(false);
  const [synced, setSynced] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [syncError, setSyncError] = useState(false);
  const syncErrorRef = useRef(false);
  const syncRef = useRef<(serverUser: User | null) => Promise<void>>(async () => undefined);
  const userRef = useRef<User | null>(state.user);
  const favRef = useRef<string[]>(state.favouriteIds);
  const leaveGuardRef = useRef<((intent: { proceed: () => void }) => void) | null>(null);
  userRef.current = state.user;
  favRef.current = state.favouriteIds;
  syncErrorRef.current = syncError;

  useEffect(() => {
    const next = load();
    setState(next);
    setReady(true);
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setSynced(true);
    }, 8000);
    const epochAtBoot = sessionEpoch;
    // Public feed/points/config don't wait for /api/me and the local draft restore: on a slow mobile link
    // (Kyrgyzstan → server) that saved one or two round trips before the first listings show.
    const fetchPublic = () =>
      Promise.all([
        api<{ listings: Listing[]; counts?: Record<string, { likes: number; dislikes: number }> }>("/api/listings?limit=1000"),
        api<{ shops: Shop[] }>("/api/shops"),
        api("/api/config"),
      ]);
    let bootPublic: ReturnType<typeof fetchPublic> | null = fetchPublic();
    const authTask = (async () => {
      const me = await api<{ user: User | null }>("/api/me");
      if (cancelled || epochAtBoot !== sessionEpoch) return null;
      if (!me.ok && me.status === 0) return next.user ?? null;
      const serverUser = me.ok ? me.data?.user ?? null : null;
        if (!serverUser) {
        setState((s) => ({ ...s, user: null, blockedUserIds: [] }));
        return null;
      }
      setState((s) => ({
        ...s,
        user: s.user
          ? {
              ...s.user,
              id: serverUser.id ?? s.user.id,
              name: serverUser.name || s.user.name,
              phone: serverUser.phone ?? "",
              email: serverUser.email,
              method: serverUser.method ?? s.user.method,
              joinedYear: serverUser.joinedYear || s.user.joinedYear,
              roles: rolesForPhone(serverUser.phone || s.user.phone || "", serverAdminFlag(serverUser), s.realtorProfiles, s.developerProfiles, s.dealerProfiles),
            }
          : {
              ...serverUser,
              phone: serverUser.phone || "",
              roles: rolesForPhone(serverUser.phone || "", serverAdminFlag(serverUser), s.realtorProfiles, s.developerProfiles, s.dealerProfiles),
            },
      }));
      void resumeNativePush();
      return serverUser;
    })();
    trackAuth(authTask);
    const dead = () => cancelled || epochAtBoot !== sessionEpoch;
    const restorePending = async () => {
      const ops = pendingOps();
      const keys = new Set<string>();
      for (const op of ops) collectRefKeys(op.body, keys);
      collectRefKeys(next.draft, keys);
      await sweepOrphans(keys);
      const shown = await presentDraft(next.draft);
      if (!dead()) {
        setState((s) => {
          const swap = (cur?: string, display?: string) => (cur && cur.startsWith("kmedia:") ? display : cur);
          return {
            ...s,
            draft: {
              ...s.draft,
              videoUrl: swap(s.draft.videoUrl, shown.videoUrl),
              voiceUrl: swap(s.draft.voiceUrl, shown.voiceUrl),
              photo: swap(s.draft.photo, shown.photo),
              photos: s.draft.photos?.map((url, i) => swap(url, shown.photos?.[i]) || url),
              draftMedia: s.draft.draftMedia ?? shown.draftMedia,
            },
          };
        });
      }
      if (dead()) return;
      const listings: Listing[] = [];
      for (const op of ops) {
        if (op.kind !== "putListing") continue;
        const body = await hydrateRefs(op.body);
        if (body && typeof body === "object" && "id" in (body as Listing)) listings.push(body as Listing);
      }
      const patches: { id: string; body: Partial<Listing> }[] = [];
      for (const op of ops) {
        if (op.kind !== "patchListing") continue;
        patches.push({ id: op.listingId, body: await hydrateRefs(op.body as Partial<Listing>) });
      }
      const shopRows: Shop[] = [];
      for (const op of ops) {
        if (op.kind !== "putShop") continue;
        const raw = op.body as { shop?: Shop };
        if (!raw?.shop?.id) continue;
        shopRows.push(await hydrateRefs(raw.shop));
      }
      if (dead()) return;
      setState((s) => {
        let extraListings = s.extraListings;
        for (const listing of listings) extraListings = upsertExtraListing(extraListings, listing);
        for (const patch of patches) {
          if (!extraListings.some((item) => item.id === patch.id)) continue;
          extraListings = extraListings.map((item) => (item.id === patch.id ? { ...item, ...patch.body } : item));
        }
        let shops = s.shops;
        for (const shop of shopRows) {
          shops = shops.some((item) => item.id === shop.id)
            ? shops.map((item) => (item.id === shop.id ? { ...item, ...shop } : item))
            : [shop, ...shops];
        }
        return { ...s, extraListings, shops };
      });
    };
    syncRef.current = async (serverUser) => {
      const epoch = sessionEpoch;
      const first = bootPublic;
      bootPublic = null;
      const [feedRes, shopsRes] = await (first ?? fetchPublic());
      let extra = [] as Listing[];
      let serverCart: string[] | null = null;
      let reactions: ReactionsByVoter = {};
      let counts = feedRes.data?.counts;
      let useServerExtra = false;
      let blockedUserIds: string[] = [];
      const base = userRef.current;
      const reactionUser: User | null = serverUser
        ? {
            ...(base ?? serverUser),
            id: serverUser.id,
            name: serverUser.name || base?.name || "",
            phone: serverUser.phone || base?.phone || "",
            email: serverUser.email ?? base?.email,
          }
        : null;
      if (serverUser) {
        const [mine, cart, reacts, blockRes] = await Promise.all([
          api<{ listings: Listing[]; counts?: Record<string, { likes: number; dislikes: number }> }>("/api/me/listings"),
          api<{ favouriteIds: string[] }>("/api/me/cart"),
          api<{ reactions: Record<string, "like" | "dislike"> }>("/api/me/reactions"),
          api<{ blockedUserIds?: string[] }>("/api/me/blocks"),
        ]);
        if (mine.ok) {
          extra = mine.data?.listings ?? [];
          useServerExtra = true;
        }
        if (cart.ok && cart.data?.favouriteIds) {
          serverCart = cart.data.favouriteIds;
          publishGuestCart(mergeCartIds(favRef.current, serverCart).push);
        }
        const vid = voterId(reactionUser);
        if (vid && reacts.data?.reactions) reactions = { [vid]: reacts.data.reactions };
        counts = { ...(feedRes.data?.counts ?? {}), ...(mine.data?.counts ?? {}) };
        if (blockRes.ok && Array.isArray(blockRes.data?.blockedUserIds)) blockedUserIds = blockRes.data.blockedUserIds;
      }
      if (epoch !== sessionEpoch) return;
      setSyncError(feedRes.status === 0 || feedRes.status >= 500);
      if (feedRes.ok && shopsRes.ok) writeFeedCache(feedRes.data?.listings ?? [], shopsRes.data?.shops ?? []);
      applyCounts(counts, reactions, reactionUser);
      const ops = pendingOps();
      const pendingListingIds = new Set(ops.filter((op) => op.kind !== "putShop").map((op) => op.listingId));
      const pendingShopIds = new Set(ops.filter((op) => op.kind === "putShop").map((op) => op.shopId));
      setState((s) => {
        let extraListings = useServerExtra ? extra : s.extraListings;
        if (useServerExtra) {
          const serverIds = new Set(extra.map((item) => item.id));
          for (const local of s.extraListings) {
            if (pendingListingIds.has(local.id) && !serverIds.has(local.id)) extraListings = upsertExtraListing(extraListings, local);
          }
        }
        let shops = shopsRes.ok ? (shopsRes.data?.shops ?? []) : s.shops;
        if (shopsRes.ok) {
          const serverIds = new Set((shopsRes.data?.shops ?? []).map((item) => item.id));
          for (const local of s.shops) {
            if (pendingShopIds.has(local.id) && !serverIds.has(local.id)) shops = [local, ...shops];
          }
        }
        return {
          ...s,
          feed: feedRes.ok ? (feedRes.data?.listings ?? []) : s.feed,
          shops,
          extraListings,
          favouriteIds: serverCart ? mergeCartIds(s.favouriteIds, serverCart).ids : s.favouriteIds,
          reactions: serverUser ? reactions : s.reactions,
          blockedUserIds: serverUser ? blockedUserIds : [],
        };
      });
      setSynced(true);
    };
    void (async () => {
      await restorePending();
      const serverUser = await authTask;
      if (dead()) return;
      await syncRef.current(serverUser);
      if (!cancelled) setSynced(true);
      window.clearTimeout(timeout);
    })();
    void (async () => {
      let changed = false;
      const shops: Shop[] = [];
      for (const shop of next.shops) {
        const result = await sweepShopPriceTagPhotos(shop);
        if (result.changed) changed = true;
        shops.push(result.shop);
      }
      let shopDraft = next.shopDraft;
      if (shopDraft) {
        const result = await sweepShopPriceTagPhotos(shopDraft);
        if (result.changed) {
          changed = true;
          shopDraft = result.shop;
        }
      }
      if (cancelled || !changed) return;
      setState((s) => ({
        ...s,
        shops,
        shopDraft,
        extraListings: syncShopListings(s.extraListings, shops, s.user),
      }));
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const on = () => {
      setOnline(true);
      if (syncErrorRef.current) void syncRef.current(userRef.current);
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    return startOutbox((op, data) => {
      const payload = data as { listing?: Listing; shop?: Shop; discarded?: boolean; limit?: boolean };
      if (payload?.limit && (op.kind === "putListing" || op.kind === "patchListing")) {
        setState((s) => ({ ...s, extraListings: s.extraListings.filter((item) => item.id !== op.listingId) }));
        return;
      }
      if (payload?.discarded) {
        if (op.kind === "putListing" || op.kind === "patchListing") {
          setState((s) => ({ ...s, extraListings: s.extraListings.filter((item) => item.id !== op.listingId) }));
        }
        if (op.kind === "putShop") {
          setState((s) => ({ ...s, shops: s.shops.filter((item) => item.id !== op.shopId) }));
        }
        return;
      }
      if ((op.kind === "putListing" || op.kind === "patchListing") && payload.listing) {
        const listing = payload.listing;
        setState((s) => ({ ...s, extraListings: upsertExtraListing(s.extraListings, listing) }));
      }
      if (op.kind === "putShop" && payload.shop) {
        const shop = payload.shop;
        setState((s) => ({
          ...s,
          shops: s.shops.some((item) => item.id === shop.id) ? s.shops.map((item) => (item.id === shop.id ? shop : item)) : [shop, ...s.shops],
        }));
      }
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const {
      extraListings: _extra,
      shops: _shops,
      favouriteIds,
      reactions: _reactions,
      feed: _feed,
      blockedUserIds: _blocked,
      ...rest
    } = state;
    const payload = {
      ...rest,
      favouriteIds: state.user ? [] : favouriteIds.slice(0, 200),
      draft: durableDraft(state.draft),
      shopDraft: state.shopDraft ? (persistShop(state.shopDraft) as ShopDraft) : null,
    };
    try {
      localStorage.setItem(STORAGE, JSON.stringify(payload));
    } catch (err) {
      try {
        const light = { ...payload.draft, description: "", transcript: "", photos: [] as string[] };
        localStorage.setItem(STORAGE, JSON.stringify({ ...payload, draft: light, shopDraft: null }));
      } catch {
        console.warn("state persist skipped", err);
      }
    }
  }, [state, ready]);

  const update = useCallback((patch: Partial<State> | ((s: State) => State)) => {
    setState((s) => (typeof patch === "function" ? patch(s) : { ...s, ...patch }));
  }, []);

  const t = DICT[state.lang];
  const catalog = useMemo(() => {
    // Server rows of point products (owner, views, status) seed the client-built ones so they aren't replaced by stubs.
    const extraShopItems = state.extraListings.filter((item) => item.shopProductId);
    const extraShopIds = new Set(extraShopItems.map((item) => item.id));
    const fromShops = syncShopListings(
      [...extraShopItems, ...state.feed.filter((item) => item.shopProductId && !extraShopIds.has(item.id))],
      state.shops,
      state.user,
    );
    const restExtra = state.extraListings.filter((item) => !item.shopProductId);
    const extra = [...fromShops, ...restExtra];
    const extraIds = new Set(extra.map((item) => item.id));
    const merged = [...extra, ...state.feed.filter((item) => !extraIds.has(item.id))];
    const uid = state.user?.id;
    return merged
      .map((item) => {
        const edit = state.listingEdits[item.id];
        return edit ? { ...item, ...edit } : item;
      })
      .filter((item) => {
        if (!isSectionVisible(item.section)) return false;
        const status = item.status as string;
        if (item.underReview && item.ownerId !== uid) return false;
        if ((status === "expired" || status === "hidden") && item.ownerId !== uid) return false;
        return true;
      });
  }, [state.extraListings, state.feed, state.listingEdits, state.shops, state.user]);
  const allListings = useMemo(
    () => catalog.filter((item) => !hiddenByBlock(item.ownerId, state.blockedUserIds, state.user?.id)),
    [catalog, state.blockedUserIds, state.user?.id],
  );
  const visibleShops = useMemo(
    () => state.shops.filter((shop) => !hiddenByBlock(shop.ownerId, state.blockedUserIds, state.user?.id)),
    [state.shops, state.blockedUserIds, state.user?.id],
  );

  const value: Store = {
    ...state,
    t,
    ready,
    synced,
    online,
    syncError,
    resync: () => {
      void syncRef.current(userRef.current);
    },
    allListings,
    shops: visibleShops,
    isBlocked: (ownerId) => hiddenByBlock(ownerId, state.blockedUserIds, state.user?.id),
    recallListing: (id) => catalog.find((item) => item.id === id),
    recallShop: (id) => state.shops.find((item) => item.id === id),
    blockUser: async (userId) => {
      if (!state.user || !isDbUserId(userId) || userId === state.user.id) return { ok: false };
      update((s) => ({
        ...s,
        blockedUserIds: s.blockedUserIds.includes(userId) ? s.blockedUserIds : [...s.blockedUserIds, userId],
      }));
      const res = await api<{ blockedUserIds?: string[] }>("/api/me/blocks", { method: "POST", json: { userId } });
      if (!res.ok) {
        update((s) => ({ ...s, blockedUserIds: s.blockedUserIds.filter((id) => id !== userId) }));
        return { ok: false };
      }
      if (Array.isArray(res.data?.blockedUserIds)) {
        const ids = res.data.blockedUserIds;
        update((s) => ({ ...s, blockedUserIds: ids }));
      }
      return { ok: true };
    },
    unblockUser: async (userId) => {
      const prev = state.blockedUserIds;
      update((s) => ({ ...s, blockedUserIds: s.blockedUserIds.filter((id) => id !== userId) }));
      const res = await api<{ blockedUserIds?: string[] }>("/api/me/blocks", { method: "DELETE", json: { userId } });
      if (!res.ok) {
        update((s) => ({ ...s, blockedUserIds: prev }));
        return { ok: false };
      }
      if (Array.isArray(res.data?.blockedUserIds)) {
        const ids = res.data.blockedUserIds;
        update((s) => ({ ...s, blockedUserIds: ids }));
      }
      const feedRes = await api<{ listings: Listing[] }>("/api/listings?limit=1000");
      if (feedRes.ok) update((s) => ({ ...s, feed: feedRes.data?.listings ?? s.feed }));
      return { ok: true };
    },
    signInWithGoogle: async ({ locale, container, navigate, dest }) => {
      let credential: string | null;
      try {
        credential = await startGoogleSignIn({ locale, container });
      } catch (err) {
        if (err instanceof GoogleLoginError) {
          if (err.code === "cancelled") return "cancelled";
          if (err.code === "not-configured") return "not-configured";
          if (err.code === "open-in-browser") return "open-in-browser";
        }
        return "error";
      }
      if (!credential) return "cancelled";
      const signed = await api<{ ok?: boolean; user?: User; isNew?: boolean }>("/api/auth/google", {
        method: "POST",
        json: { credential },
      });
      const serverUser = signed.data?.user;
      if (!signed.ok || !serverUser?.id) return "error";
      void enableNativePush();
      const epoch = ++sessionEpoch;
      const isNew = signed.data?.isNew === true;
      const pickPlace = isNew && !hasPlaceFilter(state.filters);
      update((s) => {
        const nextUser: User = {
          id: serverUser.id,
          name: serverUser.name || "",
          phone: serverUser.phone || "",
          email: serverUser.email,
          method: "google",
          linkedChannels: [],
          cardLinked: false,
          joinedYear: serverUser.joinedYear || new Date().getFullYear(),
          verified: false,
          rating: 0,
          views: 0,
          roles: rolesForPhone(serverUser.phone || "", serverAdminFlag(serverUser), s.realtorProfiles, s.developerProfiles, s.dealerProfiles),
        };
        return {
          ...s,
          user: nextUser,
          pendingPath: null,
          draft: { ...s.draft, name: nextUser.name, phone: nextUser.phone },
        };
      });
      if (pickPlace) {
        const { openLocationPicker } = await import("@/components/location-line");
        openLocationPicker({ push: navigate }, dest || "/");
      } else {
        navigate(dest || "/");
      }
      trackAuth(
        (async () => {
          const [mine, cart, reacts, feedRes, blockRes] = await Promise.all([
            api<{ listings: Listing[]; counts?: Record<string, { likes: number; dislikes: number }> }>("/api/me/listings"),
            api<{ favouriteIds: string[] }>("/api/me/cart"),
            api<{ reactions: Record<string, "like" | "dislike"> }>("/api/me/reactions"),
            api<{ counts?: Record<string, { likes: number; dislikes: number }> }>("/api/listings?limit=1000"),
            api<{ blockedUserIds?: string[] }>("/api/me/blocks"),
          ]);
          if (epoch !== sessionEpoch) return;
          const reactionUser: User = {
            id: serverUser.id,
            name: serverUser.name || "",
            phone: serverUser.phone || "",
            email: serverUser.email,
            method: "google",
            joinedYear: serverUser.joinedYear || new Date().getFullYear(),
            verified: false,
            rating: 0,
            views: 0,
          };
          const vid = voterId(reactionUser);
          const reactions = vid && reacts.data?.reactions ? { [vid]: reacts.data.reactions } : {};
          applyCounts({ ...(feedRes.data?.counts ?? {}), ...(mine.data?.counts ?? {}) }, reactions, reactionUser);
          if (cart.ok && cart.data?.favouriteIds) publishGuestCart(mergeCartIds(favRef.current, cart.data.favouriteIds).push);
          update((s) => ({
            ...s,
            extraListings: mine.data?.listings ?? s.extraListings,
            favouriteIds: cart.ok && cart.data?.favouriteIds ? mergeCartIds(s.favouriteIds, cart.data.favouriteIds).ids : s.favouriteIds,
            reactions,
            blockedUserIds: Array.isArray(blockRes.data?.blockedUserIds) ? blockRes.data.blockedUserIds : [],
          }));
        })(),
      );
      return "ok";
    },
    acceptSignedInUser: (serverUser, isNew, navigate, dest) => {
      void enableNativePush();
      const epoch = ++sessionEpoch;
      const pickPlace = isNew && !hasPlaceFilter(state.filters);
      const method = serverUser.method ?? "telegram";
      update((s) => {
        const nextUser: User = {
          id: serverUser.id,
          name: serverUser.name || "",
          phone: serverUser.phone || "",
          email: serverUser.email,
          method,
          linkedChannels: [],
          cardLinked: false,
          joinedYear: serverUser.joinedYear || new Date().getFullYear(),
          verified: false,
          rating: 0,
          views: 0,
          roles: rolesForPhone(serverUser.phone || "", serverAdminFlag(serverUser), s.realtorProfiles, s.developerProfiles, s.dealerProfiles),
        };
        return {
          ...s,
          user: nextUser,
          pendingPath: null,
          draft: { ...s.draft, name: nextUser.name, phone: nextUser.phone },
        };
      });
      if (pickPlace) {
        void import("@/components/location-line").then(({ openLocationPicker }) => {
          openLocationPicker({ push: navigate }, dest || "/");
        });
      } else {
        navigate(dest || "/");
      }
      trackAuth(
        (async () => {
          const [mine, cart, reacts, feedRes, blockRes] = await Promise.all([
            api<{ listings: Listing[]; counts?: Record<string, { likes: number; dislikes: number }> }>("/api/me/listings"),
            api<{ favouriteIds: string[] }>("/api/me/cart"),
            api<{ reactions: Record<string, "like" | "dislike"> }>("/api/me/reactions"),
            api<{ counts?: Record<string, { likes: number; dislikes: number }> }>("/api/listings?limit=1000"),
            api<{ blockedUserIds?: string[] }>("/api/me/blocks"),
          ]);
          if (epoch !== sessionEpoch) return;
          const reactionUser: User = {
            id: serverUser.id,
            name: serverUser.name || "",
            phone: serverUser.phone || "",
            email: serverUser.email,
            method,
            joinedYear: serverUser.joinedYear || new Date().getFullYear(),
            verified: false,
            rating: 0,
            views: 0,
          };
          const vid = voterId(reactionUser);
          const reactions = vid && reacts.data?.reactions ? { [vid]: reacts.data.reactions } : {};
          applyCounts({ ...(feedRes.data?.counts ?? {}), ...(mine.data?.counts ?? {}) }, reactions, reactionUser);
          if (cart.ok && cart.data?.favouriteIds) publishGuestCart(mergeCartIds(favRef.current, cart.data.favouriteIds).push);
          update((s) => ({
            ...s,
            extraListings: mine.data?.listings ?? s.extraListings,
            favouriteIds: cart.ok && cart.data?.favouriteIds ? mergeCartIds(s.favouriteIds, cart.data.favouriteIds).ids : s.favouriteIds,
            reactions,
            blockedUserIds: Array.isArray(blockRes.data?.blockedUserIds) ? blockRes.data.blockedUserIds : [],
          }));
        })(),
      );
    },
    logout: () => {
      sessionEpoch += 1;
      void nativeGoogleSignOut().catch(() => undefined);
      disableGoogleAutoSelect();
      update({ user: null, extraListings: [], favouriteIds: [], reactions: {}, blockedUserIds: [] });
      dropFeedCache();
      void (async () => {
        await forgetNativePush();
        await api("/api/auth/logout", { method: "POST", json: {} });
        const [feed, shopList] = await Promise.all([
          api<{ listings?: Listing[]; counts?: Record<string, { likes: number; dislikes: number }> }>("/api/listings?limit=1000"),
          api<{ shops?: Shop[] }>("/api/shops"),
        ]);
        applyCounts(feed.data?.counts, {}, null);
        update((s) => ({
          ...s,
          ...(feed.ok && feed.data?.listings ? { feed: feed.data.listings } : {}),
          ...(shopList.ok && shopList.data?.shops ? { shops: shopList.data.shops } : {}),
          blockedUserIds: [],
        }));
      })();
    },
    linkCard: () =>
      update((s) => {
        if (!s.user || s.user.method !== "sms") return s;
        return { ...s, user: { ...s.user, cardLinked: true, verified: true } };
      }),
    linkChannel: (channel) =>
      update((s) => {
        if (!s.user) return s;
        if (channelsOf(s.user).includes(channel)) return s;
        return { ...s, user: { ...s.user, linkedChannels: [...channelsOf(s.user), channel] } };
      }),
    setLang: (lang) => update({ lang, langChosen: true }),
    setListingLayout: (listingLayout) => update({ listingLayout }),
    setElderMode: (elderMode) =>
      update({ elderMode, listingLayout: elderMode ? "large" : "medium" }),
    setSide: (side) => update({ side }),
    markViewed: (id) =>
      update((s) => ({
        ...s,
        viewedIds: [id, ...s.viewedIds.filter((x) => x !== id)].slice(0, 12),
      })),
    reportListing: (id, reason) => {
      update((s) => ({
        ...s,
        reports: { ...s.reports, [id]: reason },
      }));
      void (async () => {
        await authReady;
        onceRetry(() => api("/api/reports", { method: "POST", json: { listingId: id, reason } }));
      })();
    },
    setCity: (city) => update((s) => ({ ...s, city, filters: { ...s.filters, city } })),
    setFilters: (patch) => update((s) => ({ ...s, filters: { ...s.filters, ...patch } })),
    resetFilters: () =>
      update({
        filters: { ...defaultFilters(), city: "all" },
        city: "all",
      }),
    toggleFav: (id) => {
      const has = state.favouriteIds.includes(id);
      const signedIn = Boolean(state.user);
      update({
        favouriteIds: has ? state.favouriteIds.filter((x) => x !== id) : [id, ...state.favouriteIds].slice(0, 200),
      });
      if (signedIn) {
        void (async () => {
          await authReady;
          onceRetry(() => api(`/api/me/cart/${encodeURIComponent(id)}`, { method: has ? "DELETE" : "PUT", json: {} }));
        })();
      }
      return true;
    },
    isFav: (id) => state.favouriteIds.includes(id),
    reactionOf: (id) => {
      const vid = voterId(state.user);
      if (!vid) return null;
      return state.reactions[vid]?.[id] ?? null;
    },
    setReaction: (id, reaction) => {
      if (!state.user) return false;
      const vid = voterId(state.user);
      if (!vid) return false;
      const prev = state.reactions[vid]?.[id] ?? null;
      const next = prev === reaction ? null : reaction;
      update((s) => {
        const current = voterId(s.user);
        if (!current) return s;
        const prev = s.reactions[current]?.[id] ?? null;
        const next = prev === reaction ? null : reaction;
        const map = { ...s.reactions[current] };
        if (next) map[id] = next;
        else delete map[id];
        return {
          ...s,
          reactions: {
            ...s.reactions,
            [current]: map,
          },
        };
      });
      void (async () => {
        await authReady;
        onceRetry(() => api(`/api/listings/${encodeURIComponent(id)}/reaction`, { method: "PUT", json: { value: next } }));
      })();
      return true;
    },
    commentsOf: (id) => state.comments[id] ?? [],
    addComment: (id, text) => {
      const clean = text.trim();
      if (!state.user || !clean) return false;
      const comment: ListingComment = {
        id: `c-${Date.now()}`,
        listingId: id,
        author: state.user.name,
        text: clean,
        time: t.justNow,
      };
      update((s) => ({
        ...s,
        comments: { ...s.comments, [id]: [...(s.comments[id] ?? []), comment] },
      }));
      return true;
    },
    honestyOf: (id) => {
      const votes = state.honesty[id] ?? {};
      const scores = Object.values(votes);
      const count = scores.length;
      const avg = count ? scores.reduce((a, b) => a + b, 0) / count : 0;
      const vid = voterId(state.user);
      const mine = vid ? votes[vid] ?? null : null;
      return { avg, count, mine };
    },
    rateHonesty: (id, score) => {
      if (!state.user) return false;
      const vid = voterId(state.user);
      if (!vid) return false;
      if (state.honesty[id]?.[vid]) return false;
      update((s) => {
        const current = voterId(s.user);
        if (!current) return s;
        if (s.honesty[id]?.[current]) return s;
        return {
          ...s,
          honesty: {
            ...s.honesty,
            [id]: { ...s.honesty[id], [current]: score },
          },
        };
      });
      return true;
    },
    requireAuth: () => Boolean(state.user),
    setPendingPath: (path) => update({ pendingPath: path }),
    setDraft: (patch) => {
      update((s) => ({ ...s, draft: { ...s.draft, ...patch, savedAt: new Date().toISOString() } }));
      void absorbMediaPatch(patch).then(async (media) => {
        if (!media) return;
        const shownVideo = media.videoUrl ? await displayUrl(media.videoUrl) : undefined;
        const shownVoice = media.voiceUrl ? await displayUrl(media.voiceUrl) : undefined;
        const shownPhoto = media.photo ? await displayUrl(media.photo) : undefined;
        update((s) => {
          const next = { ...s.draft };
          const mediaRefs = { ...s.draft.draftMedia };
          let applied = false;
          if (shownVideo && patch.videoUrl && s.draft.videoUrl === patch.videoUrl) {
            next.videoUrl = shownVideo;
            mediaRefs.video = media.draftMedia?.video;
            applied = true;
          }
          if (shownVoice && patch.voiceUrl && s.draft.voiceUrl === patch.voiceUrl) {
            next.voiceUrl = shownVoice;
            mediaRefs.voice = media.draftMedia?.voice;
            applied = true;
          }
          if (shownPhoto && patch.photo && s.draft.photo === patch.photo) {
            next.photo = shownPhoto;
            next.photos = [shownPhoto];
            mediaRefs.photos = media.draftMedia?.photos;
            applied = true;
          }
          // A cleared or replaced draft must not receive this upload.
          if (!applied) return s;
          next.savedAt = new Date().toISOString();
          next.draftMedia = mediaRefs;
          return { ...s, draft: next };
        });
      });
    },
    updateProfile: async (patch) => {
      const res = await api<{ user?: User }>("/api/me", { method: "PATCH", json: patch });
      if (!res.ok || !res.data?.user) return { ok: false, error: res.status === 0 ? "network" : res.error || "save" };
      const serverUser = res.data.user;
      const nextUser = state.user
        ? {
            ...state.user,
            name: serverUser.name || state.user.name,
            phone: serverUser.phone || "",
            roles: rolesForPhone(serverUser.phone || "", serverAdminFlag(serverUser), state.realtorProfiles, state.developerProfiles, state.dealerProfiles),
          }
        : null;
      if (nextUser) userRef.current = nextUser;
      update((s) => ({ ...s, user: nextUser ?? s.user }));
      return { ok: true };
    },
    discardDraft: () => {
      const current = state.draft;
      void releaseRefs(current);
      update((s) => ({
        ...s,
        draft: { ...defaultDraft(), name: s.user?.name ?? "", phone: s.user?.phone ?? "", city: s.city || "bishkek" },
      }));
    },
    setLeaveGuard: (fn) => {
      leaveGuardRef.current = fn;
    },
    askLeave: (proceed) => {
      const fn = leaveGuardRef.current;
      if (!fn) return false;
      fn({ proceed });
      return true;
    },
    saveDraft: () => {
      if (state.draft.editing) {
        // A live listing being edited is never saved back as a draft.
        return userListingFromDraft(state.draft, {
          user: state.user,
          dealerProfiles: state.dealerProfiles,
          untitled: t.draft,
          status: state.draft.editStatus ?? "active",
        });
      }
      const listing = userListingFromDraft(state.draft, {
        user: state.user,
        dealerProfiles: state.dealerProfiles,
        untitled: t.draft,
        status: "draft",
      });
      update((s) => ({
        ...s,
        extraListings: upsertExtraListing(s.extraListings, listing),
        draft: { ...s.draft, id: listing.id },
        side: "sell",
      }));
      return listing;
    },
    markInboxRead: () =>
      update((s) => ({
        ...s,
        threads: s.threads.map((th) => ({ ...th, unread: false })),
        savedSearches: s.savedSearches.map((row) => ({ ...row, newCount: 0 })),
      })),
    publishDraft: () => {
      const d = state.draft;
      const liveUser = userRef.current ?? state.user;
      const priced =
        Boolean(d.priceNegotiable) ||
        d.section === "vacancies" ||
        d.section === "restaurants" ||
        d.section === "services" ||
        Boolean(d.price.trim());
      if (!d.title.trim() || !priced) return null;
      const built = userListingFromDraft(d, {
        user: liveUser,
        dealerProfiles: state.dealerProfiles,
        untitled: t.draft,
        status: d.editing && d.editStatus && d.editStatus !== "draft" ? d.editStatus : d.promote ? "promoted" : "active",
      });
      // Editing keeps counters, dates and moderation flags of the original listing.
      const original = d.editing
        ? state.extraListings.find((item) => item.id === built.id) ?? state.feed.find((item) => item.id === built.id)
        : undefined;
      const listing: Listing = original
        ? ({
            ...original,
            ...Object.fromEntries(Object.entries(built).filter(([, value]) => value !== undefined)),
            postedAgo: original.postedAgo,
          } as Listing)
        : built;
      update((s) => ({
        ...s,
        extraListings: upsertExtraListing(s.extraListings, listing),
        draft: { ...s.draft, id: listing.id },
        side: "sell",
      }));
      const videoSec = d.videoSec;
      const stashed = stashListing(listing, videoSec);
      void (async () => {
        try {
          const body = await stashed;
          await authReady;
          enqueue({ kind: "putListing", listingId: listing.id, body: { ...body, videoSec } });
        } catch (err) {
          const code = err instanceof UploadFatal ? err.code : "network";
          enqueue({ kind: "putListing", listingId: listing.id, body: { ...listing, videoSec }, failed: true, error: code });
        }
      })();
      return listing;
    },
    updateListing: (id, patch) => {
      const current = state.extraListings.find((item) => item.id === id) ?? state.feed.find((item) => item.id === id);
      const own = Boolean(current && (state.extraListings.some((item) => item.id === id) || current.ownerId === state.user?.id));
      let shopToPush: Shop | null = null;
      update((s) => {
        let extraListings = s.extraListings;
        let shops = s.shops;
        let feed = s.feed;
        const inExtra = extraListings.some((item) => item.id === id);
        const inFeed = feed.some((item) => item.id === id);
        if (!inExtra && !inFeed) return s;
        if (inExtra) {
          extraListings = extraListings.map((item) => (item.id === id ? { ...item, ...patch } : item));
          const listing = extraListings.find((item) => item.id === id);
          if (listing?.shopId && listing.shopProductId && "price" in patch) {
            shops = shops.map((shop) =>
              shop.id === listing.shopId
                ? {
                    ...shop,
                    products: shop.products.map((row) =>
                      row.id === listing.shopProductId
                        ? { ...row, price: listing.price > 0 ? listing.price : undefined, updatedAt: new Date().toISOString() }
                        : row,
                    ),
                  }
                : shop,
            );
            shopToPush = shops.find((shop) => shop.id === listing.shopId) ?? null;
          }
        }
        if (inFeed) feed = feed.map((item) => (item.id === id ? { ...item, ...patch } : item));
        return { ...s, extraListings, shops, feed };
      });
      if (!own) return;
      void (async () => {
        await authReady;
        enqueue({ kind: "patchListing", listingId: id, body: patch });
        if (!shopToPush) return;
        try {
          const ready = await materializeShop(shopToPush);
          enqueue({ kind: "putShop", shopId: ready.id, body: { action: "save-draft", shop: ready } });
        } catch (err) {
          console.warn("shop sync failed", err);
        }
      })();
    },
    noteListingFresh: (id) => {
      const iso = new Date().toISOString();
      update((s) => ({
        ...s,
        extraListings: s.extraListings.map((item) => (item.id === id ? { ...item, confirmedAt: iso } : item)),
        feed: s.feed.map((item) => (item.id === id ? { ...item, confirmedAt: iso } : item)),
      }));
    },
    ensureMeetDeal: (listingId, reservedById) => {
      update((s) => {
        const cur = s.meetDeals[listingId];
        if (cur && cur.reservedById === reservedById) return s;
        return {
          ...s,
          meetDeals: { ...s.meetDeals, [listingId]: emptyMeetDeal(listingId, reservedById) },
        };
      });
    },
    clearMeetDeal: (listingId) => {
      update((s) => {
        if (!s.meetDeals[listingId]) return s;
        const next = { ...s.meetDeals };
        delete next[listingId];
        return { ...s, meetDeals: next };
      });
    },
    patchMeetDeal: (listingId, patch) => {
      update((s) => {
        const cur = s.meetDeals[listingId];
        if (!cur) return s;
        const next = typeof patch === "function" ? patch(cur) : { ...cur, ...patch };
        return { ...s, meetDeals: { ...s.meetDeals, [listingId]: next } };
      });
    },
    setMeetViewAs: (listingId, viewAs) => {
      update((s) => {
        const cur = s.meetDeals[listingId];
        if (!cur) return s;
        return { ...s, meetDeals: { ...s.meetDeals, [listingId]: { ...cur, viewAs } } };
      });
    },
    confirmMeetReserve: (listingId) => {
      update((s) => {
        const cur = s.meetDeals[listingId];
        if (!cur) return s;
        return {
          ...s,
          meetDeals: {
            ...s.meetDeals,
            [listingId]: { ...cur, buyerConfirmed: true, phase: "wait-meet" },
          },
        };
      });
    },
    proposeMeet: (listingId, offer) => {
      update((s) => {
        const cur = s.meetDeals[listingId];
        if (!cur) return s;
        return {
          ...s,
          meetDeals: {
            ...s.meetDeals,
            [listingId]: {
              ...cur,
              offer,
              phase: "wait-reply",
              buyerLeft: false,
              calendarSaved: false,
            },
          },
        };
      });
    },
    acceptMeet: (listingId) => {
      update((s) => {
        const cur = s.meetDeals[listingId];
        if (!cur?.offer) return s;
        return {
          ...s,
          meetDeals: { ...s.meetDeals, [listingId]: { ...cur, phase: "agreed" } },
        };
      });
    },
    declineMeet: (listingId) => {
      update((s) => {
        const cur = s.meetDeals[listingId];
        if (!cur) return s;
        return {
          ...s,
          meetDeals: { ...s.meetDeals, [listingId]: { ...cur, phase: "declined" } },
        };
      });
    },
    leaveForMeet: (listingId) => {
      update((s) => {
        const cur = s.meetDeals[listingId];
        if (!cur) return s;
        return {
          ...s,
          meetDeals: { ...s.meetDeals, [listingId]: { ...cur, buyerLeft: true } },
        };
      });
    },
    clearPostedDraft: () =>
      update((s) => ({
        ...s,
        draft: {
          ...defaultDraft(),
          name: s.draft.name,
          phone: s.draft.phone,
        },
      })),
    addMessage: (threadId, text, from = "me") => {
      update((s) => ({
        ...s,
        threads: s.threads.map((th) =>
          th.id === threadId
            ? {
                ...th,
                preview: text,
                time: "сейчас",
                messages: [
                  ...th.messages.filter((m) => m.from !== "system"),
                  {
                    id: `x-${Date.now()}`,
                    from,
                    text,
                    time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
                    read: true,
                  },
                  ...th.messages.filter((m) => m.from === "system"),
                ],
              }
            : th,
        ),
      }));
    },
    ensureThread: (listingId) => {
      const existing = state.threads.find((th) => th.listingId === listingId);
      if (existing) return existing.id;
      const listing = allListings.find((l) => l.id === listingId);
      const id = `t-${listingId}`;
      const thread: Thread = {
        id,
        listingId,
        ownerId: listing?.ownerId ?? "aida",
        preview: "",
        time: "",
        unread: false,
        messages: [
          {
            id: "sys",
            from: "system",
            text: listing?.section === "services" ? t.meetServiceText : listing?.safetyKind === "goods" ? t.meetGoods : t.meetHome,
            time: "",
          },
        ],
      };
      update({ threads: [thread, ...state.threads] });
      return id;
    },
    toggleSearchNotify: (id) =>
      update({
        savedSearches: state.savedSearches.map((s) => (s.id === id ? { ...s, notify: !s.notify } : s)),
      }),
    saveCurrentSearch: () => {
      const f = state.filters;
      const title = [f.query, f.city !== "all" ? t.cities[f.city] : "", f.section ? t.sectionNames[f.section] : ""]
        .filter(Boolean)
        .join(", ") || t.savedSearches;
      update({
        savedSearches: [{ id: `ss-${Date.now()}`, title, newCount: 0, notify: true }, ...state.savedSearches],
      });
    },
    setNotificationsOn: (on) => update({ notificationsOn: on }),
    startShopDraft: (id, opts) => {
      if (!state.user) return null;
      if (id) {
        const existing = state.shops.find((s) => s.id === id);
        if (!existing || !isOwnShop(existing, state.user)) return null;
        const draft: ShopDraft = { ...existing, locked: {}, pendingProducts: [] };
        update({ shopDraft: draft });
        return draft;
      }
      if (!opts?.fresh && state.shopDraft && state.shopDraft.status !== "active" && isOwnShop(state.shopDraft, state.user)) {
        return state.shopDraft;
      }
      const draft = emptyShopDraft(state.user);
      update({ shopDraft: draft });
      return draft;
    },
    setShopDraft: (patch) =>
      update((s) => {
        if (!s.shopDraft) return s;
        return { ...s, shopDraft: { ...s.shopDraft, ...patch, updatedAt: new Date().toISOString() } };
      }),
    lockShopField: (key) =>
      update((s) => {
        if (!s.shopDraft) return s;
        return { ...s, shopDraft: { ...s.shopDraft, locked: { ...s.shopDraft.locked, [key]: true } } };
      }),
    saveShopDraft: () => {
      const draft = state.shopDraft;
      const user = state.user;
      if (!draft || !user || !isOwnShop(draft, user)) return null;
      const saved: Shop = { ...draft, status: draft.status === "active" ? "active" : "draft", updatedAt: new Date().toISOString() };
      const prevShop = state.shops.find((item) => item.id === saved.id);
      const mergedShop: Shop = {
        ...saved,
        products: [
          ...(prevShop?.products ?? []),
          ...saved.products.filter((row) => !(prevShop?.products ?? []).some((p) => p.id === row.id)),
        ],
      };
      update((s) => ({
        ...s,
        shops: prevShop ? s.shops.map((item) => (item.id === saved.id ? mergedShop : item)) : [mergedShop, ...s.shops],
        shopDraft: { ...draft, ...mergedShop },
      }));
      void (async () => {
        await authReady;
        try {
          const ready = await materializeShop(mergedShop);
          enqueue({ kind: "putShop", shopId: ready.id, body: { action: "save-draft", shop: ready } });
        } catch (err) {
          console.warn("shop draft upload failed", err);
        }
      })();
      return saved;
    },
    discardShopDraft: () => {
      const draft = state.shopDraft;
      if (!draft) return;
      update((s) => ({
        ...s,
        shopDraft: null,
        shops: draft.status === "active" ? s.shops : s.shops.filter((item) => item.id !== draft.id),
      }));
    },
    publishShop: async (source) => {
      const user = state.user;
      const draft = source ?? state.shopDraft;
      if (!user) return { shop: null, error: "auth" };
      if (!draft || !isOwnShop(draft, user)) return { shop: null, error: "forbidden" };
      const shop: Shop = { ...draft, status: "active", updatedAt: new Date().toISOString(), aiConfirmed: true };
      try {
        await authReady;
        const ready = await materializeShop(shop);
        const res = await api<{ ok?: boolean; error?: string; shop?: Shop }>(`/api/shops/${encodeURIComponent(ready.id)}`, {
          method: "PUT",
          json: { action: "publish", shop: ready },
        });
        if (!res.ok || !res.data?.ok) return { shop: null, error: res.data?.error || res.error || "forbidden" };
      } catch {
        return { shop: null, error: "network" };
      }
      update((s) => {
        const prev = s.shops.find((item) => item.id === shop.id);
        const merged: Shop = {
          ...shop,
          products: [
            ...(prev?.products ?? []),
            ...shop.products.filter((row) => !(prev?.products ?? []).some((p) => p.id === row.id)),
          ],
        };
        const kept = s.shopDraft?.id === merged.id ? s.shopDraft : null;
        return {
          ...s,
          shops: prev ? s.shops.map((item) => (item.id === shop.id ? merged : item)) : [merged, ...s.shops],
          shopDraft: {
            ...draft,
            ...merged,
            locked: kept?.locked ?? {},
            pendingProducts: kept?.pendingProducts,
          },
          extraListings: syncShopListings(s.extraListings, prev ? s.shops.map((item) => (item.id === shop.id ? merged : item)) : [merged, ...s.shops], user),
        };
      });
      return { shop };
    },
    withdrawShop: async (id) => {
      const user = state.user;
      const shop = state.shops.find((item) => item.id === id);
      if (!user) return { error: "auth" };
      if (!shop || !isOwnShop(shop, user)) return { error: "forbidden" };
      const next = { ...shop, status: "withdrawn" as const, updatedAt: new Date().toISOString() };
      try {
        await authReady;
        const ready = await materializeShop(next);
        const res = await api<{ ok?: boolean; error?: string }>(`/api/shops/${encodeURIComponent(ready.id)}`, {
          method: "PUT",
          json: { action: "withdraw", shop: ready },
        });
        if (!res.ok || !res.data?.ok) return { error: res.data?.error || res.error || "forbidden" };
      } catch {
        return { error: "network" };
      }
      update((s) => ({
        ...s,
        shops: s.shops.map((item) => (item.id === id ? next : item)),
        shopDraft: s.shopDraft?.id === id ? { ...s.shopDraft, ...next } : s.shopDraft,
        extraListings: s.extraListings.map((item) => (item.shopId === id ? { ...item, status: "withdrawn" } : item)),
      }));
      return {};
    },
    deleteShop: async (id) => {
      const user = state.user;
      const shop = state.shops.find((item) => item.id === id);
      if (!user) return { error: "auth" };
      if (!shop || !isOwnShop(shop, user)) return { error: "forbidden" };
      try {
        await authReady;
        const res = await api<{ ok?: boolean; error?: string }>(`/api/shops/${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!res.ok || !res.data?.ok) return { error: res.data?.error || res.error || "forbidden" };
      } catch {
        return { error: "network" };
      }
      const stamp = new Date().toISOString();
      update((s) => ({
        ...s,
        shops: s.shops.map((item) => (item.id === id ? { ...item, status: "hidden", updatedAt: stamp } : item)),
        shopDraft: s.shopDraft?.id === id ? null : s.shopDraft,
        extraListings: s.extraListings.map((item) => (item.shopId === id ? { ...item, status: "hidden" } : item)),
        feed: s.feed.map((item) => (item.shopId === id ? { ...item, status: "hidden" } : item)),
      }));
      return {};
    },
    deleteListing: async (id) => {
      const user = state.user;
      if (!user) return { error: "auth" };
      const current = state.extraListings.find((item) => item.id === id) ?? state.feed.find((item) => item.id === id);
      const own = Boolean(
        current &&
          (current.ownerId === user.id ||
            state.extraListings.some((item) => item.id === id) ||
            (current.shopId && isOwnShop(state.shops.find((shop) => shop.id === current.shopId) ?? { ownerPhone: "" }, user))),
      );
      if (!own) return { error: "forbidden" };
      try {
        await authReady;
        const res = await api<{ ok?: boolean; error?: string }>(`/api/listings/${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!res.ok || !res.data?.ok) return { error: res.data?.error || res.error || "forbidden" };
      } catch {
        return { error: "network" };
      }
      update((s) => ({
        ...s,
        extraListings: s.extraListings.map((item) => (item.id === id ? { ...item, status: "hidden" } : item)),
        feed: s.feed.map((item) => (item.id === id ? { ...item, status: "hidden" } : item)),
        shops:
          current?.shopId && current.shopProductId
            ? s.shops.map((shop) =>
                shop.id === current.shopId
                  ? {
                      ...shop,
                      products: shop.products.map((row) =>
                        row.id === current.shopProductId ? { ...row, published: false, updatedAt: new Date().toISOString() } : row,
                      ),
                    }
                  : shop,
              )
            : s.shops,
      }));
      return {};
    },
    upsertShopProduct: async (shopId, product) => {
      const user = state.user;
      const shop = state.shops.find((item) => item.id === shopId);
      if (!user) return { error: "auth" };
      if (!shop || !isOwnShop(shop, user)) return { error: "forbidden" };
      const price = product.price != null ? validPrice(product.price) : undefined;
      if (product.price != null && product.price !== 0 && price == null) return { error: "price" };
      const now = new Date().toISOString();
      const id = product.id || `sp-${crypto.randomUUID()}`;
      const sourceId = product.sourceId || id;
      const isNew = !shop.products.some((row) => row.id === id);
      if (isNew && sourceId !== id && !canReuseAssortment(shop, sourceId)) return { error: "reuse" };
      const kind = product.kind;
      const parent = parentOfShopKind(kind) ?? product.category ?? shop.category;
      const extraCategories =
        parent !== shop.category && !shop.extraCategories.includes(parent)
          ? [...shop.extraCategories, parent]
          : shop.extraCategories;
      const kinds =
        kind && isShopKind(kind) && !(shop.kinds ?? []).includes(kind)
          ? pruneShopKinds({ ...shop, extraCategories, kinds: [...(shop.kinds ?? []), kind] })
          : pruneShopKinds({ ...shop, extraCategories, kinds: shop.kinds ?? [] });
      const nextProduct: ShopProduct = {
        id,
        shopId,
        title: product.title.trim(),
        description: product.description,
        photo: displayPhotoForProduct({ title: product.title.trim(), kind, photo: product.photo }),
        videoUrl: product.videoUrl,
        category: parent,
        kind,
        price,
        currency: "KGS",
        unit: product.unit ?? "piece",
        stock: product.stock ?? "in",
        quantity: validQuantity(product.quantity),
        listingId: product.listingId || listingIdForProduct(id),
        sourceId,
        priceFromPhoto: product.priceFromPhoto,
        previousPrice: product.previousPrice,
        promoPercent: product.promoPercent,
        published: product.published !== false,
        createdAt: product.createdAt ?? now,
        updatedAt: now,
      };
      try {
        await authReady;
        const shopForSave: Shop = {
          ...shop,
          extraCategories,
          kinds,
          updatedAt: now,
          products: shop.products.some((row) => row.id === nextProduct.id)
            ? shop.products.map((row) => (row.id === nextProduct.id ? nextProduct : row))
            : [...shop.products, nextProduct],
        };
        const ready = await materializeShop(shopForSave);
        const res = await api<{ ok?: boolean; error?: string }>(`/api/shops/${encodeURIComponent(ready.id)}`, {
          method: "PUT",
          json: { action: "upsert-product", shop: ready, product: nextProduct },
        });
        if (!res.ok || !res.data?.ok) return { error: res.data?.error || res.error || "forbidden" };
      } catch {
        return { error: "network" };
      }
      update((s) => {
        const shops = s.shops.map((item) =>
          item.id === shopId
            ? {
                ...item,
                extraCategories,
                kinds,
                updatedAt: now,
                products: item.products.some((row) => row.id === nextProduct.id)
                  ? item.products.map((row) => (row.id === nextProduct.id ? nextProduct : row))
                  : [...item.products, nextProduct],
              }
            : item,
        );
        const shopNext = shops.find((item) => item.id === shopId) ?? shop;
        return {
          ...s,
          shops,
          extraListings: syncProductListing(s.extraListings, shopNext, nextProduct, user),
        };
      });
      return { product: nextProduct };
    },
    updateShopProduct: async (shopId, productId, patch) => {
      const user = state.user;
      const shop = state.shops.find((item) => item.id === shopId);
      const current = shop?.products.find((row) => row.id === productId);
      if (!user) return { error: "auth" };
      if (!shop || !current || !isOwnShop(shop, user)) return { error: "forbidden" };
      if ("price" in patch && patch.price != null && patch.price !== 0 && validPrice(patch.price) == null) return { error: "price" };
      if ("quantity" in patch && patch.quantity != null && patch.quantity !== 0 && validQuantity(patch.quantity) == null) {
        return { error: "quantity" };
      }
      const next = {
        ...current,
        ...patch,
        price: "price" in patch
          ? patch.price == null || patch.price === 0
            ? undefined
            : validPrice(patch.price)
          : current.price,
        photo: displayPhotoForProduct({ ...current, ...patch }),
        quantity: "quantity" in patch ? validQuantity(patch.quantity) : current.quantity,
        updatedAt: new Date().toISOString(),
      };
      const shopNext: Shop = {
        ...shop,
        updatedAt: next.updatedAt,
        products: shop.products.map((row) => (row.id === productId ? next : row)),
      };
      update((s) => ({
        ...s,
        shops: s.shops.map((item) => (item.id === shopId ? shopNext : item)),
        extraListings: syncProductListing(s.extraListings, shopNext, next, user),
      }));
      void (async () => {
        await authReady;
        try {
          const ready = await materializeShop(shopNext);
          enqueue({ kind: "putShop", shopId: ready.id, body: { action: "upsert-product", shop: ready, product: next } });
        } catch (err) {
          console.warn("shop product upload failed", err);
        }
      })();
      return {};
    },
    hideShopProduct: (shopId, productId) => {
      const user = state.user;
      const shop = state.shops.find((item) => item.id === shopId);
      const product = shop?.products.find((row) => row.id === productId);
      if (!user || !shop || !isOwnShop(shop, user) || !product) return;
      const hiddenShop: Shop = {
        ...shop,
        products: shop.products.map((row) => (row.id === productId ? { ...row, published: false, updatedAt: new Date().toISOString() } : row)),
      };
      update((s) => ({
        ...s,
        shops: s.shops.map((item) => (item.id === shopId ? hiddenShop : item)),
        extraListings: s.extraListings.map((item) =>
          item.id === (product.listingId || listingIdForProduct(productId)) || item.shopProductId === productId
            ? { ...item, status: "withdrawn" }
            : item,
        ),
      }));
      void (async () => {
        await authReady;
        try {
          const ready = await materializeShop(hiddenShop);
          enqueue({ kind: "putShop", shopId: ready.id, body: { action: "hide-product", shop: ready, product } });
        } catch (err) {
          console.warn("shop hide upload failed", err);
        }
      })();
    },
    publishProductListing: (shopId, productId) => {
      const user = state.user;
      const shop = state.shops.find((item) => item.id === shopId);
      const product = shop?.products.find((row) => row.id === productId);
      if (!user || !shop || !product || !isOwnShop(shop, user)) return null;
      if (!product.title.trim()) return { missing: ["name"] };
      let listing: Listing | undefined;
      update((s) => {
        const extraListings = syncProductListing(s.extraListings, shop, product, user);
        listing = extraListings.find((item) => item.shopProductId === product.id);
        return {
          ...s,
          extraListings,
          shops: s.shops.map((item) =>
            item.id === shopId
              ? {
                  ...item,
                  products: item.products.map((row) =>
                    row.id === productId ? { ...row, listingId: listingIdForProduct(product.id), published: true } : row,
                  ),
                }
              : item,
          ),
        };
      });
      const shopNext: Shop = {
        ...shop,
        products: shop.products.map((row) =>
          row.id === productId ? { ...row, listingId: listingIdForProduct(product.id), published: true } : row,
        ),
      };
      void (async () => {
        await authReady;
        try {
          const ready = await materializeShop(shopNext);
          enqueue({ kind: "putShop", shopId: ready.id, body: { action: "upsert-product", shop: ready, product: shopNext.products.find((row) => row.id === productId) } });
        } catch (err) {
          console.warn("shop publish upload failed", err);
        }
      })();
      return listing ?? null;
    },
    reportShop: (id, reason) => {
      update((s) => ({
        ...s,
        reports: { ...s.reports, [id]: reason },
      }));
      void (async () => {
        await authReady;
        onceRetry(() => api("/api/reports", { method: "POST", json: { shopId: id, reason } }));
      })();
    },
    submitPartnerApplication: (input) => {
      const user = state.user;
      if (!user) return null;
      const pending = state.applications.find((row) => row.kind === input.kind && row.userPhone === user.phone && row.status === "pending");
      if (pending) return pending.id;
      const id = `app-${input.kind}-${Date.now()}`;
      const row: PartnerApplication = {
        id,
        kind: input.kind,
        userPhone: user.phone,
        userName: user.name,
        companyName: input.companyName,
        contactName: input.contactName,
        phone: input.phone,
        city: input.city,
        districts: input.districts,
        specialization: input.specialization,
        inn: input.inn,
        website: input.website,
        address: input.address ?? "",
        hours: input.hours ?? "",
        status: "pending",
        note: "",
        createdAt: new Date().toISOString(),
      };
      update((s) => ({ ...s, applications: [row, ...s.applications] }));
      return id;
    },
    reviewApplication: (id, status, note) => {
      if (!isAdminUser(state.user)) return;
      const app = state.applications.find((row) => row.id === id);
      if (!app) return;
      update((s) => {
        const applications = s.applications.map((row) => (row.id === id ? { ...row, status, note: note ?? row.note } : row));
        if (status !== "approved") return { ...s, applications };
        const now = new Date().toISOString();
        const sameUser = s.user && s.user.phone === app.userPhone;
        const roles = sameUser ? Array.from(new Set([...(s.user?.roles ?? []), app.kind])) : s.user?.roles;
        let realtorProfiles = s.realtorProfiles;
        let developerProfiles = s.developerProfiles;
        let dealerProfiles = s.dealerProfiles;
        if (app.kind === "realtor" && !realtorProfiles.some((row) => row.userPhone === app.userPhone)) {
          realtorProfiles = [
            {
              id: `realtor-${Date.now()}`,
              userPhone: app.userPhone,
              agencyName: app.companyName,
              phone: app.phone,
              cities: app.city,
              districts: app.districts,
              specialization: app.specialization,
              telegramChatId: "",
              verified: true,
              createdAt: now,
            },
            ...realtorProfiles,
          ];
        }
        if (app.kind === "developer" && !developerProfiles.some((row) => row.userPhone === app.userPhone)) {
          developerProfiles = [
            {
              id: `dev-${Date.now()}`,
              userPhone: app.userPhone,
              slug: slugify(app.companyName || app.userName),
              companyName: app.companyName || app.userName,
              description: "",
              logoUrl: "",
              phone: app.phone,
              website: app.website,
              telegramChatId: "",
              verified: true,
              verifiedAt: now,
              createdAt: now,
            },
            ...developerProfiles,
          ];
        }
        if (app.kind === "dealer" && !dealerProfiles.some((row) => row.userPhone === app.userPhone)) {
          dealerProfiles = [
            {
              id: `dealer-${Date.now()}`,
              userPhone: app.userPhone,
              slug: slugify(app.companyName || app.userName),
              companyName: app.companyName || app.userName,
              address: app.address,
              city: app.city,
              phone: app.phone,
              hours: app.hours,
              website: app.website,
              logoUrl: "",
              telegramChatId: "",
              verified: true,
              createdAt: now,
            },
            ...dealerProfiles,
          ];
        }
        return {
          ...s,
          applications,
          realtorProfiles,
          developerProfiles,
          dealerProfiles,
          user: sameUser && s.user ? { ...s.user, roles } : s.user,
        };
      });
    },
    setRealtorTelegram: (chatId) => {
      const user = state.user;
      if (!user) return;
      update((s) => ({
        ...s,
        realtorProfiles: s.realtorProfiles.map((row) => (row.userPhone === user.phone ? { ...row, telegramChatId: chatId } : row)),
      }));
    },
    setDeveloperTelegram: (chatId) => {
      const user = state.user;
      if (!user) return;
      update((s) => ({
        ...s,
        developerProfiles: s.developerProfiles.map((row) => (row.userPhone === user.phone ? { ...row, telegramChatId: chatId } : row)),
      }));
    },
    setDealerTelegram: (chatId) => {
      const user = state.user;
      if (!user) return;
      update((s) => ({
        ...s,
        dealerProfiles: s.dealerProfiles.map((row) => (row.userPhone === user.phone ? { ...row, telegramChatId: chatId } : row)),
      }));
    },
    patchDeveloperProfile: (patch) => {
      const user = state.user;
      if (!user) return;
      update((s) => ({
        ...s,
        developerProfiles: s.developerProfiles.map((row) => (row.userPhone === user.phone ? { ...row, ...patch } : row)),
      }));
    },
    patchDealerProfile: (patch) => {
      const user = state.user;
      if (!user) return;
      update((s) => ({
        ...s,
        dealerProfiles: s.dealerProfiles.map((row) => (row.userPhone === user.phone ? { ...row, ...patch } : row)),
      }));
    },
    saveComplex: (input) => {
      const user = state.user;
      if (!user || !hasRole(user, "developer")) return null;
      const profile = state.developerProfiles.find((row) => row.userPhone === user.phone);
      if (!profile) return null;
      const now = new Date().toISOString();
      const current = input.id ? state.complexes.find((row) => row.id === input.id) : undefined;
      if (current && current.developerId !== profile.id && !isAdminUser(user)) return null;
      const row: ResidentialComplex = {
        id: current?.id ?? `jk-${Date.now()}`,
        developerId: profile.id,
        name: input.name,
        slug: input.slug || slugify(input.name),
        city: input.city ?? current?.city ?? "bishkek",
        district: input.district ?? current?.district ?? "",
        address: input.address ?? current?.address ?? "",
        lat: input.lat ?? current?.lat ?? 42.8746,
        lng: input.lng ?? current?.lng ?? 74.5698,
        class: input.class ?? current?.class ?? "comfort",
        stage: input.stage ?? current?.stage ?? "under_construction",
        deadlineQuarter: input.deadlineQuarter ?? current?.deadlineQuarter,
        deadlineYear: input.deadlineYear ?? current?.deadlineYear,
        totalBuildings: input.totalBuildings ?? current?.totalBuildings ?? 1,
        description: input.description ?? current?.description ?? "",
        amenities: input.amenities ?? current?.amenities ?? [],
        coverUrl: input.coverUrl ?? current?.coverUrl ?? "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=70",
        gallery: input.gallery ?? current?.gallery ?? [],
        tourUrl: input.tourUrl ?? current?.tourUrl,
        isPublished: false,
        views: current?.views ?? 0,
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
      };
      update((s) => ({
        ...s,
        complexes: current ? s.complexes.map((item) => (item.id === row.id ? row : item)) : [row, ...s.complexes],
      }));
      return row;
    },
    setComplexUnits: (complexId, rows) => {
      const user = state.user;
      const complex = state.complexes.find((row) => row.id === complexId);
      const profile = state.developerProfiles.find((row) => row.userPhone === user?.phone);
      if (!user || !complex || !profile) return;
      if (complex.developerId !== profile.id && !isAdminUser(user)) return;
      update((s) => ({ ...s, complexUnits: createOrUpdateUnits(s.complexUnits, complexId, rows) }));
    },
    bumpComplexViews: (id) =>
      update((s) => ({
        ...s,
        complexes: s.complexes.map((row) => (row.id === id ? { ...row, views: row.views + 1 } : row)),
      })),
    submitLead: (input) => {
      if (input.honeypot) return { ok: true };
      if (!input.name.trim() || !kyrgyzPhoneOk(input.phone)) return { ok: false, error: "phone" };
      const last = state.partnerLeads.find((row) => row.phone === input.phone);
      if (last && Date.now() - new Date(last.createdAt).getTime() < 30000) return { ok: false, error: "rate" };
      const now = new Date().toISOString();
      const listing = input.listingId ? allListings.find((row) => row.id === input.listingId) : undefined;
      const lead: PartnerLead = {
        id: `lead-${Date.now()}`,
        source: input.source,
        complexId: input.complexId,
        unitId: input.unitId,
        listingId: input.listingId,
        developerId: input.developerId,
        realtorPhone: input.realtorPhone,
        dealerId: input.dealerId ?? listing?.dealerId,
        name: input.name.trim(),
        phone: input.phone.trim(),
        message: input.message ?? "",
        status: "new",
        createdAt: now,
      };
      const complex = input.complexId ? state.complexes.find((row) => row.id === input.complexId) : undefined;
      const developer = input.developerId
        ? state.developerProfiles.find((row) => row.id === input.developerId)
        : complex
          ? state.developerProfiles.find((row) => row.id === complex.developerId)
          : undefined;
      const realtor = input.realtorPhone ? state.realtorProfiles.find((row) => row.userPhone === input.realtorPhone) : undefined;
      const dealer = lead.dealerId ? state.dealerProfiles.find((row) => row.id === lead.dealerId) : undefined;
      const chatId = developer?.telegramChatId || realtor?.telegramChatId || dealer?.telegramChatId;
      const unit = input.unitId ? state.complexUnits.find((row) => row.id === input.unitId) : undefined;
      const text = [
        "Заявка Коңшу",
        complex ? `ЖК: ${complex.name}` : "",
        unit ? `Юнит: корп. ${unit.buildingLabel}, эт. ${unit.floor}, ${unit.rooms || "ст."} комн.` : "",
        input.listingId ? `Объявление: ${listing?.title ?? input.listingId}` : "",
        dealer ? `Автосалон: ${dealer.companyName}` : "",
        `${input.name.trim()}, ${input.phone.trim()}`,
        input.message,
      ]
        .filter(Boolean)
        .join("\n");
      update((s) => ({
        ...s,
        partnerLeads: [lead, ...s.partnerLeads],
        extraListings: input.listingId
          ? s.extraListings.map((item) => (item.id === input.listingId ? { ...item, leadCount: (item.leadCount ?? 0) + 1 } : item))
          : s.extraListings,
        listingEdits: input.listingId && !s.extraListings.some((item) => item.id === input.listingId)
          ? {
              ...s.listingEdits,
              [input.listingId]: {
                ...s.listingEdits[input.listingId],
                leadCount: (s.listingEdits[input.listingId]?.leadCount ?? 0) + 1,
              },
            }
          : s.listingEdits,
        telegramOutbox: chatId
          ? [{ id: `tg-${Date.now()}`, chatId, text, createdAt: now }, ...s.telegramOutbox].slice(0, 40)
          : s.telegramOutbox,
      }));
      return { ok: true };
    },
    setLeadStatus: (id, status) => {
      const user = state.user;
      if (!user) return;
      update((s) => ({
        ...s,
        partnerLeads: s.partnerLeads.map((row) => (row.id === id ? { ...row, status } : row)),
      }));
    },
    setUnitStatus: (id, status) => {
      const user = state.user;
      const unit = state.complexUnits.find((row) => row.id === id);
      const complex = unit ? state.complexes.find((row) => row.id === unit.complexId) : undefined;
      const profile = state.developerProfiles.find((row) => row.userPhone === user?.phone);
      if (!user || !unit || !complex || !profile) return;
      if (complex.developerId !== profile.id && !isAdminUser(user)) return;
      update((s) => ({
        ...s,
        complexUnits: s.complexUnits.map((row) => (row.id === id ? { ...row, status, updatedAt: new Date().toISOString() } : row)),
      }));
    },
    editListingToDraft: (listing) => {
      const photos = listing.photos.filter((url) => !url.startsWith("/sections/"));
      update((s) => ({
        ...s,
        draft: {
          ...defaultDraft(),
          name: s.user?.name ?? "",
          phone: s.user?.phone ?? "",
          id: listing.id,
          editing: true,
          editStatus: listing.status,
          // The edit keeps the listing's section; the guesser must not move it.
          categoryLocked: true,
          sectionPicked: true,
          section: listing.section,
          kind: listing.section === "rent" || listing.section === "stays" ? "rent" : "goods",
          title: listing.title,
          city: listing.city,
          price: listing.price ? String(listing.price) : "",
          priceNegotiable: !listing.price && listing.section !== "vacancies" && listing.section !== "services" && listing.section !== "restaurants" ? true : undefined,
          rooms: listing.rooms != null ? String(listing.rooms) : "",
          area: listing.area != null ? String(listing.area) : "",
          description: listing.description,
          promote: listing.status === "promoted",
          photo: photos[0],
          photos: photos.length ? photos : undefined,
          videoUrl: listing.videoUrl,
          voiceUrl: listing.voiceUrl,
          transcript: listing.transcript,
          mediaKind: listing.mediaKind ?? (listing.videoUrl ? "video" : "photos"),
          category: listing.category,
          goodsKind: listing.goodsKind,
          housingKind: listing.housingKind,
          dealKind: listing.dealKind,
          realtyGroup: listing.realtyGroup,
          realtySub: listing.realtySub,
          realtyKind: listing.realtyKind,
          sellerType: listing.sellerType,
          animalGroup: listing.animalGroup,
          animalKind: listing.animalKind,
          vehicleGroup: listing.vehicleGroup,
          vehicleType: listing.bodyKind,
          carMake: listing.carMake,
          carModel: listing.carModel,
          year: listing.year,
          mileage: listing.mileage,
          gearKind: listing.gearKind,
          techBrand: listing.techBrand,
          techModel: listing.techModel,
          serviceMode: listing.serviceMode,
          serviceArea: listing.serviceArea,
          priceFrom: listing.priceFrom,
          hours: listing.hours,
          address: listing.address,
          aiConfirmed: true,
          lat: listing.lat,
          lng: listing.lng,
          district: listing.district,
          meetupSpot: listing.meetupSpot,
          neighborPledge: listing.noAgent,
        },
        side: "sell",
      }));
    },
    duplicateListingToDraft: (listing) => {
      update((s) => ({
        ...s,
        draft: {
          ...s.draft,
          id: undefined,
          editing: false,
          editStatus: undefined,
          section: listing.section,
          kind: listing.section === "rent" || listing.section === "stays" ? "rent" : "goods",
          title: `${listing.title}`,
          city: listing.city,
          price: String(listing.price),
          rooms: listing.rooms != null ? String(listing.rooms) : "",
          area: listing.area != null ? String(listing.area) : "",
          description: listing.description,
          photo: listing.photos[0],
          category: listing.category,
          goodsKind: listing.goodsKind,
          housingKind: listing.housingKind,
          dealKind: listing.dealKind,
          realtyGroup: listing.realtyGroup,
          realtySub: listing.realtySub,
          realtyKind: listing.realtyKind,
          sellerType: listing.sellerType,
          vehicleGroup: listing.vehicleGroup,
          vehicleType: listing.bodyKind,
          carMake: listing.carMake,
          carModel: listing.carModel,
          year: listing.year,
          mileage: listing.mileage,
          gearKind: listing.gearKind,
          mediaKind: "photos",
          aiConfirmed: true,
          lat: listing.lat,
          lng: listing.lng,
          district: listing.district,
          meetupSpot: listing.meetupSpot,
        },
        side: "sell",
      }));
    },
    toggleRealtorVerified: (id) => {
      if (!isAdminUser(state.user)) return;
      update((s) => ({
        ...s,
        realtorProfiles: s.realtorProfiles.map((row) => (row.id === id ? { ...row, verified: !row.verified } : row)),
      }));
    },
    toggleDeveloperVerified: (id) => {
      if (!isAdminUser(state.user)) return;
      update((s) => ({
        ...s,
        developerProfiles: s.developerProfiles.map((row) =>
          row.id === id ? { ...row, verified: !row.verified, verifiedAt: !row.verified ? new Date().toISOString() : undefined } : row,
        ),
      }));
    },
    toggleDealerVerified: (id) => {
      if (!isAdminUser(state.user)) return;
      update((s) => {
        const current = s.dealerProfiles.find((row) => row.id === id);
        if (!current) return s;
        const verified = !current.verified;
        const listingEdits = { ...s.listingEdits };
        for (const item of SEED_DEALER_CARS) {
          if (item.dealerId !== id) continue;
          if (s.extraListings.some((row) => row.id === item.id)) continue;
          listingEdits[item.id] = { ...listingEdits[item.id], verified };
        }
        return {
          ...s,
          dealerProfiles: s.dealerProfiles.map((row) => (row.id === id ? { ...row, verified } : row)),
          extraListings: s.extraListings.map((item) => (item.dealerId === id ? { ...item, verified } : item)),
          listingEdits,
        };
      });
    },
    publishComplex: (id, published) => {
      if (!isAdminUser(state.user)) return;
      update((s) => ({
        ...s,
        complexes: s.complexes.map((row) => (row.id === id ? { ...row, isPublished: published, updatedAt: new Date().toISOString() } : row)),
      }));
    },
  };

  return (
    <Ctx.Provider value={value}>
      {ready ? (
        children
      ) : (
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#EDE7DC]">
          <BrandMark size={40} wordClass="text-[32px] text-ink" />
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp");
  return ctx;
}
