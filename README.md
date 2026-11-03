# Endemion Life

Браузерный симулятор жизни с элементами RPG и интерактивной истории: life.endemion.online.
Игрок рождается в одном из шести миров, проживает год за годом и принимает решения, которые меняют характеристики и судьбу персонажа.

Стек: Next.js 16, React 19, TypeScript, Tailwind CSS 4, NestJS 12, PostgreSQL 18 + Prisma 7, Redis 8, pnpm workspaces, Vitest, Playwright, Docker Compose, Nginx.

Устройство проекта: [docs/architecture.md](docs/architecture.md). Состояние этапа: [STAGE_01_REPORT.md](STAGE_01_REPORT.md).

## Требования

- Node.js 24 или новее
- pnpm 12 (`corepack enable`)
- Docker с Docker Compose

## Локальный запуск

```bash
cp .env.example .env        # значения по умолчанию подходят для разработки
pnpm install
pnpm infra:up               # PostgreSQL и Redis в Docker
pnpm db:migrate             # миграции базы
pnpm dev                    # API на :4000, сайт на :3000
```

Сайт: http://localhost:3000. Проверка API: http://localhost:4000/api/health.

## Команды

| Команда | Что делает |
| --- | --- |
| `pnpm dev` | Сборка пакетов и запуск API и сайта в режиме разработки |
| `pnpm build` | Сборка всех пакетов и приложений |
| `pnpm start` | Запуск собранных API и сайта |
| `pnpm test` | Модульные тесты всех пакетов |
| `pnpm test:api` | Тесты API на отдельной тестовой базе (`DATABASE_URL_TEST`) |
| `pnpm test:e2e` | Браузерные тесты Playwright (компьютер и телефон) |
| `pnpm lint` / `pnpm typecheck` | ESLint и проверка типов |
| `pnpm check` | lint + typecheck + test + build |
| `pnpm infra:up` / `pnpm infra:down` | PostgreSQL и Redis для разработки |
| `pnpm db:migrate` / `pnpm db:migrate:dev` | Применить миграции / создать новую |
| `node infrastructure/scripts/load-test.mjs` | Нагрузочный тест API (`BASE_URL`, `USERS`, `DURATION`) |

Перед первым запуском браузерных тестов установите браузер: `pnpm --filter @endemion/web exec playwright install chromium`.

## Рабочая среда

```bash
cp infrastructure/env.production.example .env   # на сервере; заполнить
docker compose -f infrastructure/docker-compose.prod.yml --env-file .env up -d --build
```

Поднимаются PostgreSQL, Redis, миграции, API, сайт, Nginx с HTTPS (Let's Encrypt) или за внешним прокси, резервное копирование и монитор. Cookie сессии — только по HTTPS (`COOKIE_SECURE=true`).

| Документ | О чём |
| --- | --- |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Развёртывание и обновление |
| [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) | Проверочный список перед запуском |
| [docs/ROLLBACK.md](docs/ROLLBACK.md) | Откат кода, миграций, восстановления |
| [docs/HTTPS_SETUP.md](docs/HTTPS_SETUP.md) | Сертификат, режимы tls и behind-proxy, HSTS |
| [docs/DATABASE_BACKUPS.md](docs/DATABASE_BACKUPS.md) | Резервные копии и восстановление |
| [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md) | Аккаунты, сессии, перенос гостевых жизней |
| [docs/MONITORING.md](docs/MONITORING.md) | Журналы, Sentry, healthcheck-и, оповещения |
| [docs/LOAD_TEST_REPORT.md](docs/LOAD_TEST_REPORT.md) | Нагрузочный тест и тесты надёжности |
| [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) | Git, ветки, CI |

Состояние подготовки к запуску: [STAGE_01_5_REPORT.md](STAGE_01_5_REPORT.md).
