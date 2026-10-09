import { shopSearchText, wordsHit } from "./catalog-words";
import { SECTIONS, SHOP_ART, homeTiles } from "./data";
import { isSectionVisible } from "./features";
import { searchRootPatch } from "./filter";
import { haversineKm, nearRadiusKm } from "./geo";
import { adminAreaById, adminAreaMatchesListing } from "./admin-areas";
import { listingInOblast } from "./places";
import { patchForSection } from "./section";
import { BRANCH_ALL, pathFromFilters, resolveBranch } from "./section-tree";
import { SHOP_CATEGORIES, isShopCategory, isShopKind, parentOfShopKind, publicShops, shopKindsOf, shopMatchesCategory } from "./shops";
import type { Dict } from "./i18n";
import type { Filters, Listing, SectionId, Shop } from "./types";

export type SearchTile = {
  id: string;
  label: (t: Dict) => string;
  art: string;
  section: SectionId;
  path: string[];
  href?: string;
};

export function sectionCover(id: SectionId): string {
  if (id === "shops") return SHOP_ART;
  return SECTIONS.find((item) => item.id === id)?.art ?? SHOP_ART;
}

/** Visible sections only. Vacancies, stays and «Айылы» stay hidden (Р-036, Р-130). */
export function rootSearchTiles(): SearchTile[] {
  return homeTiles()
    .filter((tile) => isSectionVisible(tile.id))
    .map((tile) => ({
      id: tile.id,
      label: (t) => (tile.id === "shops" ? t.shopNav : t.sectionNames[tile.id]),
      art: tile.art,
      section: tile.id,
      path: [],
    }));
}

/** Drop the section-page «all» marker so a group still shows its children. */
export function searchPath(filters: Filters): string[] {
  if (!filters.section) return [];
  if (filters.section === "shops") return shopPath(filters.category);
  const path = pathFromFilters(filters);
  if (path[path.length - 1] === BRANCH_ALL) return path.slice(0, -1);
  return path;
}

function shopPath(category: string | null): string[] {
  if (!category || category === "all") return [];
  if (isShopKind(category)) {
    const parent = parentOfShopKind(category);
    return parent ? [parent, category] : [category];
  }
  if (isShopCategory(category)) return [category];
  return [];
}

export type SearchLevel = {
  section: SectionId;
  path: string[];
  title: (t: Dict) => string;
  art: string;
  tiles: SearchTile[];
};

/**
 * One level of the search grid. Animals use existing groups (farm / plants / pets)
 * and kinds (cow, bull, sheep, horses, potato, carrot, …). Services include svc-tourism.
 */
export function searchLevel(filters: Filters): SearchLevel | null {
  const section = filters.section;
  if (!section || !isSectionVisible(section)) return null;
  const path = searchPath(filters);
  const art = sectionCover(section);
  if (section === "shops") return shopLevel(path, art);
  const id: SectionId = section === "car-rental" ? "cars" : section;
  const branch = resolveBranch(id, path);
  if (!branch) return null;
  return {
    section: id,
    path,
    title: branch.title,
    art,
    tiles: branch.options.map((option) => ({
      id: option.id,
      label: option.label,
      art,
      section: id,
      path: [...path, option.id],
      href: option.href,
    })),
  };
}

function shopLevel(path: string[], art: string): SearchLevel | null {
  if (!path.length) {
    return {
      section: "shops",
      path,
      title: (t) => t.shopNav,
      art,
      tiles: SHOP_CATEGORIES.map((id) => ({
        id,
        label: (t) => t.shopCats[id] ?? id,
        art,
        section: "shops",
        path: [id],
      })),
    };
  }
  const cat = path[0];
  if (!isShopCategory(cat)) return null;
  if (path.length === 1) {
    return {
      section: "shops",
      path,
      title: (t) => t.shopCats[cat] ?? cat,
      art,
      tiles: shopKindsOf(cat).map((id) => ({
        id,
        label: (t) => t.shopKinds[id] ?? id,
        art,
        section: "shops",
        path: [cat, id],
      })),
    };
  }
  const kind = path[1];
  if (path.length !== 2 || !isShopKind(kind)) return null;
  return {
    section: "shops",
    path,
    title: (t) => t.shopKinds[kind] ?? kind,
    art,
    tiles: [],
  };
}

export function patchForSearchTile(tile: SearchTile, prev: Filters): Partial<Filters> {
  if (tile.section === "shops") {
    const category = tile.path.length ? tile.path[tile.path.length - 1] : null;
    return { ...patchForSection("shops", prev), section: "shops", category };
  }
  const section = tile.section === "car-rental" ? "cars" : tile.section;
  const branch = resolveBranch(section, tile.path);
  return { ...patchForSection(section, prev), ...(branch?.patch ?? { section }) };
}

export function patchForSearchUp(section: SectionId, path: string[], prev: Filters): Partial<Filters> {
  if (!path.length) return searchRootPatch();
  const parent = path.slice(0, -1);
  if (section === "shops") {
    return {
      ...patchForSection("shops", prev),
      section: "shops",
      category: parent.length ? parent[parent.length - 1] : null,
    };
  }
  const branch = resolveBranch(section, parent);
  if (!branch) return searchRootPatch();
  return { ...patchForSection(section, prev), ...branch.patch };
}

const PRIVATE_STATUS = new Set(["draft", "withdrawn", "closed", "hidden", "expired"]);

/** Public cards only. Owner drafts, withdrawn and «На проверке» stay out, even for the owner. */
export function listingsForSearch(listings: Listing[], shops: Shop[]): Listing[] {
  const privateShop = new Set(
    shops.filter((shop) => shop.underReview === true || shop.status !== "active").map((shop) => shop.id),
  );
  return listings.filter((item) => {
    if (item.underReview) return false;
    if (PRIVATE_STATUS.has(item.status)) return false;
    if (item.shopId && privateShop.has(item.shopId)) return false;
    return true;
  });
}

export function shopInScope(shop: Shop, filters: Filters, city: string): boolean {
  if (filters.scope === "near") {
    if (filters.nearLat == null || filters.nearLng == null || shop.lat == null || shop.lng == null) return false;
    return haversineKm(filters.nearLat, filters.nearLng, shop.lat, shop.lng) <= nearRadiusKm();
  }
  if (filters.scope === "all") return true;
  const place = { city: shop.city, district: shop.district, settlement: undefined };
  if (filters.rayon && filters.rayon !== "any") {
    const area = adminAreaById(filters.rayon);
    if (area) return adminAreaMatchesListing(area, place);
  }
  if (filters.settlement && filters.settlement !== "any") return false;
  const cityKey = filters.city !== "all" ? filters.city : city;
  if (cityKey && cityKey !== "all") return shop.city === cityKey;
  if (filters.oblast && filters.oblast !== "any") return listingInOblast({ city: shop.city }, filters.oblast);
  return true;
}

/** Active points only. A query matches the name, kind or category label. */
export function pointsForSearch(shops: Shop[], filters: Filters, city: string, query: string): Shop[] {
  let list = publicShops(shops).filter((shop) => shopInScope(shop, filters, city));
  const q = query.trim();
  if (q) return list.filter((shop) => wordsHit(shopSearchText(shop), q));
  if (filters.section !== "shops") return [];
  const cat = filters.category;
  if (isShopCategory(cat) || isShopKind(cat)) {
    list = list.filter((shop) => shopMatchesCategory(shop, cat));
  }
  return list;
}
