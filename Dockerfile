# syntax=docker/dockerfile:1
# Образы Endemion Life для рабочей среды. Один Dockerfile на монорепозиторий, цели:
#   api     — REST API (NestJS)
#   web     — сайт (Next.js, автономная сборка)
#   migrate — применение миграций Prisma перед запуском API
# Сборка и запуск: infrastructure/docker-compose.prod.yml

ARG NODE_IMAGE=node:24-bookworm-slim

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

# ---------- Сборка всего монорепозитория ----------
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
# Next.js записывает адрес прокси /api/* в сборку. В рабочей среде /api/* обслуживает Nginx, адрес — запасной
ARG API_INTERNAL_URL=http://api:4000
ENV NEXT_OUTPUT_STANDALONE=1 \
    API_INTERNAL_URL=${API_INTERNAL_URL}
RUN pnpm build:packages \
 && pnpm --filter @endemion/api build \
 && pnpm --filter @endemion/web build
# API с одними рабочими зависимостями: пакеты монорепозитория копируются внутрь
RUN pnpm --filter @endemion/api deploy --prod --legacy /prod/api
# Миграции: пакет базы с Prisma CLI (dev-зависимость), без остального монорепозитория
RUN pnpm --filter @endemion/database deploy --legacy /prod/migrate

# ---------- Миграции базы ----------
FROM ${NODE_IMAGE} AS migrate
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /prod/migrate ./
USER node
CMD ["node_modules/.bin/prisma", "migrate", "deploy"]

# ---------- API ----------
FROM ${NODE_IMAGE} AS api
ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=4000
WORKDIR /app
COPY --from=build --chown=node:node /prod/api ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=4 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "dist/main.js"]

# ---------- Сайт ----------
FROM ${NODE_IMAGE} AS web
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=4 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "apps/web/server.js"]
