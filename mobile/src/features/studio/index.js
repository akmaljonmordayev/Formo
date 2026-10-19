// Dizayn studiyasi (maxsus futbolka) tanlovlari. Id'lar backend/src/shop/studio.ts bilan,
// ranglar Superadmin "Dizayn studiyasi" sahifasi (DesignStudio.jsx) bilan bir xil.
// Qaysilari yoqilganini GET /api/app/config → `studio` aytadi; nomlar i18n'da.

export const SOLID_COLORS = [
  { id: 'oq', hex: '#F3F5F9' },
  { id: 'qora', hex: '#151827' },
  { id: 'toqkok', hex: '#16204F' },
  { id: 'lojuvard', hex: '#2A3FB0' },
  { id: 'firuza', hex: '#19A7A1' },
  { id: 'sariq', hex: '#F2A33A' },
  { id: 'qizil', hex: '#D63A45' },
  { id: 'yashil', hex: '#3FAE5A' },
];

export const GRADIENTS = [
  { id: 'quyosh', from: '#F2A33A', to: '#D63A45' },
  { id: 'dengiz', from: '#19A7A1', to: '#2A3FB0' },
  { id: 'olov', from: '#D63A45', to: '#8E1F3F' },
  { id: 'tong', from: '#8FD3F4', to: '#7A4FD1' },
  { id: 'tun', from: '#2A3FB0', to: '#151827' },
  { id: 'chempion', from: '#19A7A1', to: '#F2A33A' },
];

export const CUSTOM_COLOR_DEFAULT = '#7A4FD1';

// Maxsus rang uchun tayyor palitra (ilovada rang tanlagich yo'q — HEX ham kiritsa bo'ladi)
export const CUSTOM_PALETTE = ['#7A4FD1', '#E0662E', '#B8323F', '#0E7C66', '#5A66DE', '#8E1F3F', '#C9A227', '#2B2D42'];

// Ilovada shrift fayllari yo'q — uslub og'irlik/qiyalik/oraliq bilan ifodalanadi
export const FONTS = [
  { id: 'sport', style: { fontWeight: '900', fontStyle: 'italic', letterSpacing: -1 } },
  { id: 'klassik', style: { fontWeight: '900', letterSpacing: 2 } },
  { id: 'oddiy', style: { fontWeight: '600', letterSpacing: 0 } },
];

export const PATCHES = [
  { id: 'kapitan', sym: 'C' },
  { id: 'bayroq', sym: 'UZ' },
  { id: 'chempion', sym: '★' },
];

export const PACKAGES = [{ id: 'oddiy-paket' }, { id: 'sovga-qutisi' }];
export const GIFT_PACKAGE = 'sovga-qutisi';

export const HEX = /^#[0-9a-fA-F]{6}$/;

const byId = (list, id) => list.find((entry) => entry.id === id) || null;

/** Fon rangiga qarab o'qiladigan yozuv rangi (Superadmin inkFor bilan bir xil) */
export function inkFor(hex) {
  if (!HEX.test(hex || '')) return '#F3F5F9';
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? '#0E1A3F' : '#F3F5F9';
}

/** Taxminiy narx (haqiqiysini server hisoblaydi): asosiy + gradient/maxsus rang + yamoq + sovg'a qutisi */
export function estimatePrice(design, prices) {
  if (!design || !prices) return 0;
  return (
    prices.custom +
    (design.color?.type !== 'solid' ? prices.gradient : 0) +
    (design.patch ? prices.patch : 0) +
    (design.package === GIFT_PACKAGE ? prices.gift : 0)
  );
}

/** Saqlangan dizayndan JerseyPreview `product`i: { color, accent, gradient?, fontStyle?, patch? } */
export function designPreview(design) {
  const color = design?.color || {};
  let base = '#5A66DE';
  let gradient = null;
  if (color.type === 'gradient') {
    const g = byId(GRADIENTS, color.id);
    if (g) {
      gradient = [g.from, g.to];
      base = g.from;
    }
  } else if (color.type === 'custom' && HEX.test(color.hex || '')) {
    base = color.hex;
  } else {
    base = byId(SOLID_COLORS, color.id)?.hex || base;
  }
  return {
    color: base,
    accent: inkFor(gradient ? gradient[1] : base),
    gradient,
    fontStyle: byId(FONTS, design?.font)?.style,
    patch: byId(PATCHES, design?.patch)?.sym || null,
  };
}

/** Savat/buyurtma qatori uchun preview: maxsus dizayn yoki klub formasi ranglari */
export function itemPreview(item) {
  if (item?.design) return designPreview(item.design);
  return {
    color: item?.kit?.bgColor || item?.bgColor || '#242749',
    accent: item?.kit?.textColor || item?.textColor || '#FFFFFF',
  };
}

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
    design.package === GIFT_PACKAGE ? t('pkg_sovga-qutisi') : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
