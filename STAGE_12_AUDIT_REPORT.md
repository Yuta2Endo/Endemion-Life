# Endemion Life — Stage 12: Аудит сводки мира и баланса поздней игры

**Дата:** 2026-11-08. **Репозиторий:** `G:\III\endemion-life`, ветка `main`, HEAD `c7951d0`.
**Тип этапа:** интеграция только-чтение UI + балансная оценка + регрессия. Не новые механики.
**Развёртывание:** запрещено. **Commit / Push:** не выполнялись.

## 1. Метод

Изучены `STAGE_11_AUDIT_REPORT.md`, `STAGE_11_IMPLEMENTATION_REPORT.md`, `STAGE_11_NEXT_STAGE.md`, затем код: `world/metrics.ts`, `index.ts`, `world/state.ts`, `packages/shared/src/views.ts`, UI досье (`dossier.tsx`, `world-panel.tsx`), локализация (`messages.ts`), тесты и конфигурация (web `vitest.config.ts`, Playwright e2e). Балансные сценарии Stage 11 воспроизведены детерминированно.

## 2. Проверенные системы

- `packages/game-core/src/world/metrics.ts` — `worldMetrics(state)` и типы `WorldMetrics`, `MetricRange`, `SettlementMetrics`, `FactionMetrics`, `ActivityMetrics` (118 строк, чистые производные метрики).
- `packages/game-core/src/index.ts:100` — `worldMetrics` и типы экспортируются из `@endemion/game-core`.
- `packages/game-core/src/world/state.ts` — `WorldView`, `presentWorld`, `normalizeWorldState`, `worldTick`, `DYNASTY_PROSPERITY_RENOWN = 30`, clamps 0..100, `MAX_WORLD_ACTIVITIES = 24`.
- `packages/shared/src/views.ts` — `LifeView`, `toLifeView(meta, state)`; единственная проекция, используемая и облачным API, и локальным store.
- `apps/web/src/components/play/dossier.tsx` — вкладки досье, вкладка `world` → `WorldPanel`.
- `apps/web/src/components/play/world-panel.tsx` — существующая панель мира (поселения, сила фракций, лента).
- `apps/web/src/lib/messages.ts` — двухъязычная локализация (`ru`/`en`).
- Тесты: `apps/web/src/lib/messages.test.ts`, `packages/shared/test/schemas.test.ts`, e2e `apps/web/e2e/game.spec.ts`.
- Конфигурация: `apps/web/vitest.config.ts` (node-окружение, `src/**/*.test.ts`), `apps/web/playwright.config.ts`.

## 3. Выбранная точка интеграции и обоснование

**Точка:** существующая панель `WorldPanel` на вкладке «Мир» в `Dossier` (`apps/web/.../dossier.tsx:627`). Новая навигация и новый экран не создавались.

**Ограничение:** UI получает `LifeView` из `@endemion/shared`, а `worldMetrics` принимает `GameState`. Вызывать `worldMetrics` напрямую во вкладке нельзя.

**Решение:** в `LifeView` добавлено производное поле `metrics: WorldMetrics`, вычисляемое в `toLifeView` как `worldMetrics(state)`. Это:
- переиспользует единственную реализацию `worldMetrics` (без дублирования логики);
- обновляется при каждом ответе API и при каждом действии локального store (обе ветки используют `toLifeView`);
- ничего не сохраняет: поле существует только в ответе/представлении.

`worldMetrics` уже был доступен UI-пакету через экспорт `@endemion/game-core`; не хватало только `GameState` в браузере, что и решено через проекцию.

## 4. Доступные метрики

`WorldMetrics`: `hasWorld`, `tick`; `settlements.count`, `prosperity`/`stability` (`min/max/mean/count`), `atProsperityMax/Min`, `atStabilityMax/Min`; `factions.count`, `relation` (`min/max/mean`); `dynastyRenown`, `activeThreads`; `activities.count`, `byKind`.

Сводка использует: число поселений, средний достаток (с min–max), средний порядок (с min–max), средние отношения с фракциями (с min–max), славу рода, активные нити, число событий мира.

## 5. Балансный baseline поздней игры (воспроизведён в Stage 12)

Синтетика (слава 60 / 0, 80 лет) — идентична Stage 11:

| Мир | HIGH: p mean [min/max], на 100 | HIGH: порядок mean | HIGH: отношения | CTRL: p mean, на 100 |
|---|---|---|---|---|
| dark-fantasy | 99.7 [99/100], 2 | 100.0 | 24 | 50.3, 0 |
| isekai | 99.7 [99/100], 2 | 100.0 | 24 | 52.3, 0 |
| murim | 99.7 [99/100], 2 | 100.0 | 24 | 52.7, 0 |
| xianxia | 100.0 [100/100], 3 | 100.0 | 24 | 50.3, 0 |
| hunter | 99.3 [99/100], 1 | 100.0 | 24 | 49.0, 0 |
| academy | 100.0 [100/100], 3 | 100.0 | 24 | 57.7, 0 |

Реалистичные поколения (до 6, seed `s11real-<world>`) — идентичны Stage 11:

| Мир | Поколений | Лет | p mean | порядок mean | Слава |
|---|---|---|---|---|---|
| dark-fantasy | 4 | 261 | 93.7 | 100.0 | 26 |
| isekai | 1 | 221 | 12.3 | 0.0 | 8 |
| murim | 6 | 419 | 14.7 | 56.3 | 14 |
| xianxia | 1 | 106 | 49.7 | 92.3 | 13 |
| hunter | 6 | 464 | 99.3 | 100.0 | 9 |
| academy | 3 | 346 | 20.0 | 0.3 | 1 |

Вывод не изменился: дрейф силён только при устойчивой славе ≥ 30, ограничен clamps и в реалистичной игре активируется не всегда. **Подтверждённого игрового дефекта нет; балансные константы не меняются.**

## 6. Существующие ограничения

- Веб-тесты работают в node-окружении без DOM/Testing Library; рендер проверяется через `react-dom/server` (`renderToStaticMarkup`). Браузерные сценарии — Playwright e2e; в этом окружении они не запускались (нужны PostgreSQL/Redis, сборка и Chromium).
- `pnpm lint` в корне красный только из-за пре-существующих файлов: сгенерированный `android/.../native-bridge.js` и `prefer-const` в `packages/game-core/test/stage01-life-upgrade.test.ts`. В `apps/web` — одно пре-существующее предупреждение `react-hooks/exhaustive-deps` в `play-screen.tsx`.
- Сводка показывает агрегаты, а не историю/тренды; история потребовала бы отдельных данных и не вводится (запрет на новые сохраняемые поля).

## 7. Что вне рамок

- Новые механики, миры, фракции, события.
- Новые сохраняемые поля и миграции (`SAVE_SCHEMA_VERSION` остаётся 8).
- Внешняя телеметрия/аналитика.
- Прод-деплой, commit/push.
- Массовая чистка несвязанных lint-ошибок.