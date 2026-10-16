import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadPrefs, storePrefs, TailorContext } from './prefs';
import { translate, useT } from './i18n';

function TranslationProbe() {
  const t = useT();
  return (
    <div>
      <span>{t('nav.queue')}</span>
      <span>{t('stock.updated')}</span>
    </div>
  );
}

describe('Tailor translations', () => {
  beforeEach(() => localStorage.clear());

  it('translates Tailor UI labels in both available languages', () => {
    expect(translate('uz', 'nav.queue')).toBe('Bugungi navbat');
    expect(translate('ru', 'nav.queue')).toBe('Очередь на сегодня');
    expect(translate('ru', 'stock.updated')).toBe('Остатки по цвету и размеру.');
  });

  it('updates translated UI immediately when the selected language changes', () => {
    const { rerender } = render(
      <TailorContext.Provider value={{ prefs: { lang: 'uz' } }}>
        <TranslationProbe />
      </TailorContext.Provider>,
    );

    expect(screen.getByText('Bugungi navbat')).toBeInTheDocument();
    expect(screen.getByText('Rang va o‘lcham bo‘yicha zaxira qoldig‘i.')).toBeInTheDocument();

    rerender(
      <TailorContext.Provider value={{ prefs: { lang: 'ru' } }}>
        <TranslationProbe />
      </TailorContext.Provider>,
    );

    expect(screen.getByText('Очередь на сегодня')).toBeInTheDocument();
    expect(screen.getByText('Остатки по цвету и размеру.')).toBeInTheDocument();
  });

  it('saves the selected language for the next page load', () => {
    storePrefs({ ...loadPrefs(), lang: 'ru' });
    expect(loadPrefs().lang).toBe('ru');
  });
});
