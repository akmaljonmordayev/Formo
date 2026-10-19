// Superadminning shaxsiy sozlamalari — faqat shu brauzerda (backendda bunday maydon yo'q)
const KEY = 'formo_admin_prefs';

export const DEFAULT_ADMIN_PREFS = {
  dashboardDays: 30,
  ordersPageSize: 20,
};

export function loadAdminPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_ADMIN_PREFS, ...JSON.parse(raw) } : DEFAULT_ADMIN_PREFS;
  } catch {
    return DEFAULT_ADMIN_PREFS;
  }
}

export function storeAdminPrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // brauzer xotirasi yopiq bo'lsa ham panel ishlayveradi
  }
}
