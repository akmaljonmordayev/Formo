import { isLang, Lang, LANG_KEYBOARD_PREFIX, LANGS, LANGUAGE_NAMES, T } from './i18n';
import { LOGIN } from './messages';
import { ReplyMarkup } from './telegram';

export const CB = {
  lang: LANG_KEYBOARD_PREFIX, // lang:<uz|ru|en>
};

export interface WalletCtx {
  userId: string;
  chatId: string;
  lang: Lang;
  reply(body: string, options?: { parse_mode?: 'HTML'; reply_markup?: ReplyMarkup }): Promise<void>;
}

/**
 * Doimiy pastki menyu: balans ko'rish, buyurtmalar, til va yordam.
 */
export const mainMenu = (lang: Lang): ReplyMarkup => {
  const m = T[lang].menu;
  return {
    keyboard: [
      [{ text: m.balance }, { text: m.orders }],
      [{ text: m.language }, { text: m.help }],
      [{ text: LOGIN[lang].sendContact, request_contact: true }],
    ],
    resize_keyboard: true,
    is_persistent: true,
    input_field_placeholder: T[lang].menuPlaceholder,
  };
};

export const languageKeyboard: ReplyMarkup = {
  inline_keyboard: [LANGS.map((l) => ({ text: LANGUAGE_NAMES[l], callback_data: `${CB.lang}${l}` }))],
};

export const parseLangData = (data: string): Lang | null => {
  const v = data.slice(CB.lang.length);
  return isLang(v) ? v : null;
};
