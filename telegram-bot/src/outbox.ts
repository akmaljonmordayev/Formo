import { Backend, OutboxResult } from './backend';
import { errorMessage, Logger } from './log';
import { TelegramError } from './telegram';

export interface OutboxSender {
  sendMessage(chatId: string, text: string, options?: object, retries?: number): Promise<unknown>;
}

export const OUTBOX_BATCH = 20;

/** Telegram xatosini backend uchun natijaga aylantiradi */
export function classify(err: unknown): OutboxResult {
  if (!(err instanceof TelegramError)) return 'RETRY';
  if (err.blocked) return 'BLOCKED';
  if (err.code === 400) return 'FAILED'; // chat topilmadi va h.k. — qayta urinish foyda bermaydi
  return 'RETRY';
}

/** Navbatdan bir partiya xabar oladi va yuboradi. Qaytaradi: olingan xabarlar soni */
export async function drainOutbox(backend: Backend, tg: OutboxSender, log: Logger): Promise<number> {
  const batch = await backend.leaseOutbox(OUTBOX_BATCH);
  for (const msg of batch) {
    let result: OutboxResult = 'SENT';
    let error: string | undefined;
    try {
      await tg.sendMessage(msg.chatId, msg.text, {}, 1);
    } catch (err) {
      result = classify(err);
      error = err instanceof TelegramError ? `${err.code} ${err.description}` : errorMessage(err);
    }
    // Natija yetib bormasa — lease tugagach xabar qayta yuboriladi ("kamida bir marta")
    await backend.reportOutbox(msg.id, result, error).catch((err) => log.warn('outbox natijasi yuborilmadi', { id: msg.id, error: errorMessage(err) }));
    if (result !== 'SENT') log.warn('outbox xabari yuborilmadi', { id: msg.id, result });
  }
  return batch.length;
}

/** Davriy ishchi. To'liq partiya kelsa — kutmasdan keyingisini oladi */
export function startOutboxLoop(backend: Backend, tg: OutboxSender, log: Logger, intervalMs: number) {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  const tick = async () => {
    let delay = intervalMs;
    try {
      if ((await drainOutbox(backend, tg, log)) >= OUTBOX_BATCH) delay = 0;
    } catch (err) {
      log.warn('outbox navbatini olib bo‘lmadi', { error: errorMessage(err) });
    }
    if (!stopped) timer = setTimeout(tick, delay);
  };
  timer = setTimeout(tick, 0);
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
