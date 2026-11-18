-- Mijoz "Buyurtmani qabul qildim" tugmasini bosgan vaqt
ALTER TABLE "Order" ADD COLUMN "receivedAt" TIMESTAMP(3);

-- Mobil ilova push tokenlari
CREATE TABLE "PushToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "language" TEXT NOT NULL DEFAULT 'uz',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");
CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Push xabarlar navbati
CREATE TABLE "PushOutbox" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "dedupeKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushOutbox_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PushOutbox_dedupeKey_key" ON "PushOutbox"("dedupeKey");
CREATE INDEX "PushOutbox_sentAt_attempts_idx" ON "PushOutbox"("sentAt", "attempts");
