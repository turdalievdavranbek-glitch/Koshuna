ALTER TABLE "threads" ADD COLUMN IF NOT EXISTS "buyer_cleared_at" timestamp with time zone;
ALTER TABLE "threads" ADD COLUMN IF NOT EXISTS "seller_cleared_at" timestamp with time zone;
