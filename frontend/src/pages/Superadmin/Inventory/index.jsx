import { useEffect, useMemo, useState } from 'react';
import { inventoryApi } from '../../../features/platform/platformApi';
import { useT } from '../i18n';

const KID_SIZES = ['2-3', '4-5', '6-7', '8-9', '10-11', '12-13'];
const ADULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
const SIZES = [...KID_SIZES, ...ADULT_SIZES];

const cellKey = (kitId, size) => `${kitId}::${size}`;

export default function SuperadminInventory() {
  const t = useT();
  const [tab, setTab] = useState('TSHIRT');
  const [kits, setKits] = useState([]); // Forma 360° bilan bir xil 10 ta klub/terma jamoa
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setSaved(false);
    Promise.all([inventoryApi.kits(), inventoryApi.list({ productType: tab })])
      .then(([kitList, invItems]) => {
        if (!active) return;
        setKits(kitList);
        setItems(invItems);
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [tab]);

  const qtyMap = useMemo(() => Object.fromEntries(items.map((i) => [cellKey(i.kitId, i.size), String(i.qty)])), [items]);
  const [draft, setDraft] = useState({});
  useEffect(() => setDraft(qtyMap), [qtyMap]);

  const valueOf = (kitId, size) => (draft[cellKey(kitId, size)] ?? '');

  const setQty = (kitId, size, value) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setDraft((m) => ({ ...m, [cellKey(kitId, size)]: value }));
    setSaved(false);
  };

  const save = async () => {
    const payload = [];
    kits.forEach((k) => {
      SIZES.forEach((size) => {
        const raw = draft[cellKey(k.kitId, size)];
        if (raw === '' || raw === undefined) return;
        payload.push({ productType: tab, kitId: k.kitId, size, qty: Number(raw) });
      });
    });
    if (!payload.length) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const fresh = (await inventoryApi.save(payload)).filter((i) => i.productType === tab);
      setItems(fresh);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Zaxira')}</h1>
          <p>{t("Forma 360°dagi klub va terma jamoalar bo'yicha tayyor qoldiq. 0 bo'lsa, bu variant mijozga ko'rinmaydi.")}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saved && <span className="sa-table__sub" style={{ color: 'var(--sa-teal)' }}>{t("Saqlandi ✓")}</span>}
          <button type="button" className="sa-btn" onClick={save} disabled={saving}>
            {saving ? t("Saqlanmoqda...") : t("Qoldiqni saqlash")}
          </button>
        </div>
      </div>

      <div className="sa-tabs" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ key: 'TSHIRT', label: 'Futbolka' }, { key: 'SHORTS', label: 'Shortik' }].map((pt) => (
            <button key={pt.key} type="button" className={`sa-tab${tab === pt.key ? ' is-active' : ''}`} onClick={() => setTab(pt.key)}>
              {t(pt.label)}
            </button>
          ))}
        </div>
        <span className="sa-table__sub" style={{ marginTop: 0, display: 'flex', gap: 14 }}>
          <span><span style={{ color: 'var(--sa-accent)' }}>●</span> {t('kam qoldi (5 dan kam)')}</span>
          <span><span style={{ color: 'var(--sa-red)' }}>●</span> {t("tugagan — mijozga ko'rinmaydi")}</span>
        </span>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="sa-table__sub" style={{ padding: 20 }}>{t('Yuklanmoqda...')}</div>
      ) : kits.length === 0 ? (
        <div className="sa-panel">
          <div className="sa-table__sub">{t("Forma 360° klublari topilmadi.")}</div>
        </div>
      ) : (
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>{t('Klub formasi')}</th>
                {SIZES.map((s) => (
                  <th key={s} style={{ textAlign: 'center' }}>{s}</th>
                ))}
                <th style={{ textAlign: 'right' }}>{t("Jami")}</th>
              </tr>
            </thead>
            <tbody>
              {kits.map((kit) => {
                let total = 0;
                return (
                  <tr key={kit.kitId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          aria-hidden="true"
                          style={{
                            width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                            background: kit.bgColor || '#888', border: `2px solid ${kit.textColor || '#333'}`,
                          }}
                        />
                        <b>{kit.clubName}</b>
                      </div>
                    </td>
                    {SIZES.map((s) => {
                      const raw = valueOf(kit.kitId, s);
                      const v = raw === '' ? null : Number(raw);
                      total += v ?? 0;
                      const low = v !== null && v > 0 && v < 5;
                      const out = v === 0;
                      return (
                        <td key={s} style={{ textAlign: 'center' }}>
                          <input
                            value={raw}
                            onChange={(e) => setQty(kit.kitId, s, e.target.value)}
                            inputMode="numeric"
                            placeholder="—"
                            style={{
                              width: 44, textAlign: 'center', padding: '3px 2px', borderRadius: 7,
                              background: 'transparent',
                              border: low ? '1px solid var(--sa-accent)' : out ? '1px solid var(--sa-red)' : '1px solid var(--sa-line)',
                              color: out ? '#ff8b9a' : low ? 'var(--sa-accent)' : 'var(--sa-ink)',
                            }}
                          />
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'right' }}><b>{total}</b></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
