export type BotMode = 'polling' | 'webhook';

export interface Config {
  botToken: string;
  backendUrl: string;
  internalToken: string;
  mode: BotMode;
  webhookUrl: string;
  webhookSecret: string;
  webhookPath: string;
  port: number;
  outboxIntervalMs: number;
  /** Faqat testlar uchun (soxta Telegram server). Productionda berilmaydi */
  telegramApiBase: string;
}

const BOT_TOKEN = /^\d{5,}:[A-Za-z0-9_-]{30,}$/;
// Telegram secret_token: 1-256 belgi, A-Z a-z 0-9 _ -
const WEBHOOK_SECRET = /^[A-Za-z0-9_-]{32,256}$/;
const MIN_INTERNAL_TOKEN = 32;

/** Muhit o'zgaruvchilarini tekshiradi. Xato bo'lsa — barcha muammolar bitta xabarda (qiymatlarsiz) */
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const errors: string[] = [];
  const str = (k: string) => (env[k] ?? '').trim();

  const botToken = str('TELEGRAM_BOT_TOKEN');
  if (!BOT_TOKEN.test(botToken)) errors.push('TELEGRAM_BOT_TOKEN berilmagan yoki formati noto‘g‘ri (@BotFather tokeni)');

  const backendUrl = str('BACKEND_URL').replace(/\/+$/, '');
  if (!/^https?:\/\/[^/\s]+/.test(backendUrl)) errors.push('BACKEND_URL noto‘g‘ri (masalan http://localhost:3001/api)');

  const internalToken = str('TELEGRAM_INTERNAL_TOKEN');
  if (internalToken.length < MIN_INTERNAL_TOKEN) {
    errors.push(`TELEGRAM_INTERNAL_TOKEN kamida ${MIN_INTERNAL_TOKEN} belgi bo‘lishi kerak (backend bilan bir xil)`);
  }

  const mode = (str('BOT_MODE') || 'polling') as BotMode;
  if (mode !== 'polling' && mode !== 'webhook') errors.push('BOT_MODE faqat polling yoki webhook');

  const webhookUrl = str('TELEGRAM_WEBHOOK_URL');
  const webhookSecret = str('TELEGRAM_WEBHOOK_SECRET');
  const webhookPath = str('TELEGRAM_WEBHOOK_PATH') || '/telegram/webhook';
  if (mode === 'webhook') {
    if (!/^https:\/\/[^/\s]+/.test(webhookUrl)) errors.push('TELEGRAM_WEBHOOK_URL https:// bilan boshlanishi kerak');
    if (!WEBHOOK_SECRET.test(webhookSecret)) errors.push('TELEGRAM_WEBHOOK_SECRET: kamida 32 belgi, faqat A-Z a-z 0-9 _ -');
    if (!webhookPath.startsWith('/')) errors.push('TELEGRAM_WEBHOOK_PATH / bilan boshlanishi kerak');
  }

  const port = Number(str('PORT') || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('PORT noto‘g‘ri');

  const outboxIntervalMs = Number(str('OUTBOX_INTERVAL_MS') || 5000);
  if (!Number.isFinite(outboxIntervalMs) || outboxIntervalMs < 500) errors.push('OUTBOX_INTERVAL_MS kamida 500');

  const telegramApiBase = (str('TELEGRAM_API_BASE') || 'https://api.telegram.org').replace(/\/+$/, '');

  if (errors.length) throw new Error(`Bot sozlamalarida xato:\n  - ${errors.join('\n  - ')}`);
  return {
    botToken,
    backendUrl,
    internalToken,
    mode,
    webhookUrl,
    webhookSecret,
    webhookPath,
    port,
    outboxIntervalMs,
    telegramApiBase,
  };
}
