-- One live offer per order. The courier has 45 seconds, then the next person is offered.

CREATE TABLE IF NOT EXISTS "order_offers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "courier_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "offered_at" timestamp with time zone NOT NULL DEFAULT now(),
  "expires_at" timestamp with time zone NOT NULL,
  "status" text NOT NULL DEFAULT 'offered',
  CONSTRAINT "order_offers_status" CHECK ("status" IN ('offered', 'accepted', 'declined', 'expired'))
);

CREATE INDEX IF NOT EXISTS "order_offers_order_idx" ON "order_offers" ("order_id");
CREATE INDEX IF NOT EXISTS "order_offers_courier_idx" ON "order_offers" ("courier_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "order_offers_one_live" ON "order_offers" ("order_id") WHERE "status" = 'offered';
