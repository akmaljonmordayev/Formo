# Formo Mobile

Formo — foydalanuvchi o‘z futbol formasini yaratadigan mobil ilova.

## Ishga tushirish

```bash
npm install
npx expo start
```

## Backendga ulanish

`.env.example` dan `.env` yarating va kompyuteringizning Wi-Fi IP manzilini yozing (telefonda `localhost` ishlamaydi):

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:3001/api
```

Backend kompyuterda `docker compose up` bilan ishlab turishi kerak. `.env` o'zgarsa `npm run start:clear` bilan qayta ishga tushiring.

```js
import { auth } from './src/services/api';

await auth.register({ phone: '90 123 45 67', password: 'secret123', fullName: 'Aziz Rahimov', gender: 'MALE', age: 25, height: 178, weight: 72 });
await auth.login({ phone: '901234567', password: 'secret123' });
const me = await auth.me();
await auth.logout();
```

Xatolar `ApiError` bo'lib keladi: `error.message` — foydalanuvchiga ko'rsatsa bo'ladigan o'zbekcha matn, `error.status` — 400 / 401 / 403 / 409 / 429.

## Expo 57 va Metro cache

Agar `transformFile` xatosi chiqsa, avval eski Metro cache va ishlayotgan Expo serverini tozalang:

```bash
npm run start:clear
```

Agar xato davom etsa, `mobile` papkasida dependencylarni qayta o‘rnating:

```bash
Remove-Item -Recurse -Force node_modules, .expo -ErrorAction SilentlyContinue
npm ci
npm run start:clear
```

Expo SDK 57 uchun React `19.2.3`, React Native `0.86.3` va Metro `0.84.x` versiyalari lock faylda birga saqlangan. `npm run export:android` Metro bundlingni tekshirish uchun ishlatiladi.

## Arxitektura

- `src/screens/` — har bir asosiy ekran alohida modulda.
- `src/components/ui/` — qayta ishlatiladigan UI komponentlari.
- `src/navigation/` — ilova marshrutlari; server savati (`useCart`) va ilova sozlamalari (`useAppConfig`) shu yerda bir marta yaratiladi.
- `src/features/` — API ustidagi hooklar: `products` (katalog), `cart`, `checkout` (manzil, slotlar), `orders`, `config`, `notifications`, `auth`.
- `src/store/` — faqat ilova tili (qurilmada).
- `src/i18n/` — o‘zbekcha (`uz`) asosiy til, ruscha (`ru`) va inglizcha (`en`) tarjimalar.
- `src/services/api.js` — backend ulanishi uchun yagona API adapter (token yangilash shu yerda).
- `src/constants/` — ranglar, radiuslar va umumiy dizayn tokenlari.

## Ma’lumot oqimi (backend)

Mock ma’lumot yo‘q — hammasi `/api` dan:

| Ekran | Endpointlar |
|---|---|
| Asosiy | `GET /catalog/clubs/popular`, `GET /orders/active`, bildirishnomalar tugmasi |
| Katalog | `GET /catalog/categories`, `GET /catalog/clubs?categoryId&search`, `GET /catalog/favorites`, `PUT/DELETE /catalog/clubs/:id/favorite` |
| Klub (Product) | `GET /catalog/clubs/:id` — Uy / Mehmon / Uchinchi formalar narxi bilan |
| Studiya | `POST /cart/items` — `kitId`, `shirtSize`, `printName`, `printNumber`, `withShorts`, `shortsSize`, `numberOnShorts` |
| Savat | `GET /cart`, `PATCH/DELETE /cart/items/:id`, `DELETE /cart`, `POST /cart/promocode` |
| Rasmiylashtirish | `GET/POST /addresses`, `GET /checkout/delivery-slots`, `POST /orders/checkout` (CASH → `NEW`, CLICK/PAYME → `PENDING_PAYMENT`) |
| Buyurtmalar | `GET /orders`, `GET /orders/:id` (timeline), `POST /orders/:id/cancel`, `POST /orders/:id/payment/confirm` (demo), `PATCH /orders/:id/payment-method` |
| Bildirishnomalar | `GET /notifications` |
| Sozlamalar | `GET /app/config` — buyurtma qoidalari (to‘xtatish, minimal summa, naqd, o‘lchamlar) va aloqa |

Buyurtma holati operator/sex panelida o‘zgaradi; Buyurtmalar ekranlari har 20 soniyada va pastga tortilganda yangilanadi. Profil o‘lchovlari (bo‘y, vazn...) uchun backendda tahrirlash endpointi yo‘q — ular qurilmada saqlanadi.

## Tilni almashtirish

Profil → Sozlamalar → Ilova tili bo‘limida o‘zbekcha, ruscha yoki inglizcha tanlanadi. Standart til — o‘zbekcha.

## Hozirgi funksiyalar

- klublar katalogi, qidiruv, ligalar bo‘yicha filtr va sevimli klublar;
- klub formalari (narx tarkibi, o‘lchamlar);
- studiya: o‘lcham, ism/raqam bosmasi, shortik;
- server savati va promokod;
- rasmiylashtirish: manzil, yetkazish kuni/vaqti, to‘lov usuli;
- buyurtmalar va jonli holat (timeline), bekor qilish, demo to‘lov;
- bildirishnomalar, profil va til sozlamalari.

AR kamera va haqiqiy Click/Payme to‘lovi keyingi bosqichlar uchun ajratilgan.
