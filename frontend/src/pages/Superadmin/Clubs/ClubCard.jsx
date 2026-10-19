import { kitSetPrice } from '../adminApi';
import { useT, useMoney } from '../i18n';

/* Klublar va formalar sahifasidagi kartochka: nishon, liga/qit'a, 3 ta forma (uy/mehmon/uchinchi) va sotuv tugmasi.
   Avval bu yerda statik (mock) sahifa bor edi — endi real API ma'lumotini ko'rsatadi. */

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      style={{
        position: 'relative', width: 36, height: 20, borderRadius: 999, border: 'none', padding: 0,
        cursor: disabled ? 'wait' : 'pointer', background: checked ? 'var(--sa-teal)' : 'rgba(255,255,255,0.12)',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: '50%',
          background: '#fff', transition: 'left .15s ease',
        }}
      />
    </button>
  );
}

const KIT_NAMES = { Uy: 'Uy', Mehmon: 'Mehmon', Uchinchi: 'Uchinchi' };

function KitTile({ club, kit, busy, onToggle }) {
  const money = useMoney();
  const t = useT();
  const label = KIT_NAMES[kit.label] ? t(kit.label) : kit.label;
  return (
    <div
      style={{
        flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: '8px 8px 10px', borderRadius: 12, background: 'var(--sa-surface-2)', border: '1px solid var(--sa-line)',
      }}
    >
      <div
        style={{
          width: '100%', height: 56, borderRadius: 10, display: 'grid', placeItems: 'center',
          background: kit.bgColor, color: kit.textColor, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18,
          border: '1px solid var(--sa-line)', opacity: kit.isActive ? 1 : 0.4, transition: 'opacity .15s ease',
        }}
      >
        {club.code}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 11.5, color: 'var(--sa-mu)', textAlign: 'center', lineHeight: 1.35 }}>
        {money(kitSetPrice(kit))}
        <br />
        <span style={{ fontSize: 10.5 }}>{t('futbolka {sum}', { sum: money(kit.shirtPrice) })}</span>
      </div>
      <Switch
        checked={kit.isActive}
        disabled={busy}
        onChange={onToggle}
        label={t('{kit} formasi — sotuvda', { kit: label })}
      />
    </div>
  );
}

export default function ClubCard({ club, subtitle, busyKit, onToggleKit, onEdit, onDelete }) {
  const t = useT();
  return (
    <article className="sa-panel" style={club.isActive ? undefined : { opacity: 0.6 }}>
      <div className="sa-panel__head" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200, flex: '1 1 200px' }}>
          <span
            style={{
              display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: club.markColor, color: '#fff', fontWeight: 800, fontSize: 12, fontFamily: 'var(--font-display)',
            }}
          >
            {club.code}
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="sa-panel__title" style={{ fontSize: 14.5 }}>
              {club.name}
              {!club.isActive && (
                <span className="sa-badge sa-badge--red" style={{ marginLeft: 8 }}>{t('Yashirilgan')}</span>
              )}
            </div>
            <div className="sa-table__sub">{subtitle}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button type="button" className="sa-btn sa-btn--ghost" onClick={onEdit}>{t('Tahrirlash')}</button>
          <button
            type="button"
            className="sa-btn sa-btn--ghost"
            onClick={onDelete}
            aria-label={t("{name} ni o'chirish", { name: club.name })}
          >
            {t("O'chirish")}
          </button>
        </div>
      </div>
      {club.kits.length === 0 ? (
        <div className="sa-table__sub">{t("Forma yo'q — «Tahrirlash» orqali qo'shing")}</div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          {club.kits.map((k) => (
            <KitTile key={k.id} club={club} kit={k} busy={busyKit === k.id} onToggle={() => onToggleKit(k)} />
          ))}
        </div>
      )}
    </article>
  );
}
