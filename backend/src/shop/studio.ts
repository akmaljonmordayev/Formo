/** Dizayn studiyasi (maxsus futbolka): Superadmin "Dizayn studiyasi" sahifasidagi tanlovlar bilan bir xil id'lar */
export const SOLID_COLOR_IDS = ['oq', 'qora', 'toqkok', 'lojuvard', 'firuza', 'sariq', 'qizil', 'yashil'] as const;
export const GRADIENT_IDS = ['quyosh', 'dengiz', 'olov', 'tong', 'tun', 'chempion'] as const;
export const FONT_IDS = ['sport', 'klassik', 'oddiy'] as const;
export const PATCH_IDS = ['kapitan', 'bayroq', 'chempion'] as const;
export const PACKAGE_IDS = ['oddiy-paket', 'sovga-qutisi'] as const;

export type ColorType = 'solid' | 'gradient' | 'custom';

/** Mijoz tanlovi (savat qatori va buyurtma qatorida JSON sifatida saqlanadi) */
export interface Design {
  color: { type: ColorType; id?: string; hex?: string };
  font: string;
  patch: string | null;
  package: string;
}

export interface StudioPrices {
  custom: number; // futbolka + ism va raqam
  gradient: number; // gradient / maxsus rang qo'shimchasi
  patch: number;
  gift: number; // sovg'a qutisi
}

/** `PricingItem` jadvalida kalit bo'lmasa shu narxlar (Superadmin "Narxlar" sahifasi standarti) */
export const DEFAULT_STUDIO_PRICES: StudioPrices = { custom: 129000, gradient: 30000, patch: 10000, gift: 15000 };

export const STUDIO_PRICE_KEYS = {
  custom: 'studio.custom',
  gradient: 'studio.gradient',
  patch: 'studio.patch',
  gift: 'studio.gift',
} as const;

export const GIFT_PACKAGE = 'sovga-qutisi';

export const CUSTOM_TITLE = 'Maxsus dizayn';

/** Maxsus futbolka narxi: asosiy narx + gradient/maxsus rang + yamoq + sovg'a qutisi */
export function studioPrice(design: Design, p: StudioPrices) {
  return (
    p.custom +
    (design.color.type !== 'solid' ? p.gradient : 0) +
    (design.patch ? p.patch : 0) +
    (design.package === GIFT_PACKAGE ? p.gift : 0)
  );
}

/** Ro'yxatlarda ko'rinadigan qisqa tavsif: "Maxsus dizayn · lojuvard · sport" */
export function designSummary(design: Design) {
  const color = design.color.type === 'custom' ? design.color.hex : design.color.id;
  return [CUSTOM_TITLE, color, design.font, design.patch].filter(Boolean).join(' · ');
}
