-- Kirish oqimida botda tanlangan til (uz | ru | en) — hisob ulanganda TelegramAccount.language ga yoziladi
ALTER TABLE "TelegramAuthChallenge" ADD COLUMN "language" TEXT;
