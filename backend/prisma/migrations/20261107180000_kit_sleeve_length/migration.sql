-- Forma turi: yengli/yengsiz o'rniga kalta yoki uzun yeng (mavjud formalar — kalta yeng)
ALTER TYPE "KitSleeve" RENAME VALUE 'SLEEVED' TO 'SHORT';
ALTER TYPE "KitSleeve" RENAME VALUE 'SLEEVELESS' TO 'LONG';
ALTER TABLE "Kit" ALTER COLUMN "sleeve" SET DEFAULT 'SHORT';
