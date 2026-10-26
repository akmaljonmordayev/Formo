import { ConfigService } from '@nestjs/config';

/** Bitta to'ldirish chegaralari (so'm) — server tomonida majburiy */
export const TOPUP_MIN = 10_000;
export const TOPUP_MAX = 10_000_000;
/** Bir mijozda bir vaqtda ochiq (PENDING/REVIEW) so'rovlar */
export const TOPUP_MAX_OPEN = 3;
/** Shu oraliqda xuddi shu summa+usul bilan qayta so'rov — yangisi ochilmaydi (ikki marta bosish) */
export const TOPUP_DEDUPE_MS = 60_000;

/** Superadmin "Sozlamalar" orqali boshqariladigan qo'lda to'lov rekvizitlari (Setting `payments.manual`) */
export const MANUAL_SETTING_KEY = 'payments.manual';

export interface ManualPaymentSettings {
  enabled: boolean;
  cardNumber: string;
  cardHolder: string;
  bankName?: string;
  note?: string;
}

/** Faqat to'liq va to'g'ri to'ldirilgan rekvizitlar qabul qilinadi — aks holda usul o'chiq */
export function parseManualSettings(value: unknown): ManualPaymentSettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const digits = String(v.cardNumber ?? '').replace(/\D/g, '');
  const holder = String(v.cardHolder ?? '').trim();
  if (v.enabled !== true || !/^\d{16}$/.test(digits) || holder.length < 3) return null;
  return {
    enabled: true,
    cardNumber: digits,
    cardHolder: holder.slice(0, 80),
    bankName: v.bankName ? String(v.bankName).trim().slice(0, 60) : undefined,
    note: v.note ? String(v.note).trim().slice(0, 300) : undefined,
  };
}

/** Sozlama hali saqlanmagan bo'lsa — Formo rekvizitlari (Superadmin o'zgartirishi yoki o'chirishi mumkin) */
export const DEFAULT_MANUAL: ManualPaymentSettings = {
  enabled: true,
  cardNumber: '9860011202074545',
  cardHolder: 'YAKUBOV ABDULLA',
  bankName: 'Humo',
};

export const formatCard =(digits: string) => digits.replace(/(\d{4})(?=\d)/g, '$1 ');

export interface ClickConfig {
  serviceId: string;
  merchantId: string;
  secretKey: string;
}

export interface PaymeConfig {
  merchantId: string;
  key: string;
  checkoutUrl: string;
}

/** Click: hammasi berilgandagina yoqiladi (merchant kabinetidan) */
export function clickConfig(config: ConfigService): ClickConfig | null {
  const serviceId = config.get<string>('CLICK_SERVICE_ID')?.trim();
  const merchantId = config.get<string>('CLICK_MERCHANT_ID')?.trim();
  const secretKey = config.get<string>('CLICK_SECRET_KEY')?.trim();
  return serviceId && merchantId && secretKey ? { serviceId, merchantId, secretKey } : null;
}

/** Payme: PAYME_TEST=true — test kassa (checkout.test.paycom.uz va test kaliti) */
export function paymeConfig(config: ConfigService): PaymeConfig | null {
  const merchantId = config.get<string>('PAYME_MERCHANT_ID')?.trim();
  const key = config.get<string>('PAYME_KEY')?.trim();
  if (!merchantId || !key) return null;
  const test = config.get<string>('PAYME_TEST') === 'true';
  return { merchantId, key, checkoutUrl: test ? 'https://checkout.test.paycom.uz' : 'https://checkout.paycom.uz' };
}

export const topUpCode = (id: number) => `TOP-${String(id).padStart(6, '0')}`;
