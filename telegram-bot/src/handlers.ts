import { Backend, CodeResult, TopUpMethods } from './backend';
import { RecentIds } from './dedupe';
import { FIRST_LANGUAGE_PROMPT, isLang, Lang, langFromCode, menuAction, money, T } from './i18n';
import { errorMessage, Logger } from './log';
import { contactKeyboard, LOGIN, removeKeyboard, RESEND_DATA, resendKeyboard } from './messages';
import { UserSessions } from './session';
import { SendOptions, TelegramError, TgCallbackQuery, TgMessage, TgUpdate, TgUser } from './telegram';
import {
  amountKeyboard,
  cancelTopUpKeyboard,
  CB,
  confirmKeyboard,
  languageKeyboard,
  mainMenu,
  parseAmount,
  parseIntData,
  parseLangData,
  receiptFile,
} from './wallet';

export interface TelegramSender {
  sendMessage(chatId: number | string, text: string, options?: SendOptions): Promise<unknown>;
  answerCallbackQuery(id: string, text?: string): Promise<unknown>;
}

export interface Deps {
  tg: TelegramSender;
  backend: Backend;
  log: Logger;
  dedupe: RecentIds;
  sessions: UserSessions;
}

/** guarded() foydalanuvchiga xabar berib, qayta ishlashni to'xtatgan */
class Handled extends Error {}

const START = /^\/start(?:@\w+)?(?:\s+(\S+))?\s*$/;
const COMMAND = (name: string) => new RegExp(`^/${name}(?:@\\w+)?\\s*$`);
const LIMITS_TTL_MS = 5 * 60_000;

/** Bitta update'ni qayta ishlaydi. Hech qachon xato tashlamaydi — polling/webhook to'xtamasin */
export async function handleUpdate(update: TgUpdate, deps: Deps) {
  if (!deps.dedupe.add(update.update_id)) {
    deps.log.info('takroriy update tashlandi', { updateId: update.update_id });
    return;
  }
  try {
    if (update.message) await onMessage(update.message, deps);
    else if (update.callback_query) await onCallback(update.callback_query, deps);
  } catch (err) {
    if (!(err instanceof Handled)) deps.log.error('update qayta ishlanmadi', { updateId: update.update_id, error: errorMessage(err) });
  }
}

/** Xotiradagi til yoki (hali noma'lum bo'lsa) Telegram ilovasining tili — backend'ga murojaatsiz */
const quickLang = (deps: Deps, from: TgUser): Lang => deps.sessions.lang(String(from.id)) ?? langFromCode(from.language_code);

/**
 * Foydalanuvchi tili: tanlangani (xotirada) → qayta ishga tushgandan keyin backend'da saqlangani
 * (bir marta so'raladi) → Telegram ilovasining tili.
 */
async function langOf(deps: Deps, from: TgUser): Promise<Lang> {
  const userId = String(from.id);
  const known = deps.sessions.lang(userId);
  if (known) return known;
  if (deps.sessions.markLangLookup(userId)) {
    const me = await deps.backend.me(userId).catch(() => null);
    if (me?.linked && isLang(me.language)) {
      deps.sessions.setLang(userId, me.language);
      return me.language;
    }
  }
  return langFromCode(from.language_code);
}

const START_TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

async function onMessage(msg: TgMessage, deps: Deps) {
  // Faqat shaxsiy chat: guruhda kod yoki raqam boshqalarga ko'rinmasin
  if (msg.chat.type !== 'private' || !msg.from || msg.from.is_bot) return;
  const userId = String(msg.from.id);
  const chatId = String(msg.chat.id);

  if (msg.contact) return onContact(msg, deps);

  const body = msg.text?.trim() ?? '';
  const start = START.exec(body);
  if (start) return onStart(deps, msg.from, chatId, start[1] ?? '');

  const lang = await langOf(deps, msg.from);
  const reply = (text: string, options?: SendOptions) => send(deps, chatId, text, options);
  if (msg.photo || msg.document) return onReceipt(msg, deps, lang);

  if (COMMAND('stop').test(body)) {
    deps.sessions.clearAmount(userId);
    const { linked } = await guarded(deps, chatId, lang, () => deps.backend.stop(userId));
    return reply(linked ? T[lang].stopped : T[lang].notLinked);
  }

  const action = menuAction(body) ?? commandAction(body);
  if (action) {
    deps.sessions.clearAmount(userId);
    if (action === 'balance') return showBalance(deps, userId, chatId, lang);
    if (action === 'topup') return startTopUp(deps, userId, chatId, lang);
    if (action === 'orders') return showOrders(deps, userId, chatId, lang);
    return reply(T[lang].chooseLanguage, { reply_markup: languageKeyboard });
  }

  if (deps.sessions.isAwaitingAmount(userId)) {
    const limits = await topUpLimits(deps, chatId, lang);
    const amount = parseAmount(body, limits);
    if (amount === null) return reply(T[lang].invalidAmount(limits.min, limits.max));
    deps.sessions.clearAmount(userId);
    return reply(T[lang].confirmAmount(amount), { parse_mode: 'HTML', reply_markup: confirmKeyboard(lang, amount) });
  }

  return reply(T[lang].help);
}

/**
 * /start [payload]. Til hali tanlanmagan bo'lsa (xotirada ham, ulangan akkauntda ham yo'q) — avval til so'raladi,
 * payload eslab qolinadi va til tanlangach davom etadi (continueStart).
 */
async function onStart(deps: Deps, from: TgUser, chatId: string, payload: string) {
  const userId = String(from.id);
  deps.sessions.clearAmount(userId);
  // Payload shakli noto'g'ri bo'lsa backend'ga yubormaymiz
  if (payload && payload !== 'topup' && !START_TOKEN.test(payload)) return send(deps, chatId, LOGIN[quickLang(deps, from)].invalidLink);

  let lang = deps.sessions.lang(userId);
  let linked: boolean | undefined;
  if (!payload || !lang) {
    const hello = await guarded(deps, chatId, quickLang(deps, from), () => deps.backend.hello(userId, chatId));
    linked = hello.linked;
    if (!lang && isLang(hello.language)) {
      lang = hello.language;
      deps.sessions.setLang(userId, lang);
    }
  }
  if (!lang) {
    deps.sessions.setPendingStart(userId, payload);
    return send(deps, chatId, FIRST_LANGUAGE_PROMPT, { reply_markup: languageKeyboard });
  }
  return continueStart(deps, userId, chatId, lang, payload, linked);
}

async function continueStart(deps: Deps, userId: string, chatId: string, lang: Lang, payload: string, linked?: boolean) {
  if (!payload) {
    if (linked === undefined) linked = (await guarded(deps, chatId, lang, () => deps.backend.hello(userId, chatId))).linked;
    return linked
      ? send(deps, chatId, T[lang].welcomeLinked, { reply_markup: mainMenu(lang) })
      : send(deps, chatId, T[lang].welcome);
  }
  // Ilovadagi "Balansni to'ldirish" tugmasi: t.me/<bot>?start=topup
  if (payload === 'topup') return startTopUp(deps, userId, chatId, lang);
  const res = await guarded(deps, chatId, lang, () => deps.backend.claim(payload, userId, chatId, lang));
  if (res.result === 'CONTACT_REQUIRED') {
    return send(deps, chatId, LOGIN[lang].askContact(res.maskedPhone), { parse_mode: 'HTML', reply_markup: contactKeyboard(lang) });
  }
  return send(deps, chatId, LOGIN[lang].invalidLink);
}

function commandAction(body: string) {
  if (COMMAND('balance').test(body)) return 'balance' as const;
  if (COMMAND('topup').test(body)) return 'topup' as const;
  if (COMMAND('orders').test(body)) return 'orders' as const;
  if (COMMAND('language').test(body)) return 'language' as const;
  return null;
}

async function onContact(msg: TgMessage, deps: Deps) {
  const chatId = String(msg.chat.id);
  const contact = msg.contact!;
  // Telegram faqat "raqamni yuborish" tugmasida user_id = yuboruvchining o'zi bo'ladi.
  // Boshqa kontaktni ulashish yoki qo'lda yozilgan raqam — dalil emas.
  if (contact.user_id !== msg.from!.id) {
    const lang = quickLang(deps, msg.from!);
    return send(deps, chatId, LOGIN[lang].notOwnContact, { reply_markup: contactKeyboard(lang) });
  }
  const lang = await langOf(deps, msg.from!);
  const res = await guarded(deps, chatId, lang, () => deps.backend.contact(String(msg.from!.id), chatId, contact.phone_number));
  return replyCode(deps, chatId, lang, res);
}

/**
 * Chek rasmi: faqat ochiq so'rovga biriktiriladi va holati "tekshiruvda" bo'ladi.
 * Pul qo'shilmaydi — buni faqat admin tasdig'i qiladi.
 */
async function onReceipt(msg: TgMessage, deps: Deps, lang: Lang) {
  const userId = String(msg.from!.id);
  const chatId = String(msg.chat.id);
  const file = receiptFile(msg);
  if (!file) return send(deps, chatId, T[lang].sendPhoto);
  const res = await guarded(deps, chatId, lang, () => deps.backend.attachReceipt(userId, file.fileId, file.uniqueId));
  if (res.result === 'NOT_LINKED') return send(deps, chatId, T[lang].notLinked);
  if (res.result === 'NO_OPEN_TOPUP') return send(deps, chatId, T[lang].noOpenTopUp, { reply_markup: amountKeyboard(lang) });
  if (res.result === 'DUPLICATE_RECEIPT') return send(deps, chatId, T[lang].duplicateReceipt);
  return send(deps, chatId, T[lang].receiptReceived(res.topUp.code, res.topUp.amount));
}

async function onCallback(query: TgCallbackQuery, deps: Deps) {
  const chat = query.message?.chat;
  await deps.tg.answerCallbackQuery(query.id).catch((err) => deps.log.warn('answerCallbackQuery', { error: errorMessage(err) }));
  if (!chat || chat.type !== 'private' || !query.data) return;
  const chatId = String(chat.id);
  const userId = String(query.from.id);
  const data = query.data;

  if (data.startsWith(CB.lang)) {
    const chosen = parseLangData(data);
    if (!chosen) return;
    deps.sessions.setLang(userId, chosen);
    const { linked } = await guarded(deps, chatId, chosen, () => deps.backend.setLanguage(userId, chosen));
    // Birinchi /start til so'rash uchun to'xtatilgan bo'lsa — shu tilda davom etadi
    const pending = deps.sessions.takePendingStart(userId);
    if (pending !== undefined) return continueStart(deps, userId, chatId, chosen, pending, linked);
    return send(deps, chatId, T[chosen].languageSaved, linked ? { reply_markup: mainMenu(chosen) } : undefined);
  }

  const lang = await langOf(deps, query.from);

  if (data === RESEND_DATA) {
    const res = await guarded(deps, chatId, lang, () => deps.backend.resend(userId));
    return replyCode(deps, chatId, lang, res);
  }

  if (data === CB.abort) {
    deps.sessions.clearAmount(userId);
    return send(deps, chatId, T[lang].cancelled);
  }

  if (data.startsWith(CB.amount)) {
    const limits = await topUpLimits(deps, chatId, lang);
    if (data === `${CB.amount}other`) {
      deps.sessions.awaitAmount(userId);
      return send(deps, chatId, T[lang].enterAmount(limits.min, limits.max));
    }
    const amount = parseIntData(data, CB.amount);
    if (amount === null || amount < limits.min || amount > limits.max) return send(deps, chatId, T[lang].invalidAmount(limits.min, limits.max));
    return send(deps, chatId, T[lang].confirmAmount(amount), { parse_mode: 'HTML', reply_markup: confirmKeyboard(lang, amount) });
  }

  if (data.startsWith(CB.confirm)) {
    const amount = parseIntData(data, CB.confirm);
    if (amount === null) return;
    return createTopUp(deps, userId, chatId, lang, amount);
  }

  if (data.startsWith(CB.cancelTopUp)) {
    const id = parseIntData(data, CB.cancelTopUp);
    if (id === null || id < 1) return;
    const res = await guarded(deps, chatId, lang, () => deps.backend.cancelTopUp(userId, id));
    if (res.result === 'NOT_LINKED') return send(deps, chatId, T[lang].notLinked);
    if (res.result === 'NOT_CANCELLABLE') return send(deps, chatId, T[lang].notCancellable);
    return send(deps, chatId, T[lang].requestCancelled(res.topUp.code));
  }
}

// ---- Balans va to'ldirish ----

/** Ulangan akkauntda saqlangan til xotiradagi tildan ustun emas, lekin xotira bo'sh bo'lsa tiklanadi */
function rememberLang(deps: Deps, userId: string, stored: string | null | undefined, fallback: Lang): Lang {
  const current = deps.sessions.lang(userId);
  if (current) return current;
  if (stored === 'uz' || stored === 'ru' || stored === 'en') {
    deps.sessions.setLang(userId, stored);
    return stored;
  }
  return fallback;
}

async function showBalance(deps: Deps, userId: string, chatId: string, lang: Lang) {
  const me = await guarded(deps, chatId, lang, () => deps.backend.me(userId));
  if (!me.linked) return send(deps, chatId, T[lang].notLinked);
  lang = rememberLang(deps, userId, me.language, lang);
  const res = await guarded(deps, chatId, lang, () => deps.backend.balance(userId));
  if (!res.linked) return send(deps, chatId, T[lang].notLinked);
  const t = T[lang];
  const lines = [t.balance(res.balance, lang)];
  if (res.topUps.length) {
    lines.push('', t.recentTopUps);
    for (const tu of res.topUps) lines.push(`• ${tu.code} · ${money(tu.amount, lang)} — ${t.status[tu.status]}`);
  }
  const open = res.topUps.find((tu) => tu.status === 'PENDING' && tu.method === 'MANUAL_CARD');
  return send(deps, chatId, lines.join('\n'), {
    parse_mode: 'HTML',
    reply_markup: open ? cancelTopUpKeyboard(lang, open.id) : amountKeyboard(lang),
  });
}

async function startTopUp(deps: Deps, userId: string, chatId: string, lang: Lang) {
  const me = await guarded(deps, chatId, lang, () => deps.backend.me(userId));
  if (!me.linked) return send(deps, chatId, T[lang].notLinked);
  lang = rememberLang(deps, userId, me.language, lang);
  const limits = await topUpLimits(deps, chatId, lang);
  return send(deps, chatId, T[lang].chooseAmount(limits.min, limits.max), { reply_markup: amountKeyboard(lang) });
}

async function createTopUp(deps: Deps, userId: string, chatId: string, lang: Lang, amount: number) {
  const res = await guarded(deps, chatId, lang, () => deps.backend.createTopUp(userId, amount));
  const t = T[lang];
  switch (res.result) {
    case 'OK':
      return send(deps, chatId, t.payment(res.topUp.amount, res.topUp.instructions), {
        parse_mode: 'HTML',
        reply_markup: cancelTopUpKeyboard(lang, res.topUp.id),
      });
    case 'NOT_LINKED':
      return send(deps, chatId, t.notLinked);
    case 'TOO_MANY_OPEN':
      return send(deps, chatId, t.tooManyOpen);
    case 'INVALID_AMOUNT': {
      const limits = await topUpLimits(deps, chatId, lang);
      return send(deps, chatId, t.invalidAmount(limits.min, limits.max));
    }
    default:
      return send(deps, chatId, t.methodUnavailable);
  }
}

async function showOrders(deps: Deps, userId: string, chatId: string, lang: Lang) {
  const res = await guarded(deps, chatId, lang, () => deps.backend.orders(userId));
  if (!res.linked) return send(deps, chatId, T[lang].notLinked);
  if (!res.orders.length) return send(deps, chatId, T[lang].noOrders);
  const lines = [T[lang].ordersTitle, ...res.orders.map((o) => `• ${o.code} — ${o.statusLabel} · ${money(o.totalSum, lang)}`)];
  return send(deps, chatId, lines.join('\n'));
}

let limitsCache: { value: TopUpMethods['limits']; at: number } | null = null;

/** Summa chegaralari backend'dan (5 daqiqa keshlanadi) */
async function topUpLimits(deps: Deps, chatId: string, lang: Lang) {
  if (limitsCache && Date.now() - limitsCache.at < LIMITS_TTL_MS) return limitsCache.value;
  const { limits } = await guarded(deps, chatId, lang, () => deps.backend.topUpMethods());
  limitsCache = { value: limits, at: Date.now() };
  return limits;
}

/** Faqat testlar uchun */
export const resetLimitsCache = () => {
  limitsCache = null;
};

function replyCode(deps: Deps, chatId: string, lang: Lang, res: CodeResult) {
  const t = LOGIN[lang];
  switch (res.result) {
    case 'CODE':
      return send(deps, chatId, t.code(res.code, res.maskedPhone, res.expiresInSec), { parse_mode: 'HTML', reply_markup: resendKeyboard(lang) });
    case 'PHONE_MISMATCH':
      return send(deps, chatId, t.phoneMismatch, { reply_markup: removeKeyboard });
    case 'COOLDOWN':
      return send(deps, chatId, t.cooldown(res.retryAfterSec));
    case 'LIMIT':
      return send(deps, chatId, t.limit, { reply_markup: removeKeyboard });
    case 'CONTACT_REQUIRED':
      return send(deps, chatId, t.contactRequired, { reply_markup: contactKeyboard(lang) });
    default:
      return send(deps, chatId, t.noChallenge, { reply_markup: removeKeyboard });
  }
}

/** Backend xatosida foydalanuvchiga umumiy xabar beriladi va qayta ishlash to'xtaydi */
async function guarded<T>(deps: Deps, chatId: string, lang: Lang, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    deps.log.error('backend so‘rovi muvaffaqiyatsiz', { error: errorMessage(err) });
    await send(deps, chatId, T[lang].failure);
    throw new Handled('backend');
  }
}

async function send(deps: Deps, chatId: string, body: string, options?: SendOptions) {
  try {
    await deps.tg.sendMessage(chatId, body, options);
  } catch (err) {
    // Bloklangan bot — oddiy holat; matn (kod bo'lishi mumkin) logga yozilmaydi
    const blocked = err instanceof TelegramError && err.blocked;
    deps.log.warn(blocked ? 'foydalanuvchi botni bloklagan' : 'xabar yuborilmadi', { error: errorMessage(err) });
  }
}
