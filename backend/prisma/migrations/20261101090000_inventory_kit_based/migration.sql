-- Zaxira endi erkin "rang" matni emas, haqiqiy klub formasiga (Kit) bog'lanadi.
-- Eski "color" ustunidagi qiymatlar (mavjud bo'lsa) tiklanmaydi — bu ustun mantiqan
-- butunlay almashtirilmoqda (blank mato rangi -> klub formasi).
ALTER TABLE "InventoryItem" ADD COLUMN "kitId" INTEGER;

DROP INDEX "InventoryItem_productType_color_size_key";

ALTER TABLE "InventoryItem" DROP COLUMN "color";

DELETE FROM "InventoryItem" WHERE "kitId" IS NULL;

ALTER TABLE "InventoryItem" ALTER COLUMN "kitId" SET NOT NULL;

CREATE UNIQUE INDEX "InventoryItem_productType_kitId_size_key" ON "InventoryItem"("productType", "kitId", "size");

CREATE INDEX "InventoryItem_kitId_idx" ON "InventoryItem"("kitId");

ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "Kit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
