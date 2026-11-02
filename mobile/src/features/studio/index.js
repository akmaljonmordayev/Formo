// Eski "Maxsus dizayn" (o'z rangim) buyurtmalari — ilovada endi faqat Forma 360°, lekin savat/buyurtma tarixida
// bunday qatorlar qolgan bo'lishi mumkin. Id'lar backend/src/shop/studio.ts bilan bir xil; nomlar i18n'da.

export const NEON = 'neon';
export const GIFT_PACKAGE = 'sovga-qutisi';

/** Joriy tildagi qisqa tavsif: "Lojuvard · Sport · Kapitan" */
export function designText(t, design) {
  if (!design) return '';
  const color = design.color || {};
  const colorLabel =
    color.type === 'custom' ? (color.hex || '').toUpperCase() : t(`${color.type === 'gradient' ? 'grad' : 'color'}_${color.id}`);
  return [
    colorLabel,
    design.font ? t(`font_${design.font}`) : null,
    design.patch ? t(`patch_${design.patch}`) : null,
    design.textColor ? `${t('textColorShort')} — ${t(`tcolor_${design.textColor}`)}` : null,
    design.textEffect === NEON ? t('neonEffect') : null,
    design.package === GIFT_PACKAGE ? t('pkg_sovga-qutisi') : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
