-- Yetkazish narxini viloyat bo'yicha hisoblash: manzil viloyati va buyurtmadagi nusxasi
ALTER TABLE "Address" ADD COLUMN "region" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryRegion" TEXT;
