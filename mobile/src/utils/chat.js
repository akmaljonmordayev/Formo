/** Suhbatdosh roli nomi (OPERATOR/SUPERADMIN); noma'lum rol — umumiy "Yordam" */
export function roleLabel(t, role) {
  const key = `chatRole${role}`;
  const text = t(key);
  return text === key ? t('chatSupport') : text;
}

const pad = (n) => String(n).padStart(2, '0');

/** Xabar ostidagi vaqt: HH:MM */
export function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Ro'yxatdagi nisbiy vaqt: bugun — HH:MM, boshqa kun — dd.mm */
export function formatRelative(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return formatTime(value);
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
}
