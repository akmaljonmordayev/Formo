export const cx = (...parts) => parts.filter(Boolean).join(' ');

/** "Akmal Toshev" -> "AT" */
export const initialsOf = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'TS';

/** "+998903333333" -> "+998 90 333 33 33" */
export const prettyPhone = (phone = '') => {
  const m = phone.match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
};
