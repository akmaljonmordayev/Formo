-- Universal chat qaytarildi: ChatMessage tiklanadi, Conversation/Message olib tashlanadi

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

CREATE INDEX "ChatMessage_workshopId_id_idx" ON "ChatMessage"("workshopId", "id");

ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Operator ↔ sex yozishmalarini qaytarish (faqat TAILOR ishtirokchi bo'lgan suhbatlar)
INSERT INTO "ChatMessage" ("workshopId", "senderId", "fromWorkshop", "text", "readAt", "createdAt")
SELECT t.id, m."senderId", (m."senderId" = t.id), m."text", m."readAt", m."createdAt"
FROM "Message" m
JOIN "Conversation" c ON c.id = m."conversationId"
JOIN "User" t ON t.role = 'TAILOR' AND t.id IN (c."userAId", c."userBId")
JOIN "User" o ON o.role IN ('OPERATOR', 'SUPERADMIN') AND o.id IN (c."userAId", c."userBId")
WHERE c."orderId" IS NULL
ORDER BY m.id;

DROP TABLE "Message";
DROP TABLE "Conversation";
