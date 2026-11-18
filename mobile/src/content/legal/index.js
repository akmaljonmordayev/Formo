import { DEFAULT_CONFIG } from '../../features/config';
import { uzScript } from '../../i18n';
import en from './en';
import ru from './ru';
import uz from './uz';

const BY_LANG = { uz, ru, en };

// Ichma-ich obyekt/massivdagi barcha matnlarni o'zgartiradi (o'zbek kirill / yangi alifbo uchun)
const mapStrings = (value, fn) =>
  typeof value === 'string'
    ? fn(value)
    : Array.isArray(value)
      ? value.map((v) => mapStrings(v, fn))
      : value && typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, fn)]))
        : value;

/**
 * Oferta va maxfiylik siyosati matni joriy tilda.
 * rules/general — GET /app/config (yuklanmagan bo'lsa default'lar).
 * Kirill (uzc) va yangi alifbo (uzn) — o'zbekcha matndan avtomatik.
 */
export function legalTexts(language, rules = DEFAULT_CONFIG.rules, general = DEFAULT_CONFIG.general) {
  const build = BY_LANG[language] || uz;
  const texts = build({ rules: { ...DEFAULT_CONFIG.rules, ...rules }, general: { ...DEFAULT_CONFIG.general, ...general } });
  return language === 'uzc' || language === 'uzn' ? mapStrings(texts, (s) => uzScript(language, s)) : texts;
}
