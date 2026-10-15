ALTER TABLE "listings" ADD COLUMN "under_review" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "under_review" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE INDEX "listings_under_review_idx" ON "listings" USING btree ("under_review");
--> statement-breakpoint
CREATE INDEX "shops_under_review_idx" ON "shops" USING btree ("under_review");
--> statement-breakpoint
CREATE INDEX "reports_listing_idx" ON "reports" USING btree ("listing_id");
--> statement-breakpoint
CREATE INDEX "reports_shop_idx" ON "reports" USING btree ("shop_id");
