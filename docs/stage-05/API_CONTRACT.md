# STAGE 05 — API contract: account, presence, contribution

Все маршруты под глобальным префиксом `/api`. Cookie `el_session` — HttpOnly, SameSite=Lax, Secure в production.

## Аккаунт

### `POST /api/presence/heartbeat`

Требует аккаунт. Тело:

```json
{ "universeId": "hunter" }
```

Ответ `201`:

```json
{
  "universeId": "hunter",
  "available": true,
  "count": 2,
  "players": [{ "id": "uuid", "displayName": "Имя" }],
  "serverTime": "2026-11-14T00:00:00.000Z"
}
```

Гость: `403 { "error": { "code": "ACCOUNT_REQUIRED" } }`.
Redis недоступен: `available: false`, `count: 0`; соло-игра не страдает.

### `GET /api/presence/online?universeId=hunter`

Требует аккаунт. Возвращает тот же снимок. Имена — `idDisplayName`, затем `idUsername`, затем первые 8 символов id.

### `GET /api/presence/stream?universeId=hunter`

Требует аккаунт. `Content-Type: text/event-stream`. События:

```text
event: presence
data: { ...snapshot... }

event: hello
data: { "universeId": "hunter", "playerId": "uuid", "at": "..." }

event: world
data: {
  "universeId": "hunter",
  "kind": "contribution",
  "title": { "ru": "Поддержка: ...", "en": "Support: ..." },
  "text": { "ru": "...", "en": "..." },
  "at": "..."
}
```

Heartbeat SSE — каждые 20 секунд. Клиент использует `EventSource`, который переподключается сам.

### `GET /api/auth/export`

Требует аккаунт. Возвращает:

```json
{
  "version": 1,
  "exportedAt": "...",
  "player": { "id": "...", "createdAt": "...", "displayName": null, "username": null, "email": null },
  "account": { "email": "...", "emailVerifiedAt": null },
  "lives": [{ "id": "...", "state": {} }],
  "sessions": [{ "id": "...", "createdAt": "...", "expiresAt": "..." }]
}
```

Не содержит паролей, хешей токенов и refresh token.

### `DELETE /api/auth/account`

Требует аккаунт. Тело:

```json
{ "confirm": "DELETE" }
```

Удаляет `Player` и каскад: жизни, снимки, историю, действия, сессии, аккаунт, связи, live parts, вклады, отчёты. Cookie очищается.

## Общий мир

### `POST /api/world/:universeId/contribute`

Требует аккаунт. Тело:

```json
{
  "actionId": "uuid",
  "expectedSeason": 1,
  "targetKind": "settlement",
  "targetId": "ash-capital"
}
```

`targetKind`: `settlement | faction`.

Успех `200`:

```json
{
  "world": { "version": 1, "universeId": "hunter", "season": 1, "...": "..." },
  "checksum": "...",
  "season": 1,
  "contribution": {
    "id": "uuid",
    "actionId": "uuid",
    "season": 1,
    "targetKind": "settlement",
    "targetId": "ash-capital",
    "createdAt": "..."
  },
  "replayed": false
}
```

Повтор с тем же `actionId`: `200`, `replayed: true`, мир не меняется.
Другой `actionId` в том же сезоне: `409 ALREADY_CONTRIBUTED`.
`expectedSeason` не совпал: `409 WORLD_CONFLICT`.
Нет цели: `404 NOT_FOUND`.
Гость: `403 ACCOUNT_REQUIRED`.

Сервер применяет:

- поселение: `prosperity +1`, `stability +1` (clamp 0..100);
- фракция: `influence +1`, `standing +1` (clamp -100..100);
- запись `WorldCommand` с `actor = playerId`;
- запись `WorldAudit` `player.contribute`;
- запись `WorldContribution` (уникальность `playerId+actionId`, `worldId+playerId+season`);
- SSE `world` после успешного commit.

## Модерация

### `POST /api/social/reports`

Требует аккаунт. Тело:

```json
{
  "playerId": "uuid",
  "reason": "harassment | spam | cheating | other",
  "details": "до 500 символов, необязательно"
}
```

Ответ `201 { "reported": true }`. Нельзя пожаловаться на себя (`400`), на несуществующего игрока (`404`), гость (`403`).

## Коды ошибок

Добавлены в `packages/shared/src/views.ts`:

- `ACCOUNT_REQUIRED` — 403;
- `ALREADY_CONTRIBUTED` — 409;
- `WORLD_CONFLICT` — 409.

## Совместимость

- `SAVE_SCHEMA_VERSION` остаётся **14**.
- Старые сохранения не читаются и не пишутся этим этапом.
- Contribution/presence не входят в `GameState` и не влияют на соло-действия.
- Удаление аккаунта не затрагивает общий мир: вклад остаётся в истории мира, но `WorldContribution.playerId` каскадно удаляется; это осознанный выбор (аудит мира хранит actor, но не персональные данные).
