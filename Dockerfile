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

# ---------- Миграции базы ----------
FROM build AS migrate
CMD ["pnpm", "--filter", "@endemion/database", "db:migrate"]

# ---------- API ----------
FROM ${NODE_IMAGE} AS api
ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=4000
WORKDIR /app
COPY --from=build --chown=node:node /prod/api ./
USER node
EXPOSE 4000
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
CMD ["node", "apps/web/server.js"]
