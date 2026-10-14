import { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';

// Hali backend ulanmagani uchun namuna (mock) ma'lumotlar. Backend tayyor bo'lgach shu yerga API chaqiruvi qo'shiladi.
const STATS = [
  { label: 'Buyurtmalar', value: '48', delta: '+12% kechagiga nisbatan', up: true },
  { label: 'Tushum', value: "8,47 mln so'm", delta: '+8% kechagiga nisbatan', up: true },
  { label: 'Sexdagi yuk', value: '72%', delta: '86 / 120 dona' },
  { label: 'Kechikayotgan', value: '2', delta: 'muddatga 3 soatdan kam', up: false },
];

const BARS = [
  18, 22, 15, 24, 30, 26, 20, 17, 25, 29, 33, 21, 19, 24, 28, 31, 26, 22, 18, 23, 27, 30, 25, 20, 24, 29, 32, 27, 23, 35,
];

const STATUS = [
  { label: 'API', detail: 'p95 184 ms', state: 'ok' },
  { label: 'Navbat · print.generate', detail: '2 kutmoqda', state: 'ok' },
  { label: 'Navbat · sms / push', detail: '0 kutmoqda', state: 'ok' },
  { label: 'Click / Payme webhook', detail: 'oxirgisi 2 daq oldin', state: 'ok' },
  { label: 'Eskiz SMS', detail: "yetkazish 98,6%", state: 'warn' },
  { label: 'Telegram bot', detail: 'kechikish 40 s', state: 'warn' },
  { label: 'Backup', detail: 'bugun 03:00 · 7 kun', state: 'ok' },
];

const ACTIVITY = [
  { time: '14:32', actor: 'Sardor Rahimov', action: "Rol o'zgartirildi", ctx: 'user · Dilnoza K.' },
  { time: '14:05', actor: 'Bekzod Aliyev', action: 'Qaytarish tasdiqlandi', ctx: 'FRM-88412' },
  { time: '13:48', actor: 'Dilnoza Karimova', action: 'Buyurtma bekor qilindi', ctx: 'FRM-88419' },
  { time: '13:20', actor: 'Malika Yusupova', action: "Narx o'zgartirildi", ctx: 'product · tshirt' },
  { time: '12:10', actor: 'Sardor Rahimov', action: 'Integratsiya kaliti almashtirildi', ctx: 'payme.prod.key' },
];

const STAFF = [
  { role: 'Super admin', count: 1, pct: 20 },
  { role: 'Moliyachi', count: 2, pct: 45 },
];

const RANGES = ['Bugun', '7 kun', '30 kun'];

export default function SuperadminDashboard() {
  const { user } = useAuth();
  const [range, setRange] = useState('30 kun');
  const name = (user?.fullName || 'Super admin').split(' ')[0];
  const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  const MONTHS = [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
  ];
  const now = new Date();
  const today = `${WEEKDAYS[now.getDay()]}, ${now.getDate()}-${MONTHS[now.getMonth()]}`;

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Xayrli kun, {name}</h1>
          <p>{today} · barcha tizimlar kuzatuvda</p>
        </div>
        <div className="sa-tabs" style={{ marginBottom: 0 }}>
          {RANGES.map((r) => (
            <button key={r} type="button" className={`sa-tab${range === r ? ' is-active' : ''}`} onClick={() => setRange(r)}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="sa-stats">
        {STATS.map((s) => (
          <div key={s.label} className="sa-stat">
            <div className="sa-stat__label">{s.label}</div>
            <div className="sa-stat__value">{s.value}</div>
            <div className={`sa-stat__delta${s.up === true ? ' is-up' : s.up === false ? ' is-down' : ''}`}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="sa-grid-2">
        <div className="sa-panel">
          <div className="sa-panel__head">
            <div>
              <div className="sa-panel__title">Buyurtmalar · 30 kun</div>
              <div className="sa-panel__sub">jami {BARS.reduce((a, b) => a + b, 0)} · o'rtacha kuniga {Math.round(BARS.reduce((a, b) => a + b, 0) / BARS.length)}</div>
            </div>
          </div>
          <div className="sa-bars">
            {BARS.map((v, i) => (
              <div
                key={i}
                className={`sa-bars__col${i === BARS.length - 1 ? ' is-today' : ''}`}
                style={{ height: `${(v / Math.max(...BARS)) * 100}%` }}
                title={`${v} ta`}
              />
            ))}
          </div>
        </div>

        <div className="sa-panel">
          <div className="sa-panel__head">
            <div className="sa-panel__title">Tizim holati</div>
            <a className="sa-panel__link" href="#">Integratsiyalar →</a>
          </div>
          <div className="sa-list">
            {STATUS.map((s) => (
              <div key={s.label} className="sa-list__row">
                <span className={`sa-dot${s.state === 'warn' ? ' is-warn' : s.state === 'bad' ? ' is-bad' : ''}`} />
                <span style={{ flex: 1 }}>{s.label}</span>
                <span className="sa-table__sub" style={{ marginTop: 0 }}>{s.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sa-grid-2">
        <div className="sa-panel">
          <div className="sa-panel__head">
            <div className="sa-panel__title">So'nggi muhim amallar</div>
            <a className="sa-panel__link" href="#">Audit jurnali →</a>
          </div>
          <div className="sa-table-wrap" style={{ border: 'none' }}>
            <table className="sa-table">
              <tbody>
                {ACTIVITY.map((a, i) => (
                  <tr key={i}>
                    <td className="sa-table__sub" style={{ marginTop: 0 }}>{a.time}</td>
                    <td><b>{a.actor}</b></td>
                    <td>{a.action}</td>
                    <td style={{ textAlign: 'right', color: 'var(--sa-mu)' }}>{a.ctx}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="sa-panel">
          <div className="sa-panel__head">
            <div className="sa-panel__title">Xodimlar</div>
            <a className="sa-panel__link" href="#">Boshqarish →</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {STAFF.map((s) => (
              <div key={s.role}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13.5 }}>
                  <span>{s.role}</span>
                  <b>{s.count}</b>
                </div>
                <div className="sa-progress">
                  <div className="sa-progress__fill" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
