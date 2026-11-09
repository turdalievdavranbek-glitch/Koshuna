CREATE TABLE IF NOT EXISTS "listing_views" (
	"listing_id" text NOT NULL,
	"viewer_key" text NOT NULL,
	"day" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listing_views_listing_id_viewer_key_day_pk" PRIMARY KEY("listing_id","viewer_key","day")
);
--> statement-breakpoint
ALTER TABLE "listing_views" ADD CONSTRAINT "listing_views_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listing_views_day_idx" ON "listing_views" USING btree ("day");
