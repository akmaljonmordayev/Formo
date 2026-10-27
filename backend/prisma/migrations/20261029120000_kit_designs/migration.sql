-- AlterEnum
ALTER TYPE "OrderProductType" ADD VALUE 'KIT_DESIGN';

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "kitDesignId" INTEGER;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "designSnapshot" JSONB,
ADD COLUMN     "kitDesignId" INTEGER;

-- CreateTable
CREATE TABLE "KitDesign" (
    "id" SERIAL NOT NULL,
    "designVersion" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "textColor" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "neck" TEXT NOT NULL DEFAULT 'round',
    "sponsorText" TEXT NOT NULL DEFAULT '',
    "backTopText" TEXT NOT NULL DEFAULT '',
    "crestImageUrl" TEXT,
    "sponsorImageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitDesign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KitDesign_isActive_sortOrder_idx" ON "KitDesign"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "OrderItem_kitDesignId_idx" ON "OrderItem"("kitDesignId");

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_kitDesignId_fkey" FOREIGN KEY ("kitDesignId") REFERENCES "KitDesign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_kitDesignId_fkey" FOREIGN KEY ("kitDesignId") REFERENCES "KitDesign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
