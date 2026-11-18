import { useEffect, useMemo, useState } from 'react';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Gift, MapPin, Pencil, Search, SortAsc, TrendingDown, TrendingUp, Truck } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { settingsApi } from '../../../features/platform/platformApi';
import { DEFAULT_REGION_FEE, REGIONS, SETTING_KEYS } from '../adminApi';
import { Kpi } from '../ui';
import { NumberField, Presets, groupDigits as group } from '../NumberField';
import { useMoney, useT } from '../i18n';

const MAX_FEE = 9_999_999;
const STEP = 1000;
const PRESETS = [0, 10000, 15000, 20000, 25000, 30000, 40000];
const SORTS = [
  { key: 'name', label: 'Nomi', icon: SortAsc },
  { key: 'asc', label: 'Arzonroq', icon: ArrowUpNarrowWide },
  { key: 'desc', label: 'Qimmatroq', icon: ArrowDownWideNarrow },
];

/**
 * Yetkazib berish narxi — viloyat bo'yicha (delivery.feesByRegion sozlamasi).
 * Narx kartadagi tugma orqali modal oynada o'zgartiriladi va darhol saqlanadi;
 * "Bir nechtasiga narx" — tanlangan viloyatlarga bitta narx qo'yish.
 */
export default function SuperadminDelivery() {
  const t = useT();
  const money = useMoney();
  const [fees, setFees] = useState(null); // null — hali yuklanmagan
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState(null); // { text } — har saqlashda yangi obyekt, taymer qaytadan boshlanadi
  const [flash, setFlash] = useState([]); // hozirgina saqlangan viloyatlar — karta bir lahza yonadi
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  const [editing, setEditing] = useState(null); // { codes: string[], bulk: boolean }

  useEffect(() => {
    settingsApi
      .all()
      .then((s) => {
        const fromSetting = s[SETTING_KEYS.deliveryFeesByRegion] || {};
        setFees(Object.fromEntries(REGIONS.map((r) => [r.code, Number(fromSetting[r.code] ?? DEFAULT_REGION_FEE) || 0])));
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  // «Saqlandi» yozuvi va kartaning yonishi bir necha soniyadan keyin o'zi yo'qoladi
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => {
      setNotice(null);
      setFlash([]);
    }, 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const stats = useMemo(() => {
    if (!fees) return null;
    const list = REGIONS.map((r) => ({ ...r, fee: fees[r.code] }));
    const cheapest = list.reduce((a, b) => (b.fee < a.fee ? b : a));
    const priciest = list.reduce((a, b) => (b.fee > a.fee ? b : a));
    return { cheapest, priciest, free: list.filter((r) => r.fee === 0).length };
  }, [fees]);

  const visible = useMemo(() => {
    if (!fees) return [];
    const q = query.trim().toLowerCase();
    const list = REGIONS.filter((r) => !q || t(r.label).toLowerCase().includes(q) || r.label.toLowerCase().includes(q));
    if (sort === 'asc') return [...list].sort((a, b) => fees[a.code] - fees[b.code]);
    if (sort === 'desc') return [...list].sort((a, b) => fees[b.code] - fees[a.code]);
    return list;
  }, [fees, query, sort, t]);

  /** Modal shu funksiyani chaqiradi: xato bo'lsa throw qiladi, modal uni o'zida ko'rsatadi */
  const save = async (codes, fee) => {
    const next = { ...fees, ...Object.fromEntries(codes.map((c) => [c, fee])) };
    await settingsApi.update(SETTING_KEYS.deliveryFeesByRegion, next);
    setFees(next);
    setEditing(null);
    setFlash(codes);
    setNotice({ text: codes.length === 1 ? t('Saqlandi ✓') : t('{n} ta viloyat narxi yangilandi ✓', { n: codes.length }) });
  };

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Yetkazib berish narxi')}</h1>
          <p>{t("Har bir viloyat uchun alohida narx — Toshkent shahri ham alohida. Mijoz manzil qo'shayotganda viloyatini tanlaydi.")}</p>
        </div>
        {fees && (
          <button type="button" className="sa-btn" onClick={() => setEditing({ codes: [], bulk: true })}>
            <Truck size={16} aria-hidden="true" /> {t('Bir nechtasiga narx')}
          </button>
        )}
      </div>

      {err && <div className="form-error">{err}</div>}

      {loading || !fees ? (
        !err && <div className="sa-chart-empty">{t('Yuklanmoqda...')}</div>
      ) : (
        <>
          <div className="sa-kpis">
            <Kpi icon={TrendingDown} label={t('Eng arzon')} value={money(stats.cheapest.fee)} hint={t(stats.cheapest.label)} color="var(--sa-teal)" />
            <Kpi icon={TrendingUp} label={t('Eng qimmat')} value={money(stats.priciest.fee)} hint={t(stats.priciest.label)} delay={70} />
            <Kpi
              icon={Gift}
              label={t('Bepul yetkazish')}
              value={stats.free}
              hint={stats.free ? t('{n} ta hududda bepul', { n: stats.free }) : t("Hamma hududda pullik")}
              color="var(--sa-violet)"
              delay={140}
            />
          </div>

          <div className="sa-panel">
            <div className="sa-dlv-toolbar">
              <label className="sa-dlv-search">
                <Search size={16} aria-hidden="true" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Viloyatni qidirish...')} aria-label={t('Viloyatni qidirish...')} />
              </label>
              <div className="sa-tabs" style={{ marginBottom: 0 }} role="group" aria-label={t('Saralash')}>
                {SORTS.map(({ key, label, icon: Icon }) => (
                  <button key={key} type="button" className={`sa-tab${sort === key ? ' is-active' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} aria-pressed={sort === key} onClick={() => setSort(key)}>
                    <Icon size={14} aria-hidden="true" /> {t(label)}
                  </button>
                ))}
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="sa-chart-empty">{t('Hech narsa topilmadi')}</div>
            ) : (
              <div className="sa-dlv-grid">
                {visible.map((r, i) => {
                  const fee = fees[r.code];
                  const share = stats.priciest.fee ? fee / stats.priciest.fee : 0;
                  return (
                    <button
                      key={r.code}
                      type="button"
                      className={`sa-dlv-card${flash.includes(r.code) ? ' is-flash' : ''}`}
                      style={{ '--sa-delay': `${Math.min(i, 12) * 30}ms` }}
                      onClick={() => setEditing({ codes: [r.code], bulk: false })}
                      aria-label={t('{label} yetkazish narxi', { label: t(r.label) })}
                    >
                      <span className="sa-dlv-card__top">
                        <span className="sa-dlv-card__name">
                          <MapPin size={15} aria-hidden="true" />
                          {t(r.label)}
                        </span>
                        <span className="sa-dlv-card__edit" aria-hidden="true">
                          <Pencil size={14} />
                        </span>
                      </span>
                      <span className="sa-dlv-card__price">{fee === 0 ? t('Bepul') : money(fee)}</span>
                      <span className="sa-dlv-card__bar" aria-hidden="true">
                        <span style={{ transform: `scaleX(${share})` }} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {notice && (
        <div className="sa-dlv-toast" role="status">
          {notice.text}
        </div>
      )}

      {editing && <PriceModal fees={fees} initial={editing} onSave={save} onClose={() => setEditing(null)} />}
    </>
  );
}

/** Narxni tahrirlash oynasi: bitta viloyat yoki (bulk) bir nechta tanlangan viloyat uchun */
function PriceModal({ fees, initial, onSave, onClose }) {
  const t = useT();
  const money = useMoney();
  const { bulk } = initial;
  const [codes, setCodes] = useState(initial.codes);
  const current = bulk ? null : fees[initial.codes[0]];
  const [value, setValue] = useState(bulk ? '' : String(current));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fee = value === '' ? null : Number(value);
  const valid = fee !== null && Number.isInteger(fee) && fee >= 0 && fee <= MAX_FEE;
  const unchanged = !bulk && fee === current;
  const canSave = valid && !unchanged && codes.length > 0 && !saving;
  const diff = !bulk && valid ? fee - current : 0;

  const toggle = (code) => setCodes((cs) => (cs.includes(code) ? cs.filter((c) => c !== code) : [...cs, code]));
  const allSelected = codes.length === REGIONS.length;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      await onSave(codes, fee);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const regionLabel = REGIONS.find((r) => r.code === initial.codes[0])?.label;
  return (
    <Modal title={bulk ? t('Bir nechta viloyatga narx') : t('{label} — yetkazish narxi', { label: t(regionLabel) })} onClose={onClose}>
      <form onSubmit={submit} className="sa-dlv-modal">
        {error && <div className="form-error">{error}</div>}

        {!bulk && (
          <div className="sa-dlv-modal__current">
            <span>{t('Hozirgi narx')}</span>
            <b>{current === 0 ? t('Bepul') : money(current)}</b>
          </div>
        )}

        <div className="field">
          <span>{t('Yangi narx')}</span>
          <NumberField
            autoFocus
            value={value}
            onChange={(v) => {
              setValue(v);
              setError('');
            }}
            max={MAX_FEE}
            step={STEP}
            suffix={t("so'm")}
            label={t('Yangi narx')}
            placeholder="15 000"
          />
          {diff !== 0 && (
            <small className={diff > 0 ? 'sa-dlv-diff is-up' : 'sa-dlv-diff is-down'}>
              {diff > 0 ? '+' : '−'}
              {money(Math.abs(diff))} {t('avvalgisiga nisbatan')}
            </small>
          )}
        </div>

        <Presets
          label={t('Tez tanlash')}
          value={value}
          onPick={(p) => setValue(String(p))}
          options={PRESETS.map((p) => ({ value: p, label: p === 0 ? t('Bepul') : group(p) }))}
        />

        {bulk && (
          <div className="field">
            <span style={{ display: 'flex', justifyContent: 'space-between' }}>
              {t('Viloyatlar ({n} ta tanlandi)', { n: codes.length })}
              <button type="button" className="sa-dlv-link" onClick={() => setCodes(allSelected ? [] : REGIONS.map((r) => r.code))}>
                {allSelected ? t('Tanlovni tozalash') : t('Hammasini tanlash')}
              </button>
            </span>
            <div className="sa-dlv-checks">
              {REGIONS.map((r) => (
                <label key={r.code} className={codes.includes(r.code) ? 'is-on' : ''}>
                  <input type="checkbox" checked={codes.includes(r.code)} onChange={() => toggle(r.code)} />
                  <span>{t(r.label)}</span>
                  <small>{fees[r.code] === 0 ? t('Bepul') : group(fees[r.code])}</small>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="modal__foot" style={{ padding: '14px 0 0' }}>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('Bekor qilish')}
          </button>
          <button type="submit" className="btn btn--accent" disabled={!canSave}>
            {saving ? t('Saqlanmoqda...') : t('Saqlash')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
