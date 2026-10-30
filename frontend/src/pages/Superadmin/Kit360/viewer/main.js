/* Mobil ilova uchun Forma 360° — admin sahifasidagi bilan bir xil chizish (render.js), WebView ichidagi lokal HTML.
   Kadrlar HTML ichida (data: URL, tarmoq kerak emas); shriftlar Google Fonts'dan, internet bo'lmasa — tizim shrifti.

   Ilova → viewer:  { source, type: 'update', team, name, number, side?: 'front' | 'back', font?: id }
   Viewer → ilova:  { source, type: 'ready' } · { source, type: 'face', view } · { source, type: 'error', message } */
import { BACK_FRAMES } from '../measure';
import { FONTS, FONTS_CSS, FONT_SAMPLE, H, N, TEAMS, W, fontCss, layerCache, paint, ready } from '../render';

export const SOURCE = 'formo-kit360';
const FRAMES = window.FORMO_FRAMES || {};

const canvas = document.getElementById('kit');
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = Math.round(W * dpr);
canvas.height = Math.round(H * dpr);

const state = { team: TEAMS[0], frame: 4, name: '', number: '', font: FONTS[0] };
const images = {};
let face = null;

function post(msg) {
  const text = JSON.stringify({ source: SOURCE, ...msg });
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
  else if (window.parent !== window) window.parent.postMessage(text, '*');
}

function image(id, i) {
  const key = `${id}/${i}`;
  if (!images[key]) {
    const im = new Image();
    im.onload = draw;
    im.onerror = () => post({ type: 'error', message: `frame ${key}` });
    im.src = FRAMES[id]?.[i] ?? '';
    images[key] = im;
  }
  return images[key];
}

function draw() {
  const { team } = state;
  const img = image(team.id, state.frame);
  const back = image(team.id, 4);
  if (!ready(img)) return;
  paint(
    canvas,
    img,
    state.frame,
    {
      name: state.name.trim().replace(/\s+/g, ' '),
      number: state.number,
      team,
      style: { font: state.font, scale: 1, nameColor: team.ink, numberColor: team.ink },
    },
    ready(back) ? back : null,
  );
  // Old/Orqa tugmalari ilovada barmoq bilan aylantirishga mos tursin
  const now = state.frame in BACK_FRAMES ? 'back' : 'front';
  if (now !== face) {
    face = now;
    post({ type: 'face', view: now });
  }
}

function update(msg) {
  const team = TEAMS.find((t) => t.id === msg.team);
  if (!team) return post({ type: 'error', message: `team ${msg.team}` });
  if (team !== state.team) for (let i = 0; i < N; i += 1) image(team.id, i);
  state.team = team;
  state.name = String(msg.name ?? '');
  state.number = String(msg.number ?? '');
  state.font = FONTS.find((f) => f.id === msg.font) ?? state.font;
  // Ilova tomonni almashtirsa (Old/Orqa yoki ism maydoniga bosilsa) — o'sha tomonga buriladi; aylantirilgan burchak saqlanadi
  if (msg.side === 'back' && !(state.frame in BACK_FRAMES)) state.frame = 4;
  if (msg.side === 'front' && state.frame in BACK_FRAMES) state.frame = 0;
  loadFonts();
  draw();
  return undefined;
}

function onMessage(e) {
  let msg = e.data;
  try {
    if (typeof msg === 'string') msg = JSON.parse(msg);
  } catch {
    return;
  }
  if (msg?.source === SOURCE && msg.type === 'update') update(msg);
}
window.addEventListener('message', onMessage);
document.addEventListener('message', onMessage); // Android WebView

// Barmoq bilan aylantirish: 40 px — bitta burchak (45°)
let dragX = null;
canvas.addEventListener('pointerdown', (e) => {
  dragX = e.clientX;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (dragX === null) return;
  const dx = e.clientX - dragX;
  if (Math.abs(dx) < 40) return;
  state.frame = (state.frame + (dx < 0 ? 1 : -1) + N) % N;
  dragX = e.clientX;
  draw();
});
const stop = () => {
  dragX = null;
};
canvas.addEventListener('pointerup', stop);
canvas.addEventListener('pointercancel', stop);

// Shriftlar: stylesheet yuklangach, aynan chizilayotgan harflar bilan (kirill .woff2 bo'laklari ham keladi)
const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: FONTS_CSS });
let cssReady = false;
link.onload = () => {
  cssReady = true;
  loadFonts();
};
document.head.appendChild(link);
function loadFonts() {
  if (cssReady && document.fonts) document.fonts.load(fontCss(state.font, 48), `${state.name} ${state.number} ${FONT_SAMPLE}`).catch(() => {});
}
document.fonts?.addEventListener('loadingdone', () => {
  layerCache.clear();
  draw();
});

for (let i = 0; i < N; i += 1) image(state.team.id, i);
post({ type: 'ready' });
