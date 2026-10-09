import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().default(""),
  phone: text("phone"),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  lang: text("lang").notNull().default("ru"),
  oblast: text("oblast"),
  city: text("city"),
  district: text("district"),
  lastLat: doublePrecision("last_lat"),
  lastLng: doublePrecision("last_lng"),
  isAdmin: boolean("is_admin").notNull().default(false),
  bannedAt: ts("banned_at"),
  deletedAt: ts("deleted_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const userAuth = pgTable(
  "user_auth",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("user_auth_provider_uid").on(t.provider, t.providerUserId),
    check("user_auth_provider", sql`${t.provider} in ('demo','sms','telegram','google','apple','tiktok')`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  fcmToken: text("fcm_token").notNull().unique(),
  platform: text("platform"),
  appVersion: text("app_version"),
  lang: text("lang"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
});

export const shops = pgTable(
  "shops",
  {
    id: text("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull().default(""),
    group: text("group").notNull().default("other"),
    kind: text("kind"),
    kindOther: text("kind_other"),
    city: text("city").notNull().default(""),
    district: text("district"),
    landmarks: text("landmarks").array().notNull().default(sql`'{}'::text[]`),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    hours: jsonb("hours"),
    photoUrl: text("photo_url"),
    hasDelivery: boolean("has_delivery").notNull().default(false),
    deliveryFree: boolean("delivery_free"),
    deliveryDistricts: text("delivery_districts").array().notNull().default(sql`'{}'::text[]`),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    telegram: text("telegram"),
    status: text("status").notNull().default("draft"),
    /** Auto-hidden after 3 reports. Public feeds skip it; the owner still sees it. */
    underReview: boolean("under_review").notNull().default(false),
    followersCount: integer("followers_count").notNull().default(0),
    lastPostedAt: ts("last_posted_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
    doc: jsonb("doc").notNull(),
  },
  (t) => [
    check("shops_status", sql`${t.status} in ('draft','active','withdrawn','hidden')`),
    index("shops_under_review_idx").on(t.underReview),
  ],
);

export const listings = pgTable(
  "listings",
  {
    id: text("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    shopId: text("shop_id").references(() => shops.id, { onDelete: "cascade" }),
    shopProductId: text("shop_product_id"),
    section: text("section").notNull(),
    category: text("category"),
    subcategory: text("subcategory"),
    attrs: jsonb("attrs").notNull().default({}),
    title: text("title").notNull().default(""),
    description: text("description").notNull().default(""),
    origLang: text("orig_lang"),
    price: bigint("price", { mode: "number" }),
    priceType: text("price_type").notNull().default("fixed"),
    unit: text("unit"),
    oldPrice: bigint("old_price", { mode: "number" }),
    promoPercent: integer("promo_percent"),
    status: text("status").notNull().default("active"),
    /** Auto-hidden after 3 reports. Not a status: «Оставить» restores without guessing the old status. */
    underReview: boolean("under_review").notNull().default(false),
    soldAt: ts("sold_at"),
    expiresAt: ts("expires_at").notNull().default(sql`now() + interval '30 days'`),
    lastConfirmedAt: ts("last_confirmed_at"),
    reminderSentAt: ts("reminder_sent_at"),
    oblast: text("oblast"),
    city: text("city").notNull().default(""),
    district: text("district"),
    settlement: text("settlement"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    hasVideo: boolean("has_video").notNull().default(false),
    hasPhoto: boolean("has_photo").notNull().default(false),
    videoUrl: text("video_url"),
    videoSec: integer("video_sec"),
    voiceUrl: text("voice_url"),
    voiceSec: integer("voice_sec"),
    coverUrl: text("cover_url"),
    photos: text("photos").array().notNull().default(sql`'{}'::text[]`),
    views: integer("views").notNull().default(0),
    likes: integer("likes").notNull().default(0),
    dislikes: integer("dislikes").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check("listings_price_type", sql`${t.priceType} in ('fixed','negotiable')`),
    check(
      "listings_status",
      sql`${t.status} in ('active','promoted','reserved','closed','withdrawn','expired','hidden')`,
    ),
    index("listings_status_created_idx").on(t.status, t.createdAt),
    index("listings_city_idx").on(t.city),
    index("listings_section_idx").on(t.section),
    index("listings_owner_idx").on(t.ownerId),
    index("listings_shop_idx").on(t.shopId),
    index("listings_price_idx").on(t.price),
    index("listings_under_review_idx").on(t.underReview),
  ],
);

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: text("listing_id").references(() => listings.id, { onDelete: "cascade" }),
    shopId: text("shop_id").references(() => shops.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    path: text("path").notNull().default(""),
    url: text("url").notNull().default(""),
    mime: text("mime").notNull().default(""),
    size: bigint("size", { mode: "number" }).notNull().default(0),
    received: bigint("received", { mode: "number" }).notNull().default(0),
    durationSec: real("duration_sec"),
    width: integer("width"),
    height: integer("height"),
    sort: integer("sort").notNull().default(0),
    uploadStatus: text("upload_status").notNull().default("uploading"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    check("media_kind", sql`${t.kind} in ('photo','video','voice','poster')`),
    check("media_upload_status", sql`${t.uploadStatus} in ('uploading','ready','failed')`),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    shopId: text("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.shopId] })],
);

export const cartItems = pgTable(
  "cart_items",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    addedAt: ts("added_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.listingId] })],
);

export const reactions = pgTable(
  "reactions",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.listingId] }),
    check("reactions_value", sql`${t.value} in ('like','dislike')`),
  ],
);

export const blocks = pgTable(
  "blocks",
  {
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedUserId: uuid("blocked_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedUserId] })],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
    listingId: text("listing_id").references(() => listings.id, { onDelete: "cascade" }),
    shopId: text("shop_id").references(() => shops.id, { onDelete: "cascade" }),
    targetUserId: uuid("target_user_id").references(() => users.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    comment: text("comment"),
    status: text("status").notNull().default("new"),
    createdAt: ts("created_at").notNull().defaultNow(),
    handledAt: ts("handled_at"),
  },
  (t) => [
    check("reports_status", sql`${t.status} in ('new','hidden','dismissed')`),
    check(
      "reports_one_target",
      sql`((${t.listingId} is not null)::int + (${t.shopId} is not null)::int + (${t.targetUserId} is not null)::int) = 1`,
    ),
    index("reports_listing_idx").on(t.listingId),
    index("reports_shop_idx").on(t.shopId),
  ],
);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  listingId: text("listing_id"),
  shopId: text("shop_id"),
  textKey: text("text_key").notNull(),
  params: jsonb("params").notNull().default({}),
  createdAt: ts("created_at").notNull().defaultNow(),
  readAt: ts("read_at"),
  pushSentAt: ts("push_sent_at"),
  pushError: text("push_error"),
});

export const accountDeletions = pgTable(
  "account_deletions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    requestedAt: ts("requested_at").notNull().defaultNow(),
    source: text("source").notNull(),
    completedAt: ts("completed_at"),
  },
  (t) => [check("account_deletions_source", sql`${t.source} in ('app','web')`)],
);

/** Table only. The daily job is Шаг 24 (owner decision 2026-10-08). */
export const priceStats = pgTable(
  "price_stats",
  {
    category: text("category").notNull(),
    city: text("city").notNull(),
    unit: text("unit").notNull().default(""),
    n: integer("n").notNull().default(0),
    p25: numeric("p25"),
    median: numeric("median"),
    p75: numeric("p75"),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.category, t.city, t.unit] })],
);

export const appConfig = pgTable("app_config", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/** Table only. The hourly job and the client switch are Шаг 23 (owner decision 2026-10-08). */
export const circlePicks = pgTable(
  "circle_picks",
  {
    city: text("city").notNull(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
    computedAt: ts("computed_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.city, t.listingId] })],
);

export const threads = pgTable(
  "threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: text("listing_id").references(() => listings.id, { onDelete: "set null" }),
    shopId: text("shop_id"),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => users.id),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => users.id),
    requestId: uuid("request_id"),
    lastMessageAt: ts("last_message_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("threads_listing_buyer").on(t.listingId, t.buyerId),
    uniqueIndex("threads_request_shop")
      .on(t.requestId, t.shopId)
      .where(sql`${t.requestId} is not null and ${t.shopId} is not null`),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind").notNull().default("text"),
    text: text("text"),
    mediaUrl: text("media_url"),
    createdAt: ts("created_at").notNull().defaultNow(),
    readAt: ts("read_at"),
  },
  (t) => [check("messages_kind", sql`${t.kind} in ('text','voice','system')`)],
);

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => users.id),
    holdUntil: ts("hold_until").notNull(),
    status: text("status").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    confirmedAt: ts("confirmed_at"),
  },
  (t) => [
    check("reservations_status", sql`${t.status} in ('requested','confirmed','released','expired','cancelled')`),
  ],
);

export const purchaseRequests = pgTable("purchase_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => users.id),
  category: text("category").notNull(),
  kind: text("kind"),
  text: text("text").notNull(),
  quantity: numeric("quantity"),
  unit: text("unit"),
  city: text("city").notNull(),
  district: text("district"),
  deadline: ts("deadline"),
  needsDelivery: boolean("needs_delivery").notNull().default(false),
  status: text("status").notNull().default("open"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const purchaseOffers = pgTable("purchase_offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => purchaseRequests.id, { onDelete: "cascade" }),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  price: bigint("price", { mode: "number" }),
  createdAt: ts("created_at").notNull().defaultNow(),
});
