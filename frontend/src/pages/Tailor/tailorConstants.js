export const STATUS_VARIANTS = {
  yangi: 'amber',
  qabul: 'teal',
  bosildi: 'cyan',
  tayyor: 'amber',
};

// Profil sahifasidagi "Xodimlar" bo'limi (API: /workshop/employees). Hozircha yashirin — yoqish uchun true qiling.
export const TAILOR_EMPLOYEES_ENABLED = false;

export const STOCK_COLORS = [
  { name: 'Oq', key: 'oq', hex: '#ffffff' },
  { name: 'Qora', key: 'qora', hex: '#111827' },
  { name: 'Qizil', key: 'qizil', hex: '#D72E3F' },
  { name: "Ko'k", key: 'kok', hex: '#2563eb' },
];

// Formalar 3XL gacha sotiladi (backend ADULT_SIZES) — 3XL qoldig'i ham yuritilsin, aks holda u doim cheklovsiz sotilardi
export const STOCK_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
