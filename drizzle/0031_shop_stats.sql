ALTER TABLE orders ADD COLUMN stock_applied boolean NOT NULL DEFAULT false;

CREATE TABLE shop_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id text NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  kind text NOT NULL,
  viewer_key text NOT NULL,
  day date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_events_kind CHECK (kind IN ('shop_view', 'call', 'whatsapp'))
);

CREATE UNIQUE INDEX shop_events_view_day ON shop_events (shop_id, kind, viewer_key, day) WHERE kind = 'shop_view';
CREATE INDEX shop_events_shop_day_idx ON shop_events (shop_id, day);
