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
