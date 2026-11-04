-- Forma komplekt (futbolka + shortik) bitta narx bilan sotiladi: shortik narxi komplekt narxiga qo'shiladi
UPDATE "Kit" SET "shirtPrice" = "shirtPrice" + "shortsPrice", "shortsPrice" = 0 WHERE "shortsPrice" <> 0;

ALTER TABLE "Kit" ALTER COLUMN "shirtPrice" SET DEFAULT 159000;
ALTER TABLE "Kit" ALTER COLUMN "shortsPrice" SET DEFAULT 0;

-- 3D dizayn narx jadvali: "club.shorts" komplekt narxiga ("club.tshirt") qo'shilib, o'chiriladi
UPDATE "PricingItem" AS t
SET "price" = t."price" + s."price", "label" = 'Komplekt (futbolka + shortik)', "sub" = 'Bitta forma komplekti narxi'
FROM "PricingItem" AS s
WHERE t."key" = 'club.tshirt' AND s."key" = 'club.shorts';
DELETE FROM "PricingItem" WHERE "key" = 'club.shorts';

-- Zaxira komplekt bo'yicha yuritiladi (TSHIRT qatori = komplekt), alohida shortik qoldig'i endi ishlatilmaydi
DELETE FROM "InventoryItem" WHERE "productType" = 'SHORTS';
