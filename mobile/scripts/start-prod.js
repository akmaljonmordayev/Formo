/**
 * Expo'ni production API (https://api.formo.uz/api) bilan ishga tushiradi — backend, Docker, Postgres
 * va mobile/.env kerak emas. Diqqat: baza haqiqiy (buyurtmalar operatorga tushadi).
 *
 *   npm run start:prod            (mobile/ ichida)
 *   npm run mobile                (loyiha ildizida)
 *
 * Muhit o'zgaruvchisi mobile/.env dagidan ustun turadi (Expo .env mavjud qiymatni bosmaydi).
 * --clear: EXPO_PUBLIC_* bundle'ga yoziladi, eski lokal IP keshda qolmasin.
 */
const { spawn } = require('child_process');

const env = { ...process.env, EXPO_PUBLIC_API_URL: 'https://api.formo.uz/api' };
const args = ['expo', 'start', '--clear', ...process.argv.slice(2)];

console.log('Formo mobil → production API: https://api.formo.uz/api');
const child = spawn('npx', args, { stdio: 'inherit', env, shell: process.platform === 'win32' });
child.on('exit', (code) => process.exit(code ?? 0));
