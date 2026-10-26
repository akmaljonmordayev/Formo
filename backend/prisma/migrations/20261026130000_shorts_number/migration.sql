-- Shortikdagi raqam futbolka raqamidan farq qilishi mumkin (null — futbolka raqami ishlatiladi)
ALTER TABLE "CartItem" ADD COLUMN "shortsNumber" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "shortsNumber" TEXT;
