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
import { DEFAULT_SAVED, DEFAULT_THREADS, LISTINGS } from "./data";
import { DICT } from "./i18n";
import type { AuthMethod, DraftListing, Filters, Lang, Listing, ListingLayout, SavedSearch, Thread, User } from "./types";

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
  threads: Thread[];
  pendingPath: string | null;
  notificationsOn: boolean;
  listingLayout: ListingLayout;
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
  threads: DEFAULT_THREADS,
  pendingPath: null,
  notificationsOn: true,
  listingLayout: "medium",
};

type Store = State & {
  t: (typeof DICT)["ru"];
  ready: boolean;
  allListings: Listing[];
  login: (input: { phone?: string; email?: string; method: AuthMethod; name?: string }) => void;
  logout: () => void;
  setLang: (lang: Lang) => void;
  setCity: (city: string) => void;
  setListingLayout: (layout: ListingLayout) => void;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
  toggleFav: (id: string) => boolean;
  isFav: (id: string) => boolean;
  requireAuth: (path: string) => boolean;
  setPendingPath: (path: string | null) => void;
  setDraft: (patch: Partial<DraftListing>) => void;
  publishDraft: () => Listing | null;
  saveDraft: () => void;
  addMessage: (threadId: string, text: string) => void;
  ensureThread: (listingId: string) => string;
  toggleSearchNotify: (id: string) => void;
  saveCurrentSearch: () => void;
  setNotificationsOn: (on: boolean) => void;
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
    localStorage.setItem(STORAGE, JSON.stringify(state));
  }, [state, ready]);

  const update = useCallback((patch: Partial<State> | ((s: State) => State)) => {
    setState((s) => (typeof patch === "function" ? patch(s) : { ...s, ...patch }));
  }, []);

  const t = DICT[state.lang];
  const allListings = useMemo(
    () => [...state.extraListings, ...LISTINGS],
    [state.extraListings],
  );

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
          joinedYear: 2024,
          verified: true,
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
    setLang: (lang) => update({ lang }),
    setListingLayout: (listingLayout) => update({ listingLayout }),
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
    setDraft: (patch) => update({ draft: { ...state.draft, ...patch } }),
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
        description: d.description || d.title,
        descriptionKy: d.description || d.title,
        descriptionEn: d.description || d.title,
        ownerId: "aida",
        verified: true,
        hasPhoto: true,
        noAgent: true,
        status: d.promote ? "promoted" : "active",
        safetyKind: d.kind === "rent" ? "home" : "goods",
        mapX: 40,
        mapY: 40,
        contact: "whatsapp",
        views: 0,
        favCount: 0,
      };
      update({ extraListings: [listing, ...state.extraListings] });
      return listing;
    },
    addMessage: (threadId, text) => {
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
                    from: "me",
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
            text: t.meetHome,
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
  };

  return (
    <Ctx.Provider value={value}>
      {ready ? (
        children
      ) : (
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#EDE7DC]">
          <span className="text-[40px] font-extrabold tracking-[-0.02em] text-[#17140F]">
            konshu<span className="text-[#B8452F]">●</span>
          </span>
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
