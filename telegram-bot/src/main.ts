import { BackendClient } from './backend';
import { loadConfig } from './config';
import { RecentIds } from './dedupe';
import { handleUpdate } from './handlers';
import { createLogger, errorMessage } from './log';
import { startOutboxLoop } from './outbox';
import { pollingConflicted, pollingStale, runPolling } from './polling';
import { RateLimiter } from './ratelimit';
import { createBotServer } from './server';
import { UserSessions } from './session';
import { TelegramApi, TgUpdate } from './telegram';

async function main() {
  const config = loadConfig(process.env);
  const log = createLogger([config.botToken, config.internalToken, config.webhookSecret]);
  const tg = new TelegramApi(config.botToken, config.telegramApiBase);
  const backend = new BackendClient(config.backendUrl, config.internalToken);
  const deps = { tg, backend, log, dedupe: new RecentIds(), sessions: new UserSessions(), limiter: new RateLimiter() };
  const process_ = (u: TgUpdate) => handleUpdate(u, deps);

  const server = createBotServer({
    webhook: config.mode === 'webhook' ? { path: config.webhookPath, secret: config.webhookSecret } : undefined,
    process: process_,
    log,
    unhealthy: config.mode === 'polling' ? () => pollingStale() : undefined,
  });
  await new Promise<void>((resolve) => server.listen(config.port, resolve));
  log.info('bot ishga tushdi', { mode: config.mode, port: config.port });

  const abort = new AbortController();
  const stopOutbox = startOutboxLoop(backend, tg, log, config.outboxIntervalMs);

  // Ushlanmagan promise — logga yozamiz va ishlashda davom etamiz (holat buzilmaydi)
  process.on('unhandledRejection', (err) => log.error('ushlanmagan promise xatosi', { error: errorMessage(err) }));
  // Sinxron ushlanmagan xatodan keyin jarayon holati noaniq (yarim yozilgan sessiya, to'xtagan tsikl) —
  // logga yozib chiqamiz, Railway/Docker restart siyosati botni toza holatda qayta ko'taradi
  process.on('uncaughtException', (err) => {
    log.error('ushlanmagan xato — qayta ishga tushirilmoqda', { error: errorMessage(err) });
    setTimeout(() => process.exit(1), 500).unref();
  });

  if (config.mode === 'webhook') {
    await tg.setWebhook(config.webhookUrl, config.webhookSecret);
    log.info('webhook o‘rnatildi');
  } else {
    // Polling to'xtasa yoki osilib qolsa jarayon tirik, lekin bot "o'lik" bo'lib qolardi. Railway faqat jarayon
    // tugaganda qayta ishga tushiradi — shuning uchun o'zimiz chiqamiz (exit 1) va bot toza holatda qayta ko'tariladi
    const exitStale = (reason: string) => {
      log.error('bot javob bermayapti — qayta ishga tushirilmoqda', { reason });
      setTimeout(() => process.exit(1), 500).unref();
    };
    runPolling(tg, process_, log, abort.signal)
      .catch((err) => log.error('polling to‘xtadi', { error: errorMessage(err) }))
      .finally(() => {
        if (!abort.signal.aborted) exitStale('polling tsikli tugadi');
      });
    setInterval(() => {
      // 409 — boshqa bot nusxasi (yoki eskirgan webhook) getUpdates bilan bir vaqtda ishlayapti.
      // Umumiy 5 daqiqalik "osilib qolish" tekshiruvidan oldin, aniq va baland ovozda to'xtaymiz —
      // Railway loglarida/dashboard'da sabab darhol ko'rinadi, cheksiz tinch-sokin qayta urinish bo'lmaydi.
      // ESLATMA: bu faqat reaktiv himoya (xato ro'y bergandan keyin tez to'xtash) — haqiqiy oldini olish
      // Railway'ning `numReplicas: 1` sozlamasiga bog'liq (telegram-bot/railway.json); yangi DB/Redis asosidagi
      // tarqatilgan lock bu o'zgarishga kiritilmagan (qo'shimcha infra kerak bo'lardi).
      if (pollingConflicted()) {
        exitStale('boshqa bot nusxasi (yoki webhook) ishlayapti — 409 xatosi 60s dan ortiq davom etdi');
        return;
      }
      if (pollingStale()) exitStale('getUpdates uzoq vaqt muvaffaqiyatsiz');
    }, 30_000).unref();
  }

  const shutdown = (signal: string) => {
    log.info('to‘xtatilmoqda', { signal });
    abort.abort();
    stopOutbox();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  // Sozlama xatosi xabarida qiymatlar yo'q, faqat o'zgaruvchi nomlari
  process.stderr.write(`${errorMessage(err)}\n`);
  process.exit(1);
});
