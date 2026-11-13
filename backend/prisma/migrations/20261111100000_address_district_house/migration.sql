-- Aniq manzil: tuman (viloyat ichida) va uy raqami alohida saqlanadi; buyurtmada tuman va xarita nuqtasi nusxasi —
-- admin panel "Sergeli tumani, Madadkor mahallasi, 32-uy" + xaritadagi aniq nuqtani ko'radi.
ALTER TABLE "Address" ADD COLUMN "district" TEXT;
ALTER TABLE "Address" ADD COLUMN "house" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryDistrict" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryLat" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN "deliveryLng" DOUBLE PRECISION;
