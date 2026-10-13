import { api } from '../../services/api';
import { ROLES } from '../../constants/roles';

// Faqat dizayn ustida backendsiz ishlash uchun: .env da VITE_USE_MOCK_AUTH=true
const USE_MOCK = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

const MOCK_USERS = [
  { id: 1, fullName: 'Super Admin', phone: '+998901111111', password: 'admin123', role: ROLES.SUPERADMIN },
  { id: 2, fullName: 'Operator', phone: '+998902222222', password: 'operator123', role: ROLES.OPERATOR },
  { id: 3, fullName: 'Tikuvxona', phone: '+998903333333', password: 'tailor123', role: ROLES.TAILOR },
];

async function mockLogin({ phone, password }) {
  const found = MOCK_USERS.find((u) => u.phone === phone && u.password === password);
  if (!found) throw new Error("Telefon raqam yoki parol noto'g'ri");
  const { password: _, ...user } = found;
  return { accessToken: `mock-${user.id}`, refreshToken: `mock-${user.id}`, user };
}

/** Javob: { accessToken, refreshToken, user: { id, fullName, phone, role, ... } } */
export function login(credentials) {
  if (USE_MOCK) return mockLogin(credentials);
  return api('/auth/login', { method: 'POST', body: credentials, auth: false });
}

/** Serverdagi sessiyani yopadi. Xato bo'lsa ham lokal chiqish davom etadi. */
export async function logout() {
  if (USE_MOCK) return;
  await api('/auth/logout', { method: 'POST' }).catch(() => {});
}

/** Joriy foydalanuvchi bazadan (mock rejimida — null) */
export function fetchMe() {
  if (USE_MOCK) return Promise.resolve(null);
  return api('/auth/me');
}
