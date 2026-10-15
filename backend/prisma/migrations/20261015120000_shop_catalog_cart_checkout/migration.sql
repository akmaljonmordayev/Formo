-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "categoryId" INTEGER;

-- AlterTable
ALTER TABLE "Kit" ADD COLUMN     "colorsLabel" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "printPrice" INTEGER NOT NULL DEFAULT 30000,
ADD COLUMN     "shirtPrice" INTEGER NOT NULL DEFAULT 99000,
ADD COLUMN     "shortsPrice" INTEGER NOT NULL DEFAULT 60000,
ADD COLUMN     "sizes" TEXT[] DEFAULT ARRAY['S', 'M', 'L', 'XL', 'XXL', '3XL']::TEXT[];

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "comment" TEXT,
ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "deliveryDate" DATE,
ADD COLUMN     "deliverySlot" TEXT,
ADD COLUMN     "discountSum" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentExpiresAt" TIMESTAMP(3),
ADD COLUMN     "subtotalSum" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteClub" (
    "userId" INTEGER NOT NULL,
    "clubId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteClub_pkey" PRIMARY KEY ("userId","clubId")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "kitId" INTEGER NOT NULL,
    "printName" TEXT,
    "printNumber" TEXT,
    "numberOnShorts" BOOLEAN NOT NULL DEFAULT false,
    "withShorts" BOOLEAN NOT NULL DEFAULT true,
    "shirtSize" TEXT NOT NULL,
    "shortsSize" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "apartment" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "kitId" INTEGER,
    "clubName" TEXT NOT NULL,
    "kitLabel" TEXT NOT NULL,
    "printName" TEXT,
    "printNumber" TEXT,
    "numberOnShorts" BOOLEAN NOT NULL DEFAULT false,
    "withShorts" BOOLEAN NOT NULL DEFAULT true,
    "shirtSize" TEXT NOT NULL,
    "shortsSize" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "CartItem_userId_idx" ON "CartItem"("userId");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "Club_categoryId_idx" ON "Club"("categoryId");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_deliveryDate_deliverySlot_idx" ON "Order"("deliveryDate", "deliverySlot");

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteClub" ADD CONSTRAINT "FavoriteClub_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteClub" ADD CONSTRAINT "FavoriteClub_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "Kit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "Kit"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Data: mavjud klublarning "league" qiymatlaridan kategoriyalar yaratiladi va klublar ularga bog'lanadi
INSERT INTO "Category" ("name", "slug", "updatedAt")
SELECT DISTINCT ON (slug) league, slug, CURRENT_TIMESTAMP
FROM (
    SELECT "league" AS league,
           trim(both '-' from regexp_replace(lower("league"), '[^a-z0-9]+', '-', 'g')) AS slug
    FROM "Club"
) s
WHERE slug <> ''
ORDER BY slug, league
ON CONFLICT DO NOTHING;

UPDATE "Club" AS cl
SET "categoryId" = c."id"
FROM "Category" c
WHERE c."slug" = trim(both '-' from regexp_replace(lower(cl."league"), '[^a-z0-9]+', '-', 'g'));

-- Data: eski buyurtmalarda mahsulot summasi = umumiy summa - yetkazish
UPDATE "Order" SET "subtotalSum" = GREATEST("totalSum" - "deliverySum", 0) WHERE "subtotalSum" = 0;
