# Вход через Endemion ID

Endemion ID (`auth.endemion.online`) — общий аккаунт для endemion.online и Endemion Life. Провайдер живёт в репозитории Endemion (`auth/`), там же основная документация: `docs/ENDEMION_ECOSYSTEM_ARCHITECTURE.md`, `ENDEMION_AUTH_SETUP.md`, `ENDEMION_DEPLOYMENT.md`, `ENDEMION_SECURITY.md`.

## Что меняется в Life

С `ENDEMION_ID=true`:

- `/account` показывает «Войти через Endemion ID» и «Создать Endemion ID» вместо формы с почтой и паролем. `POST /api/auth/login`, `register`, `verify-email`, `resend-verification`, `forgot-password`, `reset-password` отвечают 410 `USE_ENDEMION_ID`.
- `GET /api/auth/oidc/login?returnTo=/путь` уводит на Endemion ID (Authorization Code + PKCE S256). `GET /api/auth/oidc/callback` принимает ответ, создаёт сессию `el_session` и возвращает на `returnTo` (только свои пути).
- Сессия хранит зашифрованный refresh token и раз в 5 минут сверяется с Endemion ID: выход, отзыв и блокировка там завершают её здесь, имя, username, почта и аватар обновляются (`players.id_*`).
- `GET /api/auth/me` дополнительно отдаёт `endemionId`: `id` (sub), `username`, `displayName`, `avatarUrl`, `email`.
- `POST /api/auth/logout` отдаёт `redirect` — страницу выхода Endemion ID, где можно выйти и с endemion.online.
- Список устройств и их отзыв работают как раньше.

Без `ENDEMION_ID` (или `false`) всё работает как до изменений.

## Прогресс и старые аккаунты

Жизни принадлежат игроку, игрок связан с Endemion ID через `players.endemion_sub`. Смена username или почты в Endemion ID не меняет ни игрока, ни прогресс.

При входе игрок ищется так (`AuthService.signInWithEndemionId`):

1. игрок уже связан с этим Endemion ID;
2. аккаунт Life с той же почтой, если Endemion ID подтвердил почту. Неподтверждённая почта не связывается: пользователь видит просьбу подтвердить её;
3. гость этого браузера — его жизни остаются у него;
4. новый игрок.

Если вход привёл к уже существующему игроку (1–2), жизни гостя этого браузера переходят к нему тем же переносом, что при обычном входе. По username ничего не связывается.

## Настройки

`ENDEMION_ID`, `ENDEMION_ID_ISSUER`, `ENDEMION_ID_CLIENT_ID`, `ENDEMION_ID_CLIENT_SECRET`, `ENDEMION_ID_TOKEN_KEY` — образцы в `.env.example` и `infrastructure/env.production.example`, в `docker-compose.prod.yml` передаются сервису `api`. Адрес ответа провайдера — `<PUBLIC_URL>/api/auth/oidc/callback`, он должен совпадать с `redirect_uris` клиента `endemion-life-web` в Endemion ID.

## Миграция

`20261103120000_endemion_id` только добавляет столбцы (`players.endemion_sub`, `players.id_*`, `sessions.refresh_token`, `refreshed_at`, `last_ok_at`) и таблицу `oidc_logins`. Существующие аккаунты, гостевые сессии и сохранения не меняются.

## Откат

`ENDEMION_ID=false` и перезапуск `api`. Старый вход по почте работает снова. Игроки, созданные через Endemion ID, остаются в базе; войти в них можно будет снова, когда вход через Endemion ID включат.

## Тесты

`apps/api/test/endemion-id.e2e-spec.ts` — 11 тестов с настоящим `oidc-provider` (`test/endemion-id-provider.ts`): вход гостя с сохранением жизней, второе устройство, связь по подтверждённой почте, отказ по username, обновление профиля, блокировка, повтор ответа провайдера, чужой `returnTo`, закрытые старые входы, выход.
