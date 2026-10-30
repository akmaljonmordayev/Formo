import { errorMessage, Logger } from './log';
import { TelegramApi, TelegramError, TgUpdate } from './telegram';

const LONG_POLL_SEC = 30;
const ERROR_PAUSE_MS = 5000;

/**
 * Long polling (lokal ishlab chiqish uchun). Update'lar ketma-ket qayta ishlanadi; offset faqat
 * qayta ishlangandan keyin suriladi — jarayon qulasa update qayta keladi (dedupe/idempotentlik ushlaydi).
 */
export async function runPolling(api: TelegramApi, process: (u: TgUpdate) => Promise<void>, log: Logger, signal: AbortSignal) {
  // Webhook o'rnatilgan bo'lsa getUpdates 409 qaytaradi
  await api.deleteWebhook();
  log.info('polling boshlandi');
  let offset = 0;
  while (!signal.aborted) {
    try {
      const updates = await api.getUpdates(offset, LONG_POLL_SEC, signal);
      for (const update of updates) {
        await process(update);
        offset = update.update_id + 1;
      }
    } catch (err) {
      if (signal.aborted) break;
      const conflict = err instanceof TelegramError && err.code === 409;
      log.warn(conflict ? 'boshqa bot nusxasi yoki webhook ishlayapti (409)' : 'getUpdates xatosi', { error: errorMessage(err) });
      await new Promise((r) => setTimeout(r, ERROR_PAUSE_MS));
    }
  }
  log.info('polling to‘xtadi');
}
