-- CreateEnum
CREATE TYPE "NotificationAudience" AS ENUM ('CLIENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER_CREATED', 'PAYMENT_APPROVED', 'PAYMENT_REJECTED', 'ORDER_DELIVERED', 'USER_REGISTERED', 'SYSTEM');

-- AlterTable
ALTER TABLE "ClientNotification" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PAYMENT_UNDER_REVIEW';

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "audience" "NotificationAudience" NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "orderId" TEXT,
    "targetTab" TEXT,
    "dedupeKey" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_recipientId_readAt_idx" ON "Notification"("recipientId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_createdAt_idx" ON "Notification"("recipientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_recipientId_dedupeKey_key" ON "Notification"("recipientId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill legacy client notifications into the unified table.
INSERT INTO "Notification" (
    "id",
    "recipientId",
    "audience",
    "type",
    "title",
    "message",
    "metadata",
    "orderId",
    "targetTab",
    "dedupeKey",
    "readAt",
    "createdAt"
)
SELECT
    cn."id",
    cn."userId" AS "recipientId",
    'CLIENT'::"NotificationAudience" AS "audience",
    CASE cn."type"
        WHEN 'ORDER_CREATED' THEN 'ORDER_CREATED'::"NotificationType"
        WHEN 'PAYMENT_APPROVED' THEN 'PAYMENT_APPROVED'::"NotificationType"
        WHEN 'PAYMENT_REJECTED' THEN 'PAYMENT_REJECTED'::"NotificationType"
        WHEN 'ORDER_DELIVERED' THEN 'ORDER_DELIVERED'::"NotificationType"
        WHEN 'USER_REGISTERED' THEN 'USER_REGISTERED'::"NotificationType"
        ELSE 'SYSTEM'::"NotificationType"
    END AS "type",
    cn."title",
    cn."message",
    cn."metadata",
    cn."orderId",
    NULL AS "targetTab",
    CONCAT('legacy-client-notification:', cn."id") AS "dedupeKey",
    cn."readAt",
    cn."createdAt"
FROM "ClientNotification" cn
ON CONFLICT ("recipientId", "dedupeKey") DO NOTHING;
