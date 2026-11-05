-- Latest courier fix for one open order. The row is deleted when the order closes.

CREATE TABLE IF NOT EXISTS "order_tracks" (
  "order_id" uuid PRIMARY KEY REFERENCES "orders"("id") ON DELETE CASCADE,
  "lat" double precision NOT NULL,
  "lng" double precision NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
