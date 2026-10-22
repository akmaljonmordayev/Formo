import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';

/**
 * `compact` — qisqa ekranlar uchun zichroq joylashuv (login/register).
 *
 * `useWindowDimensions()` dan farqi: u `window` balandligini qaytaradi, Android
 * klaviatura ochilganda `adjustResize` tufayli u kichrayadi. Natijada yozish
 * paytida `compact` birdan almashib, butun karta (forma rasmi, sarlavha,
 * oraliqlar) qayta joylashadi — klaviatura "sakraydi" va fokus barqaror
 * ko'rinmaydi. `screen` o'lchami klaviaturaga bog'liq emas, shuning uchun
 * zichlik faqat qurilma ekraniga qarab bir marta aniqlanadi.
 */
const COMPACT_HEIGHT = 760;

const readCompact = () => Dimensions.get('screen').height < COMPACT_HEIGHT;

export default function useCompactLayout() {
  const [compact, setCompact] = useState(readCompact);

  useEffect(() => {
    // Rotatsiya / split-screen: ekran o'lchami o'zgarsa qayta hisoblaymiz.
    const subscription = Dimensions.addEventListener('change', () => {
      setCompact(readCompact());
    });
    return () => subscription.remove();
  }, []);

  return compact;
}
