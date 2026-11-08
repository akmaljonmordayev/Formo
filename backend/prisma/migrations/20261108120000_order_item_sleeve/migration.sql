-- Buyurtma qatori: buyurtma paytidagi forma turi (kalta / uzun yeng, shortik / shalvar) — sex aynan shuni tikadi
ALTER TABLE "OrderItem" ADD COLUMN "sleeve" "KitSleeve" NOT NULL DEFAULT 'SHORT';
ALTER TABLE "OrderItem" ADD COLUMN "bottom" "KitBottom" NOT NULL DEFAULT 'SHORTS';
