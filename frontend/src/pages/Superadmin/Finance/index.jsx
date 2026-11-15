import { useEffect, useState } from 'react';
import { CalendarCheck, Receipt, ShoppingBag, Undo2, Wallet } from 'lucide-react';
import { financeApi, PAYMENT_METHOD } from '../../../features/platform/platformApi';
import { downloadCsv } from '../../../utils/csvExport';
import { useCompactNumber, useDayLabel, useMoney, useT } from '../i18n';
import RangePicker, { RANGES, rangeParams, todayKey } from '../RangePicker';
import { CountUp, Kpi, TrendChart } from '../ui';

const METHOD_COLOR = { CLICK: '#5b7cfa', PAYME: '#19a7a1', CASH: '#f2a33a', BALANCE: '#8b5cf6', WALLET: '#8b5cf6' };

/** Sotuvlar: tanlangan davrda nechta buyurtma sotildi, qancha pul tushdi va qaysi to'lov usuli bilan */
export default function SuperadminSales() {
  const money = useMoney();
  const compact = useCompactNumber();
  const dayLabel = useDayLabel();
  const t = useT();
  const [range, setRange] = useState(RANGES[2]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const badRange = Boolean(from && to) && from > to;

  useEffect(() => {
    if (badRange) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    financeApi
      .get(rangeParams(range, from, to))
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [range, from, to, badRange]);

  const methods = Object.entries(data?.byMethod ?? {}).sort(([, a], [, b]) => b.sum - a.sum);
  const totalByMethod = methods.reduce((s, [, m]) => s + m.sum, 0);
  const share = (sum) => (totalByMethod ? Math.round((sum / totalByMethod) * 100) : 0);
  const revenue = data?.revenue ?? 0;
  // Eski server bu maydonlarni bermasa — to'lov usullaridan hisoblaymiz
  const ordersCount = data?.ordersCount ?? methods.reduce((s, [, m]) => s + m.count, 0);
  const avgCheck = data?.avgCheck ?? (ordersCount ? Math.round(revenue / ordersCount) : 0);

  const today = todayKey();
  const points = (data?.dailyTrend ?? []).map((d) => ({ key: d.date, label: dayLabel(d.date), value: d.revenue ?? 0, today: d.date === today }));
  const best = points.reduce((top, p) => (p.value > (top?.value ?? 0) ? p : top), null);
  const delta = data?.revenueDeltaPct;

  const exportCsv = () => {
    downloadCsv(
      `sotuvlar-${from && to ? `${from}_${to}` : range.all ? 'barcha' : `${range.days}kun`}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        [t("To'lov usuli"), ([method]) => t(PAYMENT_METHOD[method] ?? method)],
        [t('Soni'), ([, m]) => m.count],
        [t("Summa (so'm)"), ([, m]) => m.sum],
        [t('Ulushi (%)'), ([, m]) => share(m.sum)],
      ],
      methods,
    );
  };

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Sotuvlar')}</h1>
          <p>{t('Nechta buyurtma sotildi va qancha pul tushdi.')}</p>
        </div>
        <button type="button" className="sa-btn sa-btn--ghost" onClick={exportCsv} disabled={!methods.length}>{t('Excel eksport')}</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <RangePicker range={range} onRange={setRange} from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </div>

      {badRange && <div className="form-error">{t("Boshlanish sanasi tugash sanasidan keyin bo'lmasligi kerak")}</div>}
      {error && <div className="form-error">{error}</div>}

      <div className="sa-hero" aria-busy={loading}>
        <div className="sa-hero__card">
          <div className="sa-hero__label">
            <Wallet size={17} strokeWidth={1.9} aria-hidden="true" />
            {t('Jami tushum')}
          </div>
          <div className="sa-hero__value">
            <CountUp value={revenue} />
            <small>{t("so'm")}</small>
          </div>
          <div className={`sa-hero__hint${delta > 0 ? ' is-up' : delta < 0 ? ' is-down' : ''}`}>
            {delta === null || delta === undefined
              ? t('Tanlangan davr uchun')
              : t('{pct}% oldingi davrga nisbatan', { pct: `${delta > 0 ? '+' : ''}${delta}` })}
          </div>
        </div>
        <div className="sa-hero__card">
          <div className="sa-hero__label">
            <ShoppingBag size={17} strokeWidth={1.9} aria-hidden="true" />
            {t('Sotilgan buyurtmalar')}
          </div>
          <div className="sa-hero__value">
            <CountUp value={ordersCount} />
            <small>{t('ta')}</small>
          </div>
          <div className="sa-hero__hint">{t("To'lovi qabul qilingan buyurtmalar")}</div>
        </div>
      </div>

      <div className="sa-kpis">
        <Kpi
          icon={Receipt}
          label={t("O'rtacha chek")}
          value={<CountUp value={avgCheck} format={money} />}
          hint={t("Bitta buyurtmaga to'g'ri keladigan summa")}
          color="var(--sa-teal)"
        />
        <Kpi
          icon={CalendarCheck}
          label={t('Eng yaxshi kun')}
          value={best ? best.label : '—'}
          hint={best ? money(best.value) : t("Bu davrda to'lov yo'q")}
          color="var(--sa-accent)"
          delay={70}
        />
        <Kpi
          icon={Undo2}
          label={t('Qaytarilgan pul')}
          value={<CountUp value={data?.refunded ?? 0} format={money} />}
          hint={data?.refundedCount === undefined ? undefined : t('{n} ta buyurtma qaytarilgan', { n: data.refundedCount })}
          color="var(--sa-red)"
          alert={data?.refunded > 0}
          delay={140}
        />
      </div>

      {data?.dailyTrend && (
        <div className="sa-panel" style={{ marginBottom: 16 }}>
          <div className="sa-panel__head">
            <div>
              <div className="sa-panel__title">{t('Kunlik tushum')}</div>
              <div className="sa-panel__sub">{t("Har bir ustun — bir kun. Ustiga olib borsangiz summa ko'rinadi.")}</div>
            </div>
          </div>
          {/* key: davr almashganda ustunlar qaytadan ko'tariladi */}
          <TrendChart
            key={points.length ? `${points[0].key}-${points.length}` : 'empty'}
            points={points}
            format={money}
            tick={compact}
            empty={loading ? t('Yuklanmoqda...') : t("Bu davrda to'lov yo'q")}
          />
        </div>
      )}

      <div className="sa-panel">
        <div className="sa-panel__head">
          <div>
            <div className="sa-panel__title">{t("To'lov usullari")}</div>
            <div className="sa-panel__sub">{t("Mijozlar qaysi usul bilan to'lagan")}</div>
          </div>
        </div>
        {methods.length === 0 ? (
          <div className="sa-chart-empty">{loading ? t('Yuklanmoqda...') : t("Bu davrda to'lov yo'q")}</div>
        ) : (
          <div className="sa-rows">
            {methods.map(([method, m]) => (
              <div key={method}>
                <div className="sa-row__top">
                  <b>
                    {t(PAYMENT_METHOD[method] ?? method)} <span>· {t("{n} ta to'lov", { n: m.count })}</span>
                  </b>
                  <b>
                    {money(m.sum)} <span>· {share(m.sum)}%</span>
                  </b>
                </div>
                <div className="sa-meter">
                  <div className="sa-meter__fill" style={{ width: `${share(m.sum)}%`, '--meter': METHOD_COLOR[method] ?? 'var(--sa-mu)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
