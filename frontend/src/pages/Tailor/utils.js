export const cx = (...parts) => parts.filter(Boolean).join(' ');

/** "Akmal Toshev" -> "AT" */
export const initialsOf = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'TS';

/** "+998903333333" -> "+998 90 333 33 33" */
export const prettyPhone = (phone = '') => {
  const m = phone.match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
};

/** Foydalanuvchi yozgan raqamni "+998 90 123 45 67" ko'rinishiga keltiradi (server uchun bo'shliqsiz qaytariladi). */
export const formatPhone = (raw) => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  // Boshqa davlat raqami (+7, +1 ...) — o'zgartirmaymiz
  if (raw.trim().startsWith('+') && digits.length >= 3 && !'998'.startsWith(digits.slice(0, 3)) && !digits.startsWith('998')) return raw.slice(0, 30);
  const local = digits.startsWith('998') ? digits.slice(3) : digits;
  if (!local) return '';
  const d = local.slice(0, 9);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return `+998 ${parts.join(' ')}`.trim();
};
export const phoneForServer = (value) => value.replace(/\s+/g, '');
