import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useT } from './i18n';

const GAP = 6;
const MAX_HEIGHT = 320;
// Ro'yxat shundan uzun bo'lsa qidiruv maydoni chiqadi (klublar, sexlar)
const SEARCH_FROM = 8;

/**
 * Panel uslubidagi select (brauzer <select> o'rniga): har bir variantda rangli nuqta (holat), belgi yoki izoh bo'lishi mumkin.
 * options: [{ value, label, dot?, icon?, hint?, disabled? }] — dot: 'green' | 'red' | 'orange' | 'blue' | 'violet' | 'gray'
 * Ro'yxat .sa ichiga portal qilinadi va ekran bo'yicha joylashadi — modal ichida ham kesilib qolmaydi.
 */
export default function Select({ value, onChange, options, placeholder, icon: Icon, ariaLabel, required = false, disabled = false, compact = false, style }) {
  const t = useT();
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(-1);

  const selected = options.find((o) => String(o.value) === String(value));
  const searchable = options.length >= SEARCH_FROM;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = (focus = true) => {
    setOpen(false);
    setQuery('');
    if (focus) btnRef.current?.focus();
  };

  // Tugma ostiga (joy yetmasa — ustiga) joylashadi
  useLayoutEffect(() => {
    if (!open) return;
    const r = btnRef.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - GAP - 8;
    const above = r.top - GAP - 8;
    const up = below < 180 && above > below;
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 200) - 8)),
      width: Math.max(r.width, 200),
      maxHeight: Math.min(MAX_HEIGHT, up ? above : below),
      ...(up ? { bottom: window.innerHeight - r.top + GAP } : { top: r.bottom + GAP }),
    });
    setCursor(options.findIndex((o) => String(o.value) === String(value)));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- faqat ochilganda o'lchanadi

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!btnRef.current?.contains(e.target) && !popRef.current?.contains(e.target)) close(false);
    };
    // Sahifa yoki modal aylantirilsa ro'yxat tugmadan uzilib qolmasin (ro'yxatning o'zi aylantirilishi mumkin)
    const onScroll = (e) => !popRef.current?.contains(e.target) && close(false);
    const onResize = () => close(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const pick = (option) => {
    if (option.disabled) return;
    if (String(option.value) !== String(value)) onChange(option.value);
    close();
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') {
      // Modal ichida: Escape faqat ro'yxatni yopadi, modalni emas
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      close();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!shown.length) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      let next = cursor;
      for (let i = 0; i < shown.length; i += 1) {
        next = (next + step + shown.length) % shown.length;
        if (!shown[next].disabled) break;
      }
      setCursor(next);
      popRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (shown[cursor]) pick(shown[cursor]);
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  const face = (option) => (
    <>
      {option.dot && <span className={`sa-select__dot sa-select__dot--${option.dot}`} aria-hidden="true" />}
      {option.icon && <option.icon size={16} strokeWidth={1.9} aria-hidden="true" />}
    </>
  );

  return (
    <span className={`sa-select${compact ? ' sa-select--compact' : ''}`} style={style}>
      <button
        ref={btnRef}
        type="button"
        className={`sa-select__btn${open ? ' is-open' : ''}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
      >
        {selected ? face(selected) : null}
        {!selected?.icon && !selected?.dot && Icon && <Icon size={16} strokeWidth={1.9} aria-hidden="true" />}
        <span className={`sa-select__value${selected ? '' : ' is-empty'}`}>{selected ? selected.label : placeholder ?? t('Tanlang')}</span>
        <ChevronDown className="sa-select__chev" size={16} strokeWidth={2.2} aria-hidden="true" />
      </button>
      {/* Forma "required" tekshiruvi brauzerning o'zida qoladi */}
      {required && <input className="sa-select__req" tabIndex={-1} aria-hidden="true" required value={value ?? ''} onChange={() => {}} />}

      {open && pos &&
        createPortal(
          <div ref={popRef} className="sa-select__pop" style={pos} onKeyDown={onKeyDown}>
            {searchable && (
              <label className="sa-select__search">
                <Search size={15} strokeWidth={2} aria-hidden="true" />
                <input
                  autoFocus
                  value={query}
                  placeholder={t('Qidirish')}
                  aria-label={t('Qidirish')}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setCursor(0);
                  }}
                />
              </label>
            )}
            <div className="sa-select__list" role="listbox" aria-label={ariaLabel}>
              {shown.length === 0 && <div className="sa-select__empty">{t('Hech narsa topilmadi')}</div>}
              {shown.map((option, index) => {
                const active = String(option.value) === String(value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    data-index={index}
                    aria-selected={active}
                    disabled={option.disabled}
                    className={`sa-select__opt${active ? ' is-selected' : ''}${cursor === index ? ' is-cursor' : ''}`}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => pick(option)}
                  >
                    {face(option)}
                    <span className="sa-select__text">
                      <span>{option.label}</span>
                      {option.hint && <small>{option.hint}</small>}
                    </span>
                    {active && <Check className="sa-select__check" size={16} strokeWidth={2.4} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>,
          btnRef.current.closest('.sa') ?? document.body,
        )}
    </span>
  );
}
