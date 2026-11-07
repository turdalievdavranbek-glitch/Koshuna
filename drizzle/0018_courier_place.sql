-- Courier working place. Nullable columns only: existing rows are left as they are.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "courier_city" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "courier_district" text;
