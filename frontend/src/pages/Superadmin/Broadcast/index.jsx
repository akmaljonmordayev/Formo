import { useEffect, useState } from 'react';
import { broadcastApi } from '../../../features/platform/platformApi';
import { useT } from '../i18n';
import { ConfirmModal } from '../ui';

const MAX_LEN = 2000;

export default function SuperadminBroadcast() {
  const t = useT();
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    broadcastApi
      .recipients()
      .then((d) => setRecipients(d.count))
      .catch(() => setRecipients(null));
  }, []);

  const send = async () => {
    setSending(true);
    setError('');
    try {
      const res = await broadcastApi.send(message.trim());
      setResult(res.sent);
      setMessage('');
      setConfirming(false);
      broadcastApi.recipients().then((d) => setRecipients(d.count)).catch(() => {});
    } catch (e) {
      setError(e.message);
      setConfirming(false);
    } finally {
      setSending(false);
    }
  };

  const canSend = message.trim().length >= 2 && !sending;

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Telegram xabar yuborish')}</h1>
          <p>{t('Botga ulangan barcha mijozlarga bir martalik xabar yuboradi.')}</p>
        </div>
      </div>

      <div className="sa-panel" style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <div className="form-error">{error}</div>}
        {result != null && (
          <div style={{ background: '#e8f7ee', color: 'var(--green, #1a7f4b)', padding: '10px 14px', borderRadius: 10, fontSize: 13.5 }}>
            {t('{n} foydalanuvchiga navbatga qo‘yildi.', { n: result })}
          </div>
        )}

        <label className="field field--full">
          <span>{t('Xabar matni')}</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={MAX_LEN}
            rows={6}
            placeholder={t('Masalan: Hurmatli mijozlar! Ertaga bayram munosabati bilan...')}
          />
          <small>
            {message.trim().length}/{MAX_LEN}
          </small>
        </label>

        <div className="sa-table__sub">
          {recipients == null
            ? t('Qabul qiluvchilar soni yuklanmoqda...')
            : t('Botga ulangan {n} mijoz xabarni oladi.', { n: recipients })}
        </div>

        <div className="modal__foot" style={{ padding: '4px 0 0' }}>
          <button type="button" className="btn btn--accent" disabled={!canSend} onClick={() => setConfirming(true)}>
            {t('Yuborish')}
          </button>
        </div>
      </div>

      {confirming && (
        <ConfirmModal
          title={t('Xabarni yuborish')}
          text={t(
            'Bu xabar botga ulangan {n} mijozga darhol yuboriladi. Bekor qilib bo‘lmaydi. Davom etasizmi?',
            { n: recipients ?? '?' },
          )}
          confirmLabel={t('Ha, yubor')}
          danger={false}
          busy={sending}
          onConfirm={send}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
}
