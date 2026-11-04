/**
 * Menyu va balans matnlari (uz / ru / en). Kirish oqimi matnlari — messages.ts.
 * HTML rejimida faqat raqam, kod va esc() qilingan qiymatlar qo'yiladi.
 */

export type Lang = 'uz' | 'ru' | 'en';
export const LANGS: Lang[] = ['uz', 'ru', 'en'];
export const LANG_KEYBOARD_PREFIX = 'lang:';

/** Telegram language_code → bot tili (noma'lum bo'lsa o'zbekcha) */
export function langFromCode(code?: string | null): Lang {
  const c = (code ?? '').toLowerCase();
  if (c.startsWith('ru')) return 'ru';
  if (c.startsWith('en')) return 'en';
  return 'uz';
}

/** Birinchi /start: til hali noma'lum — savol uch tilda */
export const FIRST_LANGUAGE_PROMPT = 'Tilni tanlang 🇺🇿\nВыберите язык 🇷🇺\nChoose a language 🇬🇧';

export const isLang = (v: unknown): v is Lang => v === 'uz' || v === 'ru' || v === 'en';

export const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CURRENCY: Record<Lang, string> = { uz: 'so‘m', ru: 'сум', en: 'UZS' };
export const money = (amount: number, lang: Lang) => `${amount.toLocaleString('ru-RU').replace(/\s/g, ' ')} ${CURRENCY[lang]}`;

export type TopUpStatus = 'PENDING' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ManualInstructions {
  cardNumber: string;
  cardHolder: string;
  bankName?: string | null;
  comment: string;
}

/** Buyurtma holati → belgi (mijoz 4 bosqichi: yuborildi → qabul qilindi → jarayonda → yetkazilmoqda) */
export const ORDER_EMOJI: Record<string, string> = {
  PENDING_PAYMENT: '💳',
  NEW: '📨',
  SENT_TO_WORKSHOP: '✅',
  ACCEPTED: '🧵',
  PRINTING: '🧵',
  QUALITY_CHECK: '🧵',
  READY: '🧵',
  DELIVERING: '🚚',
  DELIVERED: '🏁',
  CANCELLED: '❌',
  RETURNED: '↩️',
};

/** "2026-11-04T..." → "04.11.2026" */
export const shortDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
};

interface Dict {
  menu: { balance: string; topup: string; orders: string; language: string; help: string };
  menuPlaceholder: string;
  menuHint: string;
  ordersHint: string;
  welcome: string;
  welcomeLinked: string;
  help: string;
  failure: string;
  notLinked: string;
  stopped: string;
  chooseLanguage: string;
  languageSaved: string;
  balance: (amount: number, lang: Lang) => string;
  recentTopUps: string;
  status: Record<TopUpStatus, string>;
  noOrders: string;
  ordersTitle: string;
  chooseAmount: (min: number, max: number) => string;
  otherAmount: string;
  enterAmount: (min: number, max: number) => string;
  invalidAmount: (min: number, max: number) => string;
  confirmAmount: (amount: number) => string;
  confirm: string;
  cancel: string;
  cancelled: string;
  payment: (amount: number, p: ManualInstructions) => string;
  cancelRequest: string;
  requestCancelled: (code: string) => string;
  notCancellable: string;
  tooManyOpen: string;
  methodUnavailable: string;
  receiptReceived: (code: string, amount: number) => string;
  noOpenTopUp: string;
  receiptInReview: string;
  sendPhoto: string;
  tooFast: string;
  duplicateReceipt: string;
}

const uz: Dict = {
  menu: { balance: '💰 Balans', topup: '➕ Balansni to‘ldirish', orders: '📦 Buyurtmalar', language: '🌐 Til', help: '❓ Yordam' },
  menuPlaceholder: 'Pastdagi tugmalardan tanlang',
  menuHint: 'Kerakli bo‘limni pastdagi tugmalardan tanlang 👇',
  ordersHint: 'Batafsil holat va kuzatish — Formo ilovasida.',
  welcome:
    'Formo botiga xush kelibsiz! ⚽️\n\n' +
    'Ilovaga kirish uchun Formo ilovasida telefon raqamingizni kiriting va «Telegram orqali kirish» tugmasini bosing — ' +
    'ilova sizni shu yerga qaytaradi.\n\n' +
    'Buyurtma holati haqidagi xabarlar ham shu yerga keladi. O‘chirish: /stop',
  welcomeLinked:
    'Formo botiga xush kelibsiz! ⚽️\n\nAkkauntingiz ulangan — buyurtma holati haqidagi xabarlar shu yerga keladi. O‘chirish: /stop\n\n' +
    'Balansni ko‘rish va to‘ldirish — pastdagi menyuda.',
  help:
    'Pastdagi tugmalar:\n' +
    '💰 Balans — hisobingizdagi pul va so‘nggi to‘ldirishlar\n' +
    '➕ Balansni to‘ldirish — summani tanlang, kartaga o‘tkazing va chekni shu yerga yuboring\n' +
    '📦 Buyurtmalar — so‘nggi buyurtmalar va ularning holati\n' +
    '🌐 Til — o‘zbekcha / русский / English\n\n' +
    'Buyurtma holati o‘zgarsa, xabar shu yerga o‘zi keladi. Xabarlarni o‘chirish: /stop\n\n' +
    'Ilovaga kirish uchun Formo ilovasida «Telegram orqali kirish» tugmasini bosing.',
  failure: 'Texnik nosozlik yuz berdi. Birozdan keyin qayta urinib ko‘ring.',
  notLinked:
    'Bu Telegram akkaunti hali Formo hisobiga ulanmagan. Formo ilovasida «Telegram orqali kirish» orqali kiring — shundan keyin balans shu yerda ko‘rinadi.',
  stopped: 'Buyurtma xabarlari o‘chirildi. Qayta yoqish: /start',
  chooseLanguage: 'Tilni tanlang:',
  languageSaved: 'Til saqlandi: O‘zbekcha 🇺🇿',
  balance: (amount, lang) => `💰 Balansingiz: <b>${money(amount, lang)}</b>`,
  recentTopUps: 'So‘nggi to‘ldirishlar:',
  status: { PENDING: 'chek kutilmoqda', REVIEW: 'tekshirilmoqda', APPROVED: 'tasdiqlandi', REJECTED: 'rad etildi', CANCELLED: 'bekor qilindi' },
  noOrders: 'Sizda hali buyurtma yo‘q.',
  ordersTitle: '📦 So‘nggi buyurtmalar:',
  chooseAmount: (min, max) => `Qancha summaga to‘ldirasiz?\n(${money(min, 'uz')} — ${money(max, 'uz')})`,
  otherAmount: '✏️ Boshqa summa',
  enterAmount: (min, max) => `Summani raqamlarda yozing, masalan: 75000\n(${money(min, 'uz')} — ${money(max, 'uz')})`,
  invalidAmount: (min, max) => `Summa noto‘g‘ri. ${money(min, 'uz')} dan ${money(max, 'uz')} gacha butun son yozing.`,
  confirmAmount: (amount) => `Balansni <b>${money(amount, 'uz')}</b> ga to‘ldirish so‘rovini ochamizmi?`,
  confirm: '✅ Tasdiqlash',
  cancel: '❌ Bekor qilish',
  cancelled: 'Bekor qilindi.',
  payment: (amount, p) =>
    `💳 <b>To‘lov ma’lumotlari</b>\n\n` +
    `Summa: <b>${money(amount, 'uz')}</b>\n` +
    `${p.bankName ? `${esc(p.bankName)} karta` : 'Karta'}: <code>${esc(p.cardNumber)}</code>\n` +
    `Qabul qiluvchi: <b>${esc(p.cardHolder)}</b>\n` +
    `So‘rov: <code>${esc(p.comment)}</code>\n\n` +
    '1) Shu kartaga aynan shu summani o‘tkazing.\n' +
    '2) To‘lov chekini (rasm yoki skrinshot) shu chatga yuboring.\n\n' +
    'Balans admin chekni tekshirib tasdiqlagandan keyingina to‘ldiriladi.',
  cancelRequest: '❌ So‘rovni bekor qilish',
  requestCancelled: (code) => `${code} so‘rovi bekor qilindi.`,
  notCancellable: 'Bu so‘rovni bekor qilib bo‘lmaydi (allaqachon ko‘rib chiqilgan).',
  tooManyOpen: 'Sizda ochiq so‘rovlar ko‘p. Avval ularni yakunlang yoki bekor qiling: /balance',
  methodUnavailable: 'Karta orqali to‘ldirish hozircha mavjud emas. Keyinroq urinib ko‘ring.',
  receiptReceived: (code, amount) =>
    `🧾 Chek qabul qilindi: ${code} · ${money(amount, 'uz')}\n\nAdmin tekshiradi. Tasdiqlangach balansingiz to‘ldiriladi va sizga xabar keladi.`,
  noOpenTopUp: 'Ochiq to‘ldirish so‘rovi yo‘q. Avval «➕ Balansni to‘ldirish» orqali summani tanlang, keyin chekni yuboring.',
  receiptInReview:
    'Chekingiz allaqachon tekshiruvda — uni almashtirib bo‘lmaydi. Yangi o‘tkazma qilgan bo‘lsangiz, avval «➕ Balansni to‘ldirish» orqali yangi so‘rov oching, keyin chekni yuboring.',
  sendPhoto: 'Chekni rasm sifatida yuboring (JPG/PNG).',
  tooFast: 'Juda tez yuboryapsiz. Bir necha soniya kutib, qayta urinib ko‘ring.',
  duplicateReceipt: 'Bu chek avval boshqa so‘rov uchun yuborilgan. Aynan shu so‘rov bo‘yicha qilingan o‘tkazmaning chekini yuboring.',
};

const ru: Dict = {
  menu: { balance: '💰 Баланс', topup: '➕ Пополнить баланс', orders: '📦 Заказы', language: '🌐 Язык', help: '❓ Помощь' },
  menuPlaceholder: 'Выберите кнопку ниже',
  menuHint: 'Выберите нужный раздел кнопками ниже 👇',
  ordersHint: 'Подробный статус и отслеживание — в приложении Formo.',
  welcome:
    'Добро пожаловать в бот Formo! ⚽️\n\n' +
    'Чтобы войти в приложение, введите номер телефона в приложении Formo и нажмите «Войти через Telegram» — ' +
    'приложение вернёт вас сюда.\n\n' +
    'Сюда же приходят уведомления о статусе заказов. Отключить: /stop',
  welcomeLinked:
    'Добро пожаловать в бот Formo! ⚽️\n\nАккаунт подключён — уведомления о заказах будут приходить сюда. Отключить: /stop\n\n' +
    'Баланс и пополнение — в меню ниже.',
  help:
    'Кнопки внизу:\n' +
    '💰 Баланс — деньги на счёте и последние пополнения\n' +
    '➕ Пополнить баланс — выберите сумму, переведите на карту и отправьте чек сюда\n' +
    '📦 Заказы — последние заказы и их статус\n' +
    '🌐 Язык — o‘zbekcha / русский / English\n\n' +
    'Когда статус заказа меняется, уведомление придёт сюда само. Отключить уведомления: /stop\n\n' +
    'Чтобы войти в приложение, нажмите «Войти через Telegram» в приложении Formo.',
  failure: 'Произошла техническая ошибка. Попробуйте чуть позже.',
  notLinked:
    'Этот Telegram-аккаунт ещё не подключён к Formo. Войдите в приложении через «Войти через Telegram» — после этого баланс будет доступен здесь.',
  stopped: 'Уведомления о заказах отключены. Включить снова: /start',
  chooseLanguage: 'Выберите язык:',
  languageSaved: 'Язык сохранён: Русский 🇷🇺',
  balance: (amount, lang) => `💰 Ваш баланс: <b>${money(amount, lang)}</b>`,
  recentTopUps: 'Последние пополнения:',
  status: { PENDING: 'ожидается чек', REVIEW: 'на проверке', APPROVED: 'подтверждено', REJECTED: 'отклонено', CANCELLED: 'отменено' },
  noOrders: 'У вас пока нет заказов.',
  ordersTitle: '📦 Последние заказы:',
  chooseAmount: (min, max) => `На какую сумму пополнить?\n(${money(min, 'ru')} — ${money(max, 'ru')})`,
  otherAmount: '✏️ Другая сумма',
  enterAmount: (min, max) => `Введите сумму цифрами, например: 75000\n(${money(min, 'ru')} — ${money(max, 'ru')})`,
  invalidAmount: (min, max) => `Неверная сумма. Введите целое число от ${money(min, 'ru')} до ${money(max, 'ru')}.`,
  confirmAmount: (amount) => `Создать заявку на пополнение баланса на <b>${money(amount, 'ru')}</b>?`,
  confirm: '✅ Подтвердить',
  cancel: '❌ Отмена',
  cancelled: 'Отменено.',
  payment: (amount, p) =>
    `💳 <b>Реквизиты для оплаты</b>\n\n` +
    `Сумма: <b>${money(amount, 'ru')}</b>\n` +
    `${p.bankName ? `Карта ${esc(p.bankName)}` : 'Карта'}: <code>${esc(p.cardNumber)}</code>\n` +
    `Получатель: <b>${esc(p.cardHolder)}</b>\n` +
    `Заявка: <code>${esc(p.comment)}</code>\n\n` +
    '1) Переведите на эту карту ровно эту сумму.\n' +
    '2) Отправьте чек (фото или скриншот) в этот чат.\n\n' +
    'Баланс пополнится только после проверки чека администратором.',
  cancelRequest: '❌ Отменить заявку',
  requestCancelled: (code) => `Заявка ${code} отменена.`,
  notCancellable: 'Эту заявку нельзя отменить (уже рассмотрена).',
  tooManyOpen: 'У вас слишком много открытых заявок. Сначала завершите или отмените их: /balance',
  methodUnavailable: 'Пополнение картой сейчас недоступно. Попробуйте позже.',
  receiptReceived: (code, amount) =>
    `🧾 Чек получен: ${code} · ${money(amount, 'ru')}\n\nАдминистратор проверит его. После подтверждения баланс пополнится и вы получите уведомление.`,
  noOpenTopUp: 'Нет открытой заявки на пополнение. Сначала выберите сумму через «➕ Пополнить баланс», затем отправьте чек.',
  receiptInReview:
    'Ваш чек уже на проверке — заменить его нельзя. Если вы сделали новый перевод, сначала создайте новую заявку через «➕ Пополнить баланс», затем отправьте чек.',
  sendPhoto: 'Отправьте чек как изображение (JPG/PNG).',
  tooFast: 'Слишком много запросов. Подождите несколько секунд и попробуйте снова.',
  duplicateReceipt: 'Этот чек уже был отправлен для другой заявки. Отправьте чек перевода именно по этой заявке.',
};

const en: Dict = {
  menu: { balance: '💰 Balance', topup: '➕ Top up balance', orders: '📦 Orders', language: '🌐 Language', help: '❓ Help' },
  menuPlaceholder: 'Choose a button below',
  menuHint: 'Choose a section with the buttons below 👇',
  ordersHint: 'Detailed status and tracking are in the Formo app.',
  welcome:
    'Welcome to the Formo bot! ⚽️\n\n' +
    'To sign in, enter your phone number in the Formo app and tap “Sign in with Telegram” — the app will bring you here.\n\n' +
    'Order status updates are sent here as well. Turn off: /stop',
  welcomeLinked:
    'Welcome to the Formo bot! ⚽️\n\nYour account is linked — order updates will be sent here. Turn off: /stop\n\n' +
    'Check and top up your balance from the menu below.',
  help:
    'Buttons below:\n' +
    '💰 Balance — money on your account and recent top-ups\n' +
    '➕ Top up balance — choose an amount, transfer to the card and send the receipt here\n' +
    '📦 Orders — recent orders and their status\n' +
    '🌐 Language — o‘zbekcha / русский / English\n\n' +
    'When an order status changes, you get a message here automatically. Turn off: /stop\n\n' +
    'To sign in, tap “Sign in with Telegram” in the Formo app.',
  failure: 'A technical error occurred. Please try again later.',
  notLinked:
    'This Telegram account is not linked to Formo yet. Sign in to the app with “Sign in with Telegram” — then your balance will be available here.',
  stopped: 'Order notifications are turned off. Turn back on: /start',
  chooseLanguage: 'Choose a language:',
  languageSaved: 'Language saved: English 🇬🇧',
  balance: (amount, lang) => `💰 Your balance: <b>${money(amount, lang)}</b>`,
  recentTopUps: 'Recent top-ups:',
  status: { PENDING: 'awaiting receipt', REVIEW: 'under review', APPROVED: 'approved', REJECTED: 'rejected', CANCELLED: 'cancelled' },
  noOrders: 'You have no orders yet.',
  ordersTitle: '📦 Recent orders:',
  chooseAmount: (min, max) => `How much would you like to top up?\n(${money(min, 'en')} — ${money(max, 'en')})`,
  otherAmount: '✏️ Other amount',
  enterAmount: (min, max) => `Type the amount in digits, e.g. 75000\n(${money(min, 'en')} — ${money(max, 'en')})`,
  invalidAmount: (min, max) => `Invalid amount. Enter a whole number from ${money(min, 'en')} to ${money(max, 'en')}.`,
  confirmAmount: (amount) => `Create a top-up request for <b>${money(amount, 'en')}</b>?`,
  confirm: '✅ Confirm',
  cancel: '❌ Cancel',
  cancelled: 'Cancelled.',
  payment: (amount, p) =>
    `💳 <b>Payment details</b>\n\n` +
    `Amount: <b>${money(amount, 'en')}</b>\n` +
    `${p.bankName ? `${esc(p.bankName)} card` : 'Card'}: <code>${esc(p.cardNumber)}</code>\n` +
    `Recipient: <b>${esc(p.cardHolder)}</b>\n` +
    `Request: <code>${esc(p.comment)}</code>\n\n` +
    '1) Transfer exactly this amount to this card.\n' +
    '2) Send the payment receipt (photo or screenshot) to this chat.\n\n' +
    'Your balance is credited only after an admin verifies the receipt.',
  cancelRequest: '❌ Cancel request',
  requestCancelled: (code) => `Request ${code} cancelled.`,
  notCancellable: 'This request can no longer be cancelled (already reviewed).',
  tooManyOpen: 'You have too many open requests. Complete or cancel them first: /balance',
  methodUnavailable: 'Card top-up is not available right now. Please try later.',
  receiptReceived: (code, amount) =>
    `🧾 Receipt received: ${code} · ${money(amount, 'en')}\n\nAn admin will review it. Once approved, your balance will be credited and you will be notified.`,
  noOpenTopUp: 'No open top-up request. First choose an amount via “➕ Top up balance”, then send the receipt.',
  receiptInReview:
    'Your receipt is already under review and cannot be replaced. If you made a new transfer, first open a new request via “➕ Top up balance”, then send the receipt.',
  sendPhoto: 'Please send the receipt as an image (JPG/PNG).',
  tooFast: 'Too many requests. Please wait a few seconds and try again.',
  duplicateReceipt: 'This receipt was already submitted for another request. Please send the receipt for the transfer made for this request.',
};

export const T: Record<Lang, Dict> = { uz, ru, en };

export const LANGUAGE_NAMES: Record<Lang, string> = { uz: '🇺🇿 O‘zbekcha', ru: '🇷🇺 Русский', en: '🇬🇧 English' };

/** Menyu tugmasi matni (istalgan tilda) → amal */
export function menuAction(textValue: string): keyof Dict['menu'] | null {
  for (const lang of LANGS) {
    const entry = Object.entries(T[lang].menu).find(([, label]) => label === textValue);
    if (entry) return entry[0] as keyof Dict['menu'];
  }
  return null;
}
