-- Parol bilan kirishda (/auth/login) hisob darajasidagi bloklash: IP-cheklov VPN/proksi bilan
-- chetlab o'tilishi mumkin, shuning uchun urinishlar hisobning o'zida ham sanaladi.
ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);
