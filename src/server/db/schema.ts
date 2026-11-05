import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  date,
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
  /** Optional public Telegram username (no @), shown as a «Telegram» contact button. */
  telegram: text("telegram"),
  lastLat: doublePrecision("last_lat"),
  lastLng: doublePrecision("last_lng"),
  isAdmin: boolean("is_admin").notNull().default(false),
  /** «Мастер-аккаунт»: set by an admin. May run points for sellers; no personal daily limit. */
  isMaster: boolean("is_master").notNull().default(false),
  /** Approved courier. Set only when an admin approves the application. */
  isCourier: boolean("is_courier").notNull().default(false),
  /** «На линии»: receives a notice when a confirmed order is waiting. */
  courierOnline: boolean("courier_online").notNull().default(false),
  /** Working city id (CITIES). The courier changes it without a new review. */
  courierCity: text("courier_city"),
  /** Working district id (DISTRICTS) inside courier_city. Empty means the whole city. */
  courierDistrict: text("courier_district"),
  /** Two confirmed client refusals. The admin can clear this. */
  orderBlocked: boolean("order_blocked").notNull().default(false),
  refusalCount: integer("refusal_count").notNull().default(0),
  /** Set when a low rating or two no-shows pause the courier for 48 hours. */
  courierPausedUntil: ts("courier_paused_until"),
  courierPauseCount: integer("courier_pause_count").notNull().default(0),
  /** Three pauses. Only the owner clears this. */
  courierSoftBanned: boolean("courier_soft_banned").notNull().default(false),
  /** Presence: touched at most once a minute by any signed-in request. */
  lastSeenAt: ts("last_seen_at"),
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

/** FCM registration tokens for the native app. One row per token; logout deletes that row. */
export const pushTokens = pgTable(
  "push_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    platform: text("platform").notNull(),
    lastSeen: ts("last_seen").notNull().defaultNow(),
  },
  (t) => [
    check("push_tokens_platform", sql`${t.platform} in ('android','ios')`),
    index("push_tokens_user_idx").on(t.userId),
  ],
);

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
    /** False after too many shop cancellations. Checkout refuses delivery. */
    deliveryEnabled: boolean("delivery_enabled").notNull().default(true),
    /** Phone and a storefront photo are both on file. */
    verifiedAt: ts("verified_at"),
    /** Referred shop: 0% commission until this moment. No commission is charged yet. */
    commissionFreeUntil: ts("commission_free_until"),
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

/** Instagram-style follow between two accounts. A person cannot follow themselves. */
export const userFollows = pgTable(
  "user_follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followeeId: uuid("followee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followeeId] }),
    check("user_follows_no_self", sql`${t.followerId} <> ${t.followeeId}`),
    index("user_follows_followee_idx").on(t.followeeId),
  ],
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

/** One row per viewer per listing per day: the views counter never counts the same person twice a day. */
export const listingViews = pgTable(
  "listing_views",
  {
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    /** "u:<user id>" or "d:<anonymous device id>". */
    viewerKey: text("viewer_key").notNull(),
    day: date("day").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.listingId, t.viewerKey, t.day] }), index("listing_views_day_idx").on(t.day)],
);

/** Listing comments (Instagram-style, one reply level). Soft delete; 3 reporters hide for review. */
export const listingComments = pgTable(
  "listing_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => listingComments.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    editedAt: ts("edited_at"),
    deletedAt: ts("deleted_at"),
    underReview: boolean("under_review").notNull().default(false),
  },
  (t) => [
    index("listing_comments_listing_idx").on(t.listingId, t.createdAt),
    index("listing_comments_author_idx").on(t.authorId, t.createdAt),
  ],
);

export const listingCommentLikes = pgTable(
  "listing_comment_likes",
  {
    commentId: uuid("comment_id")
      .notNull()
      .references(() => listingComments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.commentId, t.userId] })],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
    listingId: text("listing_id").references(() => listings.id, { onDelete: "cascade" }),
    shopId: text("shop_id").references(() => shops.id, { onDelete: "cascade" }),
    targetUserId: uuid("target_user_id").references(() => users.id, { onDelete: "set null" }),
    commentId: uuid("comment_id").references(() => listingComments.id, { onDelete: "cascade" }),
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
      sql`((${t.listingId} is not null)::int + (${t.shopId} is not null)::int + (${t.targetUserId} is not null)::int + (${t.commentId} is not null)::int) = 1`,
    ),
    index("reports_listing_idx").on(t.listingId),
    index("reports_comment_idx").on(t.commentId),
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

/** Filled by the daily `price-stats` job (Шаг 24). Lookup key is category + city + unit. */
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

/** Hourly `circles` job writes the top 10 public videos per city. The client reads them from /api/circles. */
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
    /** «Удалить переписку» is per user: messages up to this moment are hidden for that side only. */
    buyerClearedAt: ts("buyer_cleared_at"),
    sellerClearedAt: ts("seller_cleared_at"),
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
    /** Sender changed the text. No push, unread unchanged. */
    editedAt: ts("edited_at"),
    /** Soft delete for both people: shown as «Сообщение удалено». */
    deletedAt: ts("deleted_at"),
  },
  (t) => [check("messages_kind", sql`${t.kind} in ('text','voice','system')`)],
);

/** One emoji reaction per user per chat message (Instagram-style). */
export const messageReactions = pgTable(
  "message_reactions",
  {
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ name: "message_reactions_pk", columns: [t.messageId, t.userId] })],
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

/** One line per shop product in the buyer's delivery cart. Favourites stay in cart_items. */
export const deliveryCart = pgTable(
  "delivery_cart",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    shopId: text("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    qty: integer("qty").notNull(),
    /** Price the buyer last saw. Checkout refuses to continue when the shop price moved. */
    priceSom: integer("price_som"),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.shopId, t.productId] }),
    check("delivery_cart_qty", sql`${t.qty} > 0 and ${t.qty} <= 99`),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicNo: integer("public_no").notNull().default(sql`nextval('delivery_order_no')`),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => users.id),
    shopId: text("shop_id")
      .notNull()
      .references(() => shops.id),
    courierId: uuid("courier_id").references(() => users.id),
    status: text("status").notNull().default("new"),
    addressText: text("address_text").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    phone: text("phone").notNull(),
    comment: text("comment").notNull().default(""),
    itemsTotalSom: integer("items_total_som").notNull(),
    deliveryFeeSom: integer("delivery_fee_som").notNull(),
    totalSom: integer("total_som").notNull(),
    distanceKm: doublePrecision("distance_km"),
    feeFlat: boolean("fee_flat").notNull().default(false),
    paymentMethod: text("payment_method").notNull().default("cash"),
    /** Private photo of the receipt, taken at pickup. */
    receiptPath: text("receipt_path"),
    /** Som taken off the delivery fee for a referred client's first order. */
    referralDiscountSom: integer("referral_discount_som").notNull().default(0),
    deliveryCode: text("delivery_code").notNull(),
    codeFails: integer("code_fails").notNull().default(0),
    /** Set once when nobody has taken a confirmed order in time, so the notice is not repeated. */
    courierWaitNotifiedAt: ts("courier_wait_notified_at"),
    /** stale_pickup: courier vanished after pickup. code_locked: too many wrong codes. */
    adminFlag: text("admin_flag"),
    /** Buyer «Подтвердить заказ». Couriers do not see the order until this is set. */
    buyerConfirmedAt: ts("buyer_confirmed_at"),
    /** Shop confirmed the courier paid for the goods at pickup. */
    shopPaidAt: ts("shop_paid_at"),
    cancelReason: text("cancel_reason"),
    createdAt: ts("created_at").notNull().defaultNow(),
    acceptedAt: ts("accepted_at"),
    assembledAt: ts("assembled_at"),
    assignedAt: ts("assigned_at"),
    pickedAt: ts("picked_at"),
    deliveredAt: ts("delivered_at"),
    rejectedAt: ts("rejected_at"),
    cancelledAt: ts("cancelled_at"),
    refusedAt: ts("refused_at"),
    returnedAt: ts("returned_at"),
  },
  (t) => [
    unique("orders_public_no").on(t.publicNo),
    check(
      "orders_status",
      sql`${t.status} in ('new','accepted','assembled','assigned','picked_up','delivered','rejected','cancelled','refused','returned')`,
    ),
    check("orders_payment", sql`${t.paymentMethod} = 'cash'`),
    check("orders_code", sql`${t.deliveryCode} ~ '^[0-9]{4}$'`),
    check("orders_money", sql`${t.itemsTotalSom} >= 0 and ${t.deliveryFeeSom} >= 0 and ${t.totalSom} >= 0`),
    index("orders_shop_status_idx").on(t.shopId, t.status),
    index("orders_buyer_idx").on(t.buyerId, t.createdAt),
    index("orders_courier_idx").on(t.courierId),
    uniqueIndex("orders_one_active_courier")
      .on(t.courierId)
      .where(sql`${t.courierId} is not null and ${t.status} in ('assigned','picked_up')`),
  ],
);

/** One latest GPS fix per order. Deleted when the order leaves assigned / picked up. */
export const orderTracks = pgTable("order_tracks", {
  orderId: uuid("order_id")
    .primaryKey()
    .references(() => orders.id, { onDelete: "cascade" }),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    listingId: text("listing_id"),
    productId: text("product_id").notNull(),
    titleSnapshot: text("title_snapshot").notNull(),
    priceSomSnapshot: integer("price_som_snapshot").notNull(),
    qty: integer("qty").notNull(),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    check("order_items_qty", sql`${t.qty} > 0 and ${t.qty} <= 99`),
    check("order_items_price", sql`${t.priceSomSnapshot} >= 0`),
  ],
);

/** Passport photos live outside the public media tree. Paths are relative to PRIVATE_MEDIA_DIR. */
export const courierApplications = pgTable(
  "courier_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    district: text("district").notNull(),
    transport: text("transport").notNull(),
    passportPath: text("passport_path").notNull(),
    selfiePath: text("selfie_path").notNull(),
    /** Set when the applicant checks «Согласен с правилами курьера». */
    acceptedRulesAt: ts("accepted_rules_at"),
    status: text("status").notNull().default("pending"),
    createdAt: ts("created_at").notNull().defaultNow(),
    reviewedAt: ts("reviewed_at"),
    reviewerId: uuid("reviewer_id").references(() => users.id),
  },
  (t) => [
    unique("courier_applications_user").on(t.userId),
    check("courier_applications_transport", sql`${t.transport} in ('car','moto','walk')`),
    check("courier_applications_status", sql`${t.status} in ('pending','approved','revoked')`),
    index("courier_applications_status_idx").on(t.status),
  ],
);

/** A 45-second offer to one online courier. One live row per order. */
export const orderOffers = pgTable(
  "order_offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    courierId: uuid("courier_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    offeredAt: ts("offered_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
    status: text("status").notNull().default("offered"),
  },
  (t) => [
    check("order_offers_status", sql`${t.status} in ('offered','accepted','declined','expired')`),
    index("order_offers_order_idx").on(t.orderId),
    index("order_offers_courier_idx").on(t.courierId, t.status),
    uniqueIndex("order_offers_one_live").on(t.orderId).where(sql`${t.status} = 'offered'`),
  ],
);

export const deliveryRatings = pgTable(
  "delivery_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    raterId: uuid("rater_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courierStars: integer("courier_stars"),
    shopStars: integer("shop_stars"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("delivery_ratings_order").on(t.orderId),
    check(
      "delivery_ratings_stars",
      sql`(${t.courierStars} is null or (${t.courierStars} >= 1 and ${t.courierStars} <= 5)) and (${t.shopStars} is null or (${t.shopStars} >= 1 and ${t.shopStars} <= 5))`,
    ),
  ],
);

export const deliveryNoShows = pgTable(
  "delivery_no_shows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courierId: uuid("courier_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("delivery_no_shows_courier_idx").on(t.courierId, t.createdAt)],
);

export const deliveryDisputes = pgTable(
  "delivery_disputes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    openerId: uuid("opener_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    photoPath: text("photo_path"),
    status: text("status").notNull().default("escalated"),
    resolution: text("resolution"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    check("delivery_disputes_status", sql`${t.status} in ('auto','escalated','closed')`),
    index("delivery_disputes_status_idx").on(t.status, t.createdAt),
  ],
);

export const referralCodes = pgTable("referral_codes", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const referralAttributions = pgTable(
  "referral_attributions",
  {
    referredId: uuid("referred_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    referrerId: uuid("referrer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [check("referral_attributions_not_self", sql`${t.referredId} <> ${t.referrerId}`)],
);

export const referralRewards = pgTable(
  "referral_rewards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referrerId: uuid("referrer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    referredId: uuid("referred_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    shopId: text("shop_id"),
    amountSom: integer("amount_som").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    check("referral_rewards_kind", sql`${t.kind} in ('courier','client','shop')`),
    unique("referral_rewards_once").on(t.referredId, t.kind),
  ],
);

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  text: text("text").notNull().default(""),
  topic: text("topic"),
  contact: text("contact"),
  userEmail: text("user_email"),
  pageUrl: text("page_url"),
  platform: text("platform"),
  appVersion: text("app_version"),
  photoData: text("photo_data"),
  voiceData: text("voice_data"),
  status: text("status").notNull().default("new"),
  createdAt: ts("created_at").notNull().defaultNow(),
});
