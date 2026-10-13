import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Factory, Phone, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { prettyPhone, workshopsApi } from '../../../features/accounts/accountsApi';
import { useT } from '../i18n';

function greeting(t) {
  const h = new Date().getHours();
  if (h < 12) return t('dash.morning');
  if (h < 18) return t('dash.day');
  return t('dash.evening');
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function OperatorDashboard() {
  const { user } = useAuth();
  const t = useT();
  const now = useClock();
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
  const kpi = (value) => (stats ? value : <span className="op-sk" style={{ width: 56, height: 40 }} />);
  const date = (iso) => new Date(iso).toLocaleDateString(t.locale, { day: '2-digit', month: '2-digit' });
  const share = stats && stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : null;

  return (
    <>
      <section className="op-hi" aria-labelledby="dash-hi">
        <div className="op-hi-top">
          <span className="op-clock">{now.toLocaleTimeString(t.locale, { hour12: false })}</span>
          <span className="op-pill">{t('role.OPERATOR')}</span>
        </div>
        <h1 id="dash-hi">
          {greeting(t)}
          {firstName && (
            <>
              ,<br />
              {firstName}
            </>
          )}
        </h1>
        <div className="op-hi-row">
          <div className="op-hi-txt">
            <p>{stats ? t('dash.hero', stats) : t('dash.subtitle')}</p>
            <div className="op-row is-w">
              <Link to="/operator/orders" className="op-b is-ink is-lg">
                <ShoppingBag size={15} strokeWidth={2} aria-hidden="true" />
                {t('dash.toOrders')}
              </Link>
              <Link to="/operator/factories" className="op-b is-line is-lg">
                {t('dash.toFactories')} <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <dl className="op-hi-kp">
            <div>
              <dd>{kpi(stats?.total)}</dd>
              <dt>{t('dash.totalPartners')}</dt>
            </div>
            <div>
              <dd>{kpi(stats?.active)}</dd>
              <dt>{t('dash.active')}</dt>
            </div>
            <div>
              <dd>{kpi(stats?.blocked)}</dd>
              <dt>{t('dash.blocked')}</dt>
            </div>
          </dl>
        </div>
      </section>

      {error && <div className="op-msg">{error}</div>}

      <div className="op-sh">
        <h2>
          {t('dash.newWs')}
          {recent?.length > 0 && <em>{recent.length}</em>}
        </h2>
        <span className="op-sub">{t('dash.newWsHint')}</span>
      </div>

      {recent === null ? (
        <div className="op-tags">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="op-sk" style={{ height: 210, borderRadius: 16 }} />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <section className="op-cd">
          <div className="op-em">
            <Factory size={28} aria-hidden="true" />
            <h3>{t('dash.noWs')}</h3>
            <p>{t('dash.noWsHint')}</p>
          </div>
        </section>
      ) : (
        <div className="op-tags">
          {recent.map((w, i) => (
            <article key={w.id} className={`op-tag is-c${i % 5}`}>
              <div className="op-tag-hd">
                <span className="op-tag-lb">{t(w.isActive ? 'dash.wsActive' : 'dash.blocked')}</span>
                <span className="op-mono">{date(w.createdAt)}</span>
              </div>
              <h3>{w.workshopName}</h3>
              <p>
                {w.fullName} · {prettyPhone(w.phone)}
              </p>
              <div className="op-tag-ft">
                <a href={`tel:${w.phone}`} className="op-b is-ink">
                  <Phone size={13} strokeWidth={2.2} aria-hidden="true" />
                  {t('dash.call')}
                </a>
                <Link to="/operator/factories" className="op-tag-go" aria-label={`${t('dash.open')}: ${w.workshopName}`}>
                  <ArrowRight size={16} strokeWidth={2.2} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="op-g2">
        <section className="op-cd op-pd" aria-labelledby="dash-health">
          <div className="op-cd-tt">
            <div>
              <h2 id="dash-health">{t('dash.health')}</h2>
              <p className="op-sub">{t('dash.healthHint')}</p>
            </div>
            <Link to="/operator/factories" className="op-lk">
              {t('dash.all')} <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="op-meter" role="img" aria-label={share === null ? '—' : t('dash.activeShare', { n: share })}>
            <span style={{ width: `${share ?? 0}%` }} />
          </div>
          <div className="op-legend">
            <div>
              <i className="is-ok" />
              <span>{t('dash.active')}</span>
              <b>{kpi(stats?.active)}</b>
            </div>
            <div>
              <i className="is-off" />
              <span>{t('dash.blocked')}</span>
              <b>{kpi(stats?.blocked)}</b>
            </div>
            <div>
              <i />
              <span>{t('dash.totalPartners')}</span>
              <b>{kpi(stats?.total)}</b>
            </div>
          </div>
          <p className="op-big">{share === null ? '—' : t('dash.activeShare', { n: share })}</p>
        </section>

        <section className="op-cd op-pd op-lav" aria-labelledby="dash-orders">
          <span className="op-eyebrow">{t('dash.notConnected')}</span>
          <h2 id="dash-orders">{t('menu.orders')}</h2>
          <p>{t('dash.ordersHint')}</p>
          <div className="op-row is-w">
            <Link to="/operator/orders" className="op-b is-sm">
              {t('dash.open')} <ArrowRight size={13} aria-hidden="true" />
            </Link>
            <Link to="/operator/notifications" className="op-b is-sm">
              {t('menu.notifications')}
            </Link>
            <Link to="/operator/settings" className="op-b is-sm">
              {t('menu.settings')}
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
