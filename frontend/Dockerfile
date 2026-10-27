# syntax=docker/dockerfile:1
# Build context — repo ildizi (pnpm workspace lockfile u yerda).
#   dev        — docker-compose.yml ishlatadi (Vite hot reload)
#   production — oxirgi bosqich; Railway shuni yig'adi (RAILWAY_DOCKERFILE_PATH=frontend/Dockerfile)

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY mobile/package.json mobile/
COPY packages/ui/package.json packages/ui/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/
COPY packages/kit-3d/package.json packages/kit-3d/

# ---------- dev ----------
FROM base AS dev
# dedupe-peer-dependents=false: usiz pnpm --filter ni e'tiborsiz qoldirib butun monoreponi (mobil ilova bilan) o'rnatadi
RUN pnpm install --frozen-lockfile --filter @formo/frontend --config.dedupe-peer-dependents=false
# Admin 3D forma ko'rinishi workspace paketidan (@formo/kit-3d) — manba kodi build'ga kerak
COPY packages/kit-3d/ packages/kit-3d/
COPY frontend/ frontend/
WORKDIR /app/frontend
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# ---------- build ----------
FROM dev AS build
# Vite o'zgaruvchilari build paytida JS ichiga yoziladi. Railway servis o'zgaruvchilarini
# shu ARG larga o'zi uzatadi.
ARG VITE_API_URL
ARG VITE_USE_MOCK_AUTH=false
RUN case "$VITE_API_URL" in \
      http://*|https://*) ;; \
      *) echo "XATO: VITE_API_URL berilmagan yoki noto'g'ri ('$VITE_API_URL'). Backend manzilini bering, masalan https://api.formo.uz" >&2; exit 1 ;; \
    esac
ENV VITE_API_URL=$VITE_API_URL VITE_USE_MOCK_AUTH=$VITE_USE_MOCK_AUTH
RUN pnpm build

# ---------- production ----------
FROM nginx:1.27-alpine AS production
# Railway PORT ni o'zi beradi; lokal ishga tushirish uchun standart qiymat
ENV PORT=8080
COPY frontend/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 8080
