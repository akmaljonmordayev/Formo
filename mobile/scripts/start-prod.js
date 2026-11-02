/**
 * Expo'ni aniq bir backend bilan ishga tushiradi (mobile/.env dagi manzildan qat'i nazar):
 *
 *   npm run start:prod    — production API (https://api.formo.uz/api). Diqqat: baza haqiqiy.
 *   npm run start:local   — shu kompyuterdagi backend (Docker: docker compose --profile bot up -d).
 *                           "localhost" ni utils/apiUrl Metro xostiga (Wi-Fi IP) almashtiradi —
 *                           IP o'zgarsa ham telefon backendni topadi.
 *
 * Muhit o'zgaruvchisi mobile/.env dagidan ustun turadi (Expo .env mavjud qiymatni bosmaydi).
 * --clear: EXPO_PUBLIC_* bundle'ga yoziladi, eski manzil keshda qolmasin.
 */
const { spawn } = require('child_process');

const TARGETS = {
  prod: 'https://api.formo.uz/api',
  local: 'http://localhost:3001/api',
};
const args = process.argv.slice(2);
const target = args[0] === 'local' ? 'local' : 'prod';
const extra = args.filter((a) => a !== 'local' && a !== 'prod');

const env = { ...process.env, EXPO_PUBLIC_API_URL: TARGETS[target] };
console.log(`Formo mobil → ${target === 'local' ? 'lokal backend (shu kompyuter, :3001)' : `production API: ${TARGETS.prod}`}`);
const child = spawn('npx', ['expo', 'start', '--clear', ...extra], { stdio: 'inherit', env, shell: process.platform === 'win32' });
child.on('exit', (code) => process.exit(code ?? 0));
