-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dailyCapacity" INTEGER;

-- CreateEnum
CREATE TYPE "OrderProductType" AS ENUM ('CLUB_KIT', 'CUSTOM_DESIGN');

-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('APP', 'WEB');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CLICK', 'PAYME', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'ACCEPTED', 'PRINTING', 'QUALITY_CHECK', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "InventoryProductType" AS ENUM ('TSHIRT', 'SHORTS');

-- CreateEnum
CREATE TYPE "PromocodeType" AS ENUM ('PERCENT', 'FIXED', 'FREE_SHIPPING');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CampaignChannel" AS ENUM ('PUSH', 'SMS', 'PUSH_SMS');

-- CreateEnum
CREATE TYPE "AuditCategory" AS ENUM ('ORDER', 'PAYMENT', 'USER', 'SETTING', 'CATALOG', 'SYSTEM');

-- CreateTable
CREATE TABLE "Club" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "markColor" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kit" (
    "id" SERIAL NOT NULL,
    "clubId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "bgColor" TEXT NOT NULL,
    "textColor" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Kit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "customerId" INTEGER,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "workshopId" INTEGER,
    "clubId" INTEGER,
    "kitLabel" TEXT,
    "productType" "OrderProductType" NOT NULL DEFAULT 'CLUB_KIT',
    "printName" TEXT,
    "printNumber" TEXT,
    "size" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalSum" INTEGER NOT NULL,
    "deliverySum" INTEGER NOT NULL DEFAULT 0,
    "channel" "OrderChannel" NOT NULL DEFAULT 'APP',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "promocodeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" SERIAL NOT NULL,
    "productType" "InventoryProductType" NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingItem" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "sub" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promocode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "type" "PromocodeType" NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "minSum" INTEGER,
    "usageCap" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promocode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "audience" TEXT NOT NULL,
    "channel" "CampaignChannel" NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "message" TEXT NOT NULL,
    "sentCount" INTEGER,
    "openedCount" INTEGER,
    "orderCount" INTEGER,
    "revenue" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "category" "AuditCategory" NOT NULL,
    "context" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Club_name_season_key" ON "Club"("name", "season");

-- CreateIndex
CREATE INDEX "Kit_clubId_idx" ON "Kit"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_code_key" ON "Order"("code");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_workshopId_idx" ON "Order"("workshopId");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_productType_color_size_key" ON "InventoryItem"("productType", "color", "size");

-- CreateIndex
CREATE UNIQUE INDEX "PricingItem_key_key" ON "PricingItem"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Promocode_code_key" ON "Promocode"("code");

-- CreateIndex
CREATE INDEX "AuditLog_category_idx" ON "AuditLog"("category");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Kit" ADD CONSTRAINT "Kit_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_promocodeId_fkey" FOREIGN KEY ("promocodeId") REFERENCES "Promocode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
