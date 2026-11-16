import { useEffect, useRef, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useT } from './i18n';

const POLL_MS = 3000;
// Xabarlar sahifasi chatni ochganda yuboradi — menyu belgisi kutmasdan yangilanadi
export const CHAT_READ_EVENT = 'formo-sa-chat-read';
// Buyurtma saqlanganda / chek ko'rib chiqilganda yuboriladi — menyudagi sonlar kutmasdan yangilanadi
export const COUNTS_EVENT = 'formo-sa-counts';

// Sahifa ko'rinib turgandagina `fn` ni har POLL_MS da chaqiradi; tab yashirilsa yoki unmount bo'lsa to'xtaydi
export function usePolling(fn) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    let timer = null;
    let busy = false;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      timer = setInterval(async () => {
        if (busy) return;
        busy = true;
        try {
          await ref.current();
        } finally {
          busy = false;
        }
      }, POLL_MS);
    };
    const onVis = () => {
      if (document.hidden) stop();
      else {
        ref.current();
        start();
      }
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
}

/** Sahifalash: "Jami: N" va ← sahifa / jami → (bitta sahifa bo'lsa ko'rinmaydi) */
export function Pager({ page, total, limit, onPage }) {
  const t = useT();
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
      <span className="sa-table__sub" style={{ marginTop: 0 }}>{t('Jami')}: {total}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" className="sa-btn sa-btn--ghost" aria-label={t('Oldingi sahifa')} disabled={page <= 1} onClick={() => onPage(page - 1)}>←</button>
        <span className="sa-table__sub" style={{ marginTop: 0 }}>{page} / {pages}</span>
        <button type="button" className="sa-btn sa-btn--ghost" aria-label={t('Keyingi sahifa')} disabled={page >= pages} onClick={() => onPage(page + 1)}>→</button>
      </div>
    </div>
  );
}

/** Umumiy ConfirmModal'ning tarjima qilingan varianti (tugmalar tanlangan tilda) */
export function ConfirmModal({ title, text, confirmLabel, danger = true, onConfirm, onClose, busy }) {
  const t = useT();
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('Bekor qilish')}
          </button>
          <button type="button" className={`btn ${danger ? 'btn--danger' : 'btn--accent'}`} onClick={onConfirm} disabled={busy}>
            {busy ? t('Kuting...') : (confirmLabel ?? t("O'chirish"))}
          </button>
        </>
      }
    >
      <p className="muted">{text}</p>
    </Modal>
  );
}

/** Yoqish/o'chirish tugmasi (role=switch) — sozlamalar sahifasida ishlatiladi */
export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      style={{
        position: 'relative', width: 36, height: 20, borderRadius: 999, border: 'none', padding: 0,
        cursor: disabled ? 'wait' : 'pointer', background: checked ? 'var(--sa-teal)' : 'rgba(var(--sa-hover-rgb), 0.18)',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: '50%',
          background: checked ? '#fff' : 'var(--sa-ink)', transition: 'left .15s ease',
        }}
      />
    </button>
  );
}

/** Son eski qiymatdan yangisiga silliq o'sib boradi (sahifa ochilganda 0 dan) */
export function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    const from = current.current;
    const to = Number(target) || 0;
    if (from === to || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      current.current = to;
      setValue(to);
      return undefined;
    }
    const startedAt = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      current.current = from + (to - from) * (1 - (1 - progress) ** 3);
      setValue(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

const plainNumber = (n) => Math.round(n).toLocaleString('uz-UZ');

export function CountUp({ value, format = plainNumber }) {
  return format(useCountUp(value));
}

/** Ko'rsatkich kartasi: belgi, katta raqam va bir qator izoh. tone: 'up' | 'down' — izoh rangi */
export function Kpi({ icon: Icon, label, value, hint, tone, color, alert = false, delay = 0 }) {
  return (
    <div className={`sa-kpi${alert ? ' is-alert' : ''}`} style={{ '--kpi': alert ? 'var(--sa-red)' : color, '--sa-delay': `${delay}ms` }}>
      <div className="sa-kpi__top">
        <span className="sa-kpi__label">{label}</span>
        {Icon && (
          <span className="sa-kpi__icon">
            <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="sa-kpi__value">{value}</div>
      {hint && <div className={`sa-kpi__hint${tone ? ` is-${tone}` : ''}`}>{hint}</div>}
    </div>
  );
}

/**
 * Kunlik ustunli grafik: ustunlar pastdan ko'tarilib chiqadi, ustiga borilganda shu kunning qiymati ko'rinadi.
 * points: [{ key, label, value, today }]; format — qiymatni matnga (masalan pul), tick — o'q uchun qisqa ko'rinish
 */
export function TrendChart({ points, format = plainNumber, tick = format, empty }) {
  const [hover, setHover] = useState(null);
  if (!points.length || points.every((p) => !p.value)) return <div className="sa-chart-empty">{empty}</div>;

  // O'q 4 teng qismga bo'linadi, chiziqlar yaxlit sonlarda (1, 2, 5, 10 ...) turadi
  const rawStep = Math.max(1, Math.max(...points.map((p) => p.value)) / 4);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((v) => v >= rawStep);
  const max = step * 4;
  const labelStep = Math.max(1, Math.ceil(points.length / 8));

  return (
    <div className="sa-chart">
      <div className="sa-chart__y" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} style={{ bottom: `${i * 25}%` }}>{tick(step * i)}</span>
        ))}
      </div>
      <div className="sa-chart__body">
        <div className="sa-chart__plot">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`sa-chart__grid${i === 0 ? ' is-base' : ''}`} style={{ bottom: `${i * 25}%` }} />
          ))}
          <div className="sa-chart__cols" onMouseLeave={() => setHover(null)}>
            {points.map((p, i) => {
              const height = (p.value / max) * 100;
              return (
                <div
                  key={p.key}
                  className={`sa-chart__col${hover === i ? ' is-active' : ''}`}
                  onMouseEnter={() => setHover(i)}
                  aria-label={`${p.label}: ${format(p.value)}`}
                >
                  <div
                    className={`sa-chart__bar${p.today ? ' is-today' : ''}`}
                    style={{ height: `${height}%`, minHeight: p.value > 0 ? 3 : 0, animationDelay: `${Math.min(i * 20, 600)}ms` }}
                  />
                  {hover === i && (
                    <div className="sa-chart__tip" role="status" style={{ bottom: `calc(${Math.min(height, 72)}% + 10px)` }}>
                      <span>{p.label}</span>
                      <b>{format(p.value)}</b>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="sa-chart__x" aria-hidden="true">
          {points.map((p, i) => (
            <span key={p.key}>{i % labelStep === 0 ? p.label : ''}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
