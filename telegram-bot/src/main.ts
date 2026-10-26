import { BackendClient } from './backend';
import { loadConfig } from './config';
import { RecentIds } from './dedupe';
import { handleUpdate } from './handlers';
import { createLogger, errorMessage } from './log';
import { startOutboxLoop } from './outbox';
import { runPolling } from './polling';
import { createBotServer } from './server';
import { UserSessions } from './session';
import { TelegramApi, TgUpdate } from './telegram';

async function main() {
  const config = loadConfig(process.env);
  const log = createLogger([config.botToken, config.internalToken, config.webhookSecret]);
  const tg = new TelegramApi(config.botToken, config.telegramApiBase);
  const backend = new BackendClient(config.backendUrl, config.internalToken);
  const deps = { tg, backend, log, dedupe: new RecentIds(), sessions: new UserSessions() };
  const process_ = (u: TgUpdate) => handleUpdate(u, deps);

  const server = createBotServer({
    webhook: config.mode === 'webhook' ? { path: config.webhookPath, secret: config.webhookSecret } : undefined,
    process: process_,
    log,
  });
  await new Promise<void>((resolve) => server.listen(config.port, resolve));
  log.info('bot ishga tushdi', { mode: config.mode, port: config.port });

  const abort = new AbortController();
  const stopOutbox = startOutboxLoop(backend, tg, log, config.outboxIntervalMs);

  if (config.mode === 'webhook') {
    await tg.setWebhook(config.webhookUrl, config.webhookSecret);
    log.info('webhook o‘rnatildi');
  } else {
    void runPolling(tg, process_, log, abort.signal);
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
