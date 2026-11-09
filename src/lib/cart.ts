import type { Listing } from "./types";

const CART_CAP = 200;

export function savedCartIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const id of value) {
    if (typeof id !== "string" || !id || ids.includes(id)) continue;
    ids.push(id);
    if (ids.length >= CART_CAP) break;
  }
  return ids;
}

/** Guest rows stay in front. Server order follows. Ids already on the server are not sent again. */
export function mergeCartIds(local: readonly string[], server: readonly string[]): { ids: string[]; push: string[] } {
  const onServer = new Set(server);
  const push: string[] = [];
  for (const id of local) {
    if (!id || onServer.has(id) || push.includes(id)) continue;
    push.push(id);
  }
  const extras = new Set(push);
  const ids = [...push, ...server.filter((id) => id && !extras.has(id))].slice(0, CART_CAP);
  const kept = new Set(ids);
  return { ids, push: push.filter((id) => kept.has(id)) };
}

export type CartGroup = {
  id: string;
  title: string;
  listings: Listing[];
};

/** Shop listings share a group. A listing with no point goes under the personal label. */
export function groupCart(
  listings: Listing[],
  shops: { id: string; name: string }[],
  labels: { personal: string; point: string },
): CartGroup[] {
  const names = new Map(shops.map((shop) => [shop.id, shop.name.trim()]));
  const groups: CartGroup[] = [];
  const index = new Map<string, CartGroup>();
  for (const listing of listings) {
    const pointId = listing.shopId?.trim() ?? "";
    const key = pointId || "personal";
    let group = index.get(key);
    if (!group) {
      group = {
        id: key,
        title: pointId ? names.get(pointId) || labels.point : labels.personal,
        listings: [],
      };
      index.set(key, group);
      groups.push(group);
    }
    group.listings.push(listing);
  }
  return groups;
}
