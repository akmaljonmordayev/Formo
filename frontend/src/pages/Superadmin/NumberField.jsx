import { Minus, Plus } from 'lucide-react';
import { useT } from './i18n';

/** "15000" → "15 000" (kiritish maydonida o'qish oson bo'lsin) */
export const groupDigits = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/**
 * Katta raqamli kiritish maydoni: chapda −, o'ngda + tugmasi, ichida faqat raqam (bo'shliq bilan guruhlanadi).
 * value — raqamlar satri ('' — bo'sh); onChange ham raqamlar satrini beradi.
 */
export function NumberField({ value, onChange, max, step, suffix, label, placeholder, autoFocus = false }) {
  const t = useT();
  const n = value === '' ? null : Number(value);
  const digits = String(max).length;
  const onInput = (raw) => {
    const clean = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    if (clean.length > digits || (clean !== '' && Number(clean) > max)) return;
    onChange(clean);
  };
  const bump = (delta) => onChange(String(Math.min(max, Math.max(0, (n ?? 0) + delta))));
  return (
    <div className="sa-dlv-input">
      <button type="button" onClick={() => bump(-step)} disabled={!n} aria-label={t('{n} ga kamaytirish', { n: groupDigits(step) })}>
        <Minus size={16} />
      </button>
      <input
        autoFocus={autoFocus}
        inputMode="numeric"
        value={value === '' ? '' : groupDigits(value)}
        onChange={(e) => onInput(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
      {suffix && <span className="sa-dlv-input__suffix">{suffix}</span>}
      <button type="button" onClick={() => bump(step)} disabled={n !== null && n >= max} aria-label={t('{n} ga oshirish', { n: groupDigits(step) })}>
        <Plus size={16} />
      </button>
    </div>
  );
}

/** Tez tanlash tugmalari: [{ value, label }]; tanlangani belgilanadi */
export function Presets({ options, value, onPick, label }) {
  return (
    <div className="sa-dlv-presets" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.label} type="button" className={(o.active ?? String(o.value) === String(value)) ? 'is-active' : ''} onClick={() => onPick(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
