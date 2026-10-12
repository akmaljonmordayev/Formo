import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Factory, ShieldOff, ShoppingBag, Store } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { formatDate, prettyPhone, workshopsApi } from '../../../features/accounts/accountsApi';
import { useT } from '../i18n';

function greeting(t) {
  const h = new Date().getHours();
  if (h < 12) return t('dash.morning');
  if (h < 18) return t('dash.day');
  return t('dash.evening');
}

export default function OperatorDashboard() {
  const { user } = useAuth();
  const t = useT();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      workshopsApi.list({ page: 1, limit: 5 }),
      workshopsApi.list({ isActive: 'true', page: 1, limit: 1 }),
      workshopsApi.list({ isActive: 'false', page: 1, limit: 1 }),
    ])
      .then(([all, active, blocked]) => {
        if (cancelled) return;
        setStats({ total: all.total, active: active.total, blocked: blocked.total });
        setRecent(all.items);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setStats({ total: '—', active: '—', blocked: '—' });
        setRecent([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = user?.fullName?.split(' ')[0] ?? '';
  const kpi = (value) => (stats ? value : <span className="op-sk" style={{ width: 48, height: 30 }} />);

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>
            {greeting(t)}
            {firstName && `, ${firstName}`}
          </h1>
          <p>{t('dash.subtitle')}</p>
        </div>
        <Link to="/operator/orders" className="op-b is-p">
          <ShoppingBag size={15} strokeWidth={1.8} aria-hidden="true" />
          {t('dash.toOrders')}
        </Link>
      </div>

      <div className="op-kp">
        <Link to="/operator/orders" className="op-k">
          <span>
            <ShoppingBag size={14} aria-hidden="true" /> {t('menu.orders')}
          </span>
          <b>—</b>
          <small>{t('dash.notConnected')}</small>
        </Link>
        <Link to="/operator/factories" className="op-k">
          <span>
            <Factory size={14} aria-hidden="true" /> {t('menu.factories')}
          </span>
          <b>{kpi(stats?.total)}</b>
          <small>{t('dash.totalPartners')}</small>
        </Link>
        <Link to="/operator/factories" className="op-k">
          <span>
            <Store size={14} aria-hidden="true" /> {t('dash.active')}
          </span>
          <b>{kpi(stats?.active)}</b>
          <small>{t('dash.activeHint')}</small>
        </Link>
        <Link to="/operator/factories" className="op-k">
          <span>
            <ShieldOff size={14} aria-hidden="true" /> {t('dash.blocked')}
          </span>
          <b>{kpi(stats?.blocked)}</b>
          <small>{t('dash.blockedHint')}</small>
        </Link>
      </div>

      {error && <div className="op-msg">{error}</div>}

      <div className="op-g2">
        <section className="op-cd" aria-labelledby="recent-ws">
          <div className="op-cd-hd">
            <div>
              <h2 id="recent-ws">{t('dash.recent')}</h2>
              <p>{t('dash.recentHint')}</p>
            </div>
            <Link to="/operator/factories" className="op-b is-sm">
              {t('dash.all')} <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
          {recent === null ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="op-li">
                <span className="op-sk" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                <div>
                  <span className="op-sk" style={{ width: '60%', height: 12, marginBottom: 6 }} />
                  <span className="op-sk" style={{ width: '35%', height: 10 }} />
                </div>
              </div>
            ))
          ) : recent.length === 0 ? (
            <div className="op-em">
              <Factory size={28} aria-hidden="true" />
              <h3>{t('dash.noWs')}</h3>
              <p>{t('dash.noWsHint')}</p>
            </div>
          ) : (
            recent.map((w) => (
              <div key={w.id} className="op-li">
                <span className="op-av" style={{ width: 32, height: 32, fontSize: 12 }} aria-hidden="true">
                  {w.workshopName?.[0]?.toUpperCase() ?? '?'}
                </span>
                <div>
                  <div className="op-t">
                    <b style={{ fontWeight: 500 }}>{w.workshopName}</b>
                  </div>
                  <div className="op-sub op-t">
                    {w.fullName} · {prettyPhone(w.phone)}
                  </div>
                </div>
                <div style={{ flex: 'none', textAlign: 'right' }}>
                  <span className={`op-bd ${w.isActive ? 'is-ok' : 'is-off'}`}>
                    {t(w.isActive ? 'dash.wsActive' : 'dash.blocked')}
                  </span>
                  <div className="op-sub" style={{ marginTop: 2 }}>
                    {formatDate(w.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        <div className="op-stk">
          <section className="op-cd op-pd">
            <h2>{t('menu.orders')}</h2>
            <p className="op-sub" style={{ fontSize: 14 }}>
              {t('dash.ordersHint')}
            </p>
            <Link to="/operator/orders" className="op-b">
              {t('dash.open')} <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </section>
          <section className="op-cd op-pd">
            <h2>{t('dash.quick')}</h2>
            <div className="op-row is-w">
              <Link to="/operator/factories" className="op-b is-sm">
                {t('menu.factories')}
              </Link>
              <Link to="/operator/notifications" className="op-b is-sm">
                {t('menu.notifications')}
              </Link>
              <Link to="/operator/profile" className="op-b is-sm">
                {t('menu.profile')}
              </Link>
              <Link to="/operator/settings" className="op-b is-sm">
                {t('menu.settings')}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
