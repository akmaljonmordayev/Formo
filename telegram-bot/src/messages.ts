import { ReplyMarkup } from './telegram';

/** Bot matnlari (o'zbekcha). HTML rejimida faqat raqam/maska qo'yiladi — foydalanuvchi matni hech qachon */

export const RESEND_DATA = 'resend';

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const contactKeyboard: ReplyMarkup = {
  keyboard: [[{ text: '📱 Raqamni yuborish', request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

export const resendKeyboard: ReplyMarkup = {
  inline_keyboard: [[{ text: '🔁 Yangi kod', callback_data: RESEND_DATA }]],
};

export const removeKeyboard: ReplyMarkup = { remove_keyboard: true };

export const text = {
  welcome:
    'Formo botiga xush kelibsiz! ⚽️\n\n' +
    'Ilovaga kirish uchun Formo ilovasida telefon raqamingizni kiriting va «Telegram orqali kirish» tugmasini bosing — ' +
    'ilova sizni shu yerga qaytaradi.\n\n' +
    'Buyurtma holati haqidagi xabarlar ham shu yerga keladi. O‘chirish: /stop',

  welcomeLinked:
    'Formo botiga xush kelibsiz! ⚽️\n\nAkkauntingiz ulangan — buyurtma holati haqidagi xabarlar shu yerga keladi. O‘chirish: /stop',

  help:
    'Buyruqlar:\n' +
    '/start — boshlash va xabarlarni yoqish\n' +
    '/stop — buyurtma xabarlarini o‘chirish\n\n' +
    'Ilovaga kirish uchun Formo ilovasida «Telegram orqali kirish» tugmasini bosing.',

  askContact: (maskedPhone: string) =>
    `Formo ilovasiga kirish so‘rovi: <b>${esc(maskedPhone)}</b>\n\n` +
    'Raqam sizniki ekanini tasdiqlash uchun pastdagi «📱 Raqamni yuborish» tugmasini bosing. ' +
    'Raqam faqat shu so‘rovni tekshirish uchun ishlatiladi.',

  invalidLink: 'Havola eskirgan yoki allaqachon ishlatilgan. Formo ilovasida qaytadan «Telegram orqali kirish» ni bosing.',

  notOwnContact: 'Iltimos, boshqa kontakt emas, pastdagi tugma orqali o‘zingizning raqamingizni yuboring.',

  code: (code: string, maskedPhone: string, expiresInSec: number) =>
    `🔐 Formo ilovasiga kirish kodi: <code>${esc(code)}</code>\n\n` +
    `Raqam: ${esc(maskedPhone)}\n` +
    `Kod ${Math.max(1, Math.round(expiresInSec / 60))} daqiqa amal qiladi va faqat bir marta ishlatiladi.\n\n` +
    '⚠️ Kodni hech kimga bermang — Formo xodimlari uni hech qachon so‘ramaydi. ' +
    'Agar siz kirmoqchi bo‘lmasangiz, bu xabarni e’tiborsiz qoldiring.',

  phoneMismatch:
    'Bu Telegram akkauntidagi raqam ilovada kiritilgan raqamga mos kelmadi. ' +
    'Ilovada Telegram’dagi raqamingizni kiritib, qaytadan urinib ko‘ring.',

  noChallenge: 'Faol kirish so‘rovi topilmadi. Formo ilovasida «Telegram orqali kirish» tugmasini bosing.',

  contactRequired: 'Avval pastdagi tugma orqali raqamingizni tasdiqlang.',

  cooldown: (sec: number) => `Yangi kodni ${sec} soniyadan keyin so‘rashingiz mumkin.`,

  limit: 'Bu so‘rov uchun kodlar limiti tugadi. Ilovada qaytadan «Telegram orqali kirish» ni bosing.',

  stopped: 'Buyurtma xabarlari o‘chirildi. Qayta yoqish: /start',

  notLinked: 'Bu Telegram akkaunti hali Formo hisobiga ulanmagan.',

  failure: 'Texnik nosozlik yuz berdi. Birozdan keyin qayta urinib ko‘ring.',
};
