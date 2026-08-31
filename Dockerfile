# Многоступенчатая сборка: инструменты компиляции нужны только на этапе сборки,
# в финальный образ они не попадают.

FROM node:22-slim AS builder

# better-sqlite3 — нативный модуль. Готовые бинарники есть не для всех платформ,
# поэтому держим наготове то, чем его можно собрать из исходников.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Сначала манифесты: слой с зависимостями переиспользуется, пока они не изменились.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
COPY packages/miniapp/package.json packages/miniapp/
COPY packages/guest/package.json packages/guest/
RUN npm ci

COPY . .
RUN npm run build

# Выкидываем devDependencies из node_modules, оставляя собранный нативный модуль.
RUN npm prune --omit=dev


FROM node:22-slim AS runner

ENV NODE_ENV=production
WORKDIR /app

# Процесс не должен работать от root.
RUN useradd --system --create-home --uid 10001 invite

COPY --from=builder --chown=invite:invite /app/node_modules ./node_modules
COPY --from=builder --chown=invite:invite /app/package.json ./package.json
COPY --from=builder --chown=invite:invite /app/packages/shared ./packages/shared
COPY --from=builder --chown=invite:invite /app/packages/api ./packages/api
COPY --from=builder --chown=invite:invite /app/packages/miniapp/dist ./packages/miniapp/dist
COPY --from=builder --chown=invite:invite /app/packages/guest/dist ./packages/guest/dist

# Сюда монтируется постоянный том: здесь живут SQLite и кеш фото.
# Без тома данные исчезнут при первом же перезапуске контейнера.
RUN mkdir -p /app/data/media && chown -R invite:invite /app/data
VOLUME ["/app/data"]

USER invite
EXPOSE 3000

# Хостинг обычно подставляет свой PORT — конфиг его читает.
ENV PORT=3000 HOST=0.0.0.0

CMD ["node", "packages/api/dist/server.js"]
