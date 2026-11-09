-- Stock bakery/bread art was stored as if it were the seller's photo.
-- Drop those paths. Real /media uploads stay attached.
UPDATE listings AS l
SET
  photos = cleaned.photos,
  cover_url = cleaned.cover_url,
  has_photo = COALESCE(array_length(cleaned.photos, 1), 0) > 0 OR l.video_url IS NOT NULL
FROM (
  SELECT
    id,
    COALESCE((
      SELECT array_agg(p ORDER BY ord)
      FROM unnest(photos) WITH ORDINALITY AS u(p, ord)
      WHERE p NOT LIKE '/shops/items/%'
    ), '{}') AS photos,
    CASE WHEN cover_url LIKE '/shops/items/%' THEN NULL ELSE cover_url END AS cover_url
  FROM listings
  WHERE EXISTS (SELECT 1 FROM unnest(photos) AS p WHERE p LIKE '/shops/items/%')
     OR cover_url LIKE '/shops/items/%'
) AS cleaned
WHERE l.id = cleaned.id;

UPDATE shops
SET doc = jsonb_set(
  doc,
  '{products}',
  (
    SELECT COALESCE(
      jsonb_agg(
        CASE
          WHEN COALESCE(product->>'photo', '') LIKE '/shops/items/%' THEN product - 'photo'
          ELSE product
        END
      ),
      '[]'::jsonb
    )
    FROM jsonb_array_elements(COALESCE(doc->'products', '[]'::jsonb)) AS product
  )
)
WHERE doc::text LIKE '%/shops/items/%';
