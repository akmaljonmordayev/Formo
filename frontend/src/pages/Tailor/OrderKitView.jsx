import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';
import { FONTS, FONTS_CSS, FONT_SAMPLE, H, N, TEAMS, W, fontCss, layerCache, paint, ready } from '../Superadmin/Kit360/render';
import { JerseyPreview } from './ui';
import { useT } from './i18n';
import { cx } from './utils';

/* Forma surati admin paneldagi "Forma 360°" bilan bir xil: har jamoa uchun 8 burchakli surat, ism va raqam formaga bosiladi */
const FRAMES = import.meta.glob('../Superadmin/Kit360/frames/*/*.jpg', { eager: true, query: '?url', import: 'default' });
// v: 'f' — kalta yeng + shortik, 'l' — uzun yeng + shalvar (suratlari yo'q jamoada — 'f')
export const frameUrl = (id, i, v = 'f') =>
  FRAMES[`../Superadmin/Kit360/frames/${id}/${v}${i}.jpg`] ?? FRAMES[`../Superadmin/Kit360/frames/${id}/f${i}.jpg`];
/** Buyurtma qatori → surat varianti: uzun yengli forma (sleeve LONG) — 'l' */
export const orderVariant = (order) => (order?.apiItems?.[0]?.sleeve === 'LONG' ? 'l' : 'f');

// Buyurtmadagi klub nomi → surati bor jamoa. Ro'yxat backend/src/kits/kit360.ts (KIT360_ALIASES) bilan bir xil
const TEAM_ALIASES = {
  es: ['ispaniya', 'испания', 'spain', 'espana', 'españa'],
  ar: ['argentina', 'аргентина'],
  fr: ['fransiya', 'франция', 'france'],
  en: ['angliya', 'англия', 'england'],
  pt: ['portugaliya', 'португалия', 'portugal'],
  uz: ["o'zbekiston", 'ozbekiston', 'uzbekistan', 'узбекистан', 'ўзбекистон', 'uzb', 'uz'],
  de: ['germaniya', 'германия', 'germany', 'deutschland', 'ger'],
  rm: ['real madrid', 'реал мадрид', 'real', 'rma', 'rm'],
  fcb: ['barselona', 'барселона', 'barcelona', 'fc barcelona', 'fcb', 'bar'],
  mu: ['manchester yunayted', 'манчестер юнайтед', 'manchester united', 'man united', 'man utd', 'mu', 'mun'],
  psg: ['psj', 'псж', 'psg', 'paris saint-germain', 'paris saint germain', 'paris sg'],
  mci: ['manchester siti', 'манчестер сити', 'manchester city', 'man city', 'mci'],
  lfc: ['liverpul', 'ливерпуль', 'liverpool', 'liverpool fc', 'lfc', 'liv'],
  ars: ['arsenal', 'арсенал', 'arsenal fc', 'ars'],
  che: ['chelsi', 'челси', 'chelsea', 'chelsea fc', 'che'],
  juv: ['yuventus', 'ювентус', 'juventus', 'juve', 'juv'],
  rom: ['roma', 'рома', 'as roma', 'rom'],
  atm: ['atletiko madrid', 'атлетико мадрид', 'atletico madrid', 'atlético madrid', 'atletico', 'atm'],
};
const norm = (s) => String(s ?? '').toLowerCase().replace(/[‘’ʻʼ`]/g, "'").replace(/\s+/g, ' ').trim();
export function teamForClub(clubName, kit360Id) {
  // Buyurtmaga yozilgan Forma 360° id'si nomdan ishonchliroq
  const byId = kit360Id && TEAMS.find((tm) => tm.id === kit360Id);
  if (byId) return byId;
  const key = norm(clubName);
  if (!key) return null;
  const id = Object.keys(TEAM_ALIASES).find((tid) => TEAM_ALIASES[tid].includes(key));
  return TEAMS.find((tm) => tm.id === id) ?? null;
}

const dprNow = () => Math.min(window.devicePixelRatio || 1, 2);

/* Surat kattalashtirilganda xiralashadi — yengil "unsharp" o'tkazib chekka va yozuvlar aniqlashtiriladi */
function sharpen(canvas, amount = 0.55) {
  const { width: w, height: h } = canvas;
  const ctx = canvas.getContext('2d');
  const src = ctx.getImageData(0, 0, w, h);
  const s = src.data;
  const out = new Uint8ClampedArray(s);
  const row = w * 4;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * row + x * 4;
      for (let c = 0; c < 3; c += 1) {
        const k = i + c;
        out[k] = s[k] * (1 + 4 * amount) - amount * (s[k - 4] + s[k + 4] + s[k - row] + s[k + row]);
      }
    }
  }
  ctx.putImageData(new ImageData(out, w, h), 0, 0);
}
const VIEWS = [
  { key: 'jersey.front', frame: 0 },
  { key: 'jersey.side', frame: 2 },
  { key: 'jersey.back', frame: 4 },
];

function PhotoKit({ team, variant = 'f', name, number, shortsNumber, statusBadge }) {
  const t = useT();
  const canvasRef = useRef(null);
  const cache = useRef({});
  const drag = useRef(null);
  const done = useRef({ sig: '', frames: new Map() });
  const fontsVersion = useRef(0);
  const [frame, setFrame] = useState(0);
  const [tick, setTick] = useState(0);
  const [dpr, setDpr] = useState(dprNow);
  const [fontsReady, setFontsReady] = useState(false);
  const repaint = useCallback(() => setTick((n) => n + 1), []);
  // Fonda oldindan yuklanayotgan 8 kadr har biri butun canvasni qayta chizmasin — faqat ko'rinayotganlari
  const shownRef = useRef(null);
  const repaintIfShown = useCallback((im) => {
    const s = shownRef.current;
    if (!s || im === s.img || im === s.back) repaint();
  }, [repaint]);
  const style = { font: FONTS[0], scale: 1, nameColor: team.ink, numberColor: team.ink };

  const image = useCallback((id, i) => {
    const k = `${id}/${variant}${i}`;
    if (!cache.current[k]) {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => repaintIfShown(im);
      im.onerror = () => {
        im.failed = true;
        repaintIfShown(im);
      };
      im.src = frameUrl(id, i, variant);
      cache.current[k] = im;
    }
    return cache.current[k];
  }, [repaintIfShown, variant]);

  const img = image(team.id, frame);
  const back = image(team.id, 4);
  shownRef.current = { img, back };
  const imgReady = ready(img);
  const backReady = ready(back);

  // Barcha burchaklar oldindan yuklanadi — aylantirganda kutish bo'lmaydi
  useEffect(() => {
    for (let i = 0; i < N; i += 1) image(team.id, i);
  }, [team.id, image]);

  // Bosma shrifti (Google Fonts) — yuklanguncha zaxira shrift bilan chiziladi, keyin qayta chiziladi
  useEffect(() => {
    let link = document.querySelector(`link[href="${FONTS_CSS}"]`);
    if (!link) {
      link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: FONTS_CSS });
      document.head.appendChild(link);
    }
    const done = () => setFontsReady(true);
    if (link.sheet) done();
    link.addEventListener('load', done);
    link.addEventListener('error', done);
    return () => {
      link.removeEventListener('load', done);
      link.removeEventListener('error', done);
    };
  }, []);
  useEffect(() => {
    if (fontsReady && document.fonts) document.fonts.load(fontCss(FONTS[0], 48), `${name} ${number} ${FONT_SAMPLE}`).catch(() => {});
  }, [fontsReady, name, number]);
  useEffect(() => {
    if (!document.fonts) return undefined;
    const onFonts = () => {
      layerCache.clear();
      fontsVersion.current += 1;
      repaint();
    };
    document.fonts.addEventListener('loadingdone', onFonts);
    return () => document.fonts.removeEventListener('loadingdone', onFonts);
  }, [repaint]);
  useEffect(() => {
    const onResize = () => setDpr(dprNow());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!imgReady) {
      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#b2b2b3';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    // Tayyor kadr (paint + sharpen ~140 ms) saqlanadi — aylantirganda qayta hisoblanmaydi
    const sig = `${team.id}|${variant}|${name}|${number}|${shortsNumber}|${canvas.width}|${backReady}|${fontsVersion.current}`;
    if (done.current.sig !== sig) done.current = { sig, frames: new Map() };
    const hit = done.current.frames.get(frame);
    if (hit) {
      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(hit, 0, 0);
      return;
    }
    paint(canvas, img, frame, { name, number, shortsNumber, team, style }, backReady ? back : null);
    sharpen(canvas);
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    copy.getContext('2d').drawImage(canvas, 0, 0);
    done.current.frames.set(frame, copy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, back, imgReady, backReady, frame, name, number, shortsNumber, team, dpr, tick]);

  const turn = (step) => setFrame((f) => (f + step + N) % N);
  const onPointerDown = (e) => {
    drag.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (drag.current === null) return;
    const dx = e.clientX - drag.current;
    if (Math.abs(dx) >= 40) {
      turn(dx < 0 ? 1 : -1);
      drag.current = e.clientX;
    }
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onKeyDown = (e) => {
    // Admin paneldagi bilan bir xil: ← forma chapga burilsin (kadr +1)
    if (e.key === 'ArrowLeft') turn(1);
    else if (e.key === 'ArrowRight') turn(-1);
  };

  return (
    <div className="relative flex flex-col items-center rounded-2xl border border-white/10 bg-[#0e1628] p-3">
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-xl bg-[#b2b2b3]" style={{ aspectRatio: `${W} / ${H}` }}>
        <canvas
          ref={canvasRef}
          data-kit-photo
          width={Math.round(W * dpr)}
          height={Math.round(H * dpr)}
          tabIndex={0}
          role="img"
          aria-label={t('order.kitPhotoAria', { team: team.name, deg: frame * 45 })}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          className="block h-full w-full origin-[50%_38%] scale-[1.35] cursor-grab touch-none select-none active:cursor-grabbing"
        />
        {statusBadge && <div className="absolute right-2 top-2">{statusBadge}</div>}
      </div>
      <div className="mt-3 flex w-full max-w-[480px] items-center justify-between gap-2">
        <button type="button" onClick={() => turn(1)} aria-label="←" className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:text-white">
          <RotateCcw className="h-4 w-4" />
        </button>
        <div className="flex gap-1">
          {VIEWS.map((v) => (
            <button
              key={v.frame}
              type="button"
              aria-pressed={frame === v.frame}
              onClick={() => setFrame(v.frame)}
              className={cx(
                'rounded-lg px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider transition',
                frame === v.frame ? 'bg-teal-400 text-slate-950' : 'bg-white/5 text-slate-300 hover:text-white'
              )}
            >
              {t(v.key)}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => turn(-1)} aria-label="→" className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:text-white">
          <RotateCw className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-[11px] font-semibold text-slate-400">{frame * 45}° · {team.name}</p>
    </div>
  );
}

/**
 * Buyurtmadagi forma: klub surati bor bo'lsa — admin paneldagi kabi aylanadigan futbolka + shortik surati
 * (orqada ism va raqam, shortikda raqam faqat buyurtmada belgilangan bo'lsa). Bo'lmasa — oddiy maket.
 * Status (API'dan) forma yonida ko'rinadi.
 */
export default function OrderKitView({ order, statusBadge }) {
  const team = teamForClub(order.clubName, order.apiItems?.[0]?.kit360Id);
  const name = String(order.apiPrintName || '').trim().toUpperCase();
  const number = order.number === '' || order.number == null ? '' : String(order.number);
  return (
    <div className="flex flex-col gap-2">
      {team ? (
        <PhotoKit team={team} variant={orderVariant(order)} name={name} number={number} shortsNumber={order.shortsNumber || ''} statusBadge={statusBadge} />
      ) : (
        <div className="relative">
          <JerseyPreview
            color={order.design?.color?.hex || order.kitDesign?.primaryColor || order.jerseyColor}
            number={number}
            name={name || order.customer}
            colorKey={order.colorKey}
            shorts={order.withShorts}
            shortsNumber={order.shortsNumber}
          />
          {statusBadge && <div className="absolute right-3 top-3">{statusBadge}</div>}
        </div>
      )}
    </div>
  );
}
