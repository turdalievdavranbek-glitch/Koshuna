-- A dispute with an optional photo, and the moment a shop became verified.

ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "verified_at" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "delivery_disputes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "opener_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "text" text NOT NULL,
  "photo_path" text,
  "status" text NOT NULL DEFAULT 'escalated',
  "resolution" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "delivery_disputes_status" CHECK ("status" IN ('auto', 'escalated', 'closed'))
);

CREATE INDEX IF NOT EXISTS "delivery_disputes_status_idx" ON "delivery_disputes" ("status", "created_at");
