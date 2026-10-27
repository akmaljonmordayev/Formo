import { useMemo, useRef, useState } from 'react';
import Kit3DViewer from '@formo/kit-3d/react';
import {
  BACK_NAME_MAX,
  BACK_TOP_TEXT_MAX,
  KIT_NECKS,
  KIT_NECK_LABELS,
  KIT_PATTERNS,
  KIT_PATTERN_LABELS,
  KIT_PRESETS,
  SPONSOR_TEXT_MAX,
  normalizeDesign,
} from '@formo/kit-3d/design';
import { assetUrl } from '../../../services/api';
import { useT } from '../i18n';
import ImageField from './ImageField';
import { makeThumbnail } from './thumbnail';
import './kitDesigns.css';

/**
 * 3D forma dizayni tahrirlovchisi: chapda forma, o'ngda jonli 3D ko'rinish.
 * "Sinov uchun ism/raqam" faqat ko'rinishni tekshirish uchun — saqlanmaydi (dizayn ism-raqamsiz saqlanadi).
 *
 * Props:
 *   initial  — admin ko'rinishi { design, isActive, sortOrder } yoki null (yangi)
 *   onSave(payload, thumbnail) — payload: { design, isActive, sortOrder }; thumbnail() → Promise<Blob|null>.
 *                                Berilmasa saqlash tugmalari ko'rinmaydi.
 *   onCancel, saving, error
 */
export default function KitDesignEditor({ initial, onSave, onCancel, saving = false, error = '' }) {
  const t = useT();
  const [form, setForm] = useState(() => normalizeDesign(initial?.design));
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const isActive = initial?.isActive ?? false;
  const [testName, setTestName] = useState('');
  const [testNumber, setTestNumber] = useState('');
  const [view, setView] = useState('front');
  const [spin, setSpin] = useState(true);
  const scene = useRef(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setValue = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  // Saqlanadigan dizayn (rasm manzillari server bergancha — nisbiy bo'lishi mumkin)
  const design = useMemo(() => normalizeDesign(form), [form]);
  // Viewer uchun rasm manzillari to'liq URL'ga aylantiriladi
  const viewDesign = useMemo(
    () => ({ ...design, crestImageUrl: assetUrl(design.crestImageUrl), sponsorImageUrl: assetUrl(design.sponsorImageUrl) }),
    [design],
  );

  const applyPreset = (p) =>
    setForm((f) => ({ ...f, primaryColor: p.primaryColor, secondaryColor: p.secondaryColor, textColor: p.textColor, pattern: p.pattern }));
  const presetActive = (p) => p.primaryColor === form.primaryColor && p.secondaryColor === form.secondaryColor && p.pattern === form.pattern;

  const turn = (side) => {
    setSpin(false);
    setView(side);
  };

  /** Ro'yxat uchun bir martalik rasm: old tomondan, ism-raqamsiz */
  const thumbnail = async () => {
    const api = scene.current;
    if (!api) return null;
    setSpin(false);
    setView('front');
    api.update({ backName: '', number: '' });
    api.setView('front', { immediate: true });
    return makeThumbnail(api.snapshot());
  };

  const save = (publish) => {
    onSave?.({ design: { ...design, name: form.name.trim() }, sortOrder: Number(sortOrder) || 0, isActive: publish ?? isActive }, thumbnail);
  };

  const submit = (e) => {
    e.preventDefault();
    save();
  };

  return (
    <form className="kd-editor" onSubmit={submit}>
      <div className="kd-form sa-panel">
        {error && <div className="form-error">{error}</div>}

        <div className="kd-row2">
          <label className="kd-field">
            <span>{t('Nomi')}</span>
            <input className="sa-input" value={form.name} onChange={set('name')} required minLength={2} maxLength={40} placeholder="Oqim 2026" />
          </label>
          <label className="kd-field">
            <span>{t('Tartib')}</span>
            <input className="sa-input" type="number" min={0} max={10000} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </label>
        </div>

        <div className="kd-group">
          <div className="kd-label">{t('Tayyor ranglar')}</div>
          <div className="kd-presets">
            {KIT_PRESETS.map((p) => (
              <button key={p.id} type="button" className="kd-preset" aria-pressed={presetActive(p)} onClick={() => applyPreset(p)}>
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

        <div className="kd-row2">
          <label className="kd-field">
            <span>{t('Homiy matni')}</span>
            <input className="sa-input" value={form.sponsorText} onChange={set('sponsorText')} maxLength={SPONSOR_TEXT_MAX} placeholder="KARVON" />
          </label>
          <label className="kd-field">
            <span>{t('Orqa tepadagi yozuv')}</span>
            <input
              className="sa-input"
              value={form.backTopText}
              onChange={set('backTopText')}
              onFocus={() => turn('back')}
              maxLength={BACK_TOP_TEXT_MAX}
              placeholder="TURON FC"
            />
          </label>
        </div>

        <div className="kd-row2">
          <ImageField label={t('Nishon rasmi')} kind="crest" value={form.crestImageUrl} onChange={setValue('crestImageUrl')} />
          <ImageField label={t('Homiy rasmi')} kind="sponsor" value={form.sponsorImageUrl} onChange={setValue('sponsorImageUrl')} />
        </div>
        <small className="kd-note">
          {t("Faqat o'zingizning yoki ruxsat olingan logotip — haqiqiy klub va brend logotiplari ishlatilmaydi. PNG/JPEG/WEBP, 2 MB gacha.")}
        </small>

        <div className="kd-group kd-test">
          <div className="kd-label">{t('Sinov uchun (saqlanmaydi)')}</div>
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
            {onSave && isActive && (
              <button type="button" className="sa-btn sa-btn--ghost" disabled={saving} onClick={() => save(false)}>
                {t('Nashrdan olish')}
              </button>
            )}
            {onSave && (
              <button type="submit" className={isActive ? 'sa-btn' : 'sa-btn sa-btn--ghost'} disabled={saving}>
                {saving ? t('Saqlanmoqda...') : t('Saqlash')}
              </button>
            )}
            {onSave && !isActive && (
              <button type="button" className="sa-btn" disabled={saving} onClick={() => save(true)}>
                {t('Nashr qilish')}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="kd-stage">
        <Kit3DViewer
          className="kd-viewer"
          design={viewDesign}
          backName={testName}
          number={testNumber}
          view={view}
          autoRotate={spin}
          onReady={(api) => {
            scene.current = api;
          }}
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
