import { KeyedQueue } from './keyed-queue';
import { errorMessage, Logger } from './log';
import { TelegramApi, TelegramError, TgUpdate } from './telegram';

const LONG_POLL_SEC = 30;
const ERROR_PAUSE_MS = 5000;
const MAX_ERROR_PAUSE_MS = 60_000;

/** Update qaysi foydalanuvchiniki — bir foydalanuvchining xabarlari tartib bilan qayta ishlanadi (polling va webhook'da) */
export function chatKey(update: TgUpdate): string {
  const id = update.message?.chat.id ?? update.callback_query?.from.id;
  return id === undefined ? `u${update.update_id}` : String(id);
}

/**
 * Partiyani qayta ishlaydi: turli foydalanuvchilar parallel (biri sekin backend so'rovida qolsa,
 * boshqalar kutib qolmaydi), bitta foydalanuvchiniki — kelgan tartibda.
 */
export async function processBatch(updates: TgUpdate[], process: (u: TgUpdate) => Promise<void>, log: Logger) {
  const queue = new KeyedQueue();
  await Promise.all(
    updates.map((update) =>
      queue.run(chatKey(update), () => process(update), (err) =>
        log.error('update qayta ishlanmadi', { updateId: update.update_id, error: errorMessage(err) }),
      ),
    ),
  );
}

/**
 * Long polling (lokal ishlab chiqish uchun). Offset partiya qayta ishlangandan keyin suriladi —
 * jarayon qulasa update qayta keladi (dedupe/idempotentlik ushlaydi).
 * Tarmoq uzilsa to'xtamaydi: kutish vaqti oshib boradi (5s → 60s) va ulanish tiklanganda davom etadi.
 */
/** Oxirgi muvaffaqiyatli getUpdates vaqti — watchdog va /health uchun */
export const pollingState: { lastOkAt: number; conflictSince: number | null } = { lastOkAt: Date.now(), conflictSince: null };

/** Polling shuncha vaqt muvaffaqiyatsiz/osilgan bo'lsa — jarayon o'zini o'ldiradi, Railway qayta ishga tushiradi */
export const POLL_STALE_MS = 5 * 60_000;
export const pollingStale = (now = Date.now()) => now - pollingState.lastOkAt > POLL_STALE_MS;

/**
 * 409 (boshqa bot nusxasi/webhook getUpdates bilan bir vaqtda ishlayapti) uzoq davom etsa — bu faqat
 * tarmoq blipi emas, balki numReplicas>1 yoki Railow tashqarisida qo'lda ishga tushirilgan ikkinchi nusxa.
 * Shu holatni umumiy 5 daqiqalik "osilib qolish" kutish vaqtidan ancha oldin, aniq sababi bilan aniqlaymiz —
 * jarayon tezroq va tushunarli xato bilan to'xtaydi, Railway/dashboard'da sabab ko'rinadi.
 */
export const CONFLICT_STALE_MS = 60_000;
export const pollingConflicted = (now = Date.now()) =>
  pollingState.conflictSince !== null && now - pollingState.conflictSince > CONFLICT_STALE_MS;

export async function runPolling(api: TelegramApi, process: (u: TgUpdate) => Promise<void>, log: Logger, signal: AbortSignal) {
  let offset = 0;
  let failures = 0;
  let webhookCleared = false;
  log.info('polling boshlandi');
  while (!signal.aborted) {
    try {
      // Webhook o'rnatilgan bo'lsa getUpdates 409 qaytaradi; ishga tushishda tarmoq bo'lmasa — keyin qayta urinamiz
      if (!webhookCleared) {
        await api.deleteWebhook();
        webhookCleared = true;
      }
      const updates = await api.getUpdates(offset, LONG_POLL_SEC, signal);
      pollingState.lastOkAt = Date.now();
      pollingState.conflictSince = null;
      if (failures) log.info('polling tiklandi', { afterFailures: failures });
      failures = 0;
      if (!updates.length) continue;
      // Har bir qayta ishlangan update — tiriklik belgisi: backend sekin bo'lsa uzun partiya watchdog'ni
      // bekorga ishga tushirib, offset saqlanmasdan qayta ishga tushish (va takroriy javoblar) bo'lmasin
      const tracked = (u: TgUpdate) =>
        process(u).finally(() => {
          pollingState.lastOkAt = Date.now();
        });
      await processBatch(updates, tracked, log);
      offset = updates[updates.length - 1].update_id + 1;
    } catch (err) {
      if (signal.aborted) break;
      failures++;
      const conflict = err instanceof TelegramError && err.code === 409;
      // 409: boshqa nusxa ishlayapti yoki webhook qolgan — keyingi aylanishda webhook'ni yana o'chiramiz
      if (conflict) {
        webhookCleared = false;
        if (pollingState.conflictSince === null) pollingState.conflictSince = Date.now();
      }
      log.warn(conflict ? 'boshqa bot nusxasi yoki webhook ishlayapti (409)' : 'getUpdates xatosi', { error: errorMessage(err), failures });
      const pause = Math.min(MAX_ERROR_PAUSE_MS, ERROR_PAUSE_MS * 2 ** Math.min(failures - 1, 4));
      await new Promise((r) => setTimeout(r, pause));
    }
  }
  log.info('polling to‘xtadi');
}
