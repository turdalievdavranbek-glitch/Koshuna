-- Delivery guards. Nullable columns only: existing rows are not rewritten.

ALTER TABLE "delivery_cart" ADD COLUMN IF NOT EXISTS "price_som" integer;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "courier_wait_notified_at" timestamp with time zone;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "admin_flag" text;
