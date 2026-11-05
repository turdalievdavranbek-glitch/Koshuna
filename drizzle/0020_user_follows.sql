-- User-to-user follows. New table only: existing rows are not rewritten.

CREATE TABLE IF NOT EXISTS "user_follows" (
  "follower_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "followee_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("follower_id", "followee_id"),
  CONSTRAINT "user_follows_no_self" CHECK ("follower_id" <> "followee_id")
);

CREATE INDEX IF NOT EXISTS "user_follows_followee_idx" ON "user_follows" ("followee_id");
