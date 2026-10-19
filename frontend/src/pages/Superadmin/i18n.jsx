import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import RU from './i18n.ru';

/*
 * Superadmin paneli uchun 3 til: o'zbekcha (lotin), ўзбекча (кирилл), русский.
 * Kalit — o'zbekcha (lotin) matnning o'zi: t("Buyurtmalar").
 *   - uz  → matn o'zgarishsiz
 *   - oz  → lotindan kirillga avtomatik transliteratsiya (alohida lug'at shart emas)
 *   - ru  → i18n.ru.js lug'atidan, topilmasa o'zbekchaga qaytadi
 * O'zgaruvchilar: t("{n} ta sotildi", { n: 5 }). {…} ichidagi nom transliteratsiya qilinmaydi.
 */

export const LANGS = [
  { value: 'uz', label: "O'zbekcha", short: 'UZ' },
  { value: 'oz', label: 'Ўзбекча', short: 'ЎЗ' },
  { value: 'ru', label: 'Русский', short: 'RU' },
];

export const LOCALES = { uz: 'uz-UZ', oz: 'uz-Cyrl-UZ', ru: 'ru-RU' };

const STORAGE_KEY = 'formo_admin_lang';

function readLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return LANGS.some((l) => l.value === v) ? v : 'uz';
  } catch {
    return 'uz';
  }
}

function writeLang(v) {
  try {
    localStorage.setItem(STORAGE_KEY, v);
  } catch {
    // brauzer xotirasi yopiq bo'lsa ham panel ishlayveradi
  }
}

/* ---------- Lotin → kirill (o'zbek) ---------- */
// Apostrof turlari bitta belgiga keltiriladi: o' / o‘ / oʻ / o`
const APOS = /[‘’ʻʼ`]/g;
export const normalizeKey = (s) => String(s).replace(APOS, "'");

const PAIRS = [
  ["o'", 'ў'],
  ["g'", 'ғ'],
  ['sh', 'ш'],
  ['ch', 'ч'],
  ['yo', 'ё'],
  ['yu', 'ю'],
  ['ya', 'я'],
  ['ye', 'е'],
];
const SINGLE = {
  a: 'а', b: 'б', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м', n: 'н',
  o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', x: 'х', y: 'й', z: 'з', c: 'с', w: 'в',
};

const isUpper = (ch) => ch !== ch.toLowerCase();
const applyCase = (src, out) => {
  if (!isUpper(src[0])) return out;
  // "SH" (butun so'z katta harfda) → "Ш"; "Sh" → "Ш"
  return out.charAt(0).toUpperCase() + out.slice(1);
};

// Brend va texnik so'zlar lotinda qoladi; ba'zilarining kirill yozilishi qat'iy
const KEEP = new Set(['Enter', 'Excel', 'Click', 'Payme', 'Push', 'Telegram', 'Cloudflare', 'Email', 'Slug', 'LaLiga', 'Formo',
  'peer', 'proxy', 'webhook', 'backup', 'paint', 'checkout', 'delivery', 'fee', 'Rate', 'limit', 'Remote', 'address', 'Trust', 'ID', 'push', 'web', 'Superadmin']);
const FIXED = { Dashboard: 'Дашборд', dashboard: 'дашборд', Gradient: 'Градиент', gradient: 'градиент' };

function translitWord(word) {
  if (KEEP.has(word)) return word;
  if (FIXED[word]) return FIXED[word];
  // Qisqartmalar (SMS, DTF, XL, CSV) va lotin bo'lmagan so'zlar o'zgarmaydi
  if (word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word)) return word;
  let out = '';
  let i = 0;
  while (i < word.length) {
    const rest = word.slice(i).toLowerCase();
    const pair = PAIRS.find(([lat]) => rest.startsWith(lat));
    if (pair) {
      const [lat, cyr] = pair;
      // So'z boshidagi "ye" → "е"; so'z ichida "e" esa oddiy "е"
      out += applyCase(word.slice(i, i + lat.length), cyr);
      i += lat.length;
      continue;
    }
    const ch = word[i];
    const low = ch.toLowerCase();
    if (low === 'e' && i === 0) {
      out += isUpper(ch) ? 'Э' : 'э';
    } else if (ch === "'") {
      out += 'ъ';
    } else if (SINGLE[low]) {
      out += isUpper(ch) ? SINGLE[low].toUpperCase() : SINGLE[low];
    } else {
      out += ch;
    }
    i += 1;
  }
  return out;
}

export function toCyrillic(text) {
  const src = normalizeKey(text);
  // {placeholder} va URL'lar o'zgarmaydi; qolganlari so'zma-so'z
  return src
    .split(/(\{[^}]+\}|https?:\/\/\S+)/)
    .map((part, idx) => (idx % 2 === 1 ? part : part.replace(/[A-Za-z']+/g, (w) => (/^'+$/.test(w) ? w : translitWord(w)))))
    .join('');
}

const fill = (str, vars) =>
  vars ? str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m)) : str;

export function translate(lang, text, vars) {
  if (text === undefined || text === null) return '';
  const key = normalizeKey(text);
  let out;
  if (lang === 'ru') out = RU[key] ?? key;
  else if (lang === 'oz') out = toCyrillic(key);
  else out = String(text);
  return fill(out, vars);
}

/* ---------- Context ---------- */
const LangContext = createContext({
  lang: 'uz',
  setLang: () => {},
  t: (s, v) => translate('uz', s, v),
  locale: LOCALES.uz,
});

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(readLang);
  const setLang = useCallback((v) => {
    setLangState(v);
    writeLang(v);
  }, []);
  const value = useMemo(
    () => ({ lang, setLang, t: (s, v) => translate(lang, s, v), locale: LOCALES[lang] }),
    [lang, setLang],
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
export const useT = () => useContext(LangContext).t;

/** "189 000 so'm" / "189 000 сум" — tanlangan tilda pul formati */
export function useMoney() {
  const { t } = useContext(LangContext);
  return useCallback((n) => `${Math.round(n ?? 0).toLocaleString('uz-UZ')} ${t("so'm")}`, [t]);
}

/** Kichik til almashtirgich (UZ · ЎЗ · RU) */
export function LangSwitch({ style, full = false }) {
  const { lang, setLang, t } = useLang();
  return (
    <div className="sa-tabs" role="group" aria-label={t('Til')} style={{ marginBottom: 0, gap: 4, ...style }}>
      {LANGS.map((l) => (
        <button
          key={l.value}
          type="button"
          className={`sa-tab${lang === l.value ? ' is-active' : ''}`}
          aria-pressed={lang === l.value}
          onClick={() => setLang(l.value)}
          title={l.label}
        >
          {full ? l.label : l.short}
        </button>
      ))}
    </div>
  );
}
