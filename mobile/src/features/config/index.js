import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';

// Backend default'lari (backend/src/shop/rules.service.ts) — config yuklanguncha shular
export const DEFAULT_CONFIG = {
  general: {
    companyName: 'Formo',
    supportPhone: '',
    supportTelegram: '',
    supportEmail: '',
    workHoursFrom: '09:00',
    workHoursTo: '21:00',
    maintenance: false,
  },
  rules: {
    acceptOrders: true,
    pausedMessage: '',
    minOrderSum: 0,
    maxItemsPerOrder: 20,
    maxQtyPerItem: 10,
    productionDaysMin: 2,
    productionDaysMax: 5,
    allowCash: true,
    printNameMaxLength: 12,
    printNumberMin: 0,
    printNumberMax: 99,
    allowKidsSizes: true,
    cancelWindowHours: 2,
    returnDays: 3,
    terms: '',
  },
};

/** Bolalar o'lchamlari "2-3" ... "12-13" ko'rinishida */
export const isKidSize = (size) => /^\d+-\d+$/.test(size);

/** allowKidsSizes=false bo'lsa bolalar o'lchamlari ko'rsatilmaydi */
export const visibleSizes = (sizes, rules) =>
  rules.allowKidsSizes ? sizes : sizes.filter((s) => !isKidSize(s.size));

/** Dizayn studiyasi: { prices, colors: { solid, gradient, custom }, fonts, patches, packages } */
function normalizeStudio(raw) {
  if (!raw || typeof raw !== 'object' || !raw.prices) return null;
  const list = (value) => (Array.isArray(value) ? value : []);
  return {
    prices: { custom: 0, gradient: 0, patch: 0, gift: 0, ...raw.prices },
    colors: {
      solid: list(raw.colors?.solid),
      gradient: list(raw.colors?.gradient),
      custom: raw.colors?.custom === true,
    },
    fonts: list(raw.fonts),
    patches: list(raw.patches),
    packages: list(raw.packages),
  };
}

/**
 * GET /api/app/config — buyurtma qoidalari, aloqa ma'lumotlari va dizayn studiyasi tanlovlari.
 * Server bu qoidalarni baribir o'zi tekshiradi; ilova faqat UI'ni moslaydi.
 * Yuklab bo'lmasa default'lar qoladi (server xatosi baribir ko'rsatiladi). Studiya
 * tanlovlarining default'i yo'q — `studio` null bo'lsa ekran `error` + qayta urinishni ko'rsatadi.
 */
export default function useAppConfig() {
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG, studio: null });
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await api.appConfig.get();
      const studio = normalizeStudio(data?.studio);
      setConfig((current) => ({
        general: { ...DEFAULT_CONFIG.general, ...data?.general },
        rules: { ...DEFAULT_CONFIG.rules, ...data?.rules },
        studio: studio || current.studio,
      }));
      // Eski server `studio` bermasa — studiya ekrani xato + qayta urinishni ko'rsatadi
      if (!studio) setError(new Error('studio config missing'));
    } catch (err) {
      // Tarmoq xatosi — oldingi qiymatlar qoladi
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...config, error, refresh };
}
