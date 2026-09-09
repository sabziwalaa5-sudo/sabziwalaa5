-- Order receipts / invoices
ALTER TABLE "Order" ADD COLUMN "invoiceNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN "invoiceGeneratedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Order_invoiceNumber_key" ON "Order"("invoiceNumber");
CREATE INDEX "Order_invoiceNumber_idx" ON "Order"("invoiceNumber");

ALTER TABLE "OrderItem" ADD COLUMN "unit" TEXT;

ALTER TABLE "PlatformSettings" ADD COLUMN "businessName" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN "businessTagline" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN "businessAddress" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN "businessPhone" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN "businessEmail" TEXT;
ALTER TABLE "PlatformSettings" ADD COLUMN "businessGstin" TEXT;

CREATE TABLE "ReceiptCounter" (
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ReceiptCounter_pkey" PRIMARY KEY ("year")
);

-- Backfill invoice numbers for existing orders (per calendar year)
WITH numbered AS (
  SELECT
    id,
    EXTRACT(YEAR FROM "createdAt")::int AS yr,
    ROW_NUMBER() OVER (
      PARTITION BY EXTRACT(YEAR FROM "createdAt")
      ORDER BY "createdAt", id
    ) AS rn
  FROM "Order"
  WHERE "invoiceNumber" IS NULL
)
UPDATE "Order" o
SET
  "invoiceNumber" = 'SZ-' || n.yr || '-' || LPAD(n.rn::text, 6, '0'),
  "invoiceGeneratedAt" = COALESCE(o."createdAt", NOW())
FROM numbered n
WHERE o.id = n.id;

INSERT INTO "ReceiptCounter" ("year", "lastValue")
SELECT
  EXTRACT(YEAR FROM "createdAt")::int AS yr,
  COUNT(*)::int AS lastValue
FROM "Order"
WHERE "invoiceNumber" IS NOT NULL
GROUP BY EXTRACT(YEAR FROM "createdAt")::int
ON CONFLICT ("year") DO UPDATE
SET "lastValue" = GREATEST("ReceiptCounter"."lastValue", EXCLUDED."lastValue");
