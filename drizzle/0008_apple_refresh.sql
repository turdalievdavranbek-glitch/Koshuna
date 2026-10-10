CREATE TABLE IF NOT EXISTS "apple_refresh_tokens" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "refresh_token" text NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
