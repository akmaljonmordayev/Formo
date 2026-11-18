import { useEffect, useState } from 'react';
import { settingsApi } from '../../../features/platform/platformApi';
import { DEFAULT_REGION_FEE, REGIONS, SETTING_KEYS } from '../adminApi';
import { useMoney, useT } from '../i18n';

/**
 * Yetkazib berish narxlari — viloyat bo'yicha (delivery.feesByRegion sozlamasi).
 * Avval Formalar sahifasi pastida yig'iladigan panel edi, endi alohida sahifa.
 */
export default function SuperadminDelivery() {
  const t = useT();
  const money = useMoney();
  const [draft, setDraft] = useState(null); // null — hali yuklanmagan
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    settingsApi
      .all()
      .then((s) => {
        const fromSetting = s[SETTING_KEYS.deliveryFeesByRegion] || {};
        const full = Object.fromEntries(REGIONS.map((r) => [r.code, fromSetting[r.code] ?? DEFAULT_REGION_FEE]));
        setDraft(full);
        setSaved(full);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  // «Saqlandi» yozuvi bir necha soniyadan keyin o'zi yo'qoladi
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const setFee = (code, value) => {
    if (value !== '' && !/^\d{1,7}$/.test(value)) return;
    setDraft((d) => ({ ...d, [code]: value === '' ? '' : Number(value) }));
    setNotice('');
  };

  const changed = (code) => draft && saved && draft[code] !== saved[code];
  const changes = draft && saved ? REGIONS.filter((r) => changed(r.code)).length : 0;
  const invalid = draft && REGIONS.some((r) => draft[r.code] === '');

  const save = async () => {
    setSaving(true);
    setErr('');
    setNotice('');
    try {
      await settingsApi.update(SETTING_KEYS.deliveryFeesByRegion, draft);
      setSaved(draft);
      setNotice(t('Saqlandi ✓'));
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const fees = draft ? REGIONS.map((r) => Number(draft[r.code]) || 0) : [];
  const min = fees.length ? Math.min(...fees) : 0;
  const max = fees.length ? Math.max(...fees) : 0;

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Yetkazib berish')}</h1>
          <p>{t("Har bir viloyat uchun alohida narx — Toshkent shahri ham alohida. Mijoz manzil qo'shayotganda viloyatini tanlaydi.")}</p>
        </div>
        {draft && (
          <div className="sa-table__sub" style={{ textAlign: 'right' }}>
            {t("Narx oralig'i")}
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--sa-ink)' }}>
              {min === max ? money(min) : `${money(min)} — ${money(max)}`}
            </div>
          </div>
        )}
      </div>

      {err && <div className="form-error">{err}</div>}

      {loading || !draft ? (
        <div className="sa-chart-empty">{t('Yuklanmoqda...')}</div>
      ) : (
        <div className="sa-panel">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {REGIONS.map((r) => (
              <label
                key={r.code}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 12, background: 'var(--sa-surface-2)',
                  border: `1px solid ${changed(r.code) ? 'var(--sa-teal)' : 'var(--sa-line)'}`,
                }}
              >
                <span style={{ fontSize: 13.5 }}>{t(r.label)}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    className="sa-input"
                    value={draft[r.code]}
                    onChange={(e) => setFee(r.code, e.target.value)}
                    inputMode="numeric"
                    aria-label={t('{label} yetkazish narxi', { label: r.label })}
                    style={{ width: 100, textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700 }}
                  />
                  <span className="sa-table__sub" style={{ marginTop: 0 }}>{t("so'm")}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {(changes > 0 || notice) && (
        <div className="sa-savebar" role="status">
          <b style={{ color: changes ? undefined : 'var(--sa-teal)' }}>
            {changes ? t("{n} ta o'zgarish saqlanmagan", { n: changes }) : notice}
          </b>
          {changes > 0 && (
            <div className="sa-savebar__actions">
              <button type="button" className="sa-btn sa-btn--ghost" onClick={() => setDraft(saved)} disabled={saving}>{t('Bekor qilish')}</button>
              <button type="button" className="sa-btn" onClick={save} disabled={invalid || saving}>
                {saving ? t('Saqlanmoqda...') : t('Narxlarni saqlash')}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
