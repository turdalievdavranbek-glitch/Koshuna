-- Optional point greeting. Nullable, so existing rows are untouched.

ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "greeting_video" text;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "greeting_poster" text;
