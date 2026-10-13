import { useEffect } from 'react';
import './ui.css';

export default function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__box" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__head">
          <h3>{title}</h3>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Yopish">
            ✕
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({ title, text, confirmLabel = "O'chirish", onConfirm, onClose, busy }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Bekor qilish
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Kuting...' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted">{text}</p>
    </Modal>
  );
}
