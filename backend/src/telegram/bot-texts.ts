/** Backend yozadigan bot xabarlari (outbox) — mijoz botda tanlagan tilda */

import { OrderStatus } from '@prisma/client';
import { STATUS_LABEL } from '../shop/order-status';

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

/** Ilovaga Telegram orqali kirilgach — botda pastki menyu bilan birga keladi */
export const loginTexts = {
  linked: (lang: BotLang) =>
    ({
      uz: "✅ Formo ilovasiga kirdingiz!\n\nEndi shu yerda pastdagi tugmalar orqali:\n💰 balansni ko'rasiz\n➕ hisobni to'ldirasiz\n📦 buyurtmalaringizni kuzatasiz\n🌐 tilni o'zgartirasiz\n\nBuyurtma holati haqidagi xabarlar ham shu yerga keladi.",
      ru: '✅ Вы вошли в приложение Formo!\n\nТеперь кнопками ниже вы можете:\n💰 смотреть баланс\n➕ пополнять счёт\n📦 следить за заказами\n🌐 менять язык\n\nУведомления о статусе заказов тоже придут сюда.',
      en: '✅ You are signed in to Formo!\n\nUse the buttons below to:\n💰 check your balance\n➕ top up\n📦 track your orders\n🌐 change the language\n\nOrder status updates will arrive here too.',
    })[lang],
};

/** Buyurtma holati — uz matni ilova bilan bir xil (STATUS_LABEL) */
export const orderStatusLabel = (status: OrderStatus, lang: BotLang) =>
  lang === 'uz' ? STATUS_LABEL[status] : ORDER_STATUS[lang][status];

const ORDER_STATUS: Record<Exclude<BotLang, 'uz'>, Record<OrderStatus, string>> = {
  ru: {
    PENDING_PAYMENT: 'Ожидает оплаты',
    NEW: 'Заказ отправлен',
    SENT_TO_WORKSHOP: 'Заказ принят',
    ACCEPTED: 'Заказ в работе',
    PRINTING: 'Заказ в работе',
    QUALITY_CHECK: 'Заказ в работе',
    READY: 'Заказ в работе',
    DELIVERING: 'Доставляется',
    DELIVERED: 'Доставлен',
    CANCELLED: 'Отменён',
    RETURNED: 'Возвращён',
  },
  en: {
    PENDING_PAYMENT: 'Awaiting payment',
    NEW: 'Order sent',
    SENT_TO_WORKSHOP: 'Order accepted',
    ACCEPTED: 'Order in progress',
    PRINTING: 'Order in progress',
    QUALITY_CHECK: 'Order in progress',
    READY: 'Order in progress',
    DELIVERING: 'Out for delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    RETURNED: 'Returned',
  },
};

export const orderStatusText = (lang: BotLang, code: string, status: OrderStatus) =>
  ({
    uz: `📦 ${code} buyurtmangiz holati: ${orderStatusLabel(status, lang)}`,
    ru: `📦 Статус заказа ${code}: ${orderStatusLabel(status, lang)}`,
    en: `📦 Order ${code} status: ${orderStatusLabel(status, lang)}`,
  })[lang];
