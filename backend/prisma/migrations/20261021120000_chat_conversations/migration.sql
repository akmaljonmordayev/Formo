-- Universal chat: Conversation + Message (ChatMessage o'rniga)

CREATE TABLE "Conversation" (
    "id" SERIAL NOT NULL,
    "userAId" INTEGER NOT NULL,
    "userBId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Conversation_pair_order_check" CHECK ("userAId" < "userBId")
);

CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "senderId" INTEGER,
    "text" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Conversation_userAId_lastMessageAt_idx" ON "Conversation"("userAId", "lastMessageAt");
CREATE INDEX "Conversation_userBId_lastMessageAt_idx" ON "Conversation"("userBId", "lastMessageAt");
CREATE INDEX "Conversation_orderId_idx" ON "Conversation"("orderId");
CREATE INDEX "Message_conversationId_id_idx" ON "Message"("conversationId", "id");

-- Takroriy suhbatlarning oldini olish (NULL lar Postgresda farqli hisoblanadi, shuning uchun partial indekslar)
CREATE UNIQUE INDEX "Conversation_pair_general_key" ON "Conversation"("userAId", "userBId") WHERE "orderId" IS NULL;
CREATE UNIQUE INDEX "Conversation_pair_order_key" ON "Conversation"("userAId", "userBId", "orderId") WHERE "orderId" IS NOT NULL;

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Eski yozishmalarni ko'chirish: har bir sex uchun bitta suhbat (birinchi OPERATOR bilan)
INSERT INTO "Conversation" ("userAId", "userBId", "lastMessageAt")
SELECT LEAST(c."workshopId", op.id), GREATEST(c."workshopId", op.id), MAX(c."createdAt")
FROM "ChatMessage" c
CROSS JOIN (SELECT id FROM "User" WHERE role = 'OPERATOR' ORDER BY id LIMIT 1) op
GROUP BY c."workshopId", op.id;

INSERT INTO "Message" ("conversationId", "senderId", "text", "readAt", "createdAt")
SELECT conv.id, c."senderId", c.text, c."readAt", c."createdAt"
FROM "ChatMessage" c
CROSS JOIN (SELECT id FROM "User" WHERE role = 'OPERATOR' ORDER BY id LIMIT 1) op
JOIN "Conversation" conv
  ON conv."userAId" = LEAST(c."workshopId", op.id)
 AND conv."userBId" = GREATEST(c."workshopId", op.id)
 AND conv."orderId" IS NULL
ORDER BY c.id;

DROP TABLE "ChatMessage";
