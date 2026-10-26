-- AlterTable
ALTER TABLE "TopUp" ADD COLUMN     "receiptTelegramUserId" TEXT,
ADD COLUMN     "receiptUniqueId" TEXT,
ADD COLUMN     "requestedAmount" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "TopUp_receiptUniqueId_key" ON "TopUp"("receiptUniqueId");
