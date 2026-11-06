import { useT } from './i18n';

export const RANGES = [
  { label: 'Bugun', days: 1 },
  { label: '7 kun', days: 7 },
  { label: '30 kun', days: 30 },
  { label: 'Barcha vaqt', all: true }, // birinchi buyurtma kunidan bugungacha
];

/** Tanlangan davr → API parametrlari (Dashboard va Moliya uchun bir xil) */
export const rangeParams = (range, from, to) =>
  from && to ? { from, to } : range.all ? { all: true } : { days: range.days };

// backend kunlarni UTC bo'yicha guruhlaydi
export const todayKey = () => new Date().toISOString().slice(0, 10);

/** Tezkor davr tugmalari + ixtiyoriy oraliq (boshlanish tanlansa, tugash bugun bilan to'ldiriladi) */
export default function RangePicker({ range, onRange, from, to, onFrom, onTo }) {
  const t = useT();
  const today = todayKey();
  const custom = Boolean(from && to);
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <div className="sa-tabs" style={{ marginBottom: 0 }}>
        {RANGES.map((r) => (
          <button
            key={r.label}
            type="button"
            className={`sa-tab${!custom && range.label === r.label ? ' is-active' : ''}`}
            onClick={() => {
              onFrom('');
              onTo('');
              onRange(r);
            }}
          >
            {t(r.label)}
          </button>
        ))}
      </div>
      <input
        type="date"
        className="sa-input"
        style={{ width: 'auto' }}
        aria-label={t('Boshlanish sanasi')}
        title={t('Boshlanish sanasi')}
        value={from}
        max={to || today}
        onChange={(e) => {
          onFrom(e.target.value);
          if (e.target.value && !to) onTo(today);
        }}
      />
      <input
        type="date"
        className="sa-input"
        style={{ width: 'auto' }}
        aria-label={t('Tugash sanasi')}
        title={t('Tugash sanasi')}
        value={to}
        min={from || undefined}
        max={today}
        onChange={(e) => onTo(e.target.value)}
      />
      {(from || to) && (
        <button
          type="button"
          className="sa-btn sa-btn--ghost"
          aria-label={t('Sanalarni tozalash')}
          title={t('Sanalarni tozalash')}
          onClick={() => {
            onFrom('');
            onTo('');
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
