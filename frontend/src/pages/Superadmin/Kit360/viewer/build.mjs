/**
 * Mobil ilova uchun Forma 360° viewer: kadrlarsiz yengil HTML (mobile/src/components/ui/kit360/viewerHtml.js) va
 * har jamoaning kadrlari alohida modulda (kit360/frames/<id>.js, data: URL). Ilova viewer'ga faqat ko'rsatilayotgan
 * jamoaning kadrlarini "update" xabarida yuboradi — WebView har ochilishda barcha jamoalarning ~6.7 MB kadrini emas,
 * ~0.2 MB HTML va bitta jamoaning ~0.5 MB kadrini o'qiydi.
 * Uzun yeng (l*) kadrlari faqat mobil KIT360_LONG ro'yxatidagi jamoalar uchun olinadi (ilova bilan bir xil manba).
 *
 *   node src/pages/Superadmin/Kit360/viewer/build.mjs          — yig'adi
 *   node src/pages/Superadmin/Kit360/viewer/build.mjs --check  — mobil nusxa manbaga mosligini tekshiradi
 */
import { createRequire } from 'node:module';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// esbuild frontend'ning to'g'ridan-to'g'ri bog'liqligi emas (pnpm uni ko'tarmaydi) — vite ichidagisini olamiz
const require = createRequire(import.meta.url);
const { build } = await import('esbuild').catch(() => createRequire(require.resolve('vite'))('esbuild'));
const framesDir = resolve(here, '../frames');
const mobileOut = resolve(here, '../../../../../../mobile/src/components/ui/kit360/viewerHtml.js');
// Katalog kartalari uchun old tomon surati (f0) — mobile/assets/kit360/<id>.jpg va require() xaritasi
const thumbsDir = resolve(here, '../../../../../../mobile/assets/kit360');
const thumbsOut = resolve(here, '../../../../../../mobile/src/components/ui/kit360/thumbs.js');
const framesOutDir = resolve(here, '../../../../../../mobile/src/components/ui/kit360/frames');
// Uzun yeng ilovada yoqilgan jamoalar — mobile/src/features/kit360/index.js KIT360_LONG
const kit360Src = await readFile(resolve(here, '../../../../../../mobile/src/features/kit360/index.js'), 'utf8');
const LONG_ENABLED = JSON.parse(kit360Src.match(/export const KIT360_LONG = (\[[^\]]*\]);/)[1].replace(/'/g, '"'));

const result = await build({
  entryPoints: [resolve(here, 'main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2019'],
  write: false,
  legalComments: 'none',
  logLevel: 'warning',
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

// frames[team] = { f: 8 kadr (kalta yeng + shortik), l?: 8 kadr (uzun yeng + shalvar — suratlari bor jamoalarda) }
const frames = {};
const longTeams = [];
for (const team of (await readdir(framesDir)).sort()) {
  const files = new Set(await readdir(resolve(framesDir, team)));
  frames[team] = {};
  for (const v of ['f', 'l']) {
    if (!files.has(`${v}0.jpg`)) continue;
    if (v === 'l' && !LONG_ENABLED.includes(team)) continue;
    frames[team][v] = [];
    for (let i = 0; i < 8; i += 1) {
      const jpg = await readFile(resolve(framesDir, team, `${v}${i}.jpg`));
      frames[team][v].push(`data:image/jpeg;base64,${jpg.toString('base64')}`);
    }
  }
  if (frames[team].l) longTeams.push(team);
}

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#b8b8ba;-webkit-user-select:none;user-select:none}
#kit{display:block;width:100%;height:100%;object-fit:contain;touch-action:pan-y}</style>
</head><body><canvas id="kit"></canvas>
<script>${js}</script></body></html>
`;

const moduleText = `// AVTOMATIK YARATILGAN — tahrirlamang. Manba: frontend/src/pages/Superadmin/Kit360 (viewer/build.mjs)
// Admin paneldagi Forma 360° bilan bir xil chizish; WebView'ga lokal HTML sifatida beriladi. Kadrlar — kit360/frames
// (ilova faqat kerakli jamoanikini "update" xabarida yuboradi).
export default ${JSON.stringify(html)};
`;

// Har jamoa — alohida modul; index faqat require() xaritasi: modul birinchi kerak bo'lganda baholanadi
const frameModules = Object.entries(frames).map(([team, sets]) => ({
  file: resolve(framesOutDir, `${team}.js`),
  text: `// AVTOMATIK YARATILGAN — tahrirlamang (Kit360/viewer/build.mjs). ${team}: { f: kalta yeng, l?: uzun yeng } — 8 kadrdan\nexport default ${JSON.stringify(sets)};\n`,
}));
frameModules.push({
  file: resolve(framesOutDir, 'index.js'),
  text: `// AVTOMATIK YARATILGAN — tahrirlamang (Kit360/viewer/build.mjs).
// Jamoa kadrlari kerak bo'lganda yuklanadi: framesOf('ar') -> { f: [8 ta data: URL], l?: [...] } | null
/* eslint-disable global-require */
const LOADERS = {
${Object.keys(frames).map((t) => `  ${JSON.stringify(t)}: () => require('./${t}').default,`).join('\n')}
};
const cache = {};
export function framesOf(team) {
  if (!LOADERS[team]) return null;
  if (!cache[team]) cache[team] = LOADERS[team]();
  return cache[team];
}
export const FRAME_TEAMS = Object.keys(LOADERS);
`,
});

const teams = Object.keys(frames);
// Kartalar surati: <id>.jpg — f0 (kalta yeng), <id>_l.jpg — l0 (uzun yeng)
const thumbFiles = [
  ...teams.map((id) => ({ key: id, file: `${id}.jpg`, src: resolve(framesDir, id, 'f0.jpg') })),
  ...longTeams.map((id) => ({ key: `${id}_l`, file: `${id}_l.jpg`, src: resolve(framesDir, id, 'l0.jpg') })),
].sort((a, b) => a.key.localeCompare(b.key));
const thumbsText = `// AVTOMATIK YARATILGAN — tahrirlamang. Manba: frontend/src/pages/Superadmin/Kit360/frames/<id>/f0.jpg, l0.jpg (viewer/build.mjs)
// Forma 360° jamoalarining old tomon surati — katalog, bosh sahifa, savat va buyurtma kartalari uchun.
// <id> — kalta yeng + shortik, <id>_l — uzun yeng + shalvar (suratlari bor jamoalarda).
/* eslint-disable global-require */
export default {
${thumbFiles.map((t) => `  ${JSON.stringify(t.key)}: require('../../../../assets/kit360/${t.file}'),`).join('\n')}
};

/** Uzun yeng + shalvar suratlari bor jamoalar */
export const LONG_TEAMS = ${JSON.stringify(longTeams)};
`;

if (process.argv.includes('--check')) {
  const stale = [];
  const current = await readFile(mobileOut, 'utf8').catch(() => '');
  if (current.replace(/\r\n/g, '\n') !== moduleText) stale.push('mobile/src/components/ui/kit360/viewerHtml.js');
  const thumbs = await readFile(thumbsOut, 'utf8').catch(() => '');
  if (thumbs.replace(/\r\n/g, '\n') !== thumbsText) stale.push('mobile/src/components/ui/kit360/thumbs.js');
  for (const t of thumbFiles) {
    const [src, copy] = await Promise.all([readFile(t.src), readFile(resolve(thumbsDir, t.file)).catch(() => null)]);
    if (!copy || !src.equals(copy)) stale.push(`mobile/assets/kit360/${t.file}`);
  }
  for (const m of frameModules) {
    const text = await readFile(m.file, 'utf8').catch(() => '');
    if (text.replace(/\r\n/g, '\n') !== m.text) stale.push(m.file);
  }
  if (stale.length) {
    console.error(`${stale.join(', ')} eskirgan — Kit360/viewer/build.mjs ni ishga tushiring`);
    process.exit(1);
  }
  console.log('kit360 viewerHtml.js va kartalar surati manbaga mos');
} else {
  await mkdir(dirname(mobileOut), { recursive: true });
  await writeFile(mobileOut, moduleText);
  await mkdir(thumbsDir, { recursive: true });
  for (const t of thumbFiles) await writeFile(resolve(thumbsDir, t.file), await readFile(t.src));
  await writeFile(thumbsOut, thumbsText);
  await mkdir(framesOutDir, { recursive: true });
  for (const m of frameModules) await writeFile(m.file, m.text);
  const biggest = Math.max(...frameModules.map((m) => m.text.length));
  console.log(
    `kit360 viewer.html: ${(html.length / 1024).toFixed(0)} KB, jamoa kadrlari: ${frameModules.length - 1} modul ` +
      `(eng kattasi ${(biggest / 1024).toFixed(0)} KB), kartalar: ${thumbFiles.length} surat (uzun yeng: ${longTeams.length})`,
  );
}
