import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'formo_access_token';
const REFRESH_TOKEN_KEY = 'formo_refresh_token';

// ─── Token helpers ────────────────────────────────────────────────────────────
// Access/refresh tokenlar endi SecureStore'da (Android Keystore / iOS Keychain
// bilan shifrlangan) — AsyncStorage oddiy matn, root/debug build'da ADB orqali
// o'qilishi mumkin edi. Boshqa (nosezgir) ma'lumotlar hali ham AsyncStorage'da.

export async function getToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token) {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // silently ignore
  }
}

export async function removeToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // silently ignore
  }
}

// ─── Refresh-token helpers ────────────────────────────────────────────────────

export async function getRefreshToken() {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setRefreshToken(token) {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  } catch {
    // silently ignore
  }
}

export async function removeRefreshToken() {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    // silently ignore
  }
}

// ─── One-time migration: old AsyncStorage tokens → SecureStore ───────────────
// Oldin tokenlar AsyncStorage'da saqlangan. Shu funksiya ilova ishga tushganda
// bir marta chaqiriladi: AsyncStorage'da eski token bo'lsa va SecureStore'da
// hali yo'q bo'lsa — ko'chiriladi va eski nusxa o'chiriladi. Shunda allaqachon
// tizimga kirgan foydalanuvchilar majburan chiqarib yuborilmaydi.
export async function migrateTokensToSecureStore() {
  try {
    const [[, legacyToken], [, legacyRefresh]] = await AsyncStorage.multiGet([TOKEN_KEY, REFRESH_TOKEN_KEY]);
    if (!legacyToken && !legacyRefresh) return;

    if (legacyToken) {
      const existing = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!existing) await SecureStore.setItemAsync(TOKEN_KEY, legacyToken);
    }
    if (legacyRefresh) {
      const existing = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!existing) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, legacyRefresh);
    }

    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
  } catch {
    // Ko'chirib bo'lmasa ham ilova davom etadi — keyingi ishga tushishda qayta urinadi
  }
}

// ─── Generic KV helpers (nosezgir ma'lumotlar uchun — AsyncStorage) ──────────

export async function getItem(key) {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItem(key, value) {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // silently ignore
  }
}

export async function removeItem(key) {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // silently ignore
  }
}
