// Bot profilini sozlaydi: avatar (assets/avatar.jpg), tavsif, bio va buyruqlar — uz / ru / en.
// Qayta ishga tushirish xavfsiz (Telegram qiymatlarni almashtiradi). Token ekranga chiqarilmaydi.
//
//   npm run setup-profile
//   npm run setup-profile -- --no-photo   # avatarni o'zgartirmaslik
const { readFileSync } = require('fs');
const { join } = require('path');

const SITE = 'formo.uz';
const INSTAGRAM = '@formo_uz';

const PROFILE = {
  uz: {
    short: `Formo — futbol formalari ⚽️ Ilovaga kirish, balans va buyurtmalar.\n🌐 ${SITE} · 📸 Instagram: ${INSTAGRAM}`,
    description:
      'Formo rasmiy boti ⚽️\n\n' +
      '• Formo ilovasiga Telegram orqali kirish kodi\n' +
      '• Balansni ko‘rish va to‘ldirish\n' +
      '• Buyurtma holati haqida xabarlar\n\n' +
      `🌐 Sayt: ${SITE}\n📸 Instagram: ${INSTAGRAM}`,
    commands: { start: 'Boshlash', balance: 'Balans', topup: 'Balansni to‘ldirish', orders: 'Buyurtmalar', language: 'Tilni o‘zgartirish', stop: 'Xabarlarni o‘chirish' },
  },
  ru: {
    short: `Formo — футбольная форма ⚽️ Вход в приложение, баланс и заказы.\n🌐 ${SITE} · 📸 Instagram: ${INSTAGRAM}`,
    description:
      'Официальный бот Formo ⚽️\n\n' +
      '• Код для входа в приложение Formo через Telegram\n' +
      '• Баланс и пополнение\n' +
      '• Уведомления о статусе заказов\n\n' +
      `🌐 Сайт: ${SITE}\n📸 Instagram: ${INSTAGRAM}`,
    commands: { start: 'Начать', balance: 'Баланс', topup: 'Пополнить баланс', orders: 'Заказы', language: 'Сменить язык', stop: 'Отключить уведомления' },
  },
  en: {
    short: `Formo — football kits ⚽️ App sign-in, balance and orders.\n🌐 ${SITE} · 📸 Instagram: ${INSTAGRAM}`,
    description:
      'Official Formo bot ⚽️\n\n' +
      '• Sign-in code for the Formo app via Telegram\n' +
      '• Check and top up your balance\n' +
      '• Order status notifications\n\n' +
      `🌐 Website: ${SITE}\n📸 Instagram: ${INSTAGRAM}`,
    commands: { start: 'Start', balance: 'Balance', topup: 'Top up balance', orders: 'Orders', language: 'Change language', stop: 'Turn off notifications' },
  },
};

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN topilmadi (telegram-bot/.env)');
  process.exit(1);
}
const base = `${(process.env.TELEGRAM_API_BASE || 'https://api.telegram.org').replace(/\/+$/, '')}/bot${token}`;

async function call(method, body) {
  const res = await fetch(`${base}/${method}`, body instanceof FormData ? { method: 'POST', body } : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) throw new Error(`${method}: ${json.description || res.status}`);
  return json.result;
}

async function main() {
  for (const [lang, p] of Object.entries(PROFILE)) {
    if (p.short.length > 120) throw new Error(`${lang}: bio 120 belgidan uzun (${p.short.length})`);
    const commands = Object.entries(p.commands).map(([command, description]) => ({ command, description }));
    // uz — standart (til kodi berilmagan foydalanuvchilar uchun ham)
    for (const language_code of lang === 'uz' ? ['', 'uz'] : [lang]) {
      const scope = language_code ? { language_code } : {};
      await call('setMyShortDescription', { short_description: p.short, ...scope });
      await call('setMyDescription', { description: p.description, ...scope });
      await call('setMyCommands', { commands, ...scope });
    }
    console.log(`✔ ${lang}: bio, tavsif va buyruqlar`);
  }

  if (!process.argv.includes('--no-photo')) {
    const form = new FormData();
    form.append('photo', JSON.stringify({ type: 'static', photo: 'attach://avatar' }));
    form.append('avatar', new Blob([readFileSync(join(__dirname, '..', 'assets', 'avatar.jpg'))], { type: 'image/jpeg' }), 'avatar.jpg');
    await call('setMyProfilePhoto', form);
    console.log('✔ avatar: Formo logotipi');
  }
}

main().catch((err) => {
  console.error(`✖ ${err.message}`);
  process.exit(1);
});
