import { useMemo, useState } from 'react';
import Kit3DViewer from '@formo/kit-3d/react';
import {
  BACK_NAME_MAX,
  KIT_NECKS,
  KIT_NECK_LABELS,
  KIT_PATTERNS,
  KIT_PATTERN_LABELS,
  KIT_PRESETS,
  normalizeDesign,
} from '@formo/kit-3d/design';
import { useT } from '../i18n';
import './kitDesigns.css';

/**
 * 3D forma dizayni tahrirlovchisi: chapda forma, o'ngda jonli 3D ko'rinish.
 * "Sinov uchun ism/raqam" faqat ko'rinishni tekshirish uchun — saqlanmaydi (dizayn ism-raqamsiz saqlanadi).
 *
 * Props: initial (dizayn yoki null), onSave(design) — berilmasa saqlash tugmasi ko'rinmaydi, onCancel, saving, error
 */
export default function KitDesignEditor({ initial, onSave, onCancel, saving = false, error = '' }) {
  const t = useT();
  const [form, setForm] = useState(() => normalizeDesign(initial));
  const [testName, setTestName] = useState('');
  const [testNumber, setTestNumber] = useState('');
  const [view, setView] = useState('front');
  const [spin, setSpin] = useState(true);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  // Viewer har render'da yangi obyekt olmasin — faqat dizayn o'zgarganda
  const design = useMemo(() => normalizeDesign(form), [form]);

  const applyPreset = (p) =>
    setForm((f) => ({ ...f, primaryColor: p.primaryColor, secondaryColor: p.secondaryColor, textColor: p.textColor, pattern: p.pattern }));
  const presetActive = (p) => p.primaryColor === form.primaryColor && p.secondaryColor === form.secondaryColor && p.pattern === form.pattern;

  const turn = (side) => {
    setSpin(false);
    setView(side);
  };

  const submit = (e) => {
    e.preventDefault();
    onSave?.({ ...design, name: form.name.trim() });
  };

  return (
    <form className="kd-editor" onSubmit={submit}>
      <div className="kd-form sa-panel">
        {error && <div className="form-error">{error}</div>}

        <label className="kd-field">
          <span>{t('Nomi')}</span>
          <input className="sa-input" value={form.name} onChange={set('name')} required minLength={2} maxLength={40} placeholder="Oqim 2026" />
        </label>

        <div className="kd-group">
          <div className="kd-label">{t('Tayyor ranglar')}</div>
          <div className="kd-presets">
            {KIT_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="kd-preset"
                aria-pressed={presetActive(p)}
                onClick={() => applyPreset(p)}
              >
                <span className="kd-sw" style={{ background: `linear-gradient(135deg, ${p.primaryColor} 50%, ${p.secondaryColor} 50%)` }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="kd-row3">
          <label className="kd-field">
            <span>{t('Asosiy')}</span>
            <input type="color" className="kd-color" value={form.primaryColor} onChange={set('primaryColor')} />
          </label>
          <label className="kd-field">
            <span>{t('Ikkinchi')}</span>
            <input type="color" className="kd-color" value={form.secondaryColor} onChange={set('secondaryColor')} />
          </label>
          <label className="kd-field">
            <span>{t('Yozuvlar')}</span>
            <input type="color" className="kd-color" value={form.textColor} onChange={set('textColor')} />
          </label>
        </div>

        <div className="kd-row2">
          <label className="kd-field">
            <span>{t('Naqsh')}</span>
            <select className="sa-input" value={form.pattern} onChange={set('pattern')}>
              {KIT_PATTERNS.map((p) => (
                <option key={p} value={p}>
                  {t(KIT_PATTERN_LABELS[p])}
                </option>
              ))}
            </select>
          </label>
          <label className="kd-field">
            <span>{t('Yoqa')}</span>
            <select className="sa-input" value={form.neck} onChange={set('neck')}>
              {KIT_NECKS.map((n) => (
                <option key={n} value={n}>
                  {t(KIT_NECK_LABELS[n])}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="kd-field">
          <span>{t('Homiy matni')}</span>
          <input className="sa-input" value={form.sponsorText} onChange={set('sponsorText')} maxLength={20} placeholder="KARVON" />
          <small>{t("Faqat o'zingizning yoki ruxsat olingan nom — haqiqiy brend logotiplari ishlatilmaydi")}</small>
        </label>

        <div className="kd-group kd-test">
          <div className="kd-label">{t("Sinov uchun (saqlanmaydi)")}</div>
          <div className="kd-row2">
            <label className="kd-field">
              <span>{t('Orqadagi ism')}</span>
              <input
                className="sa-input"
                value={testName}
                maxLength={BACK_NAME_MAX}
                onChange={(e) => setTestName(e.target.value)}
                onFocus={() => turn('back')}
                placeholder="RAHIMOV"
              />
            </label>
            <label className="kd-field">
              <span>{t('Raqam')}</span>
              <input
                className="sa-input"
                inputMode="numeric"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                onFocus={() => turn('back')}
                placeholder="10"
              />
            </label>
          </div>
        </div>

        {(onSave || onCancel) && (
          <div className="kd-actions">
            {onCancel && (
              <button type="button" className="sa-btn sa-btn--ghost" onClick={onCancel} disabled={saving}>
                {t('Bekor qilish')}
              </button>
            )}
            {onSave && (
              <button type="submit" className="sa-btn" disabled={saving}>
                {saving ? t('Saqlanmoqda...') : t('Saqlash')}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="kd-stage">
        <Kit3DViewer
          className="kd-viewer"
          design={design}
          backName={testName}
          number={testNumber}
          view={view}
          autoRotate={spin}
        />
        <div className="kd-stage-top" role="group" aria-label={t("Ko'rinish")}>
          <button type="button" className="kd-pill" aria-pressed={!spin && view === 'front'} onClick={() => turn('front')}>
            {t('Old')}
          </button>
          <button type="button" className="kd-pill" aria-pressed={!spin && view === 'back'} onClick={() => turn('back')}>
            {t('Orqa')}
          </button>
          <button type="button" className="kd-pill" aria-pressed={spin} onClick={() => setSpin((s) => !s)}>
            {t('Aylantirish')}
          </button>
        </div>
        <div className="kd-hint">{t("Sichqoncha bilan aylantiring · g'ildirak bilan yaqinlashtiring")}</div>
      </div>
    </form>
  );
}
