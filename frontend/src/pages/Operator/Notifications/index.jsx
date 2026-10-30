import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, BellOff } from 'lucide-react';
import { defectsApi, ordersApi } from '../../../features/platform/platformApi';
import { useT } from '../i18n';

const TABS = ['notif.all', 'notif.unread'];
const SEEN_KEY = 'formo_operator_seen_orders';
const SEEN_DEFECTS_KEY = 'formo_operator_seen_defects';

const loadSeen = (key = SEEN_KEY) => {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

// Operator bildirishnomasi = operator harakatini kutayotgan buyurtmalar (NEW): yangi kelgan yoki sex rad etib qaytargan.
// "O'qilgan" belgisi faqat shu brauzerda saqlanadi.
export default function OperatorNotifications() {
  const t = useT();
  const [tab, setTab] = useState(TABS[0]);
  const [orders, setOrders] = useState([]);
  const [defects, setDefects] = useState([]);
  const [seen, setSeen] = useState(() => loadSeen());
  const [seenDefects, setSeenDefects] = useState(() => loadSeen(SEEN_DEFECTS_KEY));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [data, def] = await Promise.all([
        ordersApi.list({ status: 'NEW', page: 1, limit: 50 }),
        defectsApi.list({ status: 'OPEN', page: 1, limit: 20 }),
      ]);
      setOrders(data.items);
      setDefects(def.items);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  const markAllRead = () => {
    const ids = orders.map((o) => o.id);
    const defectIds = defects.map((d) => d.id);
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
      localStorage.setItem(SEEN_DEFECTS_KEY, JSON.stringify(defectIds));
    } catch {
      // brauzer saqlashga ruxsat bermasa — faqat joriy sessiya uchun
    }
    setSeen(ids);
    setSeenDefects(defectIds);
  };

  const unreadOrders = orders.filter((o) => !seen.includes(o.id));
  const unreadDefects = defects.filter((d) => !seenDefects.includes(d.id));
  const unreadCount = unreadOrders.length + unreadDefects.length;
  const shownOrders = tab === TABS[0] ? orders : unreadOrders;
  const shownDefects = tab === TABS[0] ? defects : unreadDefects;
  const isEmpty = !shownOrders.length && !shownDefects.length;
  const date = (iso) => new Date(iso).toLocaleString(t.locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>{t('menu.notifications')}</h1>
          <p>{t('notif.subtitle')}</p>
        </div>
        <div className="op-row" style={{ gap: 8 }}>
          {unreadCount > 0 && (
            <button type="button" className="op-b" onClick={markAllRead}>
              {t('notif.markRead')}
            </button>
          )}
          <Link to="/operator/settings" className="op-b">
            {t('notif.configure')}
          </Link>
        </div>
      </div>

      <div className="op-tabs" role="tablist">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`op-tab${tab === key ? ' is-on' : ''}`}
            onClick={() => setTab(key)}
          >
            {t(key)}
            {key === TABS[1] && unreadCount > 0 ? ` · ${unreadCount}` : ''}
          </button>
        ))}
      </div>

      <section className="op-cd">
        {error && (
          <div className="op-msg" style={{ margin: 12 }}>
            {error}
          </div>
        )}
        {!isEmpty ? (
          <div className="op-sc">
            <table className="op-tb">
              <tbody>
                {shownOrders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ width: 32 }}>
                      <Bell size={16} aria-hidden="true" />
                    </td>
                    <td>
                      <b>{t('notif.newOrder', { code: o.code })}</b>
                      <div className="op-sub">{o.customerName}</div>
                    </td>
                    <td className="op-mono">{date(o.updatedAt ?? o.createdAt)}</td>
                    <td>
                      <Link to="/operator/orders" className="op-b is-sm">
                        {t('notif.open')}
                      </Link>
                    </td>
                  </tr>
                ))}
                {shownDefects.map((d) => (
                  <tr key={`d${d.id}`}>
                    <td style={{ width: 32 }}>
                      <AlertTriangle size={16} aria-hidden="true" />
                    </td>
                    <td>
                      <b>
                        {t('notif.newDefect', { code: d.order?.code, reason: t(`defects.reason.${d.reason}`), qty: d.qty })}
                      </b>
                      <div className="op-sub">{d.workshop?.workshopName || d.workshop?.fullName}</div>
                    </td>
                    <td className="op-mono">{date(d.createdAt)}</td>
                    <td>
                      <Link to="/operator/defects" className="op-b is-sm">
                        {t('notif.open')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="op-em">
            <BellOff size={28} aria-hidden="true" />
            <h3>{t(loading ? 'orders.loading' : tab === TABS[0] ? 'notif.none' : 'notif.allRead')}</h3>
            {!loading && <p>{t('notif.hint')}</p>}
          </div>
        )}
      </section>
    </>
  );
}
