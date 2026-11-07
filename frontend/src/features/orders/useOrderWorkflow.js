import { useEffect, useState } from 'react';
import { workshopsApi } from '../accounts/accountsApi';

// Buyurtmani boshqa sexga yo'naltirish faqat shu holatlarda mumkin (sex hali qabul
// qilmagan yoki buyurtma hali yangi). Superadmin holatni erkin tanlaydi (OrderModal).
export const ASSIGNABLE_STATUSES = ['NEW', 'SENT_TO_WORKSHOP'];
// Yakunlangan holatlar — bularda "bekor qilish" tugmasi ko'rsatilmaydi
export const CLOSED_STATUSES = ['DELIVERED', 'CANCELLED', 'RETURNED'];

/**
 * Faol tikuv sexlari ro'yxati. Orders sahifalarida buyurtmani
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
