import { TopUpMethods } from './backend';
import { isLang, Lang, LANG_KEYBOARD_PREFIX, LANGS, LANGUAGE_NAMES, money, T } from './i18n';
import { ReplyMarkup, TgMessage } from './telegram';

/** Tayyor summalar (so'm) */
export const PRESET_AMOUNTS = [30_000, 50_000, 100_000];

export const CB = {
  amount: 'tu:', // tu:<summa> | tu:other
  confirm: 'tc:', // tc:<summa>
  abort: 'tx',
  cancelTopUp: 'tk:', // tk:<id>
  lang: LANG_KEYBOARD_PREFIX, // lang:<uz|ru|en>
};

export interface WalletCtx {
  userId: string;
  chatId: string;
  lang: Lang;
  reply(body: string, options?: { parse_mode?: 'HTML'; reply_markup?: ReplyMarkup }): Promise<void>;
}

export const mainMenu = (lang: Lang): ReplyMarkup => {
  const m = T[lang].menu;
  return { keyboard: [[{ text: m.balance }, { text: m.topup }], [{ text: m.orders }, { text: m.language }]], resize_keyboard: true, is_persistent: true };
};

export const languageKeyboard: ReplyMarkup = {
  inline_keyboard: [LANGS.map((l) => ({ text: LANGUAGE_NAMES[l], callback_data: `${CB.lang}${l}` }))],
};

export const amountKeyboard = (lang: Lang): ReplyMarkup => ({
  inline_keyboard: [
    PRESET_AMOUNTS.map((a) => ({ text: money(a, lang), callback_data: `${CB.amount}${a}` })),
    [{ text: T[lang].otherAmount, callback_data: `${CB.amount}other` }],
  ],
});

export const confirmKeyboard = (lang: Lang, amount: number): ReplyMarkup => ({
  inline_keyboard: [[
    { text: T[lang].confirm, callback_data: `${CB.confirm}${amount}` },
    { text: T[lang].cancel, callback_data: CB.abort },
  ]],
});

export const cancelTopUpKeyboard = (lang: Lang, id: number): ReplyMarkup => ({
  inline_keyboard: [[{ text: T[lang].cancelRequest, callback_data: `${CB.cancelTopUp}${id}` }]],
});

/** "75 000", "75,000" yoki "75000 so'm" → 75000; aks holda null. Chegaralar backend'da ham tekshiriladi */
export function parseAmount(input: string, limits: TopUpMethods['limits']): number | null {
  const raw = input.trim().replace(/\s*(so[‘'’]?m|сум|uzs)$/i, '');
  // Ajratgich faqat 3 xonali guruhlar orasida: "75 000", "1,500,000"; "50000.5" — kasr, rad etiladi
  const grouped = /^\d{1,3}(?:[\s,.'’_]\d{3})+$/.test(raw);
  const compact = grouped ? raw.replace(/\D/g, '') : raw;
  if (!/^\d{1,9}$/.test(compact)) return null;
  const amount = Number(compact);
  return Number.isSafeInteger(amount) && amount >= limits.min && amount <= limits.max ? amount : null;
}

export interface ReceiptFile {
  fileId: string;
  /** Telegram file_unique_id — bir xil rasm qayta yuborilganini backend shu bilan aniqlaydi */
  uniqueId?: string;
}

/** Chek: eng katta o'lchamdagi rasm yoki rasm-fayl (document image/*). Boshqa fayl — null */
export function receiptFile(msg: TgMessage): ReceiptFile | null {
  if (msg.photo?.length) {
    const best = [...msg.photo].sort((a, b) => b.width * b.height - a.width * a.height)[0];
    return { fileId: best.file_id, uniqueId: best.file_unique_id };
  }
  if (msg.document && /^image\/(jpeg|png|webp)$/.test(msg.document.mime_type ?? '')) {
    return { fileId: msg.document.file_id, uniqueId: msg.document.file_unique_id };
  }
  return null;
}

export const parseLangData = (data: string): Lang | null => {
  const v = data.slice(CB.lang.length);
  return isLang(v) ? v : null;
};

/** Callback'dagi musbat butun son (summa yoki id); aks holda null */
export const parseIntData = (data: string, prefix: string): number | null => {
  const v = data.slice(prefix.length);
  return /^\d{1,9}$/.test(v) ? Number(v) : null;
};
