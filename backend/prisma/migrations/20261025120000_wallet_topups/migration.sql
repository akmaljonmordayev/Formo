-- CreateEnum
CREATE TYPE "BalanceTxType" AS ENUM ('TOPUP', 'TOPUP_REVERSAL', 'ORDER_PAYMENT', 'ORDER_REFUND');

-- CreateEnum
CREATE TYPE "TopUpMethod" AS ENUM ('MANUAL_CARD', 'CLICK', 'PAYME');

-- CreateEnum
CREATE TYPE "TopUpStatus" AS ENUM ('PENDING', 'REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'BALANCE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "balance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "BalanceTransaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "BalanceTxType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "topUpId" INTEGER,
    "orderId" INTEGER,
    "actorId" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopUp" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "TopUpMethod" NOT NULL,
    "status" "TopUpStatus" NOT NULL DEFAULT 'PENDING',
    "receiptFileId" TEXT,
    "receiptSubmittedAt" TIMESTAMP(3),
    "providerTransId" TEXT,
    "providerState" INTEGER,
    "providerCreatedAt" TIMESTAMP(3),
    "createdOnProvider" TIMESTAMP(3),
    "performedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" INTEGER,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BalanceTransaction_userId_createdAt_idx" ON "BalanceTransaction"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BalanceTransaction_type_topUpId_key" ON "BalanceTransaction"("type", "topUpId");

-- CreateIndex
CREATE UNIQUE INDEX "BalanceTransaction_type_orderId_key" ON "BalanceTransaction"("type", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "TopUp_code_key" ON "TopUp"("code");

-- CreateIndex
CREATE INDEX "TopUp_status_createdAt_idx" ON "TopUp"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TopUp_userId_createdAt_idx" ON "TopUp"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TopUp_method_providerTransId_key" ON "TopUp"("method", "providerTransId");

-- AddForeignKey
ALTER TABLE "BalanceTransaction" ADD CONSTRAINT "BalanceTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopUp" ADD CONSTRAINT "TopUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Balans hech qachon manfiy bo'lmaydi (ilova xatosi bo'lsa ham)
ALTER TABLE "User" ADD CONSTRAINT "User_balance_nonnegative" CHECK ("balance" >= 0);
