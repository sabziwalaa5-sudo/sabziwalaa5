-- CreateEnum
CREATE TYPE "StorefrontSectionType" AS ENUM ('CATEGORY', 'MANUAL', 'BEST_SELLERS', 'NEW_ARRIVALS', 'FEATURED', 'DEALS');

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorefrontSection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sectionType" "StorefrontSectionType" NOT NULL,
    "categoryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "maxProducts" INTEGER NOT NULL DEFAULT 12,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorefrontSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionProduct" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SectionProduct_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT,
ADD COLUMN "imageStoragePath" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_slug_key" ON "ProductCategory"("slug");
CREATE INDEX "ProductCategory_isActive_displayOrder_idx" ON "ProductCategory"("isActive", "displayOrder");

CREATE UNIQUE INDEX "StorefrontSection_slug_key" ON "StorefrontSection"("slug");
CREATE INDEX "StorefrontSection_isActive_displayOrder_idx" ON "StorefrontSection"("isActive", "displayOrder");

CREATE INDEX "SectionProduct_sectionId_idx" ON "SectionProduct"("sectionId");
CREATE INDEX "SectionProduct_productId_idx" ON "SectionProduct"("productId");
CREATE UNIQUE INDEX "SectionProduct_sectionId_productId_key" ON "SectionProduct"("sectionId", "productId");

CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StorefrontSection" ADD CONSTRAINT "StorefrontSection_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SectionProduct" ADD CONSTRAINT "SectionProduct_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "StorefrontSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SectionProduct" ADD CONSTRAINT "SectionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
