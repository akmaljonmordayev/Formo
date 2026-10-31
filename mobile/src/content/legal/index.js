import { DEFAULT_CONFIG } from '../../features/config';
import en from './en';
import ru from './ru';
import uz from './uz';

const BY_LANG = { uz, ru, en };

/**
 * Oferta va maxfiylik siyosati matni joriy tilda.
 * rules/general — GET /app/config (yuklanmagan bo'lsa default'lar).
 */
export function legalTexts(language, rules = DEFAULT_CONFIG.rules, general = DEFAULT_CONFIG.general) {
  const build = BY_LANG[language] || uz;
  return build({ rules: { ...DEFAULT_CONFIG.rules, ...rules }, general: { ...DEFAULT_CONFIG.general, ...general } });
}
