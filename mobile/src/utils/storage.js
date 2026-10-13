import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'formo_access_token';
const REFRESH_TOKEN_KEY = 'formo_refresh_token';

// ─── Token helpers ────────────────────────────────────────────────────────────

export async function getToken() {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token) {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch {
    // silently ignore
  }
}

export async function removeToken() {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // silently ignore
  }
}

// ─── Refresh-token helpers ────────────────────────────────────────────────────

export async function getRefreshToken() {
  try {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setRefreshToken(token) {
  try {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch {
    // silently ignore
  }
}

export async function removeRefreshToken() {
  try {
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // silently ignore
  }
}

// ─── Generic KV helpers ───────────────────────────────────────────────────────

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
