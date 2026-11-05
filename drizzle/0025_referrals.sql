-- Referral code, who invited whom, and a reward ledger. Commission-free week is a timestamp only.

ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "commission_free_until" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "referral_codes" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "code" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "referral_codes_code" UNIQUE ("code")
);

CREATE TABLE IF NOT EXISTS "referral_attributions" (
  "referred_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "referrer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "referral_attributions_not_self" CHECK ("referred_id" <> "referrer_id")
);

CREATE TABLE IF NOT EXISTS "referral_rewards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "referrer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "referred_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "kind" text NOT NULL,
  "shop_id" text,
  "amount_som" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "referral_rewards_kind" CHECK ("kind" IN ('courier', 'client', 'shop')),
  CONSTRAINT "referral_rewards_once" UNIQUE ("referred_id", "kind")
);
