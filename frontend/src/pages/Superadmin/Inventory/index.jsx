import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../features/platform/platformApi';
import { useT } from '../i18n';

const KID_SIZES = ['2-3', '4-5', '6-7', '8-9', '10-11', '12-13'];
const ADULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
const SIZES = [...KID_SIZES, ...ADULT_SIZES];

const cellKey = (color, size) => `${color}::${size}`;

export default function SuperadminInventory() {
  const t = useT();
  const [tab, setTab] = useState('TSHIRT');
  const [colors, setColors] = useState([]);
  const [qtyMap, setQtyMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newColor, setNewColor] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setSaved(false);
    inventoryApi
      .list({ productType: tab })
      .then((items) => {
        if (!active) return;
        setColors(Array.from(new Set(items.map((i) => i.color))));
        const map = {};
        items.forEach((i) => {
          map[cellKey(i.color, i.size)] = String(i.qty);
        });
        setQtyMap(map);
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [tab]);

  const setQty = (color, size, value) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setQtyMap((m) => ({ ...m, [cellKey(color, size)]: value }));
    setSaved(false);
  };

  const addColor = () => {
    const name = newColor.trim();
    if (!name || colors.includes(name)) return;
    setColors((c) => [...c, name]);
    setNewColor('');
    setSaved(false);
  };

  const save = async () => {
    const items = [];
    colors.forEach((color) => {
      SIZES.forEach((size) => {
        const raw = qtyMap[cellKey(color, size)];
        if (raw === '' || raw === undefined) return;
        items.push({ productType: tab, color, size, qty: Number(raw) });
      });
    });
    if (!items.length) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const fresh = (await inventoryApi.save(items)).filter((i) => i.productType === tab);
      setColors(Array.from(new Set(fresh.map((i) => i.color))));
      const map = {};
      fresh.forEach((i) => {
        map[cellKey(i.color, i.size)] = String(i.qty);
      });
      setQtyMap(map);
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
          <h1>{t("Zaxira")}</h1>
          <p>{t("Rang va o'lcham bo'yicha bo'sh futbolkalar. 0 bo'lsa, bu variant mijozga ko'rinmaydi.")}</p>
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

      <div className="sa-toolbar">
        <input
          className="sa-input"
          style={{ maxWidth: 200 }}
          placeholder={t("Yangi rang nomi")}
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
          maxLength={30}
        />
        <button type="button" className="sa-btn sa-btn--ghost" onClick={addColor} disabled={!newColor.trim()}>
          {t("+ Rang qo'shish")}
        </button>
      </div>

      {loading ? (
        <div className="sa-table__sub" style={{ padding: 20 }}>{t("Yuklanmoqda...")}</div>
      ) : colors.length === 0 ? (
        <div className="sa-panel">
          <div className="sa-table__sub">
            {t("Hali bu mahsulot turi uchun zaxira kiritilmagan. Yuqoridan rang qo'shib, qoldiqlarni kiriting.")}
          </div>
        </div>
      ) : (
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>{t("Rang")}</th>
                {SIZES.map((s) => (
                  <th key={s} style={{ textAlign: 'center' }}>{s}</th>
                ))}
                <th style={{ textAlign: 'right' }}>{t("Jami")}</th>
              </tr>
            </thead>
            <tbody>
              {colors.map((color) => {
                let total = 0;
                return (
                  <tr key={color}>
                    <td><b>{color}</b></td>
                    {SIZES.map((s) => {
                      const raw = qtyMap[cellKey(color, s)];
                      const v = raw === '' || raw === undefined ? null : Number(raw);
                      total += v ?? 0;
                      const low = v !== null && v > 0 && v < 5;
                      const out = v === 0;
                      return (
                        <td key={s} style={{ textAlign: 'center' }}>
                          <input
                            value={raw ?? ''}
                            onChange={(e) => setQty(color, s, e.target.value)}
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
