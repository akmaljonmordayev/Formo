import { errorMessage, Logger } from './log';
import { TelegramApi, TelegramError, TgUpdate } from './telegram';

const LONG_POLL_SEC = 30;
const ERROR_PAUSE_MS = 5000;
const MAX_ERROR_PAUSE_MS = 60_000;

/** Update qaysi foydalanuvchiniki — bir foydalanuvchining xabarlari tartib bilan qayta ishlanadi */
function chatKey(update: TgUpdate): string {
  const id = update.message?.chat.id ?? update.callback_query?.from.id;
  return id === undefined ? `u${update.update_id}` : String(id);
}

/**
 * Partiyani qayta ishlaydi: turli foydalanuvchilar parallel (biri sekin backend so'rovida qolsa,
 * boshqalar kutib qolmaydi), bitta foydalanuvchiniki — kelgan tartibda.
 */
export async function processBatch(updates: TgUpdate[], process: (u: TgUpdate) => Promise<void>, log: Logger) {
  const chains = new Map<string, Promise<void>>();
  for (const update of updates) {
    const key = chatKey(update);
    const prev = chains.get(key) ?? Promise.resolve();
    chains.set(
      key,
      prev.then(() => process(update)).catch((err) => log.error('update qayta ishlanmadi', { updateId: update.update_id, error: errorMessage(err) })),
    );
  }
  await Promise.all(chains.values());
}

/**
 * Long polling (lokal ishlab chiqish uchun). Offset partiya qayta ishlangandan keyin suriladi —
 * jarayon qulasa update qayta keladi (dedupe/idempotentlik ushlaydi).
 * Tarmoq uzilsa to'xtamaydi: kutish vaqti oshib boradi (5s → 60s) va ulanish tiklanganda davom etadi.
 */
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
      if (failures) log.info('polling tiklandi', { afterFailures: failures });
      failures = 0;
      if (!updates.length) continue;
      await processBatch(updates, process, log);
      offset = updates[updates.length - 1].update_id + 1;
    } catch (err) {
      if (signal.aborted) break;
      failures++;
      const conflict = err instanceof TelegramError && err.code === 409;
      // 409: boshqa nusxa ishlayapti yoki webhook qolgan — keyingi aylanishda webhook'ni yana o'chiramiz
      if (conflict) webhookCleared = false;
      log.warn(conflict ? 'boshqa bot nusxasi yoki webhook ishlayapti (409)' : 'getUpdates xatosi', { error: errorMessage(err), failures });
      const pause = Math.min(MAX_ERROR_PAUSE_MS, ERROR_PAUSE_MS * 2 ** Math.min(failures - 1, 4));
      await new Promise((r) => setTimeout(r, pause));
    }
  }
  log.info('polling to‘xtadi');
}
