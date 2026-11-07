-- When the courier accepted the rules. Nullable, so existing rows are not rewritten.

ALTER TABLE "courier_applications" ADD COLUMN IF NOT EXISTS "accepted_rules_at" timestamp with time zone;
