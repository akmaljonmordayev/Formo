-- Forma narxi endi o'lcham bo'yicha ham belgilanishi mumkin: { "S": 150000, "M": 150000, ... }.
-- Kiritilmagan o'lcham eski "shirtPrice"dan oladi — mavjud formalar standart "{}" bilan o'zgarishsiz ishlayveradi.
ALTER TABLE "Kit" ADD COLUMN "sizePrices" JSONB NOT NULL DEFAULT '{}';
