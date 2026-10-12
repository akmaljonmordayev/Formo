# syntax=docker/dockerfile:1
# Build context — repo ildizi (pnpm workspace lockfile u yerda).
#   dev        — docker-compose.yml ishlatadi (hot reload)
#   production — oxirgi bosqich; Railway shuni yig'adi (backend/railway.json)

FROM node:20-alpine AS base
# Prisma engine uchun openssl kerak
RUN apk add --no-cache openssl && corepack enable
WORKDIR /app
# Avval faqat manifestlar — kod o'zgarganda dependencylar qayta o'rnatilmaydi
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY mobile/package.json mobile/
COPY packages/ui/package.json packages/ui/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/

# ---------- dev ----------
FROM base AS dev
# dedupe-peer-dependents=false: usiz pnpm --filter ni e'tiborsiz qoldirib butun monoreponi (mobil ilova bilan) o'rnatadi
RUN pnpm install --frozen-lockfile --filter @formo/backend --config.dedupe-peer-dependents=false
COPY backend/ backend/
WORKDIR /app/backend
RUN pnpm prisma generate
EXPOSE 3001
# Har ishga tushganda sxema bazaga qo'llanadi, keyin watch rejimida server
CMD ["sh", "-c", "pnpm prisma db push --skip-generate && pnpm dev"]

# ---------- build ----------
FROM dev AS build
RUN pnpm build

# ---------- production ----------
FROM base AS production
ENV NODE_ENV=production
# Faqat production dependencylar (prisma CLI ham shu yerda — migratsiya uchun)
RUN pnpm install --frozen-lockfile --prod --filter @formo/backend --config.dedupe-peer-dependents=false \
    && rm -rf /root/.local/share/pnpm /root/.cache
WORKDIR /app/backend
COPY backend/prisma prisma
RUN ./node_modules/.bin/prisma generate
COPY --from=build /app/backend/dist dist
USER node
EXPOSE 3001
# Avval kutilayotgan migratsiyalar qo'llanadi; xato bo'lsa server ko'tarilmaydi va
# Railway eski (ishlab turgan) deployni trafikda qoldiradi. exec — SIGTERM node'ga yetib borishi uchun.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/main"]
