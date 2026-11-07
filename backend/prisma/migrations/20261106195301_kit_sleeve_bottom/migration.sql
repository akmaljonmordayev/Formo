-- CreateEnum
CREATE TYPE "KitSleeve" AS ENUM ('SLEEVED', 'SLEEVELESS');

-- CreateEnum
CREATE TYPE "KitBottom" AS ENUM ('SHORTS', 'PANTS');

-- AlterTable
ALTER TABLE "Kit" ADD COLUMN     "bottom" "KitBottom" NOT NULL DEFAULT 'SHORTS',
ADD COLUMN     "sleeve" "KitSleeve" NOT NULL DEFAULT 'SLEEVED';
