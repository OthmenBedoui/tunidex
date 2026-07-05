ALTER TABLE "Order"
ADD COLUMN "couponCode" TEXT;

CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "minAmount" DOUBLE PRECISION,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT,
    "codeSnapshot" TEXT NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");
CREATE UNIQUE INDEX "CouponRedemption_couponId_orderId_key" ON "CouponRedemption"("couponId", "orderId");
CREATE INDEX "CouponRedemption_userId_idx" ON "CouponRedemption"("userId");

ALTER TABLE "CouponRedemption"
ADD CONSTRAINT "CouponRedemption_couponId_fkey"
FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CouponRedemption"
ADD CONSTRAINT "CouponRedemption_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CouponRedemption"
ADD CONSTRAINT "CouponRedemption_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
