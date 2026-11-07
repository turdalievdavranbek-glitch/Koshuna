-- Buyer limits and a pickup receipt. New columns and one partial index. Existing rows are not rewritten.

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "receipt_path" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "referral_discount_som" integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "orders_one_open_buyer"
  ON "orders" ("buyer_id")
  WHERE "status" IN ('new', 'accepted', 'assembled', 'assigned', 'picked_up', 'refused');
