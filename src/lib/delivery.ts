/** Shared delivery types. Fee math stays on the server so the client cannot set the price. */

export const ORDER_STATUSES = [
  "new",
  "accepted",
  "assembled",
  "assigned",
  "picked_up",
  "delivered",
  "rejected",
  "cancelled",
  "refused",
  "returned",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const COURIER_TRANSPORTS = ["car", "moto", "walk"] as const;
export type CourierTransport = (typeof COURIER_TRANSPORTS)[number];

export type FeeQuote = {
  feeSom: number;
  km: number | null;
  flat: boolean;
  baseSom: number;
  perKmSom: number;
  tooFar?: boolean;
};

export type CartProblem = { title: string; kind: "price" | "gone" | "stock"; from?: number; to?: number };

export type CartLine = {
  productId: string;
  title: string;
  unit: string;
  priceSom: number;
  qty: number;
  photo?: string;
  kind?: string;
  /** Price stored when the line was added. Differs from priceSom after the shop edits it. */
  listedSom?: number | null;
  changed?: boolean;
  unavailable?: boolean;
};

export type CartShop = {
  shopId: string;
  name: string;
  place: string;
  lines: CartLine[];
  itemsTotalSom: number;
  quote: FeeQuote;
  /** Shop is hidden, withdrawn, or gone. Checkout is closed. */
  closed?: boolean;
};

export type OrderItemView = {
  id: string;
  productId: string;
  title: string;
  priceSom: number;
  qty: number;
};

export type OrderRole = "buyer" | "shop" | "courier";

export type OrderView = {
  id: string;
  no: number;
  status: OrderStatus;
  role: OrderRole;
  shopId: string;
  shopName: string;
  shopPlace: string;
  shopPhone: string | null;
  buyerName: string;
  buyerPhone: string | null;
  address: string;
  comment: string;
  items: OrderItemView[];
  itemsTotalSom: number;
  deliveryFeeSom: number;
  /** Som taken off the fee for a referred client's first order. */
  discountSom: number;
  totalSom: number;
  hasReceipt: boolean;
  km: number | null;
  flatFee: boolean;
  buyerConfirmed: boolean;
  shopPaid: boolean;
  /** Present only for the buyer, and only while the courier still needs it. */
  deliveryCode: string | null;
  /** Wrong code entered too many times. The admin is told. The code stays hidden. */
  codeLocked?: boolean;
  createdAt: string;
};

export type CourierOffer = {
  id: string;
  no: number;
  shopName: string;
  shopPlace: string;
  feeSom: number;
  itemsTotalSom: number;
  km: number | null;
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isCourierTransport(value: string): value is CourierTransport {
  return (COURIER_TRANSPORTS as readonly string[]).includes(value);
}

export function formatKm(km: number): string {
  return (Math.round(km * 10) / 10).toFixed(1).replace(".", ",");
}

const SHOP_ID = /^shop-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isShopId(value: string): boolean {
  return SHOP_ID.test(value);
}

export function isProductId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,80}$/.test(value);
}

export function readPoint(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const a = typeof lat === "number" ? lat : typeof lat === "string" && lat.trim() ? Number(lat) : NaN;
  const b = typeof lng === "number" ? lng : typeof lng === "string" && lng.trim() ? Number(lng) : NaN;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < -90 || a > 90 || b < -180 || b > 180) return null;
  return { lat: a, lng: b };
}
