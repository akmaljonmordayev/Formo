/** Dizayn studiyasi (maxsus futbolka): Superadmin "Dizayn studiyasi" sahifasidagi tanlovlar bilan bir xil id'lar */
export const SOLID_COLOR_IDS = ['oq', 'qora', 'toqkok', 'lojuvard', 'firuza', 'sariq', 'qizil', 'yashil'] as const;
export const GRADIENT_IDS = ['quyosh', 'dengiz', 'olov', 'tong', 'tun', 'chempion'] as const;
export const FONT_IDS = ['sport', 'klassik', 'oddiy'] as const;
export const PATCH_IDS = ['kapitan', 'bayroq', 'chempion'] as const;
export const PACKAGE_IDS = ['oddiy-paket', 'sovga-qutisi'] as const;
/** Ism/raqam rangi (null — fon rangiga qarab avtomatik) */
export const TEXT_COLOR_IDS = ['oq', 'qora', 'sariq', 'oltin', 'qizil', 'firuza', 'lojuvard', 'yashil'] as const;
/** Yozuv effekti: neon — yorqin "porlash" (DTF/reflektiv bosma) */
export const TEXT_EFFECTS = ['none', 'neon'] as const;

export type ColorType = 'solid' | 'gradient' | 'custom';
export type TextEffect = (typeof TEXT_EFFECTS)[number];

/** Mijoz tanlovi (savat qatori va buyurtma qatorida JSON sifatida saqlanadi) */
export interface Design {
  color: { type: ColorType; id?: string; hex?: string };
  font: string;
  patch: string | null;
  package: string;
  textColor?: string | null;
  textEffect?: TextEffect;
}

export interface StudioPrices {
  custom: number; // futbolka + ism va raqam
  gradient: number; // gradient / maxsus rang qo'shimchasi
  patch: number;
  gift: number; // sovg'a qutisi
  shorts: number; // maxsus dizaynga shortik
}

/** `PricingItem` jadvalida kalit bo'lmasa shu narxlar (Superadmin "Narxlar" sahifasi standarti) */
export const DEFAULT_STUDIO_PRICES: StudioPrices = { custom: 129000, gradient: 30000, patch: 10000, gift: 15000, shorts: 60000 };

export const STUDIO_PRICE_KEYS = {
  custom: 'studio.custom',
  gradient: 'studio.gradient',
  patch: 'studio.patch',
  gift: 'studio.gift',
  shorts: 'studio.shorts',
} as const;

export const GIFT_PACKAGE = 'sovga-qutisi';

export const CUSTOM_TITLE = 'Maxsus dizayn';

/** Maxsus futbolka narxi: asosiy narx + gradient/maxsus rang + yamoq + sovg'a qutisi (+ shortik) */
export function studioPrice(design: Design, p: StudioPrices, withShorts = false) {
  return (
    p.custom +
    (design.color.type !== 'solid' ? p.gradient : 0) +
    (design.patch ? p.patch : 0) +
    (design.package === GIFT_PACKAGE ? p.gift : 0) +
    (withShorts ? p.shorts : 0)
  );
}

/** Ro'yxatlarda ko'rinadigan qisqa tavsif: "Maxsus dizayn · lojuvard · sport · yozuv: oltin · neon" */
export function designSummary(design: Design) {
  const color = design.color.type === 'custom' ? design.color.hex : design.color.id;
  return [
    CUSTOM_TITLE,
    color,
    design.font,
    design.patch,
    design.textColor ? `yozuv: ${design.textColor}` : null,
    design.textEffect === 'neon' ? 'neon' : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
