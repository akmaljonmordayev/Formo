import { useEffect, useState } from 'react';
import { diagnosticsApi, securityApi, settingsApi } from '../../../features/platform/platformApi';
import { useAuth } from '../../../hooks/useAuth';
import {
  DEFAULT_GENERAL,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_ORDER_RULES,
  SETTING_KEYS,
  loadSettings,
  saveSetting,
} from '../adminApi';
import { LANGS, useLang } from '../i18n';
import { Switch } from '../ui';
import { loadAdminPrefs, storeAdminPrefs } from '../prefs';

const GROUPS = [
  { title: 'Admin', items: [['profile', 'Profil va til'], ['general', 'Umumiy sozlamalar']] },
  { title: 'Yetkazish', items: [['slots', "Slotlar va sig'im"]] },
  { title: 'Buyurtma', items: [['orderRules', 'Buyurtma qoidalari'], ['banned', "Taqiqlangan so'zlar"]] },
  { title: 'Xabarlar', items: [['notifications', 'Bildirishnomalar']] },
  { title: 'Hisob', items: [['password', 'Parol va sessiyalar']] },
  { title: 'Texnik', items: [['integrations', 'Integratsiyalar'], ['diagnostics', 'Diagnostika']] },
];
const TITLES = Object.fromEntries(GROUPS.flatMap((g) => g.items));

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function SuperadminSettings() {
  const { t } = useLang();
  const [active, setActive] = useState('profile');
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings()
      .then(setSettings)
      .catch((e) => {
        setError(e.message);
        setSettings({});
      });
  }, []);

  // Saqlangandan keyin boshqa bo'limlar ham yangi qiymatni ko'rsin
  const onSaved = (key, value) => setSettings((s) => ({ ...s, [key]: value }));
  const common = { settings, onSaved };

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Sozlamalar')}</h1>
          <p>{t("Tizim qanday ishlashini belgilaydigan parametrlar. Chapdan bo'limni tanlang. Har bir saqlash audit jurnaliga yoziladi.")}</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="sa-grid-2" style={{ gridTemplateColumns: 'minmax(200px, 260px) 1fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="sa-group__title" style={{ padding: '0 4px 6px' }}>{t(g.title)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {g.items.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`sa-link${active === id ? ' is-active' : ''}`}
                    style={{ width: '100%', border: 'none', textAlign: 'left' }}
                    onClick={() => setActive(id)}
                  >
                    <span className="sa-link__label">{t(label)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sa-panel">
          <div className="sa-panel__title" style={{ marginBottom: 4 }}>{t(TITLES[active])}</div>

          {active === 'profile' ? (
            <ProfileSection />
          ) : active === 'password' ? (
            <SecuritySection />
          ) : active === 'diagnostics' ? (
            <DiagnosticsSection />
          ) : active === 'integrations' ? (
            <p className="sa-table__sub">{t("Bu bo'lim hali ulanmagan.")}</p>
          ) : settings === null ? (
            <div className="sa-table__sub">{t('Yuklanmoqda...')}</div>
          ) : active === 'slots' ? (
            <SlotsSection {...common} />
          ) : active === 'orderRules' ? (
            <OrderRulesSection {...common} />
          ) : active === 'banned' ? (
            <BannedWordsSection {...common} />
          ) : active === 'general' ? (
            <GeneralSection {...common} />
          ) : active === 'notifications' ? (
            <NotificationsSection {...common} />
          ) : null}
        </div>
      </div>
    </>
  );
}

/* ---------- Umumiy qismlar ---------- */
function useSaver(key, onSaved) {
  const { t } = useLang();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const save = async (value) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await saveSetting(key, value);
      onSaved(key, value);
      setNotice(t('Saqlandi'));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  return { saving, error, notice, save, setError };
}

function Messages({ error, notice }) {
  return (
    <>
      {error && <div className="form-error">{error}</div>}
      {notice && <div className="sa-table__sub" style={{ marginBottom: 12, color: 'var(--sa-teal)' }}>{notice}</div>}
    </>
  );
}

function SaveButton({ saving, disabled, onClick }) {
  const { t } = useLang();
  return (
    <button type="button" className="sa-btn" disabled={saving || disabled} onClick={onClick}>
      {saving ? t('Saqlanmoqda...') : t('Saqlash')}
    </button>
  );
}

const fieldStyle = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 18 };

function NumberField({ label, hint, value, onChange, min = 0, max, suffix }) {
  return (
    <label style={fieldStyle}>
      {label}
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          className="sa-input"
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          style={{ width: '100%', maxWidth: 160 }}
        />
        {suffix && <span className="sa-table__sub" style={{ marginTop: 0 }}>{suffix}</span>}
      </span>
      {hint && <span className="sa-table__sub" style={{ marginTop: 0 }}>{hint}</span>}
    </label>
  );
}

function TextField({ label, value, onChange, placeholder, type = 'text', maxLength = 120 }) {
  return (
    <label style={fieldStyle}>
      {label}
      <input
        className="sa-input"
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%' }}
      />
    </label>
  );
}

function SwitchRow({ label, hint, checked, onChange }) {
  return (
    <div
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '12px 14px',
        borderRadius: 12, background: 'var(--sa-surface-2)', border: '1px solid var(--sa-line)',
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{label}</div>
        {hint && <div className="sa-table__sub">{hint}</div>}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

/* ---------- Admin: profil va til (shu brauzerda) ---------- */
function ProfileSection() {
  const { t, lang, setLang } = useLang();
  const { user, role } = useAuth();
  const [prefs, setPrefs] = useState(loadAdminPrefs);
  const [notice, setNotice] = useState('');
  const set = (patch) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    storeAdminPrefs(next);
    setNotice(t('Saqlandi'));
  };

  return (
    <>
      <p className="sa-table__sub" style={{ marginBottom: 18 }}>
        {t('Bu sozlamalar faqat shu brauzerda saqlanadi va boshqa adminlarga ta’sir qilmaydi.')}
      </p>
      <Messages notice={notice} />

      <div style={grid}>
        <div style={fieldStyle}>
          {t('Ism')}
          <b>{user?.fullName || '—'}</b>
        </div>
        <div style={fieldStyle}>
          {t('Telefon')}
          <b>{user?.phone || '—'}</b>
        </div>
        <div style={fieldStyle}>
          {t('Rol')}
          <b>{role || '—'}</b>
        </div>
      </div>

      <div className="sa-panel__title" style={{ fontSize: 14, marginBottom: 8 }}>{t('Panel tili')}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
        {LANGS.map((l) => (
          <button
            key={l.value}
            type="button"
            className={`sa-tab${lang === l.value ? ' is-active' : ''}`}
            aria-pressed={lang === l.value}
            onClick={() => setLang(l.value)}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div style={grid}>
        <label style={fieldStyle}>
          {t('Dashboard: standart davr')}
          <select className="sa-input" value={prefs.dashboardDays} onChange={(e) => set({ dashboardDays: Number(e.target.value) })}>
            <option value={1}>{t('Bugun')}</option>
            <option value={7}>{t('7 kun')}</option>
            <option value={30}>{t('30 kun')}</option>
          </select>
        </label>
        <label style={fieldStyle}>
          {t('Buyurtmalar: sahifadagi qatorlar')}
          <select className="sa-input" value={prefs.ordersPageSize} onChange={(e) => set({ ordersPageSize: Number(e.target.value) })}>
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

    </>
  );
}

/* ---------- Admin: umumiy (API) ---------- */
function GeneralSection({ settings, onSaved }) {
  const { t } = useLang();
  const [form, setForm] = useState({ ...DEFAULT_GENERAL, ...(settings[SETTING_KEYS.general] ?? {}) });
  const { saving, error, notice, save, setError } = useSaver(SETTING_KEYS.general, onSaved);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    if (!TIME.test(form.workHoursFrom) || !TIME.test(form.workHoursTo)) return setError(t('Vaqt SS:DD formatida bo‘lishi kerak'));
    return save({ ...form, companyName: form.companyName.trim() });
  };

  return (
    <>
      <p className="sa-table__sub" style={{ marginBottom: 18 }}>
        {t('Kompaniya ma’lumotlari va qo‘llab-quvvatlash kontaktlari — ilova va xabarlarda ishlatiladi.')}
      </p>
      <Messages error={error} notice={notice} />
      <div style={grid}>
        <TextField label={t('Kompaniya nomi')} value={form.companyName} onChange={set('companyName')} maxLength={60} />
        <TextField label={t('Qo‘llab-quvvatlash telefoni')} value={form.supportPhone} onChange={set('supportPhone')} placeholder="+998 90 000 00 00" maxLength={20} />
        <TextField label="Telegram" value={form.supportTelegram} onChange={set('supportTelegram')} placeholder="@formo_support" maxLength={40} />
        <TextField label="Email" type="email" value={form.supportEmail} onChange={set('supportEmail')} placeholder="support@formo.uz" maxLength={80} />
        <TextField label={t('Ish vaqti: boshlanish')} value={form.workHoursFrom} onChange={set('workHoursFrom')} placeholder="09:00" maxLength={5} />
        <TextField label={t('Ish vaqti: tugash')} value={form.workHoursTo} onChange={set('workHoursTo')} placeholder="21:00" maxLength={5} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <SwitchRow
          label={t('Texnik ishlar rejimi')}
          hint={t('Yoqilsa, ilovada «texnik ishlar olib borilmoqda» xabari ko‘rsatiladi')}
          checked={form.maintenance}
          onChange={() => setForm((f) => ({ ...f, maintenance: !f.maintenance }))}
        />
      </div>
      <SaveButton saving={saving} disabled={!form.companyName.trim()} onClick={submit} />
    </>
  );
}

/* ---------- Yetkazish: slotlar + narx ---------- */
function SlotsSection({ settings, onSaved }) {
  const { t } = useLang();
  const [slots, setSlots] = useState(settings[SETTING_KEYS.deliverySlots] ?? []);
  const [fee, setFee] = useState(settings[SETTING_KEYS.deliveryFee] ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const updateSlot = (i, patch) => setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addSlot = () => setSlots((prev) => [...prev, { start: '09:00', end: '13:00', cap: 20, on: true }]);
  const removeSlot = (i) => setSlots((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    setError('');
    setNotice('');
    const bad = slots.find((s) => !TIME.test(s.start) || !TIME.test(s.end) || s.start >= s.end);
    if (bad) return setError(t('Slot vaqti noto‘g‘ri: {start}–{end}. Format SS:DD, boshlanish tugashdan oldin bo‘lsin.', bad));
    setSaving(true);
    try {
      const clean = slots.map((s) => ({ start: s.start, end: s.end, cap: Math.max(0, Number(s.cap) || 0), on: Boolean(s.on) }));
      await saveSetting(SETTING_KEYS.deliverySlots, clean);
      onSaved(SETTING_KEYS.deliverySlots, clean);
      const f = Math.max(0, Math.round(Number(fee) || 0));
      if (f !== Number(settings[SETTING_KEYS.deliveryFee] ?? 0)) {
        await saveSetting(SETTING_KEYS.deliveryFee, f);
        onSaved(SETTING_KEYS.deliveryFee, f);
      }
      setNotice(t('Saqlandi'));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  return (
    <>
      <p className="sa-table__sub" style={{ marginBottom: 18 }}>
        {t("Mijoz buyurtma berishda tanlaydigan vaqt oraliqlari. Slot to'lsa, mijozga keyingi bo'sh slot taklif qilinadi.")}
      </p>
      <Messages error={error} notice={notice} />

      <div style={{ ...grid, marginBottom: 10 }}>
        <NumberField label={t('Yetkazish narxi')} value={fee} onChange={setFee} suffix={t("so'm")} max={10000000} />
      </div>

      <div className="sa-table-wrap" style={{ border: 'none', background: 'transparent' }}>
        <table className="sa-table">
          <thead>
            <tr>
              <th>{t('Boshlanish')}</th>
              <th>{t('Tugash')}</th>
              <th>{t("Nechta buyurtma sig'adi")}</th>
              <th>{t('Holat')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {slots.map((s, i) => (
              <tr key={i}>
                <td><input className="sa-input" value={s.start} onChange={(e) => updateSlot(i, { start: e.target.value })} style={{ width: 90 }} /></td>
                <td><input className="sa-input" value={s.end} onChange={(e) => updateSlot(i, { end: e.target.value })} style={{ width: 90 }} /></td>
                <td>
                  <input
                    className="sa-input"
                    type="number"
                    min={0}
                    value={s.cap}
                    onChange={(e) => updateSlot(i, { cap: Number(e.target.value) })}
                    style={{ width: 70 }}
                  />
                </td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Switch checked={s.on} onChange={() => updateSlot(i, { on: !s.on })} label={t('Holat')} />
                    {s.on ? t('Yoqilgan') : t("O'chirilgan")}
                  </span>
                </td>
                <td>
                  <button type="button" className="sa-btn sa-btn--ghost" onClick={() => removeSlot(i)} aria-label={t("Slotni o'chirish")}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button type="button" className="sa-btn sa-btn--ghost" onClick={addSlot}>{t('+ Yangi slot')}</button>
        <SaveButton saving={saving} onClick={save} />
      </div>
    </>
  );
}

/* ---------- Buyurtma qoidalari (API: order.rules) ---------- */
function OrderRulesSection({ settings, onSaved }) {
  const { t } = useLang();
  const [r, setR] = useState({ ...DEFAULT_ORDER_RULES, ...(settings[SETTING_KEYS.orderRules] ?? {}) });
  const { saving, error, notice, save, setError } = useSaver(SETTING_KEYS.orderRules, onSaved);
  const set = (key) => (value) => setR((p) => ({ ...p, [key]: value }));
  const flip = (key) => () => setR((p) => ({ ...p, [key]: !p[key] }));

  const NUMERIC = [
    'minOrderSum', 'maxItemsPerOrder', 'maxQtyPerItem', 'productionDaysMin', 'productionDaysMax', 'prepaymentPercent',
    'autoCancelUnpaidHours', 'cancelWindowHours', 'returnDays', 'printNameMaxLength', 'printNumberMin', 'printNumberMax',
  ];

  const submit = () => {
    if (NUMERIC.some((k) => r[k] === '' || Number.isNaN(Number(r[k])) || Number(r[k]) < 0)) {
      return setError(t('Barcha raqamli maydonlarni to‘ldiring (manfiy bo‘lmasin)'));
    }
    if (r.productionDaysMin > r.productionDaysMax) return setError(t('Tayyorlash muddati: minimal qiymat maksimaldan katta'));
    if (r.printNumberMin > r.printNumberMax) return setError(t('Raqam oralig‘i noto‘g‘ri'));
    if (r.prepaymentPercent > 100) return setError(t('Oldindan to‘lov 100% dan oshmasin'));
    if (!r.allowCash && r.prepaymentPercent < 100) return setError(t('Naqd to‘lov o‘chirilgan bo‘lsa, oldindan to‘lov 100% bo‘lishi kerak'));
    const clean = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, NUMERIC.includes(k) ? Number(v) : v]));
    return save({ ...clean, pausedMessage: r.pausedMessage.trim(), terms: r.terms.trim() });
  };

  const section = (title) => (
    <div className="sa-panel__title" style={{ fontSize: 14, margin: '6px 0 10px' }}>{t(title)}</div>
  );

  return (
    <>
      <p className="sa-table__sub" style={{ marginBottom: 18 }}>
        {t('Mijoz buyurtma berishda amal qiladigan cheklovlar, to‘lov va bekor qilish qoidalari.')}
      </p>
      <Messages error={error} notice={notice} />

      <div style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SwitchRow
          label={t('Buyurtma qabul qilish')}
          hint={t('O‘chirilsa, ilovada yangi buyurtma berib bo‘lmaydi')}
          checked={r.acceptOrders}
          onChange={flip('acceptOrders')}
        />
        {!r.acceptOrders && (
          <TextField
            label={t('Mijozga ko‘rsatiladigan xabar')}
            value={r.pausedMessage}
            onChange={set('pausedMessage')}
            placeholder={t('Buyurtmalar vaqtincha qabul qilinmayapti')}
            maxLength={200}
          />
        )}
      </div>

      {section('Savat cheklovlari')}
      <div style={grid}>
        <NumberField label={t('Minimal buyurtma summasi')} value={r.minOrderSum} onChange={set('minOrderSum')} suffix={t("so'm")} />
        <NumberField label={t('Bitta buyurtmada maksimal mahsulot')} value={r.maxItemsPerOrder} onChange={set('maxItemsPerOrder')} min={1} />
        <NumberField label={t('Bitta mahsulotdan maksimal soni')} value={r.maxQtyPerItem} onChange={set('maxQtyPerItem')} min={1} />
      </div>

      {section('Tayyorlash va to‘lov')}
      <div style={grid}>
        <NumberField label={t('Tayyorlash muddati (min)')} value={r.productionDaysMin} onChange={set('productionDaysMin')} suffix={t('kun')} />
        <NumberField label={t('Tayyorlash muddati (maks)')} value={r.productionDaysMax} onChange={set('productionDaysMax')} suffix={t('kun')} />
        <NumberField label={t('Oldindan to‘lov')} value={r.prepaymentPercent} onChange={set('prepaymentPercent')} max={100} suffix="%" />
        <NumberField
          label={t('To‘lanmagan buyurtma avtomatik bekor')}
          hint={t('0 — bekor qilinmaydi')}
          value={r.autoCancelUnpaidHours}
          onChange={set('autoCancelUnpaidHours')}
          suffix={t('soat')}
        />
      </div>
      <div style={{ marginBottom: 18 }}>
        <SwitchRow label={t('Naqd to‘lovga ruxsat')} hint={t('Yetkazib berilganda naqd to‘lash')} checked={r.allowCash} onChange={flip('allowCash')} />
      </div>

      {section('Bekor qilish va qaytarish')}
      <div style={grid}>
        <NumberField
          label={t('Mijoz bekor qila oladigan vaqt')}
          hint={t('Buyurtmadan keyin, bosmaga o‘tguncha')}
          value={r.cancelWindowHours}
          onChange={set('cancelWindowHours')}
          suffix={t('soat')}
        />
        <NumberField
          label={t('Qaytarish muddati')}
          hint={t('Faqat ishlab chiqarish nuqsoni bo‘lsa')}
          value={r.returnDays}
          onChange={set('returnDays')}
          suffix={t('kun')}
        />
      </div>

      {section('Bosma (ism va raqam)')}
      <div style={grid}>
        <NumberField label={t('Ism uzunligi (maks)')} value={r.printNameMaxLength} onChange={set('printNameMaxLength')} min={1} max={30} suffix={t('belgi')} />
        <NumberField label={t('Raqam: dan')} value={r.printNumberMin} onChange={set('printNumberMin')} max={999} />
        <NumberField label={t('Raqam: gacha')} value={r.printNumberMax} onChange={set('printNumberMax')} max={999} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <SwitchRow label={t('Bolalar o‘lchamlari (2–13 yosh)')} checked={r.allowKidsSizes} onChange={flip('allowKidsSizes')} />
      </div>

      {section('Mijoz uchun qoidalar matni')}
      <label style={{ ...fieldStyle, marginBottom: 18 }}>
        <textarea
          className="sa-input"
          rows={6}
          maxLength={4000}
          value={r.terms}
          onChange={(e) => set('terms')(e.target.value)}
          placeholder={t('Masalan: Buyurtma to‘lovdan so‘ng ishlab chiqarishga o‘tadi. Ism va raqamli formalar qaytarilmaydi...')}
          style={{ width: '100%', minHeight: 120, resize: 'vertical', fontFamily: 'inherit' }}
        />
        <span className="sa-table__sub" style={{ marginTop: 0 }}>{t('Ilovada checkout sahifasida ko‘rsatiladi')}</span>
      </label>

      <div style={{ display: 'flex', gap: 10 }}>
        <SaveButton saving={saving} onClick={submit} />
        <button type="button" className="sa-btn sa-btn--ghost" onClick={() => setR(DEFAULT_ORDER_RULES)}>
          {t('Standart qiymatlar')}
        </button>
      </div>
    </>
  );
}

/* ---------- Taqiqlangan so'zlar (API: order.bannedWords) ---------- */
function BannedWordsSection({ settings, onSaved }) {
  const { t } = useLang();
  const initial = settings[SETTING_KEYS.bannedWords];
  const [words, setWords] = useState(Array.isArray(initial) ? initial : []);
  const [draft, setDraft] = useState('');
  const { saving, error, notice, save } = useSaver(SETTING_KEYS.bannedWords, onSaved);

  const add = () => {
    const fresh = draft
      .split(/[,\n]/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w && !words.includes(w));
    if (fresh.length) setWords((prev) => [...prev, ...new Set(fresh)]);
    setDraft('');
  };

  return (
    <>
      <p className="sa-table__sub" style={{ marginBottom: 18 }}>
        {t('Formaga bosiladigan ismda bu so‘zlar bo‘lsa, buyurtma qabul qilinmaydi. Vergul bilan bir nechtasini qo‘shish mumkin.')}
      </p>
      <Messages error={error} notice={notice} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          className="sa-input"
          style={{ flex: 1 }}
          value={draft}
          maxLength={300}
          placeholder={t('so‘z1, so‘z2')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="sa-btn sa-btn--ghost" onClick={add} disabled={!draft.trim()}>
          {t("Qo'shish")}
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
        {words.length === 0 && <span className="sa-table__sub">{t("Ro'yxat bo'sh")}</span>}
        {words.map((w) => (
          <span key={w} className="sa-badge sa-badge--red" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            {w}
            <button
              type="button"
              onClick={() => setWords((prev) => prev.filter((x) => x !== w))}
              aria-label={t("{name} ni o'chirish", { name: w })}
              style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 0 }}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <SaveButton saving={saving} onClick={() => save(words)} />
    </>
  );
}

/* ---------- Bildirishnomalar (API: admin.notifications) ---------- */
function NotificationsSection({ settings, onSaved }) {
  const { t } = useLang();
  const [n, setN] = useState({ ...DEFAULT_NOTIFICATIONS, ...(settings[SETTING_KEYS.notifications] ?? {}) });
  const { saving, error, notice, save } = useSaver(SETTING_KEYS.notifications, onSaved);
  const flip = (key) => () => setN((p) => ({ ...p, [key]: !p[key] }));
  const [configured, setConfigured] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    let active = true;
    settingsApi
      .notificationsStatus()
      .then((d) => active && setConfigured(Boolean(d?.telegramConfigured)))
      .catch(() => active && setConfigured(false));
    return () => {
      active = false;
    };
  }, []);

  const sendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await settingsApi.notificationsTest();
      setTestResult(r?.sent ? { ok: true, text: t('Sinov xabari yuborildi') } : { ok: false, text: r?.reason || t('Yuborilmadi') });
    } catch (e) {
      setTestResult({ ok: false, text: e.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <p className="sa-table__sub" style={{ marginBottom: 10 }}>
        {t('Adminlarga qaysi hodisalar haqida xabar yuborilishi.')}{' '}
        {t('Quyidagi sozlamalar jonli ishlaydi: hodisa yuz berganda Telegramga xabar ketadi.')}
      </p>
      <p className="sa-table__sub" style={{ marginBottom: 18 }}>
        {configured === null
          ? t('Telegram holati tekshirilmoqda...')
          : configured
            ? t('Telegram bot serverda sozlangan')
            : t('Telegram bot serverda sozlanmagan (TELEGRAM_BOT_TOKEN)')}
      </p>
      <Messages error={error} notice={notice} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
        <SwitchRow label={t('Yangi buyurtma')} checked={n.newOrder} onChange={flip('newOrder')} />
        <SwitchRow label={t('To‘lov xatosi')} checked={n.paymentFailed} onChange={flip('paymentFailed')} />
        <SwitchRow label={t('Kechikayotgan buyurtma')} checked={n.lateOrder} onChange={flip('lateOrder')} />
        <SwitchRow label={t('Zaxira kamaydi')} checked={n.lowStock} onChange={flip('lowStock')} />
      </div>
      <div style={grid}>
        <TextField
          label={t('Telegram chat ID')}
          value={n.telegramChatId}
          onChange={(v) => setN((p) => ({ ...p, telegramChatId: v }))}
          placeholder="-100123456789"
          maxLength={40}
        />
      </div>
      <p className="sa-table__sub" style={{ margin: '8px 0 14px' }}>
        {t('Chat ID ni to‘ldiring va botni shu chatga qo‘shing — xabarlar shu yerga yuboriladi.')}
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <SaveButton saving={saving} onClick={() => save({ ...n, telegramChatId: n.telegramChatId.trim() })} />
        <button type="button" className="sa-btn sa-btn--ghost" onClick={sendTest} disabled={testing}>
          {testing ? t('Yuborilmoqda...') : t('Sinov xabari yuborish')}
        </button>
        {testResult && (
          <span className="sa-table__sub" style={{ marginTop: 0, color: testResult.ok ? 'var(--sa-green, #22c55e)' : 'var(--sa-red, #ef4444)' }}>
            {testResult.text}
          </span>
        )}
      </div>
    </>
  );
}

/* ---------- Hisob: parol ---------- */
function SecuritySection() {
  const { t } = useLang();
  const { logout } = useAuth();
  const empty = { currentPassword: '', newPassword: '', confirm: '' };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (form.newPassword !== form.confirm) return setError(t('Yangi parollar mos kelmadi'));
    if (form.newPassword === form.currentPassword) return setError(t('Yangi parol eskisidan farq qilishi kerak'));
    setSaving(true);
    try {
      const res = await securityApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm(empty);
      setNotice(res?.message ?? t('Parol yangilandi'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  // Joriy sessiya ham bekor bo'ladi — shuning uchun darhol login sahifasiga qaytiladi
  const logoutAll = async () => {
    setLeaving(true);
    setError('');
    try {
      await securityApi.logoutAll();
      await logout();
    } catch (err) {
      setError(err.message);
      setLeaving(false);
    }
  };

  const input = { className: 'sa-input', style: { width: '100%', maxWidth: 320 }, required: true };

  return (
    <>
      <p className="sa-table__sub" style={{ marginBottom: 18 }}>
        {t('Parol almashtirilganda boshqa qurilmalardagi sessiyalar yopiladi, joriy sessiya qoladi.')}
      </p>
      <Messages error={error} notice={notice} />

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 26 }}>
        <label style={fieldStyle}>
          {t('Joriy parol')}
          <input {...input} type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} />
        </label>
        <label style={fieldStyle}>
          {t('Yangi parol')}
          <input {...input} type="password" autoComplete="new-password" minLength={6} value={form.newPassword} onChange={set('newPassword')} />
        </label>
        <label style={fieldStyle}>
          {t('Yangi parolni takrorlang')}
          <input {...input} type="password" autoComplete="new-password" minLength={6} value={form.confirm} onChange={set('confirm')} />
        </label>
        <div>
          <button type="submit" className="sa-btn" disabled={saving}>
            {saving ? t('Saqlanmoqda...') : t('Parolni almashtirish')}
          </button>
        </div>
      </form>

      <div className="sa-panel__title" style={{ marginBottom: 4, fontSize: 14 }}>{t('Barcha qurilmalardan chiqish')}</div>
      <p className="sa-table__sub" style={{ marginBottom: 12 }}>
        {t('Akkauntga kirilgan hamma qurilmalar, shu jumladan bu brauzer ham chiqariladi.')}
      </p>
      <button type="button" className="sa-btn sa-btn--ghost" disabled={leaving} onClick={logoutAll}>
        {leaving ? t('Chiqilmoqda...') : t('Hamma joydan chiqish')}
      </button>
    </>
  );
}

/* ---------- Texnik: diagnostika ---------- */
function DiagnosticsSection() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    diagnosticsApi
      .request()
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [tick]);

  const run = () => setTick((n) => n + 1);

  const rows = data
    ? [
        [t('Klient IP'), data.ip],
        [t('IP zanjiri'), data.ips?.length ? data.ips.join(', ') : '—'],
        ['Remote address', data.remoteAddress ?? '—'],
        ['Trust proxy', String(data.trustProxy)],
        [t('Ulangan peer'), data.connectingPeer ?? '—'],
        [t('Cloudflare orqali'), data.viaCloudflare ? t('Ha') : t("Yo'q")],
        ...Object.entries(data.headers ?? {}).map(([k, v]) => [k, v ?? '—']),
      ]
    : [];

  return (
    <>
      <p className="sa-table__sub" style={{ marginBottom: 18 }}>
        {t("Server bu so'rovni qanday ko'rayotgani: klient IP va proxy headerlari. Rate limit to'g'ri ishlashini tekshirish uchun.")}
      </p>
      {error && <div className="form-error">{error}</div>}
      {loading && !data ? (
        <div className="sa-table__sub">{t('Yuklanmoqda...')}</div>
      ) : (
        data && (
          <div className="sa-table-wrap" style={{ border: 'none', background: 'transparent' }}>
            <table className="sa-table">
              <tbody>
                {rows.map(([k, v]) => (
                  <tr key={k}>
                    <td className="sa-table__sub" style={{ marginTop: 0, width: 200 }}>{k}</td>
                    <td style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
      <button type="button" className="sa-btn sa-btn--ghost" style={{ marginTop: 14 }} disabled={loading} onClick={run}>
        {loading ? t('Tekshirilmoqda...') : t('Qayta tekshirish')}
      </button>
    </>
  );
}
