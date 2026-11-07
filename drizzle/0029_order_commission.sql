-- Live Коңшу commission, plus a snapshot on each order. Existing orders stay at 0.

CREATE TABLE IF NOT EXISTS "app_settings" (
  "key" text PRIMARY KEY,
  "value" text NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

INSERT INTO "app_settings" ("key", "value")
VALUES ('commission_percent', '0')
ON CONFLICT ("key") DO NOTHING;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "commission_percent" numeric(4,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "commission_som" integer NOT NULL DEFAULT 0;

ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_commission";
ALTER TABLE "orders" ADD CONSTRAINT "orders_commission" CHECK (
  "commission_percent" >= 0 AND "commission_percent" <= 50 AND "commission_som" >= 0
);
