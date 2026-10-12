import { Link } from 'react-router-dom';
import { CheckCircle2, CircleDot, Inbox, Phone, Settings } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { ROLE_LABELS } from '../../../constants/roles';
import { prettyPhone } from '../../../features/accounts/accountsApi';
import { formatDateTime, initials, useOperator } from '../prefs';

export default function OperatorProfile() {
  const { user, role } = useAuth();
  const { loginAt } = useOperator();
  const name = user?.fullName || 'Operator';

  // Buyurtmalar API hali yo'q — raqamlar ulanganda to'ladi
  const stats = [
    { label: 'Menga biriktirilgan', value: '—', icon: Inbox },
    { label: 'Hal qilingan', value: '—', icon: CheckCircle2 },
    { label: 'Ochiq', value: '—', icon: CircleDot },
  ];

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>Profil</h1>
          <p>Operator panelidagi hisobingiz</p>
        </div>
        <Link to="/operator/settings" className="op-b">
          <Settings size={15} strokeWidth={1.8} aria-hidden="true" />
          Sozlamalar
        </Link>
      </div>

      <section className="op-cd op-hero" aria-label="Hisob ma'lumotlari">
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
          <dt>Rol</dt>
          <dd>
            <b style={{ fontWeight: 600 }}>{ROLE_LABELS[role] ?? 'Operator'}</b>
          </dd>
          <dt>Jamoa</dt>
          <dd>Formo operatorlari</dd>
          <dt>Status</dt>
          <dd>
            <span className="op-bd is-ok">Online</span>
          </dd>
          <dt>Oxirgi kirish</dt>
          <dd>{formatDateTime(loginAt)}</dd>
          <dt>Ro‘yxatdan o‘tgan</dt>
          <dd>{formatDateTime(user?.createdAt)}</dd>
        </dl>
      </section>

      <h2>Statistika</h2>
      <div className="op-st3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label}>
            <span>
              <Icon size={14} aria-hidden="true" />
              {label}
            </span>
            <b>{value}</b>
            <small className="op-sub">Buyurtmalar moduli ulanganda hisoblanadi</small>
          </div>
        ))}
      </div>

      <p className="op-sub" style={{ marginTop: 14 }}>
        Ism va telefon raqamini superadmin o‘zgartiradi. Superadmin boshqaruvlari bu rolda mavjud emas.
      </p>
    </>
  );
}
