import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import * as Location from 'expo-location';
import { api } from '../../services/api';
import { getCached, setCached } from '../../utils/memCache';
import { formatGeocode, toAddressPayload } from './address';
import { reversePlace, searchPlaces } from './geocode';

export * from './address';
export * from './districts';
export { lookupArea } from './geocode';

/**
 * Xaritada nuqta tanlash uchun joylashuv yordamchilari (expo-location).
 *
 * Maxfiylik: ruxsat faqat foydalanuvchi "Mening joylashuvim"ni bosganda
 * so'raladi; doimiy/fon kuzatuvi yo'q (watchPosition ishlatilmaydi).
 * Manzil matni (reverse geocode) faqat pin to'xtagan nuqta uchun, qurilmaning
 * o'z geokoderi orqali olinadi — Formo serveriga koordinata faqat foydalanuvchi
 * "Saqlash"ni bosganda yuboriladi.
 *
 * permission: 'unknown' | 'granted' | 'denied' | 'blocked' (qayta so'rab bo'lmaydi)
 */
export function useDeviceLocation() {
  const [permission, setPermission] = useState('unknown');
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null); // i18n kaliti

  // Ruxsat holatini so'ramasdan o'qiymiz (dialog ochilmaydi)
  useEffect(() => {
    let cancelled = false;
    Location.getForegroundPermissionsAsync()
      .then((res) => {
        if (!cancelled && res.status === 'granted') setPermission('granted');
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /** Joriy GPS nuqtasi yoki null (xato `error`ga yoziladi). */
  const locate = useCallback(async () => {
    setError(null);
    setLocating(true);
    try {
      let res = await Location.getForegroundPermissionsAsync();
      if (res.status !== 'granted' && res.canAskAgain !== false) {
        res = await Location.requestForegroundPermissionsAsync();
      }
      if (res.status !== 'granted') {
        setPermission(res.canAskAgain === false ? 'blocked' : 'denied');
        setError('locationDenied');
        return null;
      }
      setPermission('granted');

      if (!(await Location.hasServicesEnabledAsync())) {
        setError('locationServicesOff');
        return null;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { latitude: position.coords.latitude, longitude: position.coords.longitude };
    } catch {
      setError('locationUnavailable');
      return null;
    } finally {
      setLocating(false);
    }
  }, []);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  return { permission, locating, error, locate, openSettings, clearError: () => setError(null) };
}

/**
 * Pin nuqtasi uchun manzil: `resolve(coords)` -> { text, house } | null. Har bir yangi nuqtada oldingi
 * so'rov natijasi e'tiborga olinmaydi (eski javob yangisini bosib ketmasin).
 */
export function useReverseGeocode() {
  const [resolving, setResolving] = useState(false);
  const [failed, setFailed] = useState(false);
  const requestId = useRef(0);

  const resolve = useCallback(async (coords) => {
    const id = ++requestId.current;
    setResolving(true);
    setFailed(false);
    try {
      // Asosiy manba — OpenStreetMap (mahalla, ko'cha va uy raqami alohida); ishlamasa qurilma geokoderi
      let found = null;
      try {
        found = await reversePlace(coords);
      } catch {
        found = null;
      }
      if (id !== requestId.current) return null;
      if (!found?.text) {
        const [place] = await Location.reverseGeocodeAsync(coords);
        if (id !== requestId.current) return null;
        found = { text: formatGeocode(place), house: String(place?.streetNumber || '').trim() };
      }
      if (!found.text) setFailed(true);
      return found.text ? found : null;
    } catch {
      if (id === requestId.current) setFailed(true);
      return null;
    } finally {
      if (id === requestId.current) setResolving(false);
    }
  }, []);

  return { resolve, resolving, failed };
}

/**
 * Manzilni saqlaydi: `id` bo'lsa PATCH /addresses/:id, aks holda POST /addresses.
 * Server javobini (saqlangan manzil) qaytaradi yoki ApiError tashlaydi.
 */
export async function saveAddress(form, id) {
  const saved = id
    ? await api.addresses.update(id, toAddressPayload(form, { isUpdate: true }))
    : await api.addresses.create(toAddressPayload(form));
  // Keshdagi ro'yxat ham yangilanadi: aks holda qaytilgan ekran (checkout) eski ro'yxatni ko'rib,
  // yangi manzil o'rniga asosiy manzilni tanlab qo'yardi
  const cached = getCached('addresses');
  if (cached && saved?.id) setCached('addresses', upsertAddress(cached, saved));
  return saved;
}

export function upsertAddress(list, saved) {
  const rest = list
    .filter((a) => a.id !== saved.id)
    .map((a) => (saved.isDefault && a.isDefault ? { ...a, isDefault: false } : a));
  const index = list.findIndex((a) => a.id === saved.id);
  if (index === -1) return [...rest, saved];
  rest.splice(index, 0, saved);
  return rest;
}

/** Matn bo'yicha qidiruv (qurilma geokoderi): birinchi topilgan nuqta yoki null. */
export async function searchPlace(query) {
  const text = String(query || '').trim();
  if (text.length < 3) return null;
  const [hit] = await Location.geocodeAsync(text);
  return hit ? { latitude: hit.latitude, longitude: hit.longitude } : null;
}

/**
 * Xarita qidiruvi: "Madadkor mahallasi" -> tanlangan tuman ichidan boshlab natijalar ro'yxati
 * [{ id, title, subtitle, latitude, longitude }]. `context` — "Sergeli tumani, Toshkent shahri",
 * `area` — tuman hududi. OpenStreetMap topmasa qurilma geokoderi sinaladi.
 */
export function searchAddress(query, { context, area, region, bounds } = {}) {
  const deviceFallback = async (q) => {
    const text = context ? `${q}, ${context}` : q;
    const hit = await searchPlace(text);
    return hit ? [{ id: `device:${hit.latitude},${hit.longitude}`, title: q, subtitle: context || '', ...hit }] : [];
  };
  return searchPlaces(query, { context, area, region, bounds, fallback: deviceFallback });
}
