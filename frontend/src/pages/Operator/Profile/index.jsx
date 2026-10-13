import { Link } from 'react-router-dom';
import { CheckCircle2, CircleDot, Inbox, Phone, Settings } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { prettyPhone } from '../../../features/accounts/accountsApi';
import { formatDateTime, initials, useOperator } from '../prefs';
import { useT } from '../i18n';

export default function OperatorProfile() {
  const { user, role } = useAuth();
  const { loginAt } = useOperator();
  const t = useT();
  const name = user?.fullName || t('role.OPERATOR');

  // Buyurtmalar API hali yo'q — raqamlar ulanganda to'ladi
  const stats = [
    { label: t('profile.assigned'), value: '—', icon: Inbox },
    { label: t('profile.resolved'), value: '—', icon: CheckCircle2 },
    { label: t('profile.open'), value: '—', icon: CircleDot },
  ];

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>{t('menu.profile')}</h1>
          <p>{t('profile.subtitle')}</p>
        </div>
        <Link to="/operator/settings" className="op-b">
          <Settings size={15} strokeWidth={1.8} aria-hidden="true" />
          {t('menu.settings')}
        </Link>
      </div>

      <section className="op-cd op-hero" aria-label={t('profile.info')}>
        <span className="op-av" style={{ width: 72, height: 72, fontSize: 24 }} aria-hidden="true">
          {initials(name)}
        </span>
        <div className="op-hero-id">
          <h1>{name}</h1>
          <div className="op-row" style={{ gap: 6, marginTop: 4, color: 'var(--op-mu)' }}>
            <Phone size={14} aria-hidden="true" />
            <span>{user?.phone ? prettyPhone(user.phone) : '—'}</span>
          </div>
        </div>
        <dl className="op-kv">
          <dt>{t('profile.role')}</dt>
          <dd>
            <b style={{ fontWeight: 600 }}>{t(`role.${role}`)}</b>
          </dd>
          <dt>{t('profile.team')}</dt>
          <dd>{t('team')}</dd>
          <dt>{t('profile.status')}</dt>
          <dd>
            <span className="op-bd is-ok">{t('online')}</span>
          </dd>
          <dt>{t('profile.lastLogin')}</dt>
          <dd>{formatDateTime(loginAt, t.locale)}</dd>
          <dt>{t('profile.registered')}</dt>
          <dd>{formatDateTime(user?.createdAt, t.locale)}</dd>
        </dl>
      </section>

      <h2>{t('profile.stats')}</h2>
      <div className="op-st3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label}>
            <span>
              <Icon size={14} aria-hidden="true" />
              {label}
            </span>
            <b>{value}</b>
            <small className="op-sub">{t('profile.statsHint')}</small>
          </div>
        ))}
      </div>

      <p className="op-sub" style={{ marginTop: 14 }}>
        {t('profile.note')}
      </p>
    </>
  );
}
