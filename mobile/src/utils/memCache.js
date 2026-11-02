/**
 * Xotiradagi oddiy kesh (stale-while-revalidate uchun).
 * Ekran qayta ochilganda oxirgi ma'lumot darhol ko'rinadi, yangisi fonda yuklanadi —
 * tab almashganda bo'sh ekran/spinner ko'rinmaydi va ilova tezroq seziladi.
 * Foydalanuvchi almashganda (chiqish/kirish) `clearCache()` chaqiriladi.
 */
const store = new Map();

export const getCached = (key) => (key && store.has(key) ? store.get(key) : undefined);

export function setCached(key, value) {
  if (key) store.set(key, value);
  return value;
}

export function clearCache() {
  store.clear();
}
