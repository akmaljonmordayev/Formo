# syntax=docker/dockerfile:1
# Build context — telegram-bot/ katalogining o'zi (monorepo lockfile'iga bog'liq emas):
#   docker build -t formo-telegram-bot telegram-bot
# Railway: Root Directory = telegram-bot, Dockerfile = Dockerfile

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json tsconfig.build.json ./
COPY src src
RUN npm run build

# Runtime dependency yo'q — faqat kompilyatsiya qilingan kod
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY --from=build /app/dist dist
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- "http://127.0.0.1:${PORT:-8080}/health" >/dev/null || exit 1
CMD ["node", "dist/main.js"]
