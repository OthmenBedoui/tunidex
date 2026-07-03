ALTER TABLE "Listing" ADD COLUMN "slug" TEXT;

UPDATE "Listing"
SET "slug" = regexp_replace(
  regexp_replace(
    lower(trim(coalesce("title", ''))),
    '[^a-z0-9]+',
    '-',
    'g'
  ),
  '(^-+|-+$)',
  '',
  'g'
);

UPDATE "Listing"
SET "slug" = 'product-' || substring("id" from 1 for 8)
WHERE "slug" IS NULL OR "slug" = '';

WITH duplicates AS (
  SELECT
    "id",
    "slug",
    row_number() OVER (PARTITION BY "slug" ORDER BY "createdAt", "id") AS row_num
  FROM "Listing"
)
UPDATE "Listing" AS listing
SET "slug" = duplicates."slug" || '-' || duplicates.row_num
FROM duplicates
WHERE listing."id" = duplicates."id"
  AND duplicates.row_num > 1;

ALTER TABLE "Listing" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Listing_slug_key" ON "Listing"("slug");
