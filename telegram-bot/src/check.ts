import { loadConfig } from './config';
import { errorMessage } from './log';
import { TelegramApi } from './telegram';

/**
 * Ishga tushirishdan oldingi tekshiruv. Faqat o'qiydi: Telegram getMe va backend'ga zararsiz so'rov.
 * Sir qiymatlar chiqarilmaydi — faqat natija va bot username.
 */
async function main() {
  const config = loadConfig(process.env);
  console.log(`✔ sozlamalar to‘g‘ri (rejim: ${config.mode})`);
  let failed = false;

  try {
    const me = await new TelegramApi(config.botToken, config.telegramApiBase).call<{ username?: string; is_bot?: boolean }>('getMe', {}, { retries: 1 });
    if (!me?.is_bot || !me.username) throw new Error('getMe kutilmagan javob qaytardi');
    console.log(`✔ Telegram token yaroqli: @${me.username}`);
  } catch (err) {
    failed = true;
    console.log(`✖ Telegram token tekshiruvi: ${errorMessage(err)}`);
  }

  try {
    const health = await fetch(`${config.backendUrl}/health`, { signal: AbortSignal.timeout(5000) });
    console.log(`${health.ok ? '✔' : '✖'} backend /health: ${health.status}`);
    // Mavjud bo'lmagan Telegram ID uchun /stop — hech narsani o'zgartirmaydi, faqat token qabul qilinishini ko'rsatadi
    const res = await fetch(`${config.backendUrl}/internal/telegram/stop`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.internalToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramUserId: '0' }),
      signal: AbortSignal.timeout(5000),
    });
    const ok = res.status === 200;
    if (!ok) failed = true;
    console.log(`${ok ? '✔' : '✖'} backend ichki tokenni ${ok ? 'qabul qildi' : `rad etdi (${res.status}) — TELEGRAM_INTERNAL_TOKEN backend bilan bir xilmi?`}`);
  } catch (err) {
    failed = true;
    console.log(`✖ backend’ga ulanib bo‘lmadi (${config.backendUrl}): ${errorMessage(err)}`);
  }
  // process.exit() emas: Windows'da ochiq fetch ulanishlari bilan Node qulaydi (UV_HANDLE_CLOSING)
  process.exitCode = failed ? 1 : 0;
}

main().catch((err) => {
  console.error(errorMessage(err));
  process.exitCode = 1;
});
