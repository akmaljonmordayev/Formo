/**
 * dist/viewer.html — bitta faylli (JS, CSS, shriftlar ichida) 3D ko'rinish; internet kerak emas.
 * Mobil ilova endi 3D emas, Forma 360° suratlarini ko'rsatadi (frontend/.../Kit360/viewer/build.mjs) — nusxa yozilmaydi.
 *
 *   node scripts/build-viewer.mjs          — yig'adi va dist/viewer.html ni yozadi
 *   node scripts/build-viewer.mjs --check  — faqat yig'ilishini tekshiradi (CI)
 */
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STUDIO_BACKGROUND } from '../src/scene-background.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, '..');
const htmlOut = resolve(pkg, 'dist/viewer.html');

const result = await build({
  entryPoints: [resolve(pkg, 'src/viewer/main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2019'],
  write: false,
  outdir: resolve(pkg, 'dist/tmp'),
  // woff2 ichiga joylanadi; eski woff zaxirasi kerak emas (barcha WebView'lar woff2 ni biladi)
  loader: { '.woff2': 'dataurl', '.woff': 'empty' },
  legalComments: 'none',
  logLevel: 'warning',
});

const pick = (ext) => result.outputFiles.find((f) => f.path.endsWith(ext))?.text ?? '';
const js = pick('.js').replace(/<\/script/gi, '<\\/script');
const css = pick('.css');

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>${css}
html,body,#kit{margin:0;width:100%;height:100%;overflow:hidden;background:${STUDIO_BACKGROUND};-webkit-user-select:none;user-select:none}
#kit{position:relative}</style>
</head><body><div id="kit"></div><script>${js}</script></body></html>
`;

if (process.argv.includes('--check')) {
  if (!js) {
    console.error("viewer.html yig'ilmadi");
    process.exit(1);
  }
  console.log(`viewer.html yig'iladi: ${(html.length / 1024).toFixed(0)} KB`);
} else {
  await mkdir(dirname(htmlOut), { recursive: true });
  await writeFile(htmlOut, html);
  console.log(`viewer.html: ${(html.length / 1024).toFixed(0)} KB`);
}
