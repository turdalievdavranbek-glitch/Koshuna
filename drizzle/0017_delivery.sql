-- Delivery MVP. Additive only: new columns with constant defaults, new tables, no updates of existing rows.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_courier" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "courier_online" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "order_blocked" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "refusal_count" integer DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS "users_courier_online_idx" ON "users" ("is_courier") WHERE "is_courier" = true;

CREATE SEQUENCE IF NOT EXISTS "delivery_order_no" AS integer START WITH 1001 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS "delivery_cart" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "shop_id" text NOT NULL REFERENCES "shops"("id") ON DELETE CASCADE,
  "product_id" text NOT NULL,
  "qty" integer NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "delivery_cart_pkey" PRIMARY KEY ("user_id", "shop_id", "product_id"),
  CONSTRAINT "delivery_cart_qty" CHECK ("qty" > 0 AND "qty" <= 99)
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "public_no" integer NOT NULL DEFAULT nextval('delivery_order_no'),
  "buyer_id" uuid NOT NULL REFERENCES "users"("id"),
  "shop_id" text NOT NULL REFERENCES "shops"("id"),
  "courier_id" uuid REFERENCES "users"("id"),
  "status" text NOT NULL DEFAULT 'new',
  "address_text" text NOT NULL,
  "lat" double precision,
  "lng" double precision,
  "phone" text NOT NULL,
  "comment" text NOT NULL DEFAULT '',
  "items_total_som" integer NOT NULL,
  "delivery_fee_som" integer NOT NULL,
  "total_som" integer NOT NULL,
  "distance_km" double precision,
  "fee_flat" boolean NOT NULL DEFAULT false,
  "payment_method" text NOT NULL DEFAULT 'cash',
  "delivery_code" text NOT NULL,
  "code_fails" integer NOT NULL DEFAULT 0,
  "buyer_confirmed_at" timestamp with time zone,
  "shop_paid_at" timestamp with time zone,
  "cancel_reason" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "accepted_at" timestamp with time zone,
  "assembled_at" timestamp with time zone,
  "assigned_at" timestamp with time zone,
  "picked_at" timestamp with time zone,
  "delivered_at" timestamp with time zone,
  "rejected_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "refused_at" timestamp with time zone,
  "returned_at" timestamp with time zone,
  CONSTRAINT "orders_public_no" UNIQUE ("public_no"),
  CONSTRAINT "orders_status" CHECK ("status" in ('new','accepted','assembled','assigned','picked_up','delivered','rejected','cancelled','refused','returned')),
  CONSTRAINT "orders_payment" CHECK ("payment_method" = 'cash'),
  CONSTRAINT "orders_code" CHECK ("delivery_code" ~ '^[0-9]{4}$'),
  CONSTRAINT "orders_money" CHECK ("items_total_som" >= 0 AND "delivery_fee_som" >= 0 AND "total_som" >= 0)
);

ALTER SEQUENCE "delivery_order_no" OWNED BY "orders"."public_no";

CREATE INDEX IF NOT EXISTS "orders_shop_status_idx" ON "orders" ("shop_id", "status");
CREATE INDEX IF NOT EXISTS "orders_buyer_idx" ON "orders" ("buyer_id", "created_at");
CREATE INDEX IF NOT EXISTS "orders_courier_idx" ON "orders" ("courier_id");
CREATE UNIQUE INDEX IF NOT EXISTS "orders_one_active_courier" ON "orders" ("courier_id") WHERE "courier_id" IS NOT NULL AND "status" IN ('assigned', 'picked_up');
CREATE INDEX IF NOT EXISTS "orders_available_idx" ON "orders" ("created_at") WHERE "status" = 'assembled' AND "buyer_confirmed_at" IS NOT NULL AND "courier_id" IS NULL;

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "listing_id" text,
  "product_id" text NOT NULL,
  "title_snapshot" text NOT NULL,
  "price_som_snapshot" integer NOT NULL,
  "qty" integer NOT NULL,
  CONSTRAINT "order_items_qty" CHECK ("qty" > 0 AND "qty" <= 99),
  CONSTRAINT "order_items_price" CHECK ("price_som_snapshot" >= 0)
);

CREATE INDEX IF NOT EXISTS "order_items_order_idx" ON "order_items" ("order_id");

CREATE TABLE IF NOT EXISTS "courier_applications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "phone" text NOT NULL,
  "district" text NOT NULL,
  "transport" text NOT NULL,
  "passport_path" text NOT NULL,
  "selfie_path" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "reviewed_at" timestamp with time zone,
  "reviewer_id" uuid REFERENCES "users"("id"),
  CONSTRAINT "courier_applications_user" UNIQUE ("user_id"),
  CONSTRAINT "courier_applications_transport" CHECK ("transport" in ('car','moto','walk')),
  CONSTRAINT "courier_applications_status" CHECK ("status" in ('pending','approved','revoked'))
);

CREATE INDEX IF NOT EXISTS "courier_applications_status_idx" ON "courier_applications" ("status");
