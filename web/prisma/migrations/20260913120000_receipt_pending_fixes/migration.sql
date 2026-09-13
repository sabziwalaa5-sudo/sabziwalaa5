-- Coupon snapshot on orders + configurable business logo
ALTER TABLE "Order" ADD COLUMN "couponCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "couponDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE "PlatformSettings" ADD COLUMN "businessLogoUrl" TEXT;
