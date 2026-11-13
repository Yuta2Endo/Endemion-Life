# Сезонный tick общего мира

## Контракт

`POST /api/world/:universeId/tick` с заголовком `x-world-ops` продвигает мир **ровно на
один сезон**. Повторный вызов — это следующий сезон; отдельного «идемпотентного ключа»
у tick нет, потому что сезон и есть его результат.

Детерминизм: при одинаковом `seed` и одинаковом журнале команд состояние и контрольная
сумма совпадают на любом сервере.

## Чистый алгоритм (`applySharedWorldCommand(state, { type: "tick" })`)

1. `nextSeason = state.season + 1`.
2. `rng = Rng.fromSeed(state.seed, "shared:" + nextSeason)`.
3. Для каждого поселения в порядке каталога:
   - процветание: `rng.int(-2, 2)` плюс поправка от стабильности (≥65 → +1, ≤30 → −1),
     зажим 0…100;
   - стабильность: `rng.int(-1, 1)` плюс поправка от процветания (≥60 → +1, ≤25 → −1),
     зажим 0…100;
   - население: прирост от процветания + `rng.int(-25, 25)`, зажим 100…1 000 000;
   - для каждого товара: `supply += rng.int(4, 9) + поправка процветания − ceil(population / 150 000)`,
     зажим 0…100; `buy`/`sell` пересчитываются из `base` и `supply`.
4. Для каждой фракции в порядке каталога:
   - влияние: `rng.int(-2, 2)`, зажим −100…100;
   - сила: `rng.int(-1, 1)` плюс поправка от влияния (≥25 → +1, ≤−25 → −1), зажим 0…100;
   - репутация: `round((power − 50) × 0.7 + influence × 0.3 + rng.int(-1, 1))`, зажим −100…100.
5. Выбирается одно событие сезона:
   - поселение — `rng.pick(settlements)`;
   - фракция — `rng.pick(factions)`;
   - шаблон — `rng.pick(TICK_EVENT_TEMPLATES[universeId])`, у каждого мира свои три
     шаблона (торговля, политика, кризис, находка, праздник, смута);
   - текст подставляет имя поселения или фракции;
   - `severity = clamp(шаблон + rng.int(-1, 1), 1, 5)`;
   - id: `tick:<universeId>:<season>:<kind>:<settlementId|factionId>`.
6. Событие добавляется в начало; массив обрезается до 40.
7. `state.season = nextSeason`.

Исходное состояние не мутируется: команда возвращает глубокую копию.

Порядок вызовов RNG фиксирован. Добавление нового шага RNG меняет все последующие сезоны,
поэтому такие изменения требуют новой версии `SHARED_WORLD_VERSION` и пересмотра replay.

## Запись в базу

Tick выполняется в одной транзакции PostgreSQL:

```text
BEGIN
  pg_advisory_xact_lock(hashtext('world:<universeId>'))
  SELECT worlds … (состояние, сезон, checksum)
  state' = tick(state)
  checksum' = sharedWorldChecksum(state')
  UPDATE worlds (season, checksum, state, last_tick_*, updated_at)
  UPSERT world_seasons (worldId, season')       -- снимок, checksum, state, durationMs
  UPSERT settlements / factions                 -- нормализованные проекции
  INSERT world_events … ON CONFLICT DO NOTHING  -- все события, не только новое
  INSERT world_commands (seq, type='tick', payload={type:'tick'}, …)
  INSERT world_audits (action='tick', actor='ops', detail)
COMMIT
```

Свойства:

- advisory lock сериализует tick и команды одной вселенной; параллельные tick выполняются
  последовательно и дают сезоны `N+1`, `N+2`;
- один и тот же lock используется ленивым созданием мира;
- при любой ошибке (повреждённое состояние, ошибка БД) транзакция откатывается: не
  появляется ни снимок, ни команда, ни наполовину обновлённая проекция;
- `durationMs` — время обработки запроса tick (включая ожидание advisory lock) до записи;
  попадает в `worlds` и в `world_seasons`.

## Правки администратора

`POST /api/world/:universeId/commands` принимает `event`, `settlement` или `faction`.
Они проходят тот же advisory lock и транзакцию, но:

- сезон не меняется;
- текущий снимок `world_seasons` обновляется (duration не пересчитывается);
- в `world_commands` пишется payload команды;
- в `world_audits` — действие `command.<type>` и сама команда;
- проекции обновляются сразу.

## Replay

`GET /api/world/:universeId/replay` (ops):

1. Берётся `World.seed`.
2. Все команды мира читаются по `seq`.
3. `replaySharedWorld(universeId, seed, commands)`.
4. Сравнивается checksum с `World.checksum`.

`GET /api/world/:universeId/seasons/:season/replay` (ops) делает то же для команд с
`seasonAfter <= season` и сравнивает со снимком сезона.

Расхождение — не 500, а `valid: false`: это диагностический результат. Ответ содержит
`checksum`, `expectedChecksum`, число команд и сезон.

## Наблюдаемость

`GET /api/world/admin/metrics` (ops) по каждому миру:

- `lastTickDurationMs`, `lastTickAt`;
- `projectionLagMs = now − World.updatedAt`;
- число снимков сезонов, событий и команд;
- `checksum.stored`, `checksum.current`, `checksum.valid`, `checksum.snapshotValid`.

Сбой tick пишется в лог приложения (`World`) и не оставляет частичных данных.

## Что tick не делает

- не читает и не меняет сохранения жизней;
- не использует рынок, цикл хозяйства или склад региона жизни;
- не вызывает `Math.random`, `Date.now` или время для игровых решений;
- не двигает сезон при правке администратора.
