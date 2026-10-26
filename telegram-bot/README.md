# Formo Telegram bot

Mustaqil servis: Formo ilovasiga Telegram orqali kirish (5 xonali kod), Telegram akkauntini Formo hisobiga ulash va buyurtma holati haqidagi xabarlar.

Bot **o'z bazasiga ega emas** va Formo ma'lumotlarini o'zi o'zgartirmaydi. U backend'ning ichki API'si (`/api/internal/telegram/*`) bilan servislararo token orqali gaplashadi. Balans, to'lov yoki buyurtmani o'zgartiradigan endpoint yo'q.

```
Mobil ilova ──POST /auth/telegram/start──▶ Backend ◀──ichki API (Bearer token)── telegram-bot ◀──▶ Telegram
            ◀── challengeId + deep-link ──┘    ▲                                       │
Mobil ilova ──POST /auth/telegram/verify──────┘   TelegramOutbox (buyurtma xabarlari) ◀─┘ lease / natija
```

## Kirish oqimi

1. Ilova telefon raqamni yuboradi: `POST /api/auth/telegram/start { phone }`. Javobda `challengeId` va `deepLink` (`https://t.me/<bot>?start=<token>`) keladi. So'rov 10 daqiqa amal qiladi; javob raqam ro'yxatdan o'tgan-o'tmaganini oshkor qilmaydi.
2. Ilova `deepLink` ni ochadi va foydalanuvchi botda **Start** bosadi. Bot bir martalik token bilan so'rovni o'z Telegram foydalanuvchisiga bog'laydi (`claim`). Boshqa Telegram akkaunti egallagan so'rovni olib bo'lmaydi.
3. Bot **«📱 Raqamni yuborish»** tugmasini (`request_contact`) ko'rsatadi. Telegram raqamni o'zi bermaydi; foydalanuvchi uni aniq ulashadi. Bot `contact.user_id === from.id` ekanini tekshiradi: begona kontakt yoki qo'lda yozilgan raqam dalil bo'lmaydi. Telegram username hech qachon ishlatilmaydi.
4. Backend raqamni so'rovdagi raqam bilan solishtiradi:
   - mos kelmasa, so'rov yopiladi;
   - mos kelsa, `crypto.randomInt` bilan 5 xonali kod chiqariladi va bazada faqat HMAC xeshi saqlanadi. Bot kodni chatga yuboradi.
5. Foydalanuvchi kodni ilovaga kiritadi: `POST /api/auth/telegram/verify { challengeId, code }`.
   - Hisob bo'lsa, oddiy kirish: `isNewUser: false`.
   - Bo'lmasa, `USER` hisobi ochiladi (`isNewUser: true`, `profileComplete: false`). Ilova ism, jins va yoshni mavjud `PATCH /api/auth/me` orqali saqlaydi.
   - Telegram akkaunti shu hisobga ulanadi (`TelegramAccount`).

### Himoya

| Xavf | Chora |
|---|---|
| Brute-force | so'rov uchun 5 urinish (atomik hisoblanadi), kod 5 daqiqa amal qiladi, IP bo'yicha rate-limit, raqamga soatiga 10 ta so'rov |
| Replay | kod bir martalik: `consumedAt` shartli yangilanadi, parallel so'rovlardan faqat bittasi o'tadi |
| Boshqa so'rov kodi | xesh `challengeId:code` ga bog'langan |
| Akkaunt egallash | raqam faqat Telegram tasdiqlagan o'z kontakti bilan; xodim hisoblari (admin/operator/sex) bu yo'l bilan kira olmaydi |
| Enumeration | `start` javobi hamma raqam uchun bir xil |
| Dublikat hisob | yangi hisob tranzaksiya ichida, `phone` unikal |
| Qayta yuborish | 30 soniya cooldown, so'rov uchun 3 ta kod |
| Fishing | botdagi kod xabarida ogohlantirish va qaysi raqam uchun ekani (maskalangan) ko'rsatiladi |
| Loglar | kod, telefon, token yozilmaydi; bot tokeni va ichki token logda yashiriladi |

## Buyurtma xabarlari

Buyurtma holati o'zgarganda `OrderHistoryService` mijoz botga ulangan bo'lsa xabarni **o'sha tranzaksiyada** `TelegramOutbox` ga yozadi. Bot har `OUTBOX_INTERVAL_MS` da navbatdan oladi (`FOR UPDATE SKIP LOCKED`, 60 soniyalik lease), yuboradi va natijani qaytaradi:

- `SENT`
- `RETRY`: eksponensial kutish, 5 urinishgacha
- `BLOCKED`: foydalanuvchi botni bloklagan. Keyingi xabarlar navbatga qo'yilmaydi; `/start` qayta yoqadi
- `FAILED`

Yetkazish kafolati "kamida bir marta".

Buyruqlar: `/start` (xabarlarni yoqish), `/stop` (o'chirish).

## Ishonchlilik

- **Takroriy update.** `update_id` xotirada tekshiriladi. Backend amallari idempotent (claim, hello, stop, natija).
- **Telegram API.** 429 bo'lsa `retry_after` kutiladi; 5xx va tarmoq xatosida qayta uriniladi; 400/403 da qayta urinilmaydi.
- **Backend API.** Kod chiqaradigan so'rovlar faqat so'rov serverga umuman yetmaganda qayta yuboriladi (ikki kod va soxta cooldown bo'lmasin).
- **Webhook.** `X-Telegram-Bot-Api-Secret-Token` doimiy vaqtda tekshiriladi; tana 1 MB gacha. Qayta ishlashda xato bo'lsa ham Telegram'ga 200 qaytariladi (qayta yuborish bo'roni bo'lmasin).

## Sozlash

### 1. Bot yaratish (bir marta, qo'lda)

@BotFather → `/newbot` → token va username oling. Hozirgi admin bildirishnomalari (`TELEGRAM_BOT_TOKEN`) ishlatayotgan botdan foydalanish ham mumkin.

### 2. Backend muhiti

| O'zgaruvchi | Qiymat |
|---|---|
| `TELEGRAM_BOT_USERNAME` | bot username, `@` siz (deep-link uchun) |
| `TELEGRAM_INTERNAL_TOKEN` | `openssl rand -hex 32`; productionda kamida 32 belgi tekshiriladi |

Ikkalasi berilmasa, `POST /auth/telegram/start` 503 qaytaradi va ichki API yopiq qoladi.

Migratsiya: `backend/prisma/migrations/20261024120000_telegram_bot` (deployda `prisma migrate deploy` o'zi qo'llaydi).

### 3. Bot muhiti

`npm run init-env` faqat yo'q kalitlarni qo'shadi, mavjud qatorlarni o'zgartirmaydi va sirlarni ekranga chiqarmaydi. `TELEGRAM_INTERNAL_TOKEN` hamma faylga bir xil yoziladi.

**A) Lokal (backend `pnpm dev`, bot `npm run dev`):**

```bash
cd telegram-bot
npm ci
npm run init-env   # telegram-bot/.env + backend/.env
# telegram-bot/.env: TELEGRAM_BOT_TOKEN= dan keyin BotFather tokenini qo'ying
npm run check      # sozlama, Telegram getMe, backend ichki token — faqat natija chiqadi (backend ishlab turishi kerak)
npm run dev        # polling rejimi — ochiq URL shart emas
```

**B) Docker Compose:**

```bash
cd telegram-bot && npm run init-env -- --docker   # repo ildizidagi .env
# .env (ildiz): TELEGRAM_BOT_TOKEN= dan keyin BotFather tokenini qo'ying
cd .. && docker compose --profile bot up --build
```

Joriy bot: **@formo_kit_bot** (backend'da `TELEGRAM_BOT_USERNAME=formo_kit_bot`).

Production (webhook):

```
BOT_MODE=webhook
TELEGRAM_WEBHOOK_URL=https://bot.formo.uz/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=<openssl rand -hex 32>
```

Ishga tushganda bot `setWebhook` ni o'zi chaqiradi. Polling rejimi esa `deleteWebhook` chaqiradi, shuning uchun bitta bot uchun bir vaqtda faqat bitta rejim ishlatilsin.

### Buyruqlar

| | |
|---|---|
| `npm run dev` | build + `.env` bilan ishga tushirish |
| `npm test` | unit testlar (`node:test`) |
| `npm run typecheck` | |
| `npm run build` / `npm start` | production |
| `docker build -t formo-telegram-bot telegram-bot` | image (context: `telegram-bot/`) |

`GET /health` → `{"ok":true}` (Railway healthcheck uchun).

## Mobil ilova

Telefon ekranidagi «Telegram orqali kirish» tugmasi `mobile/src/screens/Auth/TelegramScreen.js` ni ochadi:

1. «Telegram’da ochish» — deep-link botni ochadi.
2. Ilovaga qaytganda kod maydoni fokuslanadi.
3. 5 xonali kod `verify` ga yuboriladi.

Ekranda so'rov muddati (10 daqiqa) va «Yangi so'rov» (30 soniya cooldown) ko'rinadi. Yangi hisob uchun ism, familiya, jins va yosh mavjud `CompleteProfileScreen` orqali `PATCH /auth/me` ga saqlanadi.

Demo SMS-login (`/auth/otp-login`, 12345) productionda **har doim o'chiq** (403). Mobil ilova uni faqat dev buildda ko'rsatadi.

## Hali yo'q (keyingi bosqichlar)

- **To'lov cheklari va to'lov holati xabarlari.** Backend'da balans/to'ldirish so'rovi modeli yo'q (3-bosqich). Bot o'z hisobini yuritmaydi; model paydo bo'lgach, chek qabul qilish shu ichki API orqali qo'shiladi.
- **Bot matnlari** hozircha faqat o'zbekcha.
