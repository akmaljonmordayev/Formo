import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import * as Location from 'expo-location';
import { api } from '../../services/api';
import { formatGeocode, toAddressPayload } from './address';

export * from './address';

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
 * Pin nuqtasi uchun manzil matni. Har bir yangi nuqtada oldingi so'rov natijasi
 * e'tiborga olinmaydi (eski javob yangisini bosib ketmasin).
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
      const [place] = await Location.reverseGeocodeAsync(coords);
      if (id !== requestId.current) return null;
      const text = formatGeocode(place);
      if (!text) setFailed(true);
      return text || null;
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
export function saveAddress(form, id) {
  return id
    ? api.addresses.update(id, toAddressPayload(form, { isUpdate: true }))
    : api.addresses.create(toAddressPayload(form));
}

/** Matn bo'yicha qidiruv (qurilma geokoderi): birinchi topilgan nuqta yoki null. */
export async function searchPlace(query) {
  const text = String(query || '').trim();
  if (text.length < 3) return null;
  const [hit] = await Location.geocodeAsync(text);
  return hit ? { latitude: hit.latitude, longitude: hit.longitude } : null;
}
