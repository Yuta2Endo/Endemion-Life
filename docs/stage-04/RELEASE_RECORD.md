# Stage 04 — Living Worlds: запись о готовности

## Статус

Backend, web-панель и документация реализованы и проверены в рабочем дереве. **Ничего не
закоммичено, не запушено и не развёрнуто.** Production по-прежнему работает на Stage 03.
Миграция на production не применялась.

`SAVE_SCHEMA_VERSION` остаётся **14**. Общий мир — отдельная проекция, не часть
сохранения жизни.

## Маршруты

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| GET | `/api/world` | публично | все шесть миров, сводка текущего сезона |
| GET | `/api/world/:universeId` | публично | текущее состояние: поселения, фракции, события, товары |
| GET | `/api/world/:universeId/seasons/:season` | публично | исторический снимок сезона |
| GET | `/api/world/:universeId/reconciliation` | публично | агрегированная сверка с мирами живых жизней, без PII |
| POST | `/api/world/:universeId/tick` | ops | ровно один сезонный шаг |
| POST | `/api/world/:universeId/commands` | ops | `event` / `settlement` / `faction` |
| GET | `/api/world/:universeId/replay` | ops | replay от seed по всему журналу |
| GET | `/api/world/:universeId/seasons/:season/replay` | ops | replay до сезона и сверка со снимком |
| GET | `/api/world/admin/metrics` | ops | длительность tick, отставание проекции, сезоны, checksum |

Ops-доступ: заголовок `x-world-ops`, значение — `WORLD_OPS_TOKEN` из `process.env`.
Токен короче 16 символов, не задан или не совпал — **404**. `config.ts` не менялся.

### Тела ops-команд

```json
{ "type": "event", "kind": "politics",
  "title": { "ru": "…", "en": "…" },
  "text": { "ru": "…", "en": "…" },
  "settlementId": "lirevale", "factionId": "imperial-court", "severity": 4 }
```

```json
{ "type": "settlement", "settlementId": "lirevale",
  "population": 12345, "prosperity": 88, "stability": 17,
  "dominantFactionId": "magic-tower" }
```

```json
{ "type": "faction", "factionId": "magic-tower",
  "power": 91, "influence": 44, "standing": 60 }
```

`tick` через `/commands` не принимается: у него отдельный маршрут с длительностью и
снимком сезона.

## Схема и миграция

Миграция: `20261114120000_stage04_living_worlds` (одна, аддитивная).
Файл: `packages/database/prisma/migrations/20261114120000_stage04_living_worlds/migration.sql`.

Новые таблицы:

- `worlds` — одна строка на вселенную, `state` (JSONB), seed, сезон, checksum,
  длительность последнего tick;
- `world_seasons` — снимок на `(world_id, season)` с checksum, state и duration;
- `settlements` — проекция поселений и товаров (`goods` JSONB);
- `factions` — проекция фракций;
- `world_events` — все события (в состоянии хранятся 40 последних);
- `world_commands` — журнал команд, уникальный `(world_id, seq)`;
- `world_audits` — аудит ops-действий.

Ограничения: `worlds.universe_id` уникален; уникальные проекции
`(world_id, settlement_id)` и `(world_id, faction_id)`; внешние ключи с
`ON DELETE CASCADE`; CHECK-ограничения на сезон, население, процветание, стабильность,
силу/влияние/репутацию и severity.

## Изменённые файлы

Новые:

- `packages/game-core/src/world/shared.ts`
- `packages/game-core/test/stage04-shared-world.test.ts`
- `packages/database/prisma/migrations/20261114120000_stage04_living_worlds/migration.sql`
- `apps/api/src/world/world.service.ts`
- `apps/api/src/world/world.controller.ts`
- `apps/api/test/stage04-shared-world.e2e-spec.ts`
- `apps/web/src/components/world/shared-world-panel.tsx`
- `apps/web/src/components/world/shared-world-panel.test.tsx`
- `docs/stage-04/IMPLEMENTATION_PLAN.md`
- `docs/stage-04/SHARED_WORLD_MODEL.md`
- `docs/stage-04/WORLD_TICK.md`
- `docs/stage-04/WEB_UI.md`
- `docs/stage-04/RELEASE_RECORD.md`

Изменены:

- `packages/game-core/src/index.ts` — экспорты общего мира;
- `packages/database/prisma/schema.prisma` — новые модели;
- `apps/api/src/app.module.ts` — `WorldController`/`WorldService`; portal-импорты и
  записи сохранены;
- `apps/api/test/helpers.ts` — очистка новых таблиц между e2e-файлами;
- `apps/web/src/app/worlds/page.tsx` — панель общего мира;
- `apps/web/src/lib/messages.ts` — RU/EN тексты панели.

Сгенерированный Prisma-клиент обновлён локально (`db:generate`), каталог
`packages/database/src/generated/` в `.gitignore`.

Не менялись: `apps/api/src/config.ts`, `packages/game-core/src/engine/*`,
`apps/api/src/lives/*`, рынок жизни, портал, отчёты Stage 11. Существующие
незакоммиченные изменения `.env.example`, `config.ts` и `apps/api/src/portal/` оставлены
как есть.

## Тесты

Инфраструктура: PostgreSQL 18 и Redis 8 в Docker (`infrastructure/docker-compose.yml`),
тестовая база `DATABASE_URL_TEST`, миграции применяются `global-setup.ts`.

| Команда | Результат |
|---|---|
| `pnpm --filter @endemion/game-core test` | 53 файла, **775 тестов** — passed |
| `pnpm --filter @endemion/shared test` | 2 файла, **18 тестов** — passed |
| `pnpm --filter @endemion/api test` | 7 файлов, **74 теста** — passed |
| `pnpm test:api` | 15 файлов, **127 тестов** — passed (86,36 с) |
| `pnpm --filter @endemion/web test` | 8 файлов, **25 тестов** — passed |
| `pnpm --filter @endemion/web build` | PASS, `/worlds` dynamic, 12 routes |

Дополнительно проверены сборка/типы:

- `pnpm --filter @endemion/game-core build` — ok;
- `pnpm --filter @endemion/database build` — ok (`prisma generate` + tsc);
- `pnpm --filter @endemion/api typecheck` — ok;
- `pnpm typecheck` (все пакеты и web) — ok;
- `prisma validate` — schema valid;
- ESLint по изменённым файлам — без ошибок.

Что покрыто тестами:

- шесть вселенных, детерминированный seed, одинаковый checksum;
- tick ровно на один сезон, одинаковые события при одинаковом seed;
- replay из seed и журнала команд совпадает с пошаговым применением;
- зажим значений и конечность чисел, лимит 40 событий за 60 сезонов;
- каноническая контрольная сумма и отказ на `NaN`;
- проверка формы и `parseSharedWorldState`;
- сверка: aligned / drifted / missing, примеры без PII;
- два независимых гостя видят одинаковый мир, шесть строк `worlds`;
- закрытое управление: нет токена / неверный / короткий / токен удалён из env;
- tick через API сверен с `replaySharedWorld` и снимками сезонов;
- команды администратора: событие, поселение, фракция, команда и аудит, replay;
- ход одинокой жизни не меняет `worlds`, checksum, `updatedAt`, команды и аудит;
- публичная сверка: форма ответа и отсутствие id жизни;
- metrics: длительность, лаг проекции, checksum;
- два параллельных tick дают сезоны 2 и 3 без потери снимков;
- повреждённое состояние → 500, транзакция не оставляет снимок/команду.

## Риски и ограничения

1. **Сверка — по живым жизням.** Учитываются `status = alive`: `lives.total` — все такие
   жизни, `lives.scanned` — разобранные (до 1000 последних по `updatedAt`). Мёртвые жизни
   в агрегат не входят.
2. **Checksum не криптографический.** 32 hex-символа обнаруживают случайный дрейф, но не
   защищают от злонамеренного изменения БД. Для защиты нужен внешний якорь/подпись.
3. **Replay доверяет журналу.** Изменение seed или payload команды в БД изменит и replay;
   checksum сверяется с тем же миром, а не с независимым источником.
4. **Один advisory lock на вселенную.** Tick и команды сериализуются. При высокой частоте
   операторских правок возможна очередь; для текущего масштаба это приемлемо.
5. **Проекции производные.** При расхождении `settlements`/`factions`/`world_events` с
   `worlds.state` нужен ручной/будущий rebuild. Отдельной команды rebuild в этом срезе нет.
6. **Рост `world_events`.** Строка на каждый tick/команду, без retention. При сезонном
   tick это небольшой объём; политику хранения нужно задать до высокочастотных тиков.
7. **`WORLD_OPS_TOKEN` вне `config.ts`.** Проверка идёт из `process.env` при запросе;
   токен не валидируется при старте. Если он не задан, ops-маршруты просто отвечают 404.
   Для эксплуатации нужен секрет ≥ 16 символов.
8. **`SHARED_WORLD_VERSION = 1`.** Любое изменение порядка вызовов RNG или полей должно
   повышать версию и сопровождаться миграцией/пересозданием миров; иначе старые журналы
   перестанут сходиться.
9. **`durationMs` недетерминирован** и намеренно не входит в checksum.
10. **Публичное чтение раскрывает seed.** Seed детерминирован и не является секретом;
    он нужен клиенту/ops для воспроизведения. Это не даёт прав на запись.
11. **Миграция не применена к production.** Откат приложения оставляет таблицы; удаление
    таблиц — отдельное разрушительное действие, требующее явного разрешения.
12. **Web-панель не покрыта Playwright.** Есть unit/render-тесты и ручная проверка 1440/390;
    сквозной сценарий с живым API в CI пока не добавлен.
13. **`app.module.ts` содержит portal-код.** Для коммита Stage 04 нужен чистый вариант
    файла без portal-импортов; рабочая копия с порталом должна сохраниться.

## Откат

- Приложение: вернуть предыдущую версию API. Таблицы Stage 04 аддитивны и старым кодом
  не используются.
- Миграция: forward-only. Не удалять таблицы и не переписывать историю миграций без
  отдельного плана и резервной копии.
- Ops-доступ: убрать `WORLD_OPS_TOKEN` — все изменяющие маршруты станут 404.
