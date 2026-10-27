import { useRef, useState } from 'react';
import { kitDesignsApi } from '../../../features/kits/kitsApi';
import { assetUrl } from '../../../services/api';
import { useT } from '../i18n';

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Nishon/homiy rasmi: tanlangan zahoti serverga yuklanadi (haqiqiy turi va hajmi serverda ham tekshiriladi),
 * forma faqat qaytgan URL'ni saqlaydi.
 */
export default function ImageField({ label, kind, value, onChange, hint }) {
  const t = useT();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    if (!TYPES.includes(file.type)) return setError(t('Faqat PNG, JPEG yoki WEBP'));
    if (file.size > MAX_BYTES) return setError(t('Fayl 2 MB dan katta'));
    setBusy(true);
    try {
      const { url } = await kitDesignsApi.upload(kind, file);
      onChange(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="kd-field">
      <span>{label}</span>
      <div className="kd-image">
        <div className="kd-image__box">{value ? <img src={assetUrl(value)} alt="" /> : <span>—</span>}</div>
        <div className="kd-image__actions">
          <button type="button" className="sa-btn sa-btn--ghost" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? t('Yuklanmoqda...') : value ? t('Almashtirish') : t('Yuklash')}
          </button>
          {value && (
            <button type="button" className="sa-btn sa-btn--ghost" disabled={busy} onClick={() => onChange(null)}>
              {t('Olib tashlash')}
            </button>
          )}
        </div>
        <input ref={input} type="file" accept={TYPES.join(',')} hidden onChange={pick} />
      </div>
      {error ? <small className="kd-error">{error}</small> : hint ? <small>{hint}</small> : null}
    </div>
  );
}
