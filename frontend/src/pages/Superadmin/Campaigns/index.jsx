import { useEffect, useState } from 'react';
import { campaignsApi } from '../../../features/platform/platformApi';
import Modal from '../../../components/ui/Modal';
import { useT, useMoney } from '../i18n';

const STATUS_LABEL = {
  DRAFT: { label: 'Qoralama', color: 'blue' },
  SCHEDULED: { label: 'Rejalashtirilgan', color: 'orange' },
  ACTIVE: { label: 'Faol', color: 'green' },
  COMPLETED: { label: 'Yakunlangan', color: 'blue' },
};
const CHANNEL_LABEL = { PUSH: 'Push', SMS: 'SMS', PUSH_SMS: 'Push + SMS' };

const AUDIENCE_PRESETS = {
  ALL: 'Barcha mijozlar',
  ORDERED: 'Buyurtma bergan mijozlar',
  NO_ORDERS: 'Hali buyurtma bermaganlar',
  CART: 'Savatida mahsuloti borlar',
};

// ISO -> <input type="datetime-local"> qiymati (mahalliy vaqt)
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function SuperadminCampaigns() {
  const money = useMoney();
  const t = useT();
  const [data, setData] = useState({ items: [], totals: { sent: 0, opened: 0, orders: 0, revenue: 0 } });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | campaign

  const load = () => campaignsApi.list().then((d) => setData(d));

  useEffect(() => {
    let active = true;
    load()
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const campaigns = statusFilter ? data.items.filter((c) => c.status === statusFilter) : data.items;
  const openRate = data.totals.sent ? Math.round((data.totals.opened / data.totals.sent) * 1000) / 10 : 0;
  const convRate = data.totals.sent ? Math.round((data.totals.orders / data.totals.sent) * 1000) / 10 : 0;

  const STATS = [
    { label: t('Yuborilgan xabarlar'), value: data.totals.sent.toLocaleString('uz-UZ'), sub: '' },
    { label: t("O'rtacha ochilish"), value: `${openRate}%`, sub: t('faqat push') },
    { label: t('Kampaniyadan buyurtma'), value: String(data.totals.orders), sub: t('{n}% konversiya', { n: convRate }) },
    { label: t('Tushum'), value: money(data.totals.revenue), sub: '' },
  ];

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t("Kampaniyalar")}</h1>
          <p>{t("Mijozlarga push va SMS xabarlar. Kampaniyani bosib tahrirlang yoki natijasini ko'ring.")}</p>
        </div>
        <button type="button" className="sa-btn" onClick={() => setEditing('new')}>{t("+ Kampaniya")}</button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="sa-stats">
        {STATS.map((s) => (
          <div key={s.label} className="sa-stat">
            <div className="sa-stat__label">{s.label}</div>
            <div className="sa-stat__value">{loading ? '···' : s.value}</div>
            <div className="sa-stat__delta">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="sa-tabs">
        {[
          { label: 'Barchasi', value: '' },
          { label: 'Faol', value: 'ACTIVE' },
          { label: 'Rejalashtirilgan', value: 'SCHEDULED' },
          { label: 'Yakunlangan', value: 'COMPLETED' },
          { label: 'Qoralamalar', value: 'DRAFT' },
        ].map((tb) => (
          <button key={tb.value} type="button" className={`sa-tab${statusFilter === tb.value ? ' is-active' : ''}`} onClick={() => setStatusFilter(tb.value)}>
            {t(tb.label)} · {tb.value ? data.items.filter((c) => c.status === tb.value).length : data.items.length}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="sa-table__sub" style={{ padding: 20 }}>{t("Yuklanmoqda...")}</div>
      ) : campaigns.length === 0 ? (
        <div className="sa-panel">
          <div className="sa-table__sub">{t("Hali kampaniya yaratilmagan. «+ Kampaniya» bilan birinchisini qo'shing.")}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {campaigns.map((c) => {
            const st = STATUS_LABEL[c.status] ?? { label: c.status, color: 'blue' };
            const hasMetrics = c.sentCount != null;
            return (
              <div
                key={c.id}
                className="sa-panel"
                role="button"
                tabIndex={0}
                onClick={() => setEditing(c)}
                onKeyDown={(e) => e.key === 'Enter' && setEditing(c)}
                style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', cursor: 'pointer' }}
              >
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <b style={{ fontSize: 15 }}>{c.name}</b>
                    <span className={`sa-badge sa-badge--${st.color}`}>{t(st.label)}</span>
                  </div>
                  <div className="sa-table__sub" style={{ marginBottom: 6 }}>
                    {t('Kimga')}: <b style={{ color: 'var(--sa-ink)' }}>{AUDIENCE_PRESETS[c.audience] ? t(AUDIENCE_PRESETS[c.audience]) : c.audience}</b> · {t('Kanal')}:{' '}
                    <b style={{ color: 'var(--sa-ink)' }}>{CHANNEL_LABEL[c.channel]}</b>
                    {c.scheduledAt && (
                      <>
                        {' '}· {t('Qachon')}: <b style={{ color: 'var(--sa-ink)' }}>{new Date(c.scheduledAt).toLocaleString('uz-UZ')}</b>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--sa-mu)' }}>«{c.message}»</div>
                </div>
                {hasMetrics ? (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {[
                      [t('yuborildi'), t('{n} kishi', { n: c.sentCount })],
                      [t('ochildi'), c.openedCount != null ? `${c.openedCount}` : '—'],
                      [t('buyurtma'), c.orderCount != null ? `${c.orderCount}` : '—'],
                      [t('tushum'), c.revenue != null ? money(c.revenue) : '—'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--sa-surface-2)', border: '1px solid var(--sa-line)', minWidth: 90 }}>
                        <div className="sa-table__sub" style={{ textTransform: 'capitalize' }}>{k}</div>
                        <b>{v}</b>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--sa-surface-2)', border: '1px solid var(--sa-line)', color: 'var(--sa-mu)', fontSize: 12.5 }}>
                    {t("Natija yuborilgandan keyin ko'rinadi")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <CampaignForm
          campaign={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load().catch((e) => setError(e.message));
          }}
        />
      )}
    </>
  );
}

function CampaignForm({ campaign, onClose, onSaved }) {
  const t = useT();
  const isEdit = Boolean(campaign);
  const [form, setForm] = useState({
    name: campaign?.name ?? '',
    audience: campaign?.audience ?? 'ALL',
    channel: campaign?.channel ?? 'PUSH',
    scheduledAt: toLocalInput(campaign?.scheduledAt),
    message: campaign?.message ?? '',
    status: campaign?.status ?? 'DRAFT',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name.trim(),
        audience: form.audience.trim(),
        channel: form.channel,
        message: form.message.trim(),
      };
      if (form.scheduledAt) body.scheduledAt = new Date(form.scheduledAt).toISOString();
      if (isEdit) {
        body.status = form.status;
        await campaignsApi.update(campaign.id, body);
      } else {
        if (form.scheduledAt) body.status = 'SCHEDULED';
        await campaignsApi.create(body);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? t('Kampaniyani tahrirlash') : t('Yangi kampaniya')} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-grid">
          <label className="field field--full">
            <span>{t("Nomi")}</span>
            <input value={form.name} onChange={set('name')} required minLength={2} maxLength={120} />
          </label>
          <label className="field field--full">
            <span>{t("Auditoriya")}</span>
            <select value={form.audience} onChange={set('audience')} required>
              {Object.entries(AUDIENCE_PRESETS).map(([value, label]) => (
                <option key={value} value={value}>{t(label)}</option>
              ))}
              {form.audience && !AUDIENCE_PRESETS[form.audience] && (
                <option value={form.audience}>{t('{text} (eski)', { text: form.audience })}</option>
              )}
            </select>
            <small>{t("Mobil ilovadagi Push ro'yxati shu auditoriya bo'yicha mijozlarga ko'rsatiladi")}</small>
          </label>
          <label className="field">
            <span>{t("Kanal")}</span>
            <select value={form.channel} onChange={set('channel')}>
              <option value="PUSH">Push</option>
              <option value="SMS">SMS</option>
              <option value="PUSH_SMS">Push + SMS</option>
            </select>
          </label>
          <label className="field">
            <span>{t("Qachon yuborilsin")}</span>
            <input type="datetime-local" value={form.scheduledAt} onChange={set('scheduledAt')} />
            {!isEdit && <small>{t("Bo'sh qoldirilsa qoralama sifatida saqlanadi")}</small>}
          </label>
          {isEdit && (
            <label className="field">
              <span>{t("Holat")}</span>
              <select value={form.status} onChange={set('status')}>
                {Object.entries(STATUS_LABEL).map(([value, s]) => (
                  <option key={value} value={value}>{t(s.label)}</option>
                ))}
              </select>
            </label>
          )}
          <label className="field field--full">
            <span>{t("Xabar matni")}</span>
            <textarea value={form.message} onChange={set('message')} required maxLength={500} rows={3} />
          </label>
        </div>
        <div className="modal__foot" style={{ padding: '14px 0 0' }}>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t("Bekor qilish")}
          </button>
          <button type="submit" className="btn btn--accent" disabled={saving}>
            {saving ? t("Saqlanmoqda...") : t("Saqlash")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
