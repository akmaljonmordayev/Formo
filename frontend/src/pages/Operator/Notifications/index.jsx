import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff } from 'lucide-react';
import { ordersApi } from '../../../features/platform/platformApi';
import { useT } from '../i18n';

const TABS = ['notif.all', 'notif.unread'];
const SEEN_KEY = 'formo_operator_seen_orders';

const loadSeen = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
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
  const [seen, setSeen] = useState(loadSeen);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await ordersApi.list({ status: 'NEW', page: 1, limit: 50 });
      setOrders(data.items);
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
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
    } catch {
      // brauzer saqlashga ruxsat bermasa — faqat joriy sessiya uchun
    }
    setSeen(ids);
  };

  const unread = orders.filter((o) => !seen.includes(o.id));
  const shown = tab === TABS[0] ? orders : unread;
  const date = (iso) => new Date(iso).toLocaleString(t.locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>{t('menu.notifications')}</h1>
          <p>{t('notif.subtitle')}</p>
        </div>
        <div className="op-row" style={{ gap: 8 }}>
          {unread.length > 0 && (
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
            {key === TABS[1] && unread.length > 0 ? ` · ${unread.length}` : ''}
          </button>
        ))}
      </div>

      <section className="op-cd">
        {error && (
          <div className="op-msg" style={{ margin: 12 }}>
            {error}
          </div>
        )}
        {shown.length ? (
          <div className="op-sc">
            <table className="op-tb">
              <tbody>
                {shown.map((o) => (
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
