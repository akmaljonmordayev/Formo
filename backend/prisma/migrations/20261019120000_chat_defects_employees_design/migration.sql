-- CreateEnum
CREATE TYPE "DefectReason" AS ENUM ('PRINT_SHIFT', 'FABRIC', 'WRONG_SIZE', 'OTHER');

-- CreateEnum
CREATE TYPE "DefectStatus" AS ENUM ('OPEN', 'RESOLVED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "shiftEnd" TEXT,
ADD COLUMN     "shiftStart" TEXT;

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "design" JSONB,
ALTER COLUMN "kitId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "design" JSONB;

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" SERIAL NOT NULL,
    "workshopId" INTEGER NOT NULL,
    "senderId" INTEGER,
    "fromWorkshop" BOOLEAN NOT NULL,
    "text" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectReport" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "workshopId" INTEGER NOT NULL,
    "reason" "DefectReason" NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "status" "DefectStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefectReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "workshopId" INTEGER NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatMessage_workshopId_id_idx" ON "ChatMessage"("workshopId", "id");

-- CreateIndex
CREATE INDEX "DefectReport_workshopId_idx" ON "DefectReport"("workshopId");

-- CreateIndex
CREATE INDEX "DefectReport_status_createdAt_idx" ON "DefectReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DefectReport_orderId_idx" ON "DefectReport"("orderId");

-- CreateIndex
CREATE INDEX "Employee_workshopId_idx" ON "Employee"("workshopId");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectReport" ADD CONSTRAINT "DefectReport_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectReport" ADD CONSTRAINT "DefectReport_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

