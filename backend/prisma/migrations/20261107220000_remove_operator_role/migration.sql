-- OPERATOR roli butunlay olib tashlandi: huquqlari Superadmin paneliga ko'chdi
-- (sex/mijozlar bilan yozishma — admin/chat, admin/support — endi SUPERADMIN uchun).
-- Mavjud OPERATOR akkauntlar SUPERADMIN ga o'tkaziladi — kirish huquqi yo'qolmaydi.
UPDATE "User" SET "role" = 'SUPERADMIN' WHERE "role" = 'OPERATOR';

CREATE TYPE "Role_new" AS ENUM ('SUPERADMIN', 'TAILOR', 'USER');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
