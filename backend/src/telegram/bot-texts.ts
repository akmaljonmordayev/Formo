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

/** Buyurtma holati — uz matni ilova bilan bir xil (STATUS_LABEL) */
export const orderStatusLabel = (status: OrderStatus, lang: BotLang) =>
  lang === 'uz' ? STATUS_LABEL[status] : ORDER_STATUS[lang][status];

const ORDER_STATUS: Record<Exclude<BotLang, 'uz'>, Record<OrderStatus, string>> = {
  ru: {
    PENDING_PAYMENT: 'Ожидает оплаты',
    NEW: 'Принят',
    SENT_TO_WORKSHOP: 'Отправлен в цех',
    ACCEPTED: 'Цех принял',
    PRINTING: 'Печатается',
    QUALITY_CHECK: 'Контроль качества',
    READY: 'Готов',
    DELIVERING: 'Доставляется',
    DELIVERED: 'Доставлен',
    CANCELLED: 'Отменён',
    RETURNED: 'Возвращён',
  },
  en: {
    PENDING_PAYMENT: 'Awaiting payment',
    NEW: 'Accepted',
    SENT_TO_WORKSHOP: 'Sent to workshop',
    ACCEPTED: 'Workshop accepted',
    PRINTING: 'Printing',
    QUALITY_CHECK: 'Quality check',
    READY: 'Ready',
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
