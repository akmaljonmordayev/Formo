/*
 * O'zbek lotin yozuvi → yangi alifbo (2021-yilgi isloh loyihasi):
 *   Oʻ oʻ → Ō ō,  Gʻ gʻ → Ḡ ḡ,  Sh sh → Ş ş,  Ch ch → Ç ç;  tutuq belgisi (ʼ) saqlanadi.
 * Matn lotin kalitidan avtomatik o'giriladi (alohida lug'at shart emas), xuddi kirill transliteratsiyasi kabi.
 * {placeholder}, URL va brend/texnik so'zlar o'zgarmaydi.
 */

// Brend va texnik so'zlar — ichidagi "sh"/"ch" o'zbekcha tovush emas
const KEEP = new Set([
  'Dashboard', 'dashboard', 'checkout', 'Push', 'push', 'Cloudflare', 'Excel', 'Click', 'Payme', 'Telegram', 'Email',
  'Slug', 'LaLiga', 'Formo', 'webhook', 'backup', 'cache', 'Cache', 'Chrome', 'Shopify', 'flash', 'Flash', 'Fresh',
]);

// Barcha apostrof turlari (` ' ‘ ’ ʻ ʼ ´)
const APOS = "[`'‘’ʻʼ´]";
const RULES = [
  [new RegExp(`O${APOS}`, 'g'), 'Ō'],
  [new RegExp(`o${APOS}`, 'g'), 'ō'],
  [new RegExp(`G${APOS}`, 'g'), 'Ḡ'],
  [new RegExp(`g${APOS}`, 'g'), 'ḡ'],
  [/SH/g, 'Ş'],
  [/Sh/g, 'Ş'],
  [/sh/g, 'ş'],
  [/CH/g, 'Ç'],
  [/Ch/g, 'Ç'],
  [/ch/g, 'ç'],
  // Qolgan apostrof — tutuq belgisi
  [new RegExp(APOS, 'g'), 'ʼ'],
];

function convertWord(word) {
  if (KEEP.has(word)) return word;
  // Qisqartmalar (SMS, CSV, DTF) faqat sh/ch/apostrofli bo'lsa o'zgarardi — bunday qisqartma yo'q
  return RULES.reduce((out, [re, to]) => out.replace(re, to), word);
}

export function toUzNewLatin(text) {
  return String(text ?? '')
    .split(/(\{[^}]+\}|https?:\/\/\S+)/)
    .map((part, idx) => (idx % 2 === 1 ? part : part.replace(/[A-Za-z`'‘’ʻʼ´]+/g, (w) => (/^[`'‘’ʻʼ´]+$/.test(w) ? w : convertWord(w)))))
    .join('');
}
