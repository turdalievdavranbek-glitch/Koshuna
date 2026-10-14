CREATE TABLE IF NOT EXISTS "feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "text" text NOT NULL DEFAULT '',
  "topic" text,
  "contact" text,
  "page_url" text,
  "platform" text,
  "app_version" text,
  "photo_data" text,
  "voice_data" text,
  "status" text NOT NULL DEFAULT 'new',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "feedback_created_idx" ON "feedback" ("created_at" DESC);
