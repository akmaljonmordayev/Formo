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
  menu: { balance: string; orders: string; language: string; help: string };
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
  noOrders: string;
  ordersTitle: string;
  tooFast: string;
}

const uz: Dict = {
  menu: { balance: '💰 Balans', orders: '📦 Buyurtmalar', language: '🌐 Til', help: '❓ Yordam' },
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
    'Balansingizni va buyurtmalaringizni pastdagi menyudan ko‘rishingiz mumkin.',
  help:
    'Pastdagi tugmalar:\n' +
    '💰 Balans — hisobingizdagi pul va harakatlar tarixi\n' +
    '📦 Buyurtmalar — so‘nggi buyurtmalar va ularning holati\n' +
    '🌐 Til — o‘zbekcha / русский / English\n' +
    '📱 Raqamni yuborish — ilovaga qayta kirishda yangi kod olish\n\n' +
    'Buyurtma holati o‘zgarsa, xabar shu yerga o‘zi keladi. Xabarlarni o‘chirish: /stop\n\n' +
    'Ilovaga kirish uchun Formo ilovasida «Telegram orqali kirish» tugmasini bosing.',
  failure: 'Texnik nosozlik yuz berdi. Birozdan keyin qayta urinib ko‘ring.',
  notLinked:
    'Bu Telegram akkaunti hali Formo hisobiga ulanmagan. Formo ilovasida «Telegram orqali kirish» orqali kiring — shundan keyin balans shu yerda ko‘rinadi.',
  stopped: 'Buyurtma xabarlari o‘chirildi. Qayta yoqish: /start',
  chooseLanguage: 'Tilni tanlang:',
  languageSaved: 'Til saqlandi: O‘zbekcha 🇺🇿',
  balance: (amount, lang) => `💰 Balansingiz: <b>${money(amount, lang)}</b>`,
  noOrders: 'Sizda hali buyurtma yo‘q.',
  ordersTitle: '📦 So‘nggi buyurtmalar:',
  tooFast: 'Juda tez yuboryapsiz. Bir necha soniya kutib, qayta urinib ko‘ring.',
};

const ru: Dict = {
  menu: { balance: '💰 Баланс', orders: '📦 Заказы', language: '🌐 Язык', help: '❓ Помощь' },
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
    'Баланс и заказы доступны в меню ниже.',
  help:
    'Кнопки внизу:\n' +
    '💰 Баланс — сумма на счёте и история операций\n' +
    '📦 Заказы — последние заказы и их статус\n' +
    '🌐 Язык — o‘zbekcha / русский / English\n' +
    '📱 Отправить номер — новый код при повторном входе в приложение\n\n' +
    'Когда статус заказа меняется, уведомление придёт сюда само. Отключить уведомления: /stop\n\n' +
    'Чтобы войти в приложение, нажмите «Войти через Telegram» в приложении Formo.',
  failure: 'Произошла техническая ошибка. Попробуйте чуть позже.',
  notLinked:
    'Этот Telegram-аккаунт ещё не подключён к Formo. Войдите в приложении через «Войти через Telegram» — после этого баланс будет доступен здесь.',
  stopped: 'Уведомления о заказах отключены. Включить снова: /start',
  chooseLanguage: 'Выберите язык:',
  languageSaved: 'Язык сохранён: Русский 🇷🇺',
  balance: (amount, lang) => `💰 Ваш баланс: <b>${money(amount, lang)}</b>`,
  noOrders: 'У вас пока нет заказов.',
  ordersTitle: '📦 Последние заказы:',
  tooFast: 'Слишком много запросов. Подождите несколько секунд и попробуйте снова.',
};

const en: Dict = {
  menu: { balance: '💰 Balance', orders: '📦 Orders', language: '🌐 Language', help: '❓ Help' },
  menuPlaceholder: 'Choose a button below',
  menuHint: 'Choose a section with the buttons below 👇',
  ordersHint: 'Detailed status and tracking are in the Formo app.',
  welcome:
    'Welcome to the Formo bot! ⚽️\n\n' +
    'To sign in, enter your phone number in the Formo app and tap “Sign in with Telegram” — the app will bring you here.\n\n' +
    'Order status updates are sent here as well. Turn off: /stop',
  welcomeLinked:
    'Welcome to the Formo bot! ⚽️\n\nYour account is linked — order updates will be sent here. Turn off: /stop\n\n' +
    'Check your balance and orders from the menu below.',
  help:
    'Buttons below:\n' +
    '💰 Balance — account amount and transaction history\n' +
    '📦 Orders — recent orders and their status\n' +
    '🌐 Language — o‘zbekcha / русский / English\n' +
    '📱 Share phone number — get a new code when signing in to the app again\n\n' +
    'When an order status changes, you get a message here automatically. Turn off: /stop\n\n' +
    'To sign in, tap “Sign in with Telegram” in the Formo app.',
  failure: 'A technical error occurred. Please try again later.',
  notLinked:
    'This Telegram account is not linked to Formo yet. Sign in to the app with “Sign in with Telegram” — then your balance will be available here.',
  stopped: 'Order notifications are turned off. Turn back on: /start',
  chooseLanguage: 'Choose a language:',
  languageSaved: 'Language saved: English 🇬🇧',
  balance: (amount, lang) => `💰 Your balance: <b>${money(amount, lang)}</b>`,
  noOrders: 'You have no orders yet.',
  ordersTitle: '📦 Recent orders:',
  tooFast: 'Too many requests. Please wait a few seconds and try again.',
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
