import Modal from '../../components/ui/Modal';
import { useT } from './i18n';

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
        cursor: disabled ? 'wait' : 'pointer', background: checked ? 'var(--sa-teal)' : 'rgba(255,255,255,0.12)',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: '50%',
          background: '#fff', transition: 'left .15s ease',
        }}
      />
    </button>
  );
}
