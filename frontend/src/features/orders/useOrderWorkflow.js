import { useEffect, useState } from 'react';
import { workshopsApi } from '../accounts/accountsApi';

// Operator buyurtmani faqat shu holatlarda boshqa sexga yo'naltira oladi (sex hali qabul
// qilmagan yoki buyurtma hali yangi). Superadmin esa holatni erkin tanlaydi (OrderModal),
// shuning uchun bu cheklov faqat Operator sahifasida qo'llanadi — ikki rol oqimi atayin farqli.
export const ASSIGNABLE_STATUSES = ['NEW', 'SENT_TO_WORKSHOP'];
// Yakunlangan holatlar — bularda "bekor qilish" tugmasi ko'rsatilmaydi (Operator)
export const CLOSED_STATUSES = ['DELIVERED', 'CANCELLED', 'RETURNED'];

/**
 * Faol tikuv sexlari ro'yxati. Operator va Superadmin Orders sahifalarida buyurtmani
 * sexga biriktirish/qayta tayinlash uchun bir xil so'rov (`isActive=true`) ishlatiladi —
 * shu takrorlanishni bitta hookka chiqarib qo'ydik.
 */
export function useActiveWorkshops() {
  const [workshops, setWorkshops] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    workshopsApi
      .list({ isActive: 'true', page: 1, limit: 100 })
      .then((d) => active && setWorkshops(d.items))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, []);

  return { workshops, error };
}
