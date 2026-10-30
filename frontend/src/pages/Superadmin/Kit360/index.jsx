import { useCallback, useEffect, useState, useRef } from 'react';
import { useT } from '../i18n';
import { DEFAULT_ORDER_RULES, SETTING_KEYS, loadSettings } from '../adminApi';
import { BACK_FRAMES, FRONT_FRAMES } from './measure';
import { FONTS, FONTS_CSS, FONT_SAMPLE, H, N, TEAMS, W, fontCss, layerCache, paint, ready } from './render';

export { FONTS, TEAMS, fitFont, fontCss } from './render';

/* Forma 360°: har jamoa uchun 8 ta burchak (45° qadam), mijoz ismi va raqami yozilishi bilan formada chiziladi.
   Bosma joyi har bir suratdan o'lchanadi (measure.js) — kadrlar neyroset chizgani uchun har biri biroz boshqacha. */
const FRAMES = import.meta.glob('./frames/*/*.jpg', { eager: true, query: '?url', import: 'default' });
const frameUrl = (id, i) => FRAMES[`./frames/${id}/f${i}.jpg`];

// Klaviaturadagi barcha apostrof turlari (` ' ‘ ’ ʻ ʼ ´) bitta ' ga — O'KTAM, G'OFUR har qanday klaviaturada bir xil
const APOSTROPHES = /[`'‘’ʻʼ´]/g;
export const cleanName = (s, maxLen = DEFAULT_ORDER_RULES.printNameMaxLength) => s
  .replace(APOSTROPHES, "'")
  .toUpperCase()
  .replace(/[^A-ZА-ЯЁЎҚҒҲ' .-]/g, '')
  .replace(/ {2,}/g, ' ')
  .replace(/^ /, '')
  .slice(0, maxLen);
// Formaga chiqadigan matn: chetdagi va qo'sh bo'shliqlarsiz (" ALI" umurtqa ustida markazda tursin)
export const printText = (s) => s.trim().replace(/\s+/g, ' ');

// Raqam: faqat raqamlar, oldidagi nollar (bitta "0" dan tashqari) olib tashlanadi, [min, max] oralig'idan chiqmaydi
export function cleanNumber(s, _min = DEFAULT_ORDER_RULES.printNumberMin, max = DEFAULT_ORDER_RULES.printNumberMax) {
  let v = s.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, String(Math.max(0, max)).length);
  while (v && Number(v) > max) v = v.slice(0, -1);
  // '0' min > 0 bo'lsa ham qoldiriladi — admin 'oraliqdan tashqari' ogohlantirishini ko'radi
  return v;
}

export function bannedWordIn(name, words) {
  const n = name.replace(APOSTROPHES, "'").toLowerCase();
  return words.find((w) => w && n.includes(String(w).replace(APOSTROPHES, "'").toLowerCase())) ?? null;
}


const defaultStyle = (team, font = FONTS[0], scale = 1) => ({ font, scale, nameColor: team.ink, numberColor: team.ink });
const dprNow = () => Math.min(window.devicePixelRatio || 1, 2);

export default function Kit360() {
  const t = useT();
  const canvasRef = useRef(null);
  const cache = useRef({});
  const drag = useRef(null);
  const [team, setTeam] = useState(TEAMS[5]);
  const [frame, setFrame] = useState(0);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [style, setStyle] = useState(() => defaultStyle(TEAMS[5]));
  const [rules, setRules] = useState(DEFAULT_ORDER_RULES);
  const [banned, setBanned] = useState([]);
  const [dpr, setDpr] = useState(dprNow);
  const [fontsCss, setFontsCss] = useState(false);
  const [tick, setTick] = useState(0);
  const repaint = useCallback(() => setTick((n) => n + 1), []);

  const image = useCallback((id, i) => {
    const key = `${id}/${i}`;
    if (!cache.current[key]) {
      const im = new Image();
      im.decoding = 'async';
      im.onload = repaint;
      im.onerror = () => {
        im.failed = true;
        repaint();
      };
      im.src = frameUrl(id, i);
      cache.current[key] = im;
    }
    return cache.current[key];
  }, [repaint]);

  const img = image(team.id, frame);
  const back = image(team.id, 4);
  const imgReady = ready(img);
  const backReady = ready(back);
  const status = imgReady ? 'ok' : img.failed ? 'error' : 'loading';
  const shown = printText(name);

  // Tanlangan jamoaning barcha burchaklari oldindan yuklanadi — aylantirganda kutish bo'lmaydi
  useEffect(() => {
    for (let i = 0; i < N; i += 1) image(team.id, i);
  }, [team.id, image]);

  // Platforma qoidalari: ism uzunligi, raqam oralig'i va taqiqlangan so'zlar (Sozlamalar → Buyurtma qoidalari)
  useEffect(() => {
    let active = true;
    loadSettings()
      .then((all) => {
        if (!active) return;
        setRules({ ...DEFAULT_ORDER_RULES, ...(all?.[SETTING_KEYS.orderRules] ?? {}) });
        const words = all?.[SETTING_KEYS.bannedWords];
        setBanned(Array.isArray(words) ? words : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    setName((n) => cleanName(n, rules.printNameMaxLength));
    setNumber((n) => cleanNumber(n, rules.printNumberMin, rules.printNumberMax));
  }, [rules]);

  useEffect(() => {
    const onResize = () => setDpr(dprNow());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* Shriftlar: avval stylesheet yuklanadi (aks holda document.fonts.load hali e'lon qilinmagan shriftni "tayyor" deydi),
     keyin aynan chizilayotgan harflar bilan — Google Fonts kerakli cyrillic / cyrillic-ext .woff2 bo'lagini yuklaydi. */
  useEffect(() => {
    let link = document.querySelector(`link[href="${FONTS_CSS}"]`);
    if (!link) {
      link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: FONTS_CSS });
      document.head.appendChild(link);
    }
    const done = () => setFontsCss(true);
    if (link.sheet) done();
    link.addEventListener('load', done);
    link.addEventListener('error', done);
    return () => {
      link.removeEventListener('load', done);
      link.removeEventListener('error', done);
    };
  }, []);
  // Yuklash tugagach "loadingdone" keladi — o'shanda eski (zaxira shriftli) qatlamlar tashlanib, qayta chiziladi
  useEffect(() => {
    if (fontsCss && document.fonts) document.fonts.load(fontCss(style.font, 48), `${shown} ${number} ${FONT_SAMPLE}`).catch(() => {});
  }, [fontsCss, style.font, shown, number]);
  // Barcha 6 shriftning kirill qismlari oldindan — tugmalarni almashtirganda zaxira shrift miltillamaydi
  useEffect(() => {
    if (fontsCss && document.fonts) FONTS.forEach((f) => document.fonts.load(fontCss(f, 48), FONT_SAMPLE).catch(() => {}));
  }, [fontsCss]);
  useEffect(() => {
    if (!document.fonts) return undefined;
    const onFonts = () => {
      layerCache.clear();
      repaint();
    };
    document.fonts.addEventListener('loadingdone', onFonts);
    return () => document.fonts.removeEventListener('loadingdone', onFonts);
  }, [repaint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!imgReady) {
      // Eski jamoa kadri qolib ketmasin — kanvas tozalanadi, ustida skeleton ko'rinadi
      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#b2b2b3';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    // 180° kadr hali yuklanmagan yoki xato bo'lsa — joylashuv joriy kadrning o'zidan o'lchanadi
    paint(canvas, img, frame, { name: shown, number, team, style }, backReady ? back : null);
  }, [img, back, imgReady, backReady, frame, shown, number, team, style, dpr, tick]);

  // Ism — orqa tomonda; raqam, shrift, o'lcham — oldidan (shortik) qarab turgan bo'lsa ham shu yerda qoladi
  const toBack = () => setFrame((f) => (f in BACK_FRAMES ? f : 4));
  const toPrint = () => setFrame((f) => (f in BACK_FRAMES || f in FRONT_FRAMES ? f : 4));
  const turn = (step) => setFrame((f) => (f + step + N) % N);
  const pickTeam = (tm) => {
    setTeam(tm);
    setStyle((st) => defaultStyle(tm, st.font, st.scale));
  };
  // Tozalashdan keyin kursor joyida qoladi (o'rtadan tahrirlaganda oxiriga sakramaydi)
  const keepCaret = (el, pos) => requestAnimationFrame(() => {
    if (document.activeElement === el) el.setSelectionRange(pos, pos);
  });
  const onName = (e) => {
    const el = e.target;
    const pos = cleanName(el.value.slice(0, el.selectionStart ?? el.value.length), rules.printNameMaxLength).length;
    setName(cleanName(el.value, rules.printNameMaxLength));
    keepCaret(el, pos);
    toBack();
  };
  const onNumber = (e) => {
    const el = e.target;
    const pos = cleanNumber(el.value.slice(0, el.selectionStart ?? el.value.length), -1, Infinity).length;
    const next = cleanNumber(el.value, rules.printNumberMin, rules.printNumberMax);
    setNumber(next);
    keepCaret(el, Math.min(pos, next.length));
    toPrint();
  };

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
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') turn(1);
    if (e.key === 'ArrowRight') turn(-1);
  };

  const bannedWord = bannedWordIn(shown, banned);
  const numberLow = number !== '' && Number(number) < rules.printNumberMin;
  const views = [
    { label: 'Old', frame: 0 },
    { label: 'Yon', frame: 2 },
    { label: 'Orqa', frame: 4 },
  ];
  const field = { display: 'flex', flexDirection: 'column', gap: 6 };
  const warn = { color: 'var(--sa-accent)', fontSize: 12.5 };

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Forma 360°')}</h1>
          <p>{t("Mijoz ismi va raqamini yozsa, ular forma orqasida darhol ko'rinadi")}</p>
        </div>
      </div>

      <div className="sa-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 360, flex: '0 1 360px' }}>
          <canvas
            ref={canvasRef}
            width={Math.round(W * dpr)}
            height={Math.round(H * dpr)}
            tabIndex={0}
            aria-label={t('{team} formasi, {deg}°. Strelkalar bilan aylantiring', { team: t(team.name), deg: frame * 45 })}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => { drag.current = null; }}
            onPointerCancel={() => { drag.current = null; }}
            onKeyDown={onKeyDown}
            style={{
              display: 'block', width: '100%', aspectRatio: '3 / 4', borderRadius: 12, background: '#b2b2b3',
              touchAction: 'pan-y', cursor: 'grab',
            }}
          />
          {status !== 'ok' && (
            <div
              role="status"
              style={{
                position: 'absolute', inset: 0, borderRadius: 12, display: 'grid', placeItems: 'center',
                background: 'linear-gradient(180deg, #c4c4c5 0%, #a9a9aa 100%)', color: '#2a2f3d', fontSize: 13, fontWeight: 600,
              }}
            >
              {status === 'error' ? t('Surat yuklanmadi') : t('Yuklanmoqda...')}
            </div>
          )}
        </div>

        <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="sa-table__sub" style={{ marginBottom: 8 }}>{t('Jamoa')}</div>
            {[['national', 'Terma jamoalar'], ['club', 'Klublar']].map(([kind, title]) => (
              <div key={kind} role="group" aria-label={t(title)} style={{ marginBottom: 10 }}>
                <div className="sa-table__sub" style={{ marginBottom: 6, fontSize: 11.5, opacity: 0.8 }}>{t(title)}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TEAMS.filter((tm) => tm.kind === kind).map((tm) => (
                    <button
                      key={tm.id}
                      type="button"
                      className={tm.id === team.id ? 'sa-btn' : 'sa-btn sa-btn--ghost'}
                      aria-pressed={tm.id === team.id}
                      onClick={() => pickTeam(tm)}
                    >
                      {t(tm.name)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <label style={field}>
            <span className="sa-table__sub">{t('Ism')}</span>
            <input className="sa-input" value={name} placeholder="ISROIL" onChange={onName} />
            {bannedWord && <span role="alert" style={warn}>{t("Bu ismda taqiqlangan so'z bor: {word}", { word: bannedWord })}</span>}
          </label>
          <label style={field}>
            <span className="sa-table__sub">{t('Raqam')}</span>
            <input className="sa-input" value={number} inputMode="numeric" placeholder="10" onChange={onNumber} />
            {numberLow && (
              <span role="alert" style={warn}>
                {t("Raqam {min} dan {max} gacha bo'lishi kerak", { min: rules.printNumberMin, max: rules.printNumberMax })}
              </span>
            )}
          </label>

          <div>
            <div className="sa-table__sub" style={{ marginBottom: 8 }}>{t('Shrift')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {FONTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={f.id === style.font.id ? 'sa-btn' : 'sa-btn sa-btn--ghost'}
                  aria-pressed={f.id === style.font.id}
                  onClick={() => { setStyle((st) => ({ ...st, font: f })); toPrint(); }}
                  style={{ fontFamily: 'var(--font-body)', gap: 8 }}
                >
                  {t(f.label)}
                  <span aria-hidden="true" style={{ fontFamily: `${f.family}, sans-serif`, fontWeight: f.weight, letterSpacing: '0.04em' }}>
                    AB 10
                  </span>
                </button>
              ))}
            </div>
          </div>

          <label style={field}>
            <span className="sa-table__sub">{t("O'lcham")}: {Math.round(style.scale * 100)}%</span>
            <input
              type="range"
              min={80}
              max={120}
              step={5}
              value={Math.round(style.scale * 100)}
              onChange={(e) => { setStyle((st) => ({ ...st, scale: Number(e.target.value) / 100 })); toPrint(); }}
            />
          </label>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <label style={{ ...field, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={style.nameColor}
                onChange={(e) => { setStyle((st) => ({ ...st, nameColor: e.target.value })); toBack(); }}
              />
              <span className="sa-table__sub">{t('Ism rangi')}</span>
            </label>
            <label style={{ ...field, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={style.numberColor}
                onChange={(e) => { setStyle((st) => ({ ...st, numberColor: e.target.value })); toPrint(); }}
              />
              <span className="sa-table__sub">{t('Raqam rangi')}</span>
            </label>
            <button
              type="button"
              className="sa-btn sa-btn--ghost"
              onClick={() => setStyle((st) => defaultStyle(team, st.font, st.scale))}
            >
              {t('Klub ranglari')}
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {views.map((v) => (
              <button
                key={v.frame}
                type="button"
                className={frame === v.frame ? 'sa-btn' : 'sa-btn sa-btn--ghost'}
                aria-pressed={frame === v.frame}
                onClick={() => setFrame(v.frame)}
              >
                {t(v.label)}
              </button>
            ))}
          </div>
          <div className="sa-table__sub">
            {frame * 45}° · {t("Suratni sudrab aylantiring. Ism va raqam orqadan (135°–225°), shortikdagi raqam oldidan (315°–45°) ko'rinadi")}
          </div>
        </div>
      </div>
    </>
  );
}
