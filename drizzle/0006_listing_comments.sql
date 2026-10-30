CREATE TABLE IF NOT EXISTS "listing_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" text NOT NULL,
	"author_id" uuid NOT NULL,
	"parent_id" uuid,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"under_review" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing_comments" ADD CONSTRAINT "listing_comments_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "listing_comments" ADD CONSTRAINT "listing_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "listing_comments" ADD CONSTRAINT "listing_comments_parent_id_listing_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."listing_comments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listing_comments_listing_idx" ON "listing_comments" USING btree ("listing_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listing_comments_author_idx" ON "listing_comments" USING btree ("author_id","created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listing_comment_likes" (
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listing_comment_likes_comment_id_user_id_pk" PRIMARY KEY("comment_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "listing_comment_likes" ADD CONSTRAINT "listing_comment_likes_comment_id_listing_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."listing_comments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "listing_comment_likes" ADD CONSTRAINT "listing_comment_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "comment_id" uuid;
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_comment_id_listing_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."listing_comments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reports_comment_idx" ON "reports" USING btree ("comment_id");
--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_one_target";
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_one_target" CHECK ((("listing_id" is not null)::int + ("shop_id" is not null)::int + ("target_user_id" is not null)::int + ("comment_id" is not null)::int) = 1);
