-- Refresh token rotatsiyasida oldingi xesh qisqa grace oynasida qabul qilinadi: javob tarmoqda yo'qolsa
-- yoki ikki so'rov/tab bir vaqtda yangilasa, sessiya o'g'irlik deb bekor qilinmasin.
ALTER TABLE "Session" ADD COLUMN "prevRefreshTokenHash" TEXT;
ALTER TABLE "Session" ADD COLUMN "rotatedAt" TIMESTAMP(3);
