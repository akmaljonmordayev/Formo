/**
 * Mobil ilova uchun Forma 360° viewer: bitta HTML (JS va 80 kadr data: URL ichida), JS moduli sifatida
 * mobile/src/components/ui/kit360/viewerHtml.js ga yoziladi.
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
<script>window.FORMO_FRAMES=${JSON.stringify(frames)}</script>
<script>${js}</script></body></html>
`;

const moduleText = `// AVTOMATIK YARATILGAN — tahrirlamang. Manba: frontend/src/pages/Superadmin/Kit360 (viewer/build.mjs)
// Admin paneldagi Forma 360° bilan bir xil chizish; WebView'ga lokal HTML sifatida beriladi (kadrlar ichida).
export default ${JSON.stringify(html)};
`;

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
  console.log(`kit360 viewer.html: ${(html.length / 1024).toFixed(0)} KB, kartalar: ${thumbFiles.length} surat (uzun yeng: ${longTeams.length})`);
}
