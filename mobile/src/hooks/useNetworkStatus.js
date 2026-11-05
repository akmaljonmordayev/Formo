import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Tarmoq holati — har bir so'rovdagi umumiy "tarmoq xatosi" matni o'rniga,
 * doimiy "oflayn" belgisi ko'rsatish uchun (utils/errors.js'dagi errorText
 * bilan bir qatorda ishlatiladi, uni almashtirmaydi).
 *
 * `isInternetReachable` ba'zi tarmoqlarda (masalan captive portal) `null`
 * bo'lishi mumkin — shu holatda hali tekshirilmagan deb hisoblaymiz va
 * banner ko'rsatilmaydi (faqat ANIQ oflayn bo'lganda ko'rsatiladi).
 */
export default function useNetworkStatus() {
  const [state, setState] = useState({ isConnected: true, isInternetReachable: true });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((next) => {
      setState({
        isConnected: next.isConnected !== false,
        isInternetReachable: next.isInternetReachable,
      });
    });
    NetInfo.fetch().then((next) => {
      setState({
        isConnected: next.isConnected !== false,
        isInternetReachable: next.isInternetReachable,
      });
    });
    return unsubscribe;
  }, []);

  const isOffline = state.isConnected === false || state.isInternetReachable === false;

  return { ...state, isOffline };
}
