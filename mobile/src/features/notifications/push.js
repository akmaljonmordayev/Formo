import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api, PUSH_TOKEN_KEY } from '../../services/api';
import * as storage from '../../utils/storage';

const SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

if (SUPPORTED) {
  // Ilova ochiq turganda ham bildirishnoma ekranning tepasida ko'rinadi
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function obtainToken() {
  if (!SUPPORTED || !Device.isDevice) return null; // emulyator/web — push yo'q
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Buyurtmalar',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F2A33A',
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return data || null;
}

/** Bildirishnomadagi buyurtma id'si (server `data: { type: 'order', orderId }` yuboradi) */
const orderIdOf = (response) => {
  const data = response?.notification?.request?.content?.data;
  const id = Number(data?.orderId);
  return data?.type === 'order' && Number.isInteger(id) && id > 0 ? id : null;
};

/**
 * Push bildirishnomalar: kirgan foydalanuvchining qurilma tokeni serverga ilova tili bilan yoziladi
 * (til almashsa — qayta yoziladi). Bildirishnoma bosilsa `openOrderId` beriladi — AppNavigator buyurtmani ochadi.
 *
 * @returns {{ openOrderId: number|null, consumeOrder: () => void }}
 */
export default function usePushNotifications(isAuthenticated, language) {
  const [openOrderId, setOpenOrderId] = useState(null);
  const handledCold = useRef(false);

  useEffect(() => {
    if (!SUPPORTED || !isAuthenticated) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const token = await obtainToken();
        if (!token || cancelled) return;
        await api.auth.savePushToken(token, language, Platform.OS);
        await storage.setItem(PUSH_TOKEN_KEY, token);
      } catch {
        // Expo Go / tarmoq xatosi — ilova bildirishnomasiz ishlashda davom etadi
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, language]);

  useEffect(() => {
    if (!SUPPORTED || !isAuthenticated) return undefined;
    // Ilova yopiq turganda bildirishnoma bosilib ochilgan bo'lsa
    if (!handledCold.current) {
      handledCold.current = true;
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          const id = orderIdOf(response);
          if (id) setOpenOrderId(id);
        })
        .catch(() => {});
    }
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const id = orderIdOf(response);
      if (id) setOpenOrderId(id);
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  const consumeOrder = useCallback(() => setOpenOrderId(null), []);
  return { openOrderId, consumeOrder };
}
