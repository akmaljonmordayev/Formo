-- Raqam almashtirish so'rovi faqat uni ochgan foydalanuvchiga tegishli (null — oddiy kirish so'rovi)
ALTER TABLE "TelegramAuthChallenge" ADD COLUMN "changeForUserId" INTEGER;
