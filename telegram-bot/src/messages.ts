import { esc, Lang } from './i18n';
import { ReplyMarkup } from './telegram';

/** Kirish oqimi matnlari (uz / ru / en). HTML rejimida faqat raqam/maska qo'yiladi — foydalanuvchi matni hech qachon */

export const RESEND_DATA = 'resend';

interface LoginTexts {
  sendContact: string;
  newCode: string;
  askContact: (maskedPhone: string) => string;
  invalidLink: string;
  notOwnContact: string;
  code: (code: string, maskedPhone: string, expiresInSec: number) => string;
  phoneMismatch: string;
  noChallenge: string;
  contactRequired: string;
  cooldown: (sec: number) => string;
  limit: string;
}

const minutes = (sec: number) => Math.max(1, Math.round(sec / 60));

const uz: LoginTexts = {
  sendContact: '📱 Raqamni yuborish',
  newCode: '🔁 Yangi kod',
  askContact: (maskedPhone) =>
    `Formo ilovasiga kirish so‘rovi: <b>${esc(maskedPhone)}</b>\n\n` +
    'Raqam sizniki ekanini tasdiqlash uchun pastdagi «📱 Raqamni yuborish» tugmasini bosing. ' +
    'Raqam faqat shu so‘rovni tekshirish uchun ishlatiladi.',
  invalidLink: 'Havola eskirgan yoki allaqachon ishlatilgan. Formo ilovasida qaytadan «Telegram orqali kirish» ni bosing.',
  notOwnContact: 'Iltimos, boshqa kontakt emas, pastdagi tugma orqali o‘zingizning raqamingizni yuboring.',
  code: (code, maskedPhone, expiresInSec) =>
    `🔐 Formo ilovasiga kirish kodi: <code>${esc(code)}</code>\n\n` +
    `Raqam: ${esc(maskedPhone)}\n` +
    `Kod ${minutes(expiresInSec)} daqiqa amal qiladi va faqat bir marta ishlatiladi.\n\n` +
    '⚠️ Kodni hech kimga bermang — Formo xodimlari uni hech qachon so‘ramaydi. ' +
    'Agar siz kirmoqchi bo‘lmasangiz, bu xabarni e’tiborsiz qoldiring.',
  phoneMismatch:
    'Bu Telegram akkauntidagi raqam ilovada kiritilgan raqamga mos kelmadi. ' +
    'Ilovada Telegram’dagi raqamingizni kiritib, qaytadan urinib ko‘ring.',
  noChallenge: 'Faol kirish so‘rovi topilmadi. Formo ilovasida «Telegram orqali kirish» tugmasini bosing.',
  contactRequired: 'Avval pastdagi tugma orqali raqamingizni tasdiqlang.',
  cooldown: (sec) => `Yangi kodni ${sec} soniyadan keyin so‘rashingiz mumkin.`,
  limit: 'Bu so‘rov uchun kodlar limiti tugadi. Ilovada qaytadan «Telegram orqali kirish» ni bosing.',
};

const ru: LoginTexts = {
  sendContact: '📱 Отправить номер',
  newCode: '🔁 Новый код',
  askContact: (maskedPhone) =>
    `Запрос на вход в приложение Formo: <b>${esc(maskedPhone)}</b>\n\n` +
    'Чтобы подтвердить, что номер ваш, нажмите кнопку «📱 Отправить номер» ниже. ' +
    'Номер используется только для проверки этого запроса.',
  invalidLink: 'Ссылка устарела или уже использована. Снова нажмите «Войти через Telegram» в приложении Formo.',
  notOwnContact: 'Пожалуйста, отправьте свой номер кнопкой ниже, а не чужой контакт.',
  code: (code, maskedPhone, expiresInSec) =>
    `🔐 Код для входа в приложение Formo: <code>${esc(code)}</code>\n\n` +
    `Номер: ${esc(maskedPhone)}\n` +
    `Код действует ${minutes(expiresInSec)} мин. и используется только один раз.\n\n` +
    '⚠️ Никому не сообщайте код — сотрудники Formo никогда его не спрашивают. ' +
    'Если вы не пытались войти, просто проигнорируйте это сообщение.',
  phoneMismatch:
    'Номер этого Telegram-аккаунта не совпадает с номером, введённым в приложении. ' +
    'Введите в приложении номер из Telegram и попробуйте снова.',
  noChallenge: 'Активный запрос на вход не найден. Нажмите «Войти через Telegram» в приложении Formo.',
  contactRequired: 'Сначала подтвердите номер кнопкой ниже.',
  cooldown: (sec) => `Новый код можно запросить через ${sec} сек.`,
  limit: 'Лимит кодов для этого запроса исчерпан. Снова нажмите «Войти через Telegram» в приложении.',
};

const en: LoginTexts = {
  sendContact: '📱 Share phone number',
  newCode: '🔁 New code',
  askContact: (maskedPhone) =>
    `Formo app sign-in request: <b>${esc(maskedPhone)}</b>\n\n` +
    'To confirm the number is yours, tap “📱 Share phone number” below. ' +
    'The number is used only to verify this request.',
  invalidLink: 'The link has expired or was already used. Tap “Sign in with Telegram” in the Formo app again.',
  notOwnContact: 'Please share your own number using the button below, not another contact.',
  code: (code, maskedPhone, expiresInSec) =>
    `🔐 Formo app sign-in code: <code>${esc(code)}</code>\n\n` +
    `Number: ${esc(maskedPhone)}\n` +
    `The code is valid for ${minutes(expiresInSec)} min and can be used only once.\n\n` +
    '⚠️ Never share this code — Formo staff will never ask for it. ' +
    'If you did not try to sign in, just ignore this message.',
  phoneMismatch:
    'The number of this Telegram account does not match the number entered in the app. ' +
    'Enter your Telegram number in the app and try again.',
  noChallenge: 'No active sign-in request found. Tap “Sign in with Telegram” in the Formo app.',
  contactRequired: 'First confirm your number using the button below.',
  cooldown: (sec) => `You can request a new code in ${sec} s.`,
  limit: 'The code limit for this request is reached. Tap “Sign in with Telegram” in the app again.',
};

export const LOGIN: Record<Lang, LoginTexts> = { uz, ru, en };

export const contactKeyboard = (lang: Lang): ReplyMarkup => ({
  keyboard: [[{ text: LOGIN[lang].sendContact, request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
});

export const resendKeyboard = (lang: Lang): ReplyMarkup => ({
  inline_keyboard: [[{ text: LOGIN[lang].newCode, callback_data: RESEND_DATA }]],
});

export const removeKeyboard: ReplyMarkup = { remove_keyboard: true };
