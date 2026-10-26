// Muhit fayllarini tayyorlaydi. Sir qiymatlar ekranga chiqarilmaydi.
//
//   npm run init-env                 # local (Docker'siz): backend/.env + telegram-bot/.env + mobile/.env
//   npm run init-env -- --docker     # docker: ildizdagi .env (docker compose shu yerdan oladi)
//
// Qoidalar:
//  - mavjud qatorlar hech qachon o'zgartirilmaydi — faqat yo'q kalitlar qo'shiladi;
//  - local rejimda qiymatlar avval ildizdagi .env dan olinadi (Docker uchun allaqachon kiritilgan
//    TELEGRAM_BOT_TOKEN, TELEGRAM_INTERNAL_TOKEN va h.k.), bo'lmasa docker-compose.yml dagi dev standartlari;
//  - TELEGRAM_INTERNAL_TOKEN hamma faylda bir xil (backend va bot uchun shart);
//  - JWT_ACCESS_SECRET topilmasa yangi tasodifiy qiymat yaratiladi.
const { existsSync, readFileSync, writeFileSync } = require('fs');
const { randomBytes } = require('crypto');
const { networkInterfaces } = require('os');
const { join } = require('path');

const repo = join(__dirname, '..', '..');
const docker = process.argv.includes('--docker');

const parse = (text) =>
  Object.fromEntries(
    String(text || '')
      .split(/\r?\n/)
      .map((l) => /^\s*([A-Z0-9_]+)\s*=(.*)$/.exec(l))
      .filter(Boolean)
      .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]),
  );
const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : null);

/** Telefon Wi-Fi orqali ulanadigan IPv4 (virtual adapterlar — vEthernet/WSL/VirtualBox — chetlab o'tiladi) */
function lanIp() {
  const candidates = Object.entries(networkInterfaces())
    .filter(([name]) => !/vEthernet|WSL|VirtualBox|VMware|Loopback|Hyper-V/i.test(name))
    .flatMap(([, list]) => list || [])
    .filter((a) => a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.'));
  const priv = candidates.find((a) => /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))\./.test(a.address));
  return (priv || candidates[0])?.address ?? 'localhost';
}

const rootFile = join(repo, '.env');
const root = docker ? {} : parse(read(rootFile));

const targets = docker
  ? [{ file: rootFile, keys: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_BOT_USERNAME', 'TELEGRAM_INTERNAL_TOKEN'] }]
  : [
      {
        file: join(repo, 'backend', '.env'),
        keys: [
          'PORT', 'NODE_ENV', 'DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_ACCESS_EXPIRES_IN', 'REFRESH_TOKEN_TTL_DAYS',
          'SUPERADMIN_PHONE', 'SUPERADMIN_PASSWORD', 'SUPERADMIN_NAME', 'FRONTEND_URL',
          'TELEGRAM_BOT_USERNAME', 'TELEGRAM_INTERNAL_TOKEN', 'TELEGRAM_BOT_TOKEN',
        ],
      },
      { file: join(repo, 'telegram-bot', '.env'), keys: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_INTERNAL_TOKEN', 'BACKEND_URL', 'BOT_MODE'] },
      { file: join(repo, 'mobile', '.env'), keys: ['EXPO_PUBLIC_API_URL'] },
    ];

const files = targets.map((t) => ({ ...t, text: read(t.file) }));
const anyFile = (key) => [root, ...files.map((f) => parse(f.text))].map((v) => v[key]).find((v) => v);
const strong = (v) => (v && v.length >= 32 ? v : undefined);

// docker-compose.yml dagi dev standartlari (repoda ochiq — faqat lokal ishlab chiqish uchun)
const defaults = {
  PORT: '3001',
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://formo:formo@localhost:5435/formo?schema=public',
  JWT_ACCESS_SECRET: strong(anyFile('JWT_ACCESS_SECRET')) ?? randomBytes(32).toString('hex'),
  JWT_ACCESS_EXPIRES_IN: anyFile('JWT_ACCESS_EXPIRES_IN') ?? '15m',
  REFRESH_TOKEN_TTL_DAYS: anyFile('REFRESH_TOKEN_TTL_DAYS') ?? '30',
  SUPERADMIN_PHONE: anyFile('SUPERADMIN_PHONE') ?? '+998901111111',
  SUPERADMIN_PASSWORD: anyFile('SUPERADMIN_PASSWORD') ?? 'admin123',
  SUPERADMIN_NAME: anyFile('SUPERADMIN_NAME') ?? 'Super Admin',
  FRONTEND_URL: 'http://localhost:5173,http://localhost:8081,http://localhost:19006',
  TELEGRAM_BOT_TOKEN: anyFile('TELEGRAM_BOT_TOKEN') ?? '',
  TELEGRAM_BOT_USERNAME: anyFile('TELEGRAM_BOT_USERNAME') ?? 'formo_kit_bot',
  TELEGRAM_INTERNAL_TOKEN: strong(anyFile('TELEGRAM_INTERNAL_TOKEN')) ?? randomBytes(32).toString('hex'),
  BACKEND_URL: 'http://localhost:3001/api',
  BOT_MODE: 'polling',
  EXPO_PUBLIC_API_URL: `http://${lanIp()}:3001/api`,
};

for (const f of files) {
  const present = parse(f.text);
  const rel = f.file.slice(repo.length + 1);
  if (present.TELEGRAM_INTERNAL_TOKEN !== undefined && present.TELEGRAM_INTERNAL_TOKEN.length < 32) {
    console.log(`! ${rel}: TELEGRAM_INTERNAL_TOKEN 32 belgidan qisqa — qo'lda almashtiring`);
  }
  const missing = f.keys.filter((k) => present[k] === undefined);
  if (!missing.length) {
    console.log(`= ${rel}: kerakli kalitlar allaqachon bor, o'zgartirilmadi`);
    continue;
  }
  const block = ['# Formo lokal sozlamalari (telegram-bot/scripts/init-env.js)', ...missing.map((k) => `${k}=${defaults[k]}`), ''].join('\n');
  const base = f.text ?? '';
  writeFileSync(f.file, (base && !base.endsWith('\n') ? `${base}\n\n` : base ? '\n' : '') + block, { mode: 0o600 });
  console.log(`+ ${rel}: qo'shildi ${missing.join(', ')}`);
}

if (!docker) {
  const fromRoot = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_INTERNAL_TOKEN'].filter((k) => root[k]);
  if (fromRoot.length) console.log(`\nIldizdagi .env dan olindi: ${fromRoot.join(', ')}`);
  console.log(`Mobil ilova manzili: ${defaults.EXPO_PUBLIC_API_URL}`);
}
if (!defaults.TELEGRAM_BOT_TOKEN) {
  const tokenFile = docker ? '.env (repo ildizi)' : 'telegram-bot/.env va backend/.env';
  console.log(`\nKeyingi qadam: ${tokenFile} faylida TELEGRAM_BOT_TOKEN= dan keyin BotFather bergan tokenni qo'ying.`);
}
