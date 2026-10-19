import { describe, expect, it } from 'vitest';
import { LANGS, translate } from './i18n';

describe('Tailor translations', () => {
  it('supports Uzbek Cyrillic while preserving API placeholders', () => {
    expect(LANGS.map((language) => language.value)).toEqual(['uz', 'ru', 'uz-Cyrl']);
    expect(translate('uz-Cyrl', 'nav.queue')).toBe('Бугунги навбат');
    expect(translate('uz-Cyrl', 'api.loading')).toBe('Маълумотлар API дан юкланмоқда...');
    expect(translate('uz-Cyrl', 'stock.cell.nol')).toBe('НОЛ');
    expect(translate('uz-Cyrl', 'note.orderStatus.text', { code: 'F-102', status: 'Босилди' }))
      .toBe('№F-102 · Босилди');
  });
});
