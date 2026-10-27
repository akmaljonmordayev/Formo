import { KitDesign } from '@prisma/client';

/**
 * 3D forma dizayni — @formo/kit-3d (packages/kit-3d/src/design.js) dagi v1 shakli bilan bir xil.
 * Admin tahrirlovchi, mobil WebView va buyurtmadagi designSnapshot aynan shu obyektni o'qiydi.
 */
export const KIT_DESIGN_VERSION = 1;
export const KIT_PATTERNS = ['fade', 'split', 'geo', 'stripes', 'hoops', 'sash', 'halftone', 'plain'] as const;
export const KIT_NECKS = ['round', 'v'] as const;
export const KIT_DESIGN_TITLE = '3D dizayn';

export interface KitDesignV1 {
  designVersion: typeof KIT_DESIGN_VERSION;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  pattern: string;
  neck: string;
  sponsorText: string;
  backTopText: string;
  crestImageUrl: string | null;
  sponsorImageUrl: string | null;
}

type DesignRow = Pick<
  KitDesign,
  'name' | 'primaryColor' | 'secondaryColor' | 'textColor' | 'pattern' | 'neck' | 'sponsorText' | 'backTopText' | 'crestImageUrl' | 'sponsorImageUrl'
>;

export function toDesignV1(row: DesignRow): KitDesignV1 {
  return {
    designVersion: KIT_DESIGN_VERSION,
    name: row.name,
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    textColor: row.textColor,
    pattern: row.pattern,
    neck: row.neck,
    sponsorText: row.sponsorText,
    backTopText: row.backTopText,
    crestImageUrl: row.crestImageUrl,
    sponsorImageUrl: row.sponsorImageUrl,
  };
}

/** Admin ro'yxati va tahrirlovchi uchun: boshqaruv maydonlari + dizayn (v1) */
export function toAdminView(row: KitDesign) {
  return {
    id: row.id,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    thumbnailUrl: row.thumbnailUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    design: toDesignV1(row),
  };
}
