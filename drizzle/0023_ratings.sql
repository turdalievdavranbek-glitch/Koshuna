-- Stars, no-shows, courier pause / soft-ban, and a shop delivery switch.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "courier_paused_until" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "courier_pause_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "courier_soft_banned" boolean NOT NULL DEFAULT false;

ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "delivery_enabled" boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "delivery_ratings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "rater_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "courier_stars" integer,
  "shop_stars" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "delivery_ratings_order" UNIQUE ("order_id"),
  CONSTRAINT "delivery_ratings_stars" CHECK (
    ("courier_stars" IS NULL OR ("courier_stars" >= 1 AND "courier_stars" <= 5))
    AND ("shop_stars" IS NULL OR ("shop_stars" >= 1 AND "shop_stars" <= 5))
  )
);

CREATE TABLE IF NOT EXISTS "delivery_no_shows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "courier_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "delivery_no_shows_courier_idx" ON "delivery_no_shows" ("courier_id", "created_at");
