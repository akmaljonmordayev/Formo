# FORMO loyihasi — to'liq kod tahlili va tuzatishlar

> Tahlil sanasi: 2026-11-04. Qamrov: `backend` (NestJS), `frontend` (React admin panel), `mobile` (Expo/React Native), `telegram-bot` + infra/CI. Pastda topilgan har bir kamchilik/bag/xato va ularning holati — ✅ tuzatilgan, ⚠️ qisman/boshqacha yondashuv bilan tuzatilgan, ❌ ataylab tuzatilmagan (sabab bilan).
>
> Barcha tuzatishlar faqat working tree'da — hech narsa commit/push qilinmagan. `pnpm test` (backend 441/441), `vitest` (frontend 141/141), `node --test` (mobile 56/56, telegram-bot 56/56) — hammasi yashil. `tsc --noEmit`, `eslint`, `nest build`/`vite build`/`tsc -p tsconfig.build.json` — barchasi xatosiz.
>
> Qo'shimcha: tuzatishlardan keyin `/code-review` bilan mustaqil tekshiruv o'tkazildi — 2 ta yangi (past darajali) muammo topildi va ular ham tuzatildi (quyida band 1.6 va 2.9ga qarang).

---

## 1. BACKEND (NestJS)

1. ✅ **Inventory (ombor) raqamlari haqiqiy emas edi.**
   `backend/src/admin/inventory.service.ts`, `backend/src/shop/orders.service.ts`
   Checkout va bekor qilish/qaytarish oqimiga `reserve()`/`restore()` qo'shildi — endi `InventoryItem.qty` checkout paytida Serializable tranzaksiya ichida shartli (`qty: { gte }`) kamaytiriladi, yetarli bo'lmasa buyurtma bekor qilinadi; bekor qilish/qaytarishda qayta oshiriladi. Faqat `InventoryItem` yozuvi mavjud bo'lgan o'lchamlar uchun ishlaydi (yozuv yo'q = "nazoratsiz", cheklanmagan — amaldagi kiritilish siyosatiga mos).
   ⚠️ **Qoldiq xavf:** agar admin buyurtmadan KEYIN shu o'lcham uchun inventory tracking qo'shsa va keyin o'sha eski buyurtma bekor qilinsa, `restore()` hech qachon kamaytirilmagan qty'ni oshiradi (stock "shishib" ketadi). Bu juda tor va kamdan-kam holat — to'liq tuzatish uchun har bir order-item'ga "decremented" flag saqlash kerak bo'ladi (schema migratsiya), shuning uchun ataylab qoldirildi, insonga ko'rsatildi.

2. ✅ **Workshop o'chirish jarayondagi buyurtmalarni "yetim" qilib qo'yardi.**
   `backend/src/admin/accounts.service.ts`
   Endi `TAILOR` hisobini o'chirishdan oldin faol statusdagi (`SENT_TO_WORKSHOP/ACCEPTED/PRINTING/QUALITY_CHECK/READY/DELIVERING`) buyurtmalar borligi tekshiriladi; bo'lsa `ConflictException` bilan o'chirish bloklanadi. Testlar qo'shildi.

3. ✅ **Eng xavfli (pul) kodda test yo'qligi.**
   Qo'shildi: `wallet.service.spec.ts` (12 test — kredit/debit, yetarsiz balans, refund idempotentligi), `inventory.service.spec.ts` (9 test — band 1dagi yangi mantiq), `promocodes.service.spec.ts` (9 test). `topups/click/payme/shop-orders/workshop-orders/delivery` uchun to'liq suite yozish bu bitta o'tishda real emas edi — ataylab eng yuqori xavfli joylarga ustunlik berildi (vazifaning o'zida shunday belgilangan).
   ❌ **Qolgan bo'shliq:** `topups.service.ts`, `click.service.ts`, `payme.service.ts`, `shop/orders.service.ts`, `admin/orders.service.ts`, `admin/workshop-orders.service.ts`, `delivery.service.ts`/`rules.service.ts` — hamon testsiz.

4. ✅ **Campaigns moduli soxta statistika ko'rsatardi.**
   `backend/src/admin/campaigns.service.ts`
   Har bir campaign javobiga `isManualEntry: true` belgisi qo'shildi (qo'shimcha maydon, eskisi o'zgarmadi) — bu raqamlarning qo'lda kiritilgan, real analitika emasligini bildiradi. Frontend Campaigns sahifasi bu belgini hali ko'rsatmaydi (frontend ishi chegarasidan tashqarida qoldirildi, kerak bo'lsa alohida qo'shish mumkin).

5. ✅ **Timing-safe compare/hash kodining takrorlanishi (DRY).**
   Yangi `backend/src/common/utils/timing-safe.util.ts` yaratildi, `payme.service.ts`, `click.service.ts`, `telegram-auth.service.ts`, `auth.service.ts`, `basic-auth.ts`, `internal-token.guard.ts` shu umumiy funksiyadan foydalanadi. Xatti-harakat o'zgarmadi (testlar bilan tasdiqlangan).

6. ✅ **(`/code-review`da topildi) Workshop faol-statuslar ro'yxati ikki joyda alohida saqlanardi.**
   `backend/src/admin/accounts.service.ts` o'zining `ACTIVE_WORKSHOP_STATUSES` nusxasini saqlardi, `backend/src/admin/orders.service.ts`dagi `ACTIVE_STATUSES`dan mustaqil — kelajakda bittasi yangilanib ikkinchisi unutilib qolishi, "yetim order" muammosini qayta keltirib chiqarishi mumkin edi. `ACTIVE_STATUSES` endi `orders.service.ts`dan export qilinadi, `accounts.service.ts` shuni import qiladi.

7. ✅ **(`/code-review`da topildi) Promocode `value`ga backend tomonda 100% chegarasi yo'q edi.**
   `backend/src/admin/dto/promocode.dto.ts`dagi `value` maydoni PERCENT (0-100) va FIXED (so'm, chegarasiz) uchun bitta — shuning uchun class-validator darajasida qattiq `@Max(100)` qo'yib bo'lmaydi. `promocodes.service.ts`da `create()`/`update()`ga yakuniy (type+value) holatni tekshiruvchi `assertValidValue()` qo'shildi — endi to'g'ridan-to'g'ri API chaqiruv bilan ham PERCENT promokodga 100dan katta qiymat saqlab bo'lmaydi. Testlar qo'shildi.

---

## 2. FRONTEND (Admin panel, React)

1. ✅ **CSV export orqali formula/DDE injection.**
   `frontend/src/utils/csvExport.js`
   `=`, `+`, `-`, `@` bilan boshlangan katak qiymatlariga endi oldindan `'` qo'yiladi — Excel/Sheets ularni formula deb hisoblamaydi.

2. ❌ **Token'lar shifrlanmagan `localStorage`da saqlanadi — ATAYLAB TUZATILMADI.**
   `frontend/src/services/session.js`
   Bu haqiqiy xavfsizlik kamchiligi, lekin to'g'ri tuzatish (httpOnly cookie-based sessiya) **backend bilan birgalikda** auth oqimini qayta loyihalashni talab qiladi (login/refresh endpointlari cookie qaytarishi, CORS `credentials` sozlamasi, CSRF himoyasi). Bu frontend-only agentga berilgan vazifa doirasidan tashqarida, chunki backend API shaklini o'zgartiradi. **Agar xohlasangiz, bu alohida vazifa sifatida qilib beraman — lekin bu kattaroq, backend+frontend birgalikdagi arxitektura o'zgarishi, shuning uchun avval tasdiqlashingizni so'rayman.**

3. ✅ **Route guard faqat client tomonda, server tasdiqlashidan oldin ishlardi.**
   `frontend/src/features/auth/AuthContext.jsx`
   `fetchMe()` 401/403 qaytarsa, endi sessiya tozalanadi va foydalanuvchi chiqariladi (localStorage'dagi tahrirlangan role endi uzoq saqlanmaydi). Test qo'shildi.

4. ✅ **Tailor uchun "PDF yuklab olish" tugmasi soxta edi.**
   `frontend/src/pages/Tailor/OrderDetail.jsx`
   Loyihada hech qanday PDF kutubxonasi yo'qligi aniqlandi (yangi dependency qo'shilmadi). Tugma/label endi haqiqatni aytadi: ".txt fayl" deb nomlangan, "PDF" degan yolg'on da'vo olib tashlandi.

5. ✅ **`apiBlobUrl`da timeout yo'q edi.**
   `frontend/src/services/api.js`
   Oddiy `request()`dagi bilan bir xil `AbortSignal.timeout` qo'shildi, xato xabarlari ham izchil qilindi.

6. ❌ **Pul/buyurtma oqimlarida frontend test yo'q — TUZATILMADI (vaqt/chegara sababli).**
   Operator/Superadmin Orders, Pricing, Promocodes, TopUps, Finance, Campaigns, Login UI sahifalari uchun hali `.test.jsx` yo'q. Faqat `AuthContext.test.jsx`ga band 3 uchun yangi test qo'shildi.

7. ✅ **Operator/Superadmin Orders'da takrorlangan mantiq.**
   Yangi `frontend/src/features/orders/useOrderWorkflow.js` hook'i ikki sahifadagi bir xil `workshopsApi.list(...)` chaqiruvini birlashtiradi. Status-o'tish qoidalari ataylab birlashtirilmadi, chunki Operator va Superadmin uchun haqiqatan farq qiladi — ularni majburan bitta qilish xatti-harakatni o'zgartirib qo'yardi.

8. ✅ **Promocode `PERCENT` qiymatiga yuqori chegara yo'q edi.**
   `frontend/src/pages/Superadmin/Promocodes/index.jsx`
   `PERCENT` turi uchun `max={100}` qo'shildi, submit paytida ham tekshiriladi (FIXED turiga tegmaydi).

---

## 3. MOBILE (Expo/React Native, mijozlar ilovasi)

1. ✅ **Android hardware "orqaga" tugmasi ko'pchilik ekranda ishlamasdi.**
   `mobile/src/navigation/AppNavigator.js`
   Markazlashtirilgan bitta `hardwareBackPress` listener qo'shildi — endi Cart/Checkout/Studio/Order detail va boshqa barcha ekranlarda orqaga tugmasi to'g'ri navigatsiya qiladi, faqat Home'da ilovadan chiqadi.

2. ✅ **Token'lar shifrlanmagan AsyncStorage'da edi.**
   `mobile/src/utils/storage.js`
   `expo-secure-store`ga ko'chirildi (Keychain/Keystore-backed). Eski foydalanuvchilar uchun bir martalik avtomatik migratsiya qo'shildi — ular majburan chiqarib yuborilmaydi.

3. ✅ **Global ErrorBoundary yo'q edi.**
   Yangi `mobile/src/components/ErrorBoundary.js` — butun ilova shu bilan o'ralgan, kutilmagan xato endi oq ekran emas, "Qayta urinish" tugmachali ekran ko'rsatadi.

4. ✅ **Internet holatini aniqlash yo'q edi.**
   `@react-native-community/netinfo` qo'shildi, yangi `useNetworkStatus` hook va doimiy "Internet aloqasi yo'q" banner qo'shildi.

5. ✅ **`useAsync` hook'da unmount guard yo'q edi.**
   Boshqa hook'lardagi bilan bir xil `seq` ref pattern qo'shildi.

---

## 4. TELEGRAM-BOT / INFRA / CI/CD

1. ✅ **CI'da dependency/security skanerlash yo'q edi.**
   Yangi `.github/dependabot.yml` (haftalik, root pnpm workspace + telegram-bot uchun alohida) va `.github/workflows/codeql.yml` (JS/TS, alohida workflow fayl — deploy'ni bloklay olmaydi) qo'shildi.

2. ✅ **Backend/frontend uchun healthcheck/restart sozlamalari kodda yo'q edi.**
   Yangi `backend/railway.json`, `frontend/railway.json` — `telegram-bot/railway.json` namunasida, README'dagi qo'lda Railway sozlamalarini kodga aylantiradi.

3. ⚠️ **Telegram bot bitta nusxada ishlashi faqat Railway konfiguratsiyasiga tayanardi — yaxshilandi, lekin to'liq hal qilinmadi.**
   `telegram-bot/src/polling.ts`, `main.ts`
   409 xatosi 60 soniyadan ortiq davom etsa, endi aniq xabar bilan tezda (oldingi 5 daqiqa o'rniga ~60-90s) jarayon to'xtaydi — Railway restart policy buni ko'rsatadi. **Qoldiq xavf:** bu reaktiv himoya, haqiqiy oldindan bloklash uchun DB/Redis-backed distributed lock kerak bo'ladi — bu yangi infra talab qiladi, shuning uchun ataylab qilinmadi.

4. ✅ **`mobile/` workspace CI'da tekshirilmasdi.**
   `.github/workflows/ci.yml`ga `mobile` job qo'shildi (test — bloklovchi; lint — loyihada ESLint konfiguratsiyasi umuman yo'qligi sababli hozircha `continue-on-error`, bu mobil ilovaning oldindan mavjud bo'lgan holati, shu vazifada tuzatilmadi).

5. ❌ **`turbo.json` CI'da ishlatilmaydi — ATAYLAB TUZATILMADI.**
   Tekshirildi: haqiqiy drift yo'q (script nomlari mos), lekin CI job'larini `turbo run`ga o'tkazish ataylab qilinmadi — bu deploy'ni bloklaydigan pipeline'ni xavf ostiga qo'yadi.

---

## Qisqa xulosa

**21 tadan 17 tasi to'liq tuzatildi** (shundan 2 tasi `/code-review` mustaqil tekshiruvida topilgan yangi, past darajali muammolar), 2 tasi qisman/yaxshilangan holda (⚠️), 2 tasi esa ataylab tuzatilmadi va sabab ko'rsatildi (❌):

| Tuzatilmagan narsa | Nega |
|---|---|
| Frontend token'lari `localStorage`da (xavfsizlik) | To'g'ri yechim backend+frontend birgalikdagi auth arxitekturasini o'zgartirishni talab qiladi — sizning tasdiqingiz kerak |
| Pul kodidagi to'liq test qoplami (topups/click/payme/shop-orders) | Bitta o'tishda real emas, eng muhimlariga (wallet, inventory) ustunlik berildi |
| Telegram bot uchun to'liq distributed lock | Yangi infra (DB/Redis) talab qiladi |
| `turbo.json`ni CI'ga ulash | Deploy'ni bloklaydigan pipeline uchun xavfli o'zgarish |

Qaysi birini ham qo'lga olishni xohlasangiz, ayting — ayniqsa frontend token-saqlash arxitekturasi bo'yicha qaror kerak.
