ALTER TABLE "threads" ADD COLUMN "request_id" uuid;
--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_request_id_purchase_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "threads_request_shop" ON "threads" ("request_id", "shop_id") WHERE "request_id" IS NOT NULL AND "shop_id" IS NOT NULL;
