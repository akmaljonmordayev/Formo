import { useEffect, useState } from 'react';
import { workshopsApi } from '../accounts/accountsApi';

// Buyurtmani faqat shu holatlarda boshqa sexga yo'naltirish mumkin (sex hali qabul
// qilmagan yoki buyurtma hali yangi).
export const ASSIGNABLE_STATUSES = ['NEW', 'SENT_TO_WORKSHOP'];
// Yakunlangan holatlar — bularda "bekor qilish" tugmasi ko'rsatilmaydi
export const CLOSED_STATUSES = ['DELIVERED', 'CANCELLED', 'RETURNED'];

/**
 * Faol tikuv sexlari ro'yxati. Superadmin Orders sahifasida buyurtmani
 * sexga biriktirish/qayta tayinlash uchun ishlatiladi.
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
