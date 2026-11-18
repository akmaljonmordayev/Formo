/*
 * O'zbek lotin yozuvi → o'zbek kirill yozuvi.
 * Mobil ilova: o'zbekcha (lotin) lug'atdan avtomatik — har bir matnni qo'lda ikki marta yozmaslik uchun.
 *   O‘→Ў, G‘→Ғ, Sh→Ш, Ch→Ч, Yo→Ё, Yu→Ю, Ya→Я, Ye→Е, so'z boshidagi E→Э, q→қ, h→ҳ, x→х, tutuq (ʼ)→ъ.
 * {placeholder}, URL va brend/texnik so'zlar (Formo, Telegram, SMS...) lotincha qoladi.
 */

const KEEP = new Set([
  'Formo', 'FORMO', 'Telegram', 'Click', 'Payme', 'Humo', 'Push', 'push', 'LaLiga', 'Chrome', 'Excel', 'Email',
  'SMS', 'PNG', 'SVG', 'JPEG', 'WEBP', 'PDF', 'GPS', 'AR', 'ID', 'URL', 'UZS', 'DTF', 'FC', 'PSG', 'Start', 'iPhone',
]);

const APOS = "`'‘’ʻʼ´";
const isApos = (ch) => ch !== undefined && APOS.includes(ch);
const isLetter = (ch) => ch !== undefined && /[A-Za-z]/.test(ch);
const isUpper = (ch) => ch !== undefined && ch !== ch.toLowerCase();

const SINGLE = {
  a: 'а', b: 'б', c: 'с', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м',
  n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', x: 'х', y: 'й', z: 'з',
};

// Rus tilidan o'zlashgan "-tsiya"/"-tsion" (aksiya emas: kontseptsiya → концепция)
const LOAN = [
  [/tsiya/g, 'ция'],
  [/Tsiya/g, 'Ция'],
  [/TSIYA/g, 'ЦИЯ'],
  [/tsion/g, 'цион'],
];

/** Harf holatini (katta/kichik) asl harfdan oladi; butunlay katta harfli so'zda hammasi katta */
const withCase = (out, upper) => (upper ? out.toUpperCase() : out);

function convertWord(word) {
  if (KEEP.has(word)) return word;
  // "Formo'ga", "Telegram’dagi" — brend lotincha, qo'shimcha kirillda
  const brand = word.match(/^([A-Za-z]+)([`'‘’ʻʼ´])(.+)$/);
  if (brand && KEEP.has(brand[1])) return `${brand[1]}${brand[2]}${convertWord(brand[3])}`;

  let src = word;
  for (const [re, to] of LOAN) src = src.replace(re, to);
  const allUpper = src.length > 1 && src === src.toUpperCase() && /[A-Z]/.test(src);
  let out = '';
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    const next = src[i + 1];
    const lower = ch.toLowerCase();
    const up = isUpper(ch);
    const prev = src[i - 1];

    if (!isLetter(ch)) {
      // Tutuq belgisi (ma’lumot → маълумот); so'z chetidagi apostrof — tirnoq sifatida qoladi
      if (isApos(ch)) out += isLetter(prev) && isLetter(next) ? 'ъ' : ch;
      else out += ch;
      continue;
    }
    // O‘ / G‘
    if ((lower === 'o' || lower === 'g') && isApos(next)) {
      out += withCase(lower === 'o' ? 'ў' : 'ғ', up);
      i += 1;
      continue;
    }
    // Sh / Ch
    if ((lower === 's' || lower === 'c') && next && next.toLowerCase() === 'h') {
      out += withCase(lower === 's' ? 'ш' : 'ч', up);
      i += 1;
      continue;
    }
    // Yo / Yu / Ya / Ye ("yo‘q" → "йўқ": o‘ alohida harf)
    if (lower === 'y' && next) {
      const n = next.toLowerCase();
      const pair = { o: 'ё', u: 'ю', a: 'я', e: 'е' }[n];
      if (pair && !(n === 'o' && isApos(src[i + 2]))) {
        out += withCase(pair, up || (allUpper && isUpper(next)));
        i += 1;
        continue;
      }
    }
    // So'z boshida (yoki unlidan keyin) E → Э
    if (lower === 'e' && (!isLetter(prev) || 'aeiou'.includes(prev.toLowerCase()))) {
      out += withCase('э', up);
      continue;
    }
    out += withCase(SINGLE[lower] ?? ch, up);
  }
  return out;
}

export function toUzCyrillic(text) {
  return String(text ?? '')
    .split(/(\{[^}]+\}|https?:\/\/\S+)/)
    .map((part, idx) =>
      idx % 2 === 1 ? part : part.replace(/[A-Za-z`'‘’ʻʼ´]+/g, (w) => (/^[`'‘’ʻʼ´]+$/.test(w) ? w : convertWord(w))),
    )
    .join('');
}
