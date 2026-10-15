import { useEffect, useState } from 'react';
import { diagnosticsApi, securityApi, settingsApi } from '../../../features/platform/platformApi';
import { useAuth } from '../../../hooks/useAuth';

const PASSWORD = 'Parol va sessiyalar';
const DIAGNOSTICS = 'Diagnostika';

const GROUPS = [
  { title: 'Yetkazish', items: ["Slotlar va sig'im"] },
  { title: 'Buyurtma', items: ['Buyurtma qoidalari', "Taqiqlangan so'zlar"] },
  { title: 'Xabarlar', items: ['Bildirishnoma shablonlari'] },
  { title: 'Hisob', items: [PASSWORD] },
  { title: 'Texnik', items: ['Integratsiyalar', DIAGNOSTICS] },
];

export default function SuperadminSettings() {
  const [active, setActive] = useState("Slotlar va sig'im");
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    settingsApi
      .all()
      .then((s) => setSlots(s['delivery.slots'] ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const updateSlot = (i, patch) => setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addSlot = () => setSlots((prev) => [...prev, { start: '09:00', end: '13:00', cap: 20, on: true }]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await settingsApi.update('delivery.slots', slots);
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
          <h1>Sozlamalar</h1>
          <p>Tizim qanday ishlashini belgilaydigan parametrlar. Chapdan bo'limni tanlang. Har bir saqlash audit jurnaliga yoziladi.</p>
        </div>
      </div>

      <div className="sa-grid-2" style={{ gridTemplateColumns: '260px 1fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="sa-group__title" style={{ padding: '0 4px 6px' }}>{g.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {g.items.map((it) => (
                  <button
                    key={it}
                    type="button"
                    className={`sa-link${active === it ? ' is-active' : ''}`}
                    style={{ width: '100%', border: 'none', textAlign: 'left' }}
                    onClick={() => setActive(it)}
                  >
                    <span className="sa-link__label">{it}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sa-panel">
          <div className="sa-panel__title" style={{ marginBottom: 4 }}>{active}</div>

          {error && <div className="form-error">{error}</div>}

          {active === "Slotlar va sig'im" ? (
            <>
              <p className="sa-table__sub" style={{ marginBottom: 18 }}>
                Mijoz buyurtma berishda tanlaydigan vaqt oraliqlari. Slot to'lsa, mijozga keyingi bo'sh slot taklif qilinadi.
              </p>

              {loading ? (
                <div className="sa-table__sub">Yuklanmoqda...</div>
              ) : (
                <>
                  <div className="sa-table-wrap" style={{ border: 'none', background: 'transparent' }}>
                    <table className="sa-table">
                      <thead>
                        <tr>
                          <th>Boshlanish</th>
                          <th>Tugash</th>
                          <th>Nechta buyurtma sig'adi</th>
                          <th>Holat</th>
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
                              <button
                                type="button"
                                onClick={() => updateSlot(i, { on: !s.on })}
                                style={{
                                  display: 'inline-block', width: 36, height: 20, borderRadius: 999, border: 'none', cursor: 'pointer',
                                  background: s.on ? 'var(--sa-teal)' : 'rgba(255,255,255,0.12)', position: 'relative', marginRight: 8, verticalAlign: 'middle', padding: 0,
                                }}
                              >
                                <span style={{ position: 'absolute', top: 2, left: s.on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff' }} />
                              </button>
                              {s.on ? 'Yoqilgan' : "O'chirilgan"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button type="button" className="sa-btn sa-btn--ghost" onClick={addSlot}>+ Yangi slot</button>
                    <button type="button" className="sa-btn" disabled={saving} onClick={save}>
                      {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : active === PASSWORD ? (
            <SecuritySection />
          ) : active === DIAGNOSTICS ? (
            <DiagnosticsSection />
          ) : (
            <p className="sa-table__sub">Bu bo'lim hali ulanmagan.</p>
          )}
        </div>
      </div>
    </>
  );
}

function SecuritySection() {
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
    if (form.newPassword !== form.confirm) return setError('Yangi parollar mos kelmadi');
    if (form.newPassword === form.currentPassword) return setError("Yangi parol eskisidan farq qilishi kerak");
    setSaving(true);
    try {
      const res = await securityApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm(empty);
      setNotice(res?.message ?? 'Parol yangilandi');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
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
        Parol almashtirilganda boshqa qurilmalardagi sessiyalar yopiladi, joriy sessiya qoladi.
      </p>
      {error && <div className="form-error">{error}</div>}
      {notice && <div className="sa-table__sub" style={{ marginBottom: 12, color: 'var(--sa-teal)' }}>{notice}</div>}

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 26 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          Joriy parol
          <input {...input} type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          Yangi parol
          <input {...input} type="password" autoComplete="new-password" minLength={6} value={form.newPassword} onChange={set('newPassword')} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          Yangi parolni takrorlang
          <input {...input} type="password" autoComplete="new-password" minLength={6} value={form.confirm} onChange={set('confirm')} />
        </label>
        <div>
          <button type="submit" className="sa-btn" disabled={saving}>
            {saving ? 'Saqlanmoqda...' : 'Parolni almashtirish'}
          </button>
        </div>
      </form>

      <div className="sa-panel__title" style={{ marginBottom: 4, fontSize: 14 }}>Barcha qurilmalardan chiqish</div>
      <p className="sa-table__sub" style={{ marginBottom: 12 }}>
        Akkauntga kirilgan hamma qurilmalar, shu jumladan bu brauzer ham chiqariladi.
      </p>
      <button type="button" className="sa-btn sa-btn--ghost" disabled={leaving} onClick={logoutAll}>
        {leaving ? 'Chiqilmoqda...' : 'Hamma joydan chiqish'}
      </button>
    </>
  );
}

function DiagnosticsSection() {
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
        ['Klient IP', data.ip],
        ['IP zanjiri', data.ips?.length ? data.ips.join(', ') : '—'],
        ['Remote address', data.remoteAddress ?? '—'],
        ['Trust proxy', String(data.trustProxy)],
        ['Ulangan peer', data.connectingPeer ?? '—'],
        ['Cloudflare orqali', data.viaCloudflare ? 'Ha' : "Yo'q"],
        ...Object.entries(data.headers ?? {}).map(([k, v]) => [k, v ?? '—']),
      ]
    : [];

  return (
    <>
      <p className="sa-table__sub" style={{ marginBottom: 18 }}>
        Server bu so'rovni qanday ko'rayotgani: klient IP va proxy headerlari. Rate limit to'g'ri ishlashini tekshirish uchun.
      </p>
      {error && <div className="form-error">{error}</div>}
      {loading && !data ? (
        <div className="sa-table__sub">Yuklanmoqda...</div>
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
        {loading ? 'Tekshirilmoqda...' : 'Qayta tekshirish'}
      </button>
    </>
  );
}
