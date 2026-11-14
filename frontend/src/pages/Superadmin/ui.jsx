import { useEffect, useRef } from 'react';
import Modal from '../../components/ui/Modal';
import { useT } from './i18n';

const POLL_MS = 3000;
// Xabarlar sahifasi chatni ochganda yuboradi — menyu belgisi kutmasdan yangilanadi
export const CHAT_READ_EVENT = 'formo-sa-chat-read';

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
