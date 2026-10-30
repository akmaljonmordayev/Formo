/**
 * Mobil ilova uchun Forma 360° viewer: bitta HTML (JS va 80 kadr data: URL ichida), JS moduli sifatida
 * mobile/src/components/ui/kit360/viewerHtml.js ga yoziladi.
 *
 *   node src/pages/Superadmin/Kit360/viewer/build.mjs          — yig'adi
 *   node src/pages/Superadmin/Kit360/viewer/build.mjs --check  — mobil nusxa manbaga mosligini tekshiradi
 */
import { build } from 'esbuild';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const framesDir = resolve(here, '../frames');
const mobileOut = resolve(here, '../../../../../../mobile/src/components/ui/kit360/viewerHtml.js');

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

const frames = {};
for (const team of (await readdir(framesDir)).sort()) {
  frames[team] = [];
  for (let i = 0; i < 8; i += 1) {
    const jpg = await readFile(resolve(framesDir, team, `f${i}.jpg`));
    frames[team].push(`data:image/jpeg;base64,${jpg.toString('base64')}`);
  }
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

if (process.argv.includes('--check')) {
  const current = await readFile(mobileOut, 'utf8').catch(() => '');
  if (current.replace(/\r\n/g, '\n') !== moduleText) {
    console.error('mobile/src/components/ui/kit360/viewerHtml.js eskirgan — Kit360/viewer/build.mjs ni ishga tushiring');
    process.exit(1);
  }
  console.log('kit360 viewerHtml.js manbaga mos');
} else {
  await mkdir(dirname(mobileOut), { recursive: true });
  await writeFile(mobileOut, moduleText);
  console.log(`kit360 viewer.html: ${(html.length / 1024).toFixed(0)} KB`);
}
