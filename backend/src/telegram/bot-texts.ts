/** Backend yozadigan bot xabarlari (outbox) — mijoz botda tanlagan tilda */

export const BOT_LANGS = ['uz', 'ru', 'en'] as const;
export type BotLang = (typeof BOT_LANGS)[number];

export const asBotLang = (value?: string | null): BotLang => (value === 'ru' || value === 'en' ? value : 'uz');

const CURRENCY: Record<BotLang, string> = { uz: "so'm", ru: 'сум', en: 'UZS' };
export const botMoney = (amount: number, lang: BotLang) => `${amount.toLocaleString('ru-RU')} ${CURRENCY[lang]}`;

export const topUpTexts = {
  approved: (lang: BotLang, code: string, amount: number, balance: number) =>
    ({
      uz: `✅ ${code}: ${botMoney(amount, lang)} balansingizga qo'shildi.\nJoriy balans: ${botMoney(balance, lang)}`,
      ru: `✅ ${code}: ${botMoney(amount, lang)} зачислено на ваш баланс.\nТекущий баланс: ${botMoney(balance, lang)}`,
      en: `✅ ${code}: ${botMoney(amount, lang)} has been added to your balance.\nCurrent balance: ${botMoney(balance, lang)}`,
    })[lang],
  rejected: (lang: BotLang, code: string, reason: string) =>
    ({
      uz: `❌ ${code} rad etildi.\nSabab: ${reason}`,
      ru: `❌ ${code} отклонён.\nПричина: ${reason}`,
      en: `❌ ${code} was rejected.\nReason: ${reason}`,
    })[lang],
};
