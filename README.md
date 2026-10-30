# FORMО

Monorepo for the FORMО custom tailoring platform MVP.

## Tez ishga tushirish (Docker)

Faqat [Docker Desktop](https://www.docker.com/products/docker-desktop/) kerak — Node, pnpm, Postgres yoki `.env` shart emas.

```bash
git clone https://github.com/Umar033ya/Formo.git
cd Formo
docker compose up --build
```

| Xizmat | Manzil |
|---|---|
| Frontend (panel) | http://localhost:5173 |
| Backend API | http://localhost:3001/api |
| Swagger | http://localhost:3001/api/docs |
| Postgres | `localhost:5435` · `formo` / `formo` |

Superadmin avtomatik yaratiladi: **+998 90 111 11 11** / **admin123**. Operator va tikuv sexi akkauntlarini superadmin paneldan yaratadi.

| Buyruq | Nima qiladi |
|---|---|
| `docker compose up --build` | Hammasini ko'taradi (birinchi marta ~2-3 daqiqa) |
| `docker compose up -d` | Fonda ishga tushiradi |
| `docker compose down` | To'xtatadi (baza saqlanib qoladi) |
| `docker compose down -v` | To'xtatadi va bazani **o'chiradi** |
| `docker compose logs -f backend` | Backend loglari |
| `docker compose exec backend pnpm test:e2e` | E2e testlar |

`backend/src`, `frontend/src` dagi o'zgarishlar konteynerda avtomatik qayta yuklanadi. `package.json` ga yangi paket qo'shilsa — `docker compose up --build`.

### Docker'siz: faqat frontend, production API bilan

Backend va Postgres kerak emas — Vite proxy `/api` ni `api.formo.uz` ga yuboradi.

```bash
cd frontend
npm install
npm run dev:prod   # http://localhost:5173 — .env shart emas
```

> **Diqqat:** bu **production baza** — yaratilgan/o'zgartirilgan/o'chirilgan hamma narsa haqiqiy. Production akkaunti bilan kiriladi (`admin123` ishlamaydi).

### Mobil ilova (Expo) backendga ulanishi

Mobil ilova Docker'da emas — `mobile/` da Expo bilan alohida ishga tushadi va Wi-Fi orqali kompyuterdagi backendga ulanadi.

1. Kompyuterda `docker compose up` ishlab tursin.
2. Kompyuterning Wi-Fi IP manzilini bilib oling: macOS `ipconfig getifaddr en0`, Windows `ipconfig` → "IPv4 Address".
3. `mobile/.env` yarating (`mobile/.env.example` dan nusxa) va IP ni yozing: `EXPO_PUBLIC_API_URL=http://192.168.1.10:3001/api`
4. `cd mobile && npm install && npx expo start --clear` — telefon va kompyuter **bitta Wi-Fi'da** bo'lsin.
5. Brauzerda telefondan `http://<IP>:3001/api/docs` ochilsa — ulanish bor. Ochilmasa, kompyuter firewall'i 3001-portni bloklayapti.

Kodda: `import { auth, api } from './services/api'` → `auth.register(...)`, `auth.login(...)`, `auth.logout()`, `auth.me()`.

> **Production:** yuqoridagi parol va JWT secret faqat dev uchun. `NODE_ENV=production` da backend repodagi dev qiymatlari (`admin123`, dev JWT secret) yoki qisqa qiymatlar bilan **ishga tushmaydi** — `JWT_ACCESS_SECRET` (kamida 32 belgi, `openssl rand -hex 32`) va `SUPERADMIN_PASSWORD` (kamida 10 belgi) ni o'zingiz bering.

Sozlamalarni o'zgartirish (ixtiyoriy): ildizda `.env` yarating, masalan `SUPERADMIN_PASSWORD=...` yoki port band bo'lsa `FORMO_WEB_PORT=5174`, `FORMO_API_PORT=3002`, `FORMO_DB_PORT=5436`.

## SMS OTP production setup

Formo mobile app currently contains a development-only fallback OTP flow. The backend does not expose real SMS endpoints yet. In production, replace it with a real SMS provider and keep server-side verification enabled:

1. Add backend endpoints `POST /api/auth/otp/send` and `POST /api/auth/otp/verify`.
2. Store an OTP secret per phone number, send one-time codes via Twilio/ClickSend/etc., and validate them server-side before allowing registration or login.
3. Configure provider credentials in backend environment variables (for example `SMS_ACCOUNT_SID`, `SMS_AUTH_TOKEN`, `SMS_FROM` or provider-specific keys).
4. Keep the mobile app in development mode only while the SMS provider is not configured; the current local fallback is intentionally labeled as `Development-only mock OTP` and never represents real SMS delivery.

## Testlar va CI

| Buyruq | Nima tekshiradi |
|---|---|
| `pnpm --filter @formo/backend test` | Backend unit testlar (servislar, guardlar, validatsiya — bazasiz) |
| `pnpm --filter @formo/backend test:e2e` | Backend integratsion testlar: haqiqiy Postgres + HTTP (`docker compose up -d postgres` kerak) |
| `pnpm --filter @formo/frontend test` | Frontend testlar (Vitest): API klient, sessiya, routerlar, login oqimi |
| `pnpm lint` | ESLint (backend + frontend) |

Har bir PR va `main`ga push'da GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) shularning hammasini, migratsiyalarni va production Docker image'larni tekshiradi. `main`da hammasi yashil bo'lsa — Railway'ga avtomatik deploy qilinadi.

**Baza sxemasini o'zgartirsangiz** migratsiya ham qo'shing, aks holda CI qizil bo'ladi (production `prisma migrate deploy` bilan yangilanadi, `db push` bilan emas):

```bash
cd backend
pnpm prisma migrate dev --name <qisqa_nom>   # prisma/migrations/ ga yangi papka qo'shadi — commit qiling
```

Lokal bazangiz avval `db push` bilan yaratilgan bo'lsa, `migrate dev` birinchi marta "drift" deb bazani tozalashni so'raydi. Ma'lumotni saqlab qolish uchun avval bir marta: `pnpm prisma migrate resolve --applied 20261012000000_init`.

## Railway'ga deploy

Production'da uchta servis: **Postgres**, **backend** (NestJS, `backend/Dockerfile`) va **frontend** (nginx + statik build, `frontend/Dockerfile`). Panel manzili: https://admin.formo.uz.

### Bir martalik sozlash

1. Railway'da yangi project → **Database → PostgreSQL** qo'shing.
2. Ikkita **Empty Service** yarating: `backend` va `frontend`. Root Directory'ni o'zgartirmang (`/`) — build repo ildizidan yuradi. Har birining **Settings**ida: Healthcheck Path — `/api/health` (backend) va `/healthz` (frontend); Restart Policy — On Failure.
3. Har ikkala servisda **Settings → Networking → Generate Domain**.
4. **Variables**:

   | Servis | O'zgaruvchi | Qiymat |
   |---|---|---|
   | backend | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | backend | `JWT_ACCESS_SECRET` | `openssl rand -hex 32` natijasi |
   | backend | `FRONTEND_URL` | `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` (o'z domeningiz bo'lsa vergul bilan qo'shing) |
   | backend | `SUPERADMIN_PHONE` | masalan `+998901111111` |
   | backend | `SUPERADMIN_PASSWORD` | kamida 10 belgi (faqat birinchi ishga tushishda superadmin yaratish uchun) |
   | backend | `SUPERADMIN_NAME` | ixtiyoriy |
   | backend | `RAILWAY_DOCKERFILE_PATH` | `backend/Dockerfile` |
   | backend | `PORT` | `3001` (domen ham shu portga ulanadi) |
   | backend | `CLIENT_IP_HEADER` | `x-real-ip` — Railway haqiqiy klient IP'sini shu headerda beradi (Cloudflare ortida ham); usiz rate-limit hamma foydalanuvchiga umumiy bo'lib qoladi |
   | backend | `REQUIRE_CLOUDFLARE` | `true` — Cloudflare'ni chetlab Railway'ga to'g'ridan-to'g'ri kelgan so'rovlar 403 oladi (`/api/health`dan tashqari) |
   | backend | `TRUST_PROXY` | `2` — zaxira: `CLIENT_IP_HEADER` bo'lmasa va Cloudflare'siz to'g'ri ishlaydi |
   | backend | `TELEGRAM_BOT_USERNAME` | `formo_kit_bot` — mijozlar faqat shu bot orqali kiradi |
   | backend | `TELEGRAM_INTERNAL_TOKEN` | `openssl rand -hex 32` (kamida 32 belgi) — **telegram-bot servisidagi bilan aynan bir xil** |
   | backend | `TELEGRAM_BOT_TOKEN` | ixtiyoriy: admin bildirishnomalari uchun (BotFather tokeni) |
   | frontend | `RAILWAY_DOCKERFILE_PATH` | `frontend/Dockerfile` |
   | frontend | `PORT` | `8080` |
   | frontend | `VITE_API_URL` | `https://${{backend.RAILWAY_PUBLIC_DOMAIN}}` (oxirida `/api` **yo'q**) |

   `NODE_ENV=production` image ichida o'rnatilgan. Xato yoki dev qiymatlar bilan backend ishga tushmaydi va sababini deploy logida yozadi.
5. Avtomatik deploy uchun: har ikkala servisda **Settings → Source → Connect Repo** → shu repo, branch `main`, va **Wait for CI**ni yoqing.

Shundan keyin `main`ga har bir merge: GitHub Actions testlari → yashil bo'lsa Railway o'zi yig'ib deploy qiladi (faqat o'zgargan servisni: `backend/**` yoki `frontend/**`). Testlar qizil bo'lsa deploy bo'lmaydi.

> Qo'lda deploy (favqulodda): `railway up --service backend` (repo ildizidan).

### Telegram bot servisi

Mijozlar ilovaga faqat Telegram bot orqali kiradi, shuning uchun bot backend bilan **bir vaqtda** chiqishi kerak. Productionda demo SMS-login (`/auth/otp-login`, 12345) va parol bilan ro'yxatdan o'tish (`/auth/register`) o'chiq (403). Mavjud hisoblar uchun parol bilan kirish ishlayveradi.

1. Yangi **Empty Service** `telegram-bot`. **Settings → Source**: Root Directory — `telegram-bot`, Dockerfile — `Dockerfile`. Healthcheck Path — `/health`, Restart Policy — On Failure.
2. **Variables**:

   | O'zgaruvchi | Qiymat |
   |---|---|
   | `TELEGRAM_BOT_TOKEN` | BotFather tokeni (`@formo_kit_bot`) |
   | `TELEGRAM_INTERNAL_TOKEN` | backend'dagi bilan aynan bir xil (`${{backend.TELEGRAM_INTERNAL_TOKEN}}`) |
   | `BACKEND_URL` | `https://api.formo.uz/api` — ochiq domen orqali. `REQUIRE_CLOUDFLARE=true` Cloudflare'siz kelgan so'rovni 403 qiladi, shuning uchun ichki tarmoq manzili ishlamaydi. Ichki endpointlar baribir token bilan himoyalangan. |
   | `BOT_MODE` | `polling` (eng oddiy, ochiq domen shart emas) yoki `webhook` |
   | `PORT` | `8080` |
   | `TELEGRAM_WEBHOOK_URL`, `TELEGRAM_WEBHOOK_SECRET` | faqat `BOT_MODE=webhook` uchun: botga **Generate Domain**, URL `https://<bot-domeni>/telegram/webhook`, secret `openssl rand -hex 32` |

3. Bitta bot uchun bir vaqtda faqat bitta nusxa va bitta rejim ishlasin: polling ishga tushganda webhook o'chiriladi, webhook rejimi esa o'rnatadi. Lokal `npm run dev` ni productiondagi bot bilan bir vaqtda ishlatmang (Telegram 409 qaytaradi).
4. Tekshirish: servis logida `bot ishga tushdi` va `polling boshlandi`. Lokal kompyuterdan: production qiymatlarini `.env` ga yozmasdan, bot servisining **Shell**ida `node dist/check.js`.

Batafsil: [`telegram-bot/README.md`](telegram-bot/README.md).

**Chiqarish tartibi:** avval backend va bot o'zgaruvchilarini kiriting, keyin ikkalasini bir merge bilan chiqaring. Backend yangi versiyasi (demo-login o'chiq) bot ishlamay turib chiqsa, mijozlar parolsiz kira olmaydi.

### Deploy qanday ishlaydi

- Backend konteyneri har ishga tushganda `prisma migrate deploy` qiladi, keyin serverni ko'taradi. Migratsiya yiqilsa yoki `/api/health` (bazani ham tekshiradi) 200 qaytarmasa, Railway eski deployni trafikda qoldiradi.
- Frontend `VITE_API_URL` build paytida JS ichiga yoziladi — backend manzili o'zgarsa frontendni qayta deploy qiling.
- Backend proxy ortida ishlaydi: rate-limit haqiqiy klient IP'siga qarab ishlashi uchun Railway'da `CLIENT_IP_HEADER=x-real-ip`. Railway bu headerni har doim o'zi yozadi (klient yuborgani o'chiriladi). `api.formo.uz` Cloudflare orqali o'tadi va u yerda `X-Forwarded-For`da faqat Cloudflare manzili qoladi, shuning uchun hop sanash (`TRUST_PROXY`) yetarli emas. Tekshirish: superadmin tokeni bilan `GET /api/admin/diagnostics/request` — `ip` sizning haqiqiy IP'ingiz bo'lishi kerak. Oldiga yana proxy (masalan Cloudflare) qo'yilsa, shu endpoint bilan qayta o'lchang.
- Swagger (`/api/docs`) productionda faqat `SWAGGER_ENABLED=true` bilan yoqiladi va login/parol so'raydi: `SWAGGER_USER` (standart `formo`), `SWAGGER_PASSWORD` (majburiy, kamida 10 belgi).
- Mobil ilova uchun: `EXPO_PUBLIC_API_URL=https://<backend-domeni>/api` — EAS profillarida `mobile/eas.json`. Lokal `mobile/.env` (Wi-Fi IP) release buildga tushmasligi kerak — qarang [`mobile/README.md`](mobile/README.md#production-build-api-manzili).
- Lokal dev bazaga haqiqiy katalogni ko'chirish (faqat localhost, mavjud yozuvlarga tegmaydi): `cd backend && pnpm run catalog:import`.

## Architecture

pnpm + Turborepo monorepo. This is a structure-only skeleton — no business logic is implemented yet.

| App | Stack | Roles |
|-----|-------|-------|
| `backend` | NestJS, Node.js, PostgreSQL, Prisma, TypeScript | — |
| `frontend` | React + Vite, JavaScript | USER, OPERATOR, TAILOR, SUPERADMIN |
| `mobile` | React Native + Expo, JavaScript | USER only |

## MVP Roles

- **USER** — creates orders via web or mobile
- **OPERATOR** — reviews, confirms, and assigns orders to factories
- **TAILOR** — produces assigned orders at a factory
- **SUPERADMIN** — system administration

Factory/sewing shop is a domain entity, not a role. A TAILOR belongs to / works with a factory.
All roles authenticate through ONE common web login page; the backend determines the role.

## Project Structure

```
formo/
├── backend/            # NestJS API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── orders/
│   │   │   ├── products/
│   │   │   ├── factories/
│   │   │   ├── payments/
│   │   │   └── notifications/
│   │   ├── common/
│   │   ├── config/
│   │   ├── database/
│   │   └── app.module.ts
│   ├── prisma/
│   ├── test/
│   └── package.json
│
├── frontend/           # React + Vite (JS)
│   └── src/
│       ├── assets/
│       ├── components/  # common, layout, ui
│       ├── pages/
│       │   ├── Login/
│       │   ├── Operator/   # Dashboard, Orders, Factories
│       │   ├── Tailor/     # Dashboard, Orders
│       │   └── Superadmin/ # Dashboard, Users, Orders, Factories
│       ├── features/   # auth, orders, products, factories
│       ├── routes/
│       ├── services/
│       ├── store/
│       ├── hooks/
│       ├── utils/
│       └── constants/
│
├── mobile/             # React Native + Expo (JS), USER only
│   └── src/
│       ├── assets/
│       ├── components/  # common, ui
│       ├── screens/     # Login, Home, Products, ProductDetails, Cart, Checkout, Orders
│       ├── features/    # auth, products, cart, orders
│       ├── navigation/
│       ├── services/
│       ├── store/
│       ├── hooks/
│       ├── utils/
│       └── constants/
│
├── packages/
│   ├── types/
│   ├── config/
│   └── ui/
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

## Setup

```bash
pnpm install

# Backend (port 3001)
pnpm --filter @formo/backend dev

# Frontend (port 5173)
pnpm --filter @formo/frontend dev

# Mobile
pnpm --filter @formo/mobile start
```

## Notes

- No features are implemented yet — purely an architectural skeleton.
- Frontend and mobile use plain JavaScript (.js / .jsx); backend uses TypeScript (NestJS).