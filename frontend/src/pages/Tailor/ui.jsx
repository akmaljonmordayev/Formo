import { useState } from 'react';
import logoImg from './assets/formologo.png';
import { useT } from './i18n';
import { cx } from './utils';

const BADGE_VARIANTS = {
  teal: 'bg-teal-500/15 text-teal-400 ring-teal-500/30',
  amber: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
  red: 'bg-red-500/15 text-red-400 ring-red-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
  slate: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  cyan: 'bg-cyan-500/15 text-cyan-400 ring-cyan-500/30',
};

const STAT_TONES = {
  teal: 'bg-teal-500/15 text-teal-400 ring-teal-500/30',
  amber: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
  red: 'bg-red-500/15 text-red-400 ring-red-500/30',
};

export function Badge({ variant = 'slate', className, children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ring-1 ring-inset',
        BADGE_VARIANTS[variant] ?? BADGE_VARIANTS.slate,
        className
      )}
    >
      {children}
    </span>
  );
}

export function Card({ className, children }) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_16px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl',
        className
      )}
    >
      {children}
    </div>
  );
}

export function FormoLogo({ className = '' }) {
  const t = useT();
  return (
    <div className={`flex min-w-0 flex-col items-start ${className}`}>
      <img
        src={logoImg}
        alt="Formo"
        className="h-auto w-full max-w-[110px] object-contain"
        style={{ mixBlendMode: 'screen' }}
      />
      <p className="mt-1 pl-1 text-base font-semibold leading-tight tracking-wide text-slate-300">
        {t('logo.subtitle')}
      </p>
    </div>
  );
}

// Rang yorqinligi bo'yicha o'qiladigan yozuv rangi (har qanday hex uchun, ro'yxatsiz)
function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex));
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

function readableInk(hex) {
  return luminance(hex) > 0.62 ? '#0f172a' : '#ffffff';
}

const SHIRT_PATH =
  'M74 24 L36 40 L12 104 L50 120 L66 90 L66 226 Q120 238 174 226 L174 90 L190 120 L228 104 L204 40 L166 24 C164 48 76 48 74 24 Z';
// Shortik: belbog' tagidan ikki oyoq
const SHORTS_PATH = 'M70 236 Q120 246 170 236 L178 330 L126 336 L120 290 L114 336 L62 330 Z';

/**
 * Oddiy (3D dizaynsiz) buyurtma maketi: futbolka + shortik. Orqa tomonda ism va raqam kontur bilan — rangdan qat'i nazar o'qiladi.
 * Shortikdagi raqam faqat oldi tomonda (buyurtmada "shortikda raqam" belgilangan bo'lsa).
 */
export function JerseyPreview({
  color = '#D72E3F',
  number = 7,
  name = 'DILSHOD',
  colorKey = 'qizil',
  shorts = true,
  shortsNumber = '',
  defaultSide = 'back',
}) {
  const t = useT();
  const [side, setSide] = useState(defaultSide);
  const ink = readableInk(color);
  const outline = ink === '#ffffff' ? '#0b1220' : '#ffffff';
  const label = String(name || '').trim().toUpperCase();
  const digits = String(number ?? '');
  const nameSize = label.length > 10 ? 15 : label.length > 7 ? 18 : 22;
  const numberSize = digits.length > 1 ? 86 : 104;
  const viewH = shorts ? 350 : 250;

  return (
    <div className="relative flex flex-col items-center justify-between rounded-2xl border border-white/10 bg-[#0e1628] p-4 text-slate-200">
      <div className="relative my-2 w-full max-w-[280px]" style={{ aspectRatio: `240 / ${viewH}` }}>
        <svg
          viewBox={`0 0 240 ${viewH}`}
          className="h-full w-full drop-shadow-2xl"
          data-jersey-preview
          role="img"
          aria-label={t('jersey.sideAria', { name, side: t(`jersey.${side}`) })}
        >
          <defs>
            <linearGradient id="jerseyShade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
            </linearGradient>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.5" />
            </filter>
          </defs>
          <g filter="url(#shadow)">
            {shorts && (
              <g>
                <path d={SHORTS_PATH} fill={color} />
                <path d={SHORTS_PATH} fill="url(#jerseyShade)" />
                <path d="M70 236 Q120 246 170 236" fill="none" stroke={ink} strokeOpacity="0.55" strokeWidth="5" />
                {side === 'front' && shortsNumber !== '' && shortsNumber != null && (
                  <text
                    x="150" y="300" textAnchor="middle" fontSize="34" fontWeight="900"
                    fill={ink} stroke={outline} strokeWidth="1.5" paintOrder="stroke"
                  >
                    {shortsNumber}
                  </text>
                )}
              </g>
            )}
            <path d={SHIRT_PATH} fill={color} />
            <path d={SHIRT_PATH} fill="url(#jerseyShade)" />
            <path
              d={side === 'back' ? 'M86 24 C92 34 148 34 154 24' : 'M86 24 C90 46 150 46 154 24'}
              fill="none"
              stroke={ink}
              strokeOpacity="0.8"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {side === 'front' && (
              <g transform="translate(145, 60) scale(0.6)">
                <path d="M12 0 L24 8 L20 22 L12 28 L4 22 L0 8 Z" fill="none" stroke={ink} strokeWidth="2" opacity="0.9" />
                <path d="M12 4 L16 12 L12 18 L8 12 Z" fill={ink} opacity="0.9" />
              </g>
            )}
            {side === 'back' && (
              <g stroke={outline} strokeWidth="2" paintOrder="stroke" fill={ink} textAnchor="middle" fontWeight="900">
                <text
                  x="120" y="78" fontSize={nameSize} letterSpacing="2"
                  textLength={label.length > 5 ? Math.min(150, label.length * nameSize * 0.72) : undefined}
                  lengthAdjust="spacingAndGlyphs"
                >
                  {label}
                </text>
                <text x="120" y="182" fontSize={numberSize} strokeWidth="3">
                  {digits}
                </text>
              </g>
            )}
          </g>
        </svg>
      </div>
      <div className="flex w-full items-center justify-between pt-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <span className="h-3 w-3 rounded-full ring-2 ring-white/20" style={{ backgroundColor: color }} />
          <span>{colorKey ? t(`color.${colorKey}`) : color}</span>
        </div>
        <button
          type="button"
          onClick={() => setSide((current) => (current === 'front' ? 'back' : 'front'))}
          className="text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-white"
        >
          {t('jersey.view')}: {t(`jersey.${side}`)}
        </button>
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'teal' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold leading-none text-white">{value}</p>
          {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <span className={cx('rounded-xl p-2.5 ring-1 ring-inset', STAT_TONES[tone])}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, ariaLabel, disabled = false }) {
  return (
    <div className="flex select-none items-center justify-between gap-4 py-3">
      <span className="min-w-0">
        {label && <span className="block text-xs font-extrabold text-white">{label}</span>}
        {description && <span className="mt-0.5 block text-[10px] font-medium text-slate-400">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? label}
        disabled={disabled}
        onClick={() => onChange && onChange(!checked)}
        className={cx(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-teal-400' : 'bg-white/10'
        )}
      >
        <span
          className={cx(
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full shadow-md transition-transform duration-200 ease-in-out',
            checked ? 'translate-x-5 bg-slate-950' : 'translate-x-0 bg-white/70'
          )}
        />
      </button>
    </div>
  );
}
