-- Mijoz yoqtirgan formalar (yurakcha): klub emas, aniq forma bo'yicha
CREATE TABLE "FavoriteKit" (
    "userId" INTEGER NOT NULL,
    "kitId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteKit_pkey" PRIMARY KEY ("userId","kitId")
);

CREATE INDEX "FavoriteKit_kitId_idx" ON "FavoriteKit"("kitId");

ALTER TABLE "FavoriteKit" ADD CONSTRAINT "FavoriteKit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FavoriteKit" ADD CONSTRAINT "FavoriteKit_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "Kit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
