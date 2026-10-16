-- CreateEnum
CREATE TYPE "ClubType" AS ENUM ('CLUB', 'NATIONAL');

-- CreateEnum
CREATE TYPE "Continent" AS ENUM ('EUROPE', 'ASIA', 'AFRICA', 'AMERICA', 'OCEANIA');

-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "type" "ClubType" NOT NULL DEFAULT 'CLUB',
ADD COLUMN     "continent" "Continent";

-- CreateIndex
CREATE INDEX "Club_type_continent_idx" ON "Club"("type", "continent");
