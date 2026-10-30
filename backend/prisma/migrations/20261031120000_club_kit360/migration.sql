-- Forma 360° suratlari to'plamiga bog'lash (src/kits/kit360.ts). Mavjud klublarga qiymat
-- `pnpm --filter @formo/backend kit360:backfill` bilan qo'yiladi (nom/kod variantlari bitta manbadan).
ALTER TABLE "Club" ADD COLUMN "kit360Id" TEXT;

CREATE UNIQUE INDEX "Club_kit360Id_key" ON "Club"("kit360Id");

-- Buyurtma qatori: buyurtma paytidagi Forma 360° to'plami (klub formasi uchun)
ALTER TABLE "OrderItem" ADD COLUMN "kit360Id" TEXT;
