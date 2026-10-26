-- CreateEnum
CREATE TYPE "TelegramMessageStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "TelegramAuthChallenge" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "startTokenHash" TEXT NOT NULL,
    "telegramUserId" TEXT,
    "chatId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "codeHash" TEXT,
    "codeExpiresAt" TIMESTAMP(3),
    "codeSentAt" TIMESTAMP(3),
    "codeSends" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "ip" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramAuthChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramAccount" (
    "userId" INTEGER NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "chatId" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramAccount_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "TelegramOutbox" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "chatId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "status" "TelegramMessageStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "TelegramOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramAuthChallenge_startTokenHash_key" ON "TelegramAuthChallenge"("startTokenHash");

-- CreateIndex
CREATE INDEX "TelegramAuthChallenge_phone_createdAt_idx" ON "TelegramAuthChallenge"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "TelegramAuthChallenge_telegramUserId_claimedAt_idx" ON "TelegramAuthChallenge"("telegramUserId", "claimedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramAccount_telegramUserId_key" ON "TelegramAccount"("telegramUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramOutbox_dedupeKey_key" ON "TelegramOutbox"("dedupeKey");

-- CreateIndex
CREATE INDEX "TelegramOutbox_status_lockedUntil_idx" ON "TelegramOutbox"("status", "lockedUntil");

-- AddForeignKey
ALTER TABLE "TelegramAccount" ADD CONSTRAINT "TelegramAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

