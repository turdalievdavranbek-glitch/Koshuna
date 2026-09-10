"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { persistableUrl } from "./blob-media";
import { channelsOf, parseSellerChannel } from "./channels";
import { DEFAULT_SAVED, DEFAULT_THREADS, GIS_CITIES, LISTINGS } from "./data";
import { DICT } from "./i18n";
import {
  type AuthMethod,
  type ChatMessage,
  type DraftListing,
  type Filters,
  type Lang,
  type Listing,
  type ListingLayout,
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
  type ViewerPlace,
} from "./types";
import { canReuseAssortment, emptyShopDraft, hydrateShop, isOwnShop, isShopKind, listingSectionForShop, parentOfShopKind, pruneShopKinds, validPrice } from "./shops";
import { parseViewerPlace } from "./strategy";
import { BrandMark } from "@/components/brand";

const STORAGE = "konshu-state-v1";

const defaultFilters = (): Filters => ({
  query: "",
  section: null,
  category: null,
  goodsKind: "any",
  housingType: "any",
  city: "all",
  priceMin: null,
  priceMax: null,
  rooms: [],
  bodyType: "any",
  gear: "any",
  photosOnly: false,
  verifiedOnly: false,
  noAgents: false,
  neighborOnly: false,
  videoOnly: false,
  sort: "new",
  checkIn: null,
  checkOut: null,
  dealType: "any",
  stockType: "any",
  autoType: "sale",
  carMake: "any",
  carModel: "any",
  techBrand: "any",
  techModel: "any",
  animalGroup: "pets",
  animalKind: "any",
  locLng: null,
  locLat: null,
  locLabel: null,
  settlement: "any",
  aiylOnly: false,
  priceDroppedOnly: false,
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
});

type State = {
  user: User | null;
  lang: Lang;
  city: string;
  filters: Filters;
  favouriteIds: string[];
  savedSearches: SavedSearch[];
  draft: DraftListing;
  extraListings: Listing[];
  listingEdits: Record<string, Partial<Listing>>;
  threads: Thread[];
  pendingPath: string | null;
  notificationsOn: boolean;
  listingLayout: ListingLayout;
  elderMode: boolean;
  viewedIds: string[];
  reports: Record<string, string>;
  viewerPlace: ViewerPlace;
  meetDeals: Record<string, MeetDeal>;
  shops: Shop[];
  shopDraft: ShopDraft | null;
};

const initial: State = {
  user: null,
  lang: "ru",
  city: "all",
  filters: defaultFilters(),
  favouriteIds: ["apt-sunny", "sofa-leather", "bike-blue", "camera-canon", "apt-osh", "house-karakol"],
  savedSearches: DEFAULT_SAVED,
  draft: defaultDraft(),
  extraListings: [],
  listingEdits: {},
  threads: DEFAULT_THREADS,
  pendingPath: null,
  notificationsOn: true,
  listingLayout: "medium",
  elderMode: false,
  viewedIds: [],
  reports: {},
  viewerPlace: "kyrgyzstan",
  meetDeals: {},
  shops: [],
  shopDraft: null,
};

type Store = State & {
  t: (typeof DICT)["ru"];
  ready: boolean;
  allListings: Listing[];
  login: (input: { phone?: string; email?: string; method: AuthMethod; name?: string }) => void;
  logout: () => void;
  linkCard: () => void;
  linkChannel: (channel: SellerChannel) => void;
  setLang: (lang: Lang) => void;
  setCity: (city: string) => void;
  setListingLayout: (layout: ListingLayout) => void;
  setElderMode: (on: boolean) => void;
  markViewed: (id: string) => void;
  reportListing: (id: string, reason: string) => void;
  setViewerPlace: (place: ViewerPlace) => void;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
  toggleFav: (id: string) => boolean;
  isFav: (id: string) => boolean;
  requireAuth: (path: string) => boolean;
  setPendingPath: (path: string | null) => void;
  setDraft: (patch: Partial<DraftListing>) => void;
  publishDraft: () => Listing | null;
  updateListing: (id: string, patch: Partial<Listing>) => void;
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
  saveDraft: () => void;
  addMessage: (threadId: string, text: string, from?: ChatMessage["from"]) => void;
  ensureThread: (listingId: string) => string;
  toggleSearchNotify: (id: string) => void;
  saveCurrentSearch: () => void;
  setNotificationsOn: (on: boolean) => void;
  startShopDraft: (id?: string) => ShopDraft | null;
  setShopDraft: (patch: Partial<ShopDraft>) => void;
  lockShopField: (key: keyof Shop) => void;
  saveShopDraft: () => Shop | null;
  publishShop: () => Promise<{ shop: Shop | null; error?: string }>;
  withdrawShop: (id: string) => Promise<{ error?: string }>;
  upsertShopProduct: (
    shopId: string,
    product: Partial<ShopProduct> & { title: string },
  ) => Promise<{ error?: string; product?: ShopProduct }>;
  updateShopProduct: (shopId: string, productId: string, patch: Partial<ShopProduct>) => Promise<{ error?: string }>;
  hideShopProduct: (shopId: string, productId: string) => void;
  publishProductListing: (shopId: string, productId: string) => Listing | { missing: string[] } | null;
  reportShop: (id: string, reason: string) => void;
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

function normalizeFilters(filters: Filters): Filters {
  if (filters.section === "car-rental") {
    return { ...filters, section: "cars", autoType: "rent" };
  }
  const next = migrateElectronicsCategory(filters);
  return {
    ...next,
    autoType: next.autoType === "rent" ? "rent" : "sale",
    goodsKind: next.goodsKind && next.goodsKind !== "any" ? next.goodsKind : "any",
    animalGroup: next.animalGroup === "farm" ? "farm" : "pets",
    animalKind: next.animalKind && next.animalKind !== "any" ? next.animalKind : "any",
    carMake: next.carMake && next.carMake !== "any" ? next.carMake : "any",
    carModel: next.carModel && next.carModel !== "any" ? next.carModel : "any",
    techBrand: next.techBrand && next.techBrand !== "any" ? next.techBrand : "any",
    techModel: next.techModel && next.techModel !== "any" ? next.techModel : "any",
    neighborOnly: Boolean(next.neighborOnly),
    aiylOnly: Boolean(next.aiylOnly),
    priceDroppedOnly: Boolean(next.priceDroppedOnly),
    videoOnly: Boolean(next.videoOnly),
    settlement: next.settlement && next.settlement !== "any" ? next.settlement : "any",
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
    if (!raw) return initial;
    const saved = JSON.parse(raw) as Partial<State>;
    return {
      ...initial,
      ...saved,
      listingLayout:
        saved.listingLayout === "large" || saved.listingLayout === "small" ? saved.listingLayout : "medium",
      viewedIds: Array.isArray(saved.viewedIds) ? saved.viewedIds.slice(0, 12) : [],
      reports: saved.reports && typeof saved.reports === "object" ? saved.reports : {},
      listingEdits: saved.listingEdits && typeof saved.listingEdits === "object" ? saved.listingEdits : {},
      meetDeals: saved.meetDeals && typeof saved.meetDeals === "object" ? saved.meetDeals : {},
      shops: Array.isArray(saved.shops) ? saved.shops.map((item) => hydrateShop(item as Shop)) : [],
      shopDraft: saved.shopDraft && typeof saved.shopDraft === "object" ? hydrateShop(saved.shopDraft as ShopDraft) : null,
      viewerPlace: parseViewerPlace(saved.viewerPlace),
      filters: normalizeFilters({ ...defaultFilters(), ...saved.filters }),
    };
  } catch {
    return initial;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(
      STORAGE,
      JSON.stringify({
        ...state,
        draft: {
          ...state.draft,
          videoUrl: persistableUrl(state.draft.videoUrl),
          voiceUrl: persistableUrl(state.draft.voiceUrl),
          photo: persistableUrl(state.draft.photo),
        },
        extraListings: state.extraListings.map((item) => ({
          ...item,
          videoUrl: persistableUrl(item.videoUrl),
          voiceUrl: persistableUrl(item.voiceUrl),
        })),
        shops: state.shops.map(persistShop),
        shopDraft: state.shopDraft ? persistShop(state.shopDraft) as ShopDraft : null,
      }),
    );
  }, [state, ready]);

  const update = useCallback((patch: Partial<State> | ((s: State) => State)) => {
    setState((s) => (typeof patch === "function" ? patch(s) : { ...s, ...patch }));
  }, []);

  const t = DICT[state.lang];
  const allListings = useMemo(() => {
    const extraIds = new Set(state.extraListings.map((item) => item.id));
    const merged = [...state.extraListings, ...LISTINGS.filter((item) => !extraIds.has(item.id))];
    return merged.map((item) => {
      const edit = state.listingEdits[item.id];
      return edit ? { ...item, ...edit } : item;
    });
  }, [state.extraListings, state.listingEdits]);

  const value: Store = {
    ...state,
    t,
    ready,
    allListings,
    login: ({ phone, email, method, name }) => {
      const clean = (phone ?? "").replace(/\D/g, "");
      const isAida = method === "sms" && (clean === "555123456" || clean === "");
      const displayName = name || (isAida ? "Аида" : "Давран");
      const displayPhone = phone
        ? phone.startsWith("+")
          ? phone
          : `+996 ${phone}`
        : "+996 555 12 34 56";
      update({
        user: {
          name: displayName,
          phone: displayPhone,
          email,
          method,
          linkedChannels: (() => {
            const ch = parseSellerChannel(method);
            return ch ? [ch] : [];
          })(),
          cardLinked: false,
          joinedYear: 2024,
          verified: method === "sms",
          rating: 4.9,
          views: 1284,
        },
        draft: {
          ...state.draft,
          name: displayName,
          phone: displayPhone,
        },
      });
    },
    logout: () => update({ user: null }),
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
    setLang: (lang) => update({ lang }),
    setListingLayout: (listingLayout) => update({ listingLayout }),
    setElderMode: (elderMode) =>
      update({ elderMode, listingLayout: elderMode ? "large" : "medium" }),
    setViewerPlace: (viewerPlace) => update({ viewerPlace }),
    markViewed: (id) =>
      update((s) => ({
        ...s,
        viewedIds: [id, ...s.viewedIds.filter((x) => x !== id)].slice(0, 12),
      })),
    reportListing: (id, reason) =>
      update((s) => ({
        ...s,
        reports: { ...s.reports, [id]: reason },
      })),
    setCity: (city) => update((s) => ({ ...s, city, filters: { ...s.filters, city } })),
    setFilters: (patch) => update((s) => ({ ...s, filters: { ...s.filters, ...patch } })),
    resetFilters: () =>
      update({
        filters: { ...defaultFilters(), city: "all" },
        city: "all",
      }),
    toggleFav: (id) => {
      if (!state.user) return false;
      const has = state.favouriteIds.includes(id);
      update({
        favouriteIds: has ? state.favouriteIds.filter((x) => x !== id) : [id, ...state.favouriteIds],
      });
      return true;
    },
    isFav: (id) => state.favouriteIds.includes(id),
    requireAuth: () => Boolean(state.user),
    setPendingPath: (path) => update({ pendingPath: path }),
    setDraft: (patch) => update((s) => ({ ...s, draft: { ...s.draft, ...patch } })),
    saveDraft: () => update({ draft: { ...state.draft } }),
    publishDraft: () => {
      const d = state.draft;
      if (!d.title.trim() || !d.price.trim()) return null;
      const listing: Listing = {
        id: `user-${Date.now()}`,
        section: d.section,
        category:
          d.section === "services"
            ? d.category ?? "repairs-finish"
            : d.section === "secondhand"
              ? d.category ?? "furniture"
              : d.section === "construction"
                ? d.category ?? "cement"
                : d.section === "restaurants"
                  ? d.category ?? "national"
                  : d.kind === "rent"
                    ? "rent"
                    : "furniture",
        goodsKind: d.section === "secondhand" ? d.goodsKind : undefined,
        housingKind: d.section === "rent" ? d.housingKind ?? "apartment" : undefined,
        animalGroup: d.section === "animals" ? d.animalGroup ?? "pets" : undefined,
        animalKind: d.section === "animals" ? d.animalKind : undefined,
        carMake: d.section === "cars" || d.section === "car-rental" ? d.carMake : undefined,
        carModel: d.section === "cars" || d.section === "car-rental" ? d.carModel : undefined,
        techBrand: d.section === "secondhand" ? d.techBrand : undefined,
        techModel: d.section === "secondhand" ? d.techModel : undefined,
        title: d.title,
        titleKy: d.title,
        titleEn: d.title,
        price: Number(d.price.replace(/\s/g, "")) || 0,
        unit: d.section === "car-rental" ? "day" : d.kind === "rent" ? "month" : undefined,
        city: d.city,
        postedAgo: "2h",
        rooms: d.rooms ? Number(d.rooms) : undefined,
        area: d.area ? Number(d.area) : undefined,
        photos: [d.photo || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=70"],
        photoCredit: "Demo",
        mediaKind: d.mediaKind ?? "photos",
        videoUrl: d.videoUrl,
        voiceUrl: d.voiceUrl,
        transcript: d.transcript,
        voiceText: d.transcript,
        voiceSec: d.transcript ? Math.max(8, Math.round(d.transcript.split(/\s+/).length / 2.4)) : undefined,
        description: d.description || d.transcript || d.title,
        descriptionKy: d.description || d.title,
        descriptionEn: d.description || d.title,
        ownerId: "aida",
        hasPhoto: true,
        verified: d.neighborPledge !== false,
        noAgent: d.neighborPledge !== false,
        status: d.promote ? "promoted" : "active",
        safetyKind: d.kind === "rent" ? "home" : "goods",
        mapX: 40,
        mapY: 40,
        contact: "whatsapp",
        views: 0,
        favCount: 0,
        lat: GIS_CITIES[d.city]?.lat,
        lng: GIS_CITIES[d.city]?.lng,
        meetupSpot: d.meetupSpot,
      };
      update({ extraListings: [listing, ...state.extraListings] });
      return listing;
    },
    updateListing: (id, patch) => {
      update((s) => {
        if (s.extraListings.some((item) => item.id === id)) {
          return {
            ...s,
            extraListings: s.extraListings.map((item) => (item.id === id ? { ...item, ...patch } : item)),
          };
        }
        return {
          ...s,
          listingEdits: { ...s.listingEdits, [id]: { ...s.listingEdits[id], ...patch } },
        };
      });
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
            text: listing?.safetyKind === "goods" ? t.meetGoods : t.meetHome,
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
    startShopDraft: (id) => {
      if (!state.user) return null;
      if (id) {
        const existing = state.shops.find((s) => s.id === id);
        if (!existing || !isOwnShop(existing, state.user)) return null;
        const draft: ShopDraft = { ...existing, locked: {}, pendingProducts: [] };
        update({ shopDraft: draft });
        return draft;
      }
      if (state.shopDraft && state.shopDraft.status !== "active" && isOwnShop(state.shopDraft, state.user)) {
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
      update((s) => {
        const prev = s.shops.find((item) => item.id === saved.id);
        const merged: Shop = {
          ...saved,
          products: [
            ...(prev?.products ?? []),
            ...saved.products.filter((row) => !(prev?.products ?? []).some((p) => p.id === row.id)),
          ],
        };
        return {
          ...s,
          shops: prev ? s.shops.map((item) => (item.id === saved.id ? merged : item)) : [merged, ...s.shops],
          shopDraft: { ...draft, ...merged },
        };
      });
      return saved;
    },
    publishShop: async () => {
      const user = state.user;
      const draft = state.shopDraft;
      if (!user) return { shop: null, error: "auth" };
      if (!draft || !isOwnShop(draft, user)) return { shop: null, error: "forbidden" };
      const shop: Shop = { ...draft, status: "active", updatedAt: new Date().toISOString(), aiConfirmed: true };
      try {
        const res = await fetch("/api/shops/validate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "publish", shop, ownerPhone: user.phone, ownerName: user.name }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!data.ok) return { shop: null, error: data.error || "forbidden" };
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
        return {
          ...s,
          shops: prev ? s.shops.map((item) => (item.id === shop.id ? merged : item)) : [merged, ...s.shops],
          shopDraft: { ...draft, ...merged },
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
        const res = await fetch("/api/shops/validate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "withdraw", shop: next, ownerPhone: user.phone, ownerName: user.name }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!data.ok) return { error: data.error || "forbidden" };
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
    upsertShopProduct: async (shopId, product) => {
      const user = state.user;
      const shop = state.shops.find((item) => item.id === shopId);
      if (!user) return { error: "auth" };
      if (!shop || !isOwnShop(shop, user)) return { error: "forbidden" };
      const price = product.price != null ? validPrice(product.price) : undefined;
      if (product.price != null && product.price !== 0 && price == null) return { error: "price" };
      const now = new Date().toISOString();
      const id = product.id || `sp-${Date.now()}`;
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
        photo: product.photo,
        videoUrl: product.videoUrl,
        category: parent,
        kind,
        price,
        currency: "KGS",
        unit: product.unit ?? "piece",
        stock: product.stock ?? "in",
        listingId: product.listingId,
        sourceId,
        priceFromPhoto: product.priceFromPhoto,
        published: product.published !== false,
        createdAt: product.createdAt ?? now,
        updatedAt: now,
      };
      try {
        const res = await fetch("/api/shops/validate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "upsert-product",
            shop,
            product: nextProduct,
            ownerPhone: user.phone,
            ownerName: user.name,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!data.ok) return { error: data.error || "forbidden" };
      } catch {
        return { error: "network" };
      }
      update((s) => ({
        ...s,
        shops: s.shops.map((item) =>
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
        ),
      }));
      return { product: nextProduct };
    },
    updateShopProduct: async (shopId, productId, patch) => {
      const user = state.user;
      const shop = state.shops.find((item) => item.id === shopId);
      const current = shop?.products.find((row) => row.id === productId);
      if (!user) return { error: "auth" };
      if (!shop || !current || !isOwnShop(shop, user)) return { error: "forbidden" };
      if ("price" in patch && patch.price != null && patch.price !== 0 && validPrice(patch.price) == null) return { error: "price" };
      const next = {
        ...current,
        ...patch,
        price: "price" in patch
          ? patch.price == null || patch.price === 0
            ? undefined
            : validPrice(patch.price)
          : current.price,
        updatedAt: new Date().toISOString(),
      };
      update((s) => {
        const shops = s.shops.map((item) =>
          item.id === shopId
            ? { ...item, updatedAt: next.updatedAt, products: item.products.map((row) => (row.id === productId ? next : row)) }
            : item,
        );
        let extraListings = s.extraListings;
        let listingEdits = s.listingEdits;
        if (next.listingId && next.price != null) {
          if (extraListings.some((item) => item.id === next.listingId)) {
            extraListings = extraListings.map((item) =>
              item.id === next.listingId
                ? { ...item, price: next.price as number, previousPrice: item.price > (next.price as number) ? item.price : item.previousPrice }
                : item,
            );
          } else {
            listingEdits = {
              ...listingEdits,
              [next.listingId]: { ...listingEdits[next.listingId], price: next.price as number },
            };
          }
        }
        return { ...s, shops, extraListings, listingEdits };
      });
      return {};
    },
    hideShopProduct: (shopId, productId) => {
      const user = state.user;
      const shop = state.shops.find((item) => item.id === shopId);
      const product = shop?.products.find((row) => row.id === productId);
      if (!user || !shop || !isOwnShop(shop, user)) return;
      update((s) => ({
        ...s,
        shops: s.shops.map((item) =>
          item.id === shopId
            ? {
                ...item,
                products: item.products.map((row) => (row.id === productId ? { ...row, published: false, updatedAt: new Date().toISOString() } : row)),
              }
            : item,
        ),
        extraListings: product?.listingId
          ? s.extraListings.map((item) => (item.id === product.listingId ? { ...item, status: "withdrawn" } : item))
          : s.extraListings,
      }));
    },
    publishProductListing: (shopId, productId) => {
      const user = state.user;
      const shop = state.shops.find((item) => item.id === shopId);
      const product = shop?.products.find((row) => row.id === productId);
      if (!user || !shop || !product || !isOwnShop(shop, user)) return null;
      if (shop.status !== "active") return { missing: ["category"] };
      const mapped = listingSectionForShop(product.category || shop.category, product.kind);
      const missing: string[] = [];
      if (!product.title.trim()) missing.push("name");
      if (product.price == null) missing.push("price");
      if (!mapped) missing.push("category");
      if (missing.length || !mapped) return { missing: missing.length ? missing : ["category"] };
      if (product.listingId) {
        const existing = state.extraListings.find((item) => item.id === product.listingId);
        if (existing) {
          update((s) => ({
            ...s,
            extraListings: s.extraListings.map((item) =>
              item.id === product.listingId
                ? { ...item, title: product.title, price: product.price as number, description: product.description || product.title, status: "active" }
                : item,
            ),
          }));
          return existing;
        }
      }
      const listing: Listing = {
        id: `shop-item-${product.id}`,
        section: mapped.section,
        category: mapped.category,
        title: product.title,
        titleKy: product.title,
        titleEn: product.title,
        price: product.price as number,
        city: shop.city,
        postedAgo: "2h",
        photos: [product.photo || shop.coverUrl || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=70"],
        photoCredit: shop.name,
        description: product.description || product.title,
        descriptionKy: product.description || product.title,
        descriptionEn: product.description || product.title,
        ownerId: "aida",
        shopId: shop.id,
        shopProductId: product.id,
        hasPhoto: true,
        verified: true,
        noAgent: true,
        status: "active",
        safetyKind: "goods",
        mapX: 40,
        mapY: 40,
        contact: shop.contacts.telegram ? "telegram" : "whatsapp",
        views: 0,
        favCount: 0,
        lat: shop.lat,
        lng: shop.lng,
        mediaKind: product.videoUrl ? "video" : "photos",
        videoUrl: product.videoUrl,
      };
      update((s) => ({
        ...s,
        extraListings: [listing, ...s.extraListings],
        shops: s.shops.map((item) =>
          item.id === shopId
            ? {
                ...item,
                products: item.products.map((row) => (row.id === productId ? { ...row, listingId: listing.id, published: true } : row)),
              }
            : item,
        ),
      }));
      return listing;
    },
    reportShop: (id, reason) =>
      update((s) => ({
        ...s,
        reports: { ...s.reports, [id]: reason },
      })),
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
