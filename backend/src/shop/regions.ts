/** Yetkazish narxi viloyat bo'yicha: 12 viloyat + Qoraqalpog'iston Respublikasi + Toshkent shahri (alohida). */
export const REGIONS = [
  { code: 'TOSHKENT_SHAHRI', label: 'Toshkent shahri' },
  { code: 'TOSHKENT_VILOYATI', label: 'Toshkent viloyati' },
  { code: 'ANDIJON', label: 'Andijon' },
  { code: 'BUXORO', label: 'Buxoro' },
  { code: 'FARGONA', label: "Farg'ona" },
  { code: 'JIZZAX', label: 'Jizzax' },
  { code: 'XORAZM', label: 'Xorazm' },
  { code: 'NAMANGAN', label: 'Namangan' },
  { code: 'NAVOIY', label: 'Navoiy' },
  { code: 'QASHQADARYO', label: 'Qashqadaryo' },
  { code: 'SAMARQAND', label: 'Samarqand' },
  { code: 'SIRDARYO', label: 'Sirdaryo' },
  { code: 'SURXONDARYO', label: 'Surxondaryo' },
  { code: 'QORAQALPOGISTON', label: "Qoraqalpog'iston Respublikasi" },
] as const;

export const REGION_CODES = REGIONS.map((r) => r.code);
export type RegionCode = (typeof REGION_CODES)[number];
export const isRegionCode = (v: unknown): v is RegionCode => typeof v === 'string' && (REGION_CODES as readonly string[]).includes(v);

/** `delivery.fee` (eski, hamma joy uchun bitta) — viloyat ko'rsatilmagan/noma'lum bo'lsa shu ishlatiladi */
export const DEFAULT_REGION_FEE = 15000;

/** Admin "Formalar" sahifasidagi jadval uchun: har bir viloyat standart narxda */
export const DEFAULT_FEES_BY_REGION: Record<RegionCode, number> = Object.fromEntries(
  REGION_CODES.map((code) => [code, DEFAULT_REGION_FEE]),
) as Record<RegionCode, number>;
