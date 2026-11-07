import { useEffect, useMemo, useState } from 'react';
import { inventoryApi } from '../../../features/platform/platformApi';
import { useT } from '../i18n';
import { ConfirmModal } from '../ui';

const KID_SIZES = ['2-3', '4-5', '6-7', '8-9', '10-11', '12-13'];
const ADULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
const SIZES = [...KID_SIZES, ...ADULT_SIZES];

const cellKey = (kitId, size) => `${kitId}::${size}`;
// Forma komplekt (futbolka + shortik) bitta mahsulot — zaxira komplekt bo'yicha (API'da TSHIRT qatori).
// Alohida shortik qoldig'i yuritilmaydi: shortik o'lchami doim futbolka o'lchami bilan bir xil.
const PRODUCT = 'TSHIRT';
const LOW = 5;

export default function SuperadminInventory() {
  const t = useT();
  const [kits, setKits] = useState([]); // Forma 360° bilan bir xil 18 ta klub/terma jamoa
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setSaved(false);
    setItems([]);
    setLoadFailed(false);
    Promise.all([inventoryApi.kits(), inventoryApi.list({ productType: PRODUCT })])
      .then(([kitList, invItems]) => {
        if (!active) return;
        setKits(kitList);
        setItems(invItems);
      })
      .catch((e) => {
        if (!active) return;
        setError(e.message);
        setLoadFailed(true);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const qtyMap = useMemo(() => Object.fromEntries(items.map((i) => [cellKey(i.kitId, i.size), String(i.qty)])), [items]);
  const [draft, setDraft] = useState({});
  useEffect(() => setDraft(qtyMap), [qtyMap]);

  const valueOf = (kitId, size) => (draft[cellKey(kitId, size)] ?? '');
  const grandTotal = kits.reduce((sum, k) => sum + SIZES.reduce((s, size) => s + (Number(valueOf(k.kitId, size)) || 0), 0), 0);

  const setQty = (kitId, size, value) => {
    // 6 xonagacha: kattaroq son bazadagi int chegarasidan oshib server 500 qaytarardi
    if (value !== '' && !/^\d{1,6}$/.test(value)) return;
    setDraft((m) => ({ ...m, [cellKey(kitId, size)]: value }));
    setSaved(false);
  };

  const save = async () => {
    if (loading || loadFailed) return;
    const payload = [];
    kits.forEach((k) => {
      SIZES.forEach((size) => {
        const key = cellKey(k.kitId, size);
        const raw = draft[key];
        // Serverda qoldig'i bor katak tozalansa — 0 yuboriladi (aks holda eski son qaytib chiqardi)
        if (raw === '' || raw === undefined) {
          if (qtyMap[key] !== undefined) payload.push({ productType: PRODUCT, kitId: k.kitId, size, qty: 0 });
          return;
        }
        payload.push({ productType: PRODUCT, kitId: k.kitId, size, qty: Number(raw) });
      });
    });
    if (!payload.length) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const fresh = (await inventoryApi.save(payload)).filter((i) => i.productType === PRODUCT);
      setItems(fresh);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const [clearing, setClearing] = useState(null); // tasdiqlash kutayotgan forma
  const [clearBusy, setClearBusy] = useState(false);

  const clearKit = async () => {
    const kit = clearing;
    setClearBusy(true);
    setError('');
    setSaved(false);
    try {
      await inventoryApi.removeKit(kit.kitId, PRODUCT);
      setItems((list) => list.filter((i) => i.kitId !== kit.kitId));
    } catch (e) {
      setError(e.message);
    } finally {
      setClearBusy(false);
      setClearing(null);
    }
  };

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Zaxira')}</h1>
          <p>{t("Forma komplektlari (futbolka + shortik) qoldig'i — har bir jamoa va o'lcham bo'yicha. Buyurtma berilganda avtomatik kamayadi.")}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saved && <span className="sa-table__sub" style={{ color: 'var(--sa-teal)' }}>{t("Saqlandi ✓")}</span>}
          <button type="button" className="sa-btn" onClick={save} disabled={saving || loading || loadFailed}>
            {saving ? t("Saqlanmoqda...") : t("Qoldiqni saqlash")}
          </button>
        </div>
      </div>

      <div className="sa-tabs" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="sa-tab is-active" aria-current="true">{t('Komplekt (futbolka + shortik)')}</span>
          {!loading && kits.length > 0 && (
            <span className="sa-table__sub" style={{ marginTop: 0 }}>
              {t('Jami: {n} ta komplekt', { n: grandTotal })}
            </span>
          )}
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
                <th>{t('Komplekt')}</th>
                {SIZES.map((s) => (
                  <th key={s} style={{ textAlign: 'center' }}>{s}</th>
                ))}
                <th style={{ textAlign: 'right' }}>{t("Jami")}</th>
                <th aria-label={t("O'chirish")} />
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
                      const low = v !== null && v > 0 && v < LOW;
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
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="sa-btn sa-btn--ghost"
                        style={{ padding: '4px 8px' }}
                        title={t("Qoldiqni o'chirish")}
                        aria-label={t("Qoldiqni o'chirish")}
                        disabled={!items.some((i) => i.kitId === kit.kitId)}
                        onClick={() => setClearing(kit)}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {clearing && (
        <ConfirmModal
          title={t("Qoldiqni o'chirish")}
          text={t("{club} qoldig'i o'chirilsinmi? Barcha o'lchamlar tozalanadi.", { club: clearing.clubName })}
          busy={clearBusy}
          onConfirm={clearKit}
          onClose={() => setClearing(null)}
        />
      )}
    </>
  );
}
