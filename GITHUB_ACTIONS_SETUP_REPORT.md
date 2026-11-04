# GitHub Actions CI/CD — отчёт о настройке

Дата: 2026-11-04. Изменения слиты в `main` (PR #1, `6d39bf4`). Первая выкладка через GitHub Actions выполнена 2026-11-04 в 18:34 UTC: на сервере работает `6d39bf4`, прежний релиз — `26af6f0`. Журнал — раздел 12. Разделы 1–7 описывают состояние до выкладки.

## 1. Результаты аудита

| Что | Факт |
| --- | --- |
| Структура | pnpm-монорепозиторий: `apps/web` (Next.js), `apps/api` (NestJS), `packages/{database,game-core,shared,ui}`; Prisma, 6 миграций |
| Инструменты | Node 24 (`engines: >=24`, `NODE_VERSION: "24"` в CI, `node:24-bookworm-slim` в Dockerfile), `pnpm@12.16.1`, `pnpm-lock.yaml` |
| Команды | `pnpm lint`, `pnpm typecheck`, `pnpm test` (unit), `pnpm test:api` (API на PostgreSQL и Redis), `pnpm test:e2e` (Playwright), `pnpm build`, `pnpm check` (всё, кроме API и e2e) |
| CI | `ci.yml` уже был: lint, typecheck, unit, build; API-тесты; миграции на пустой базе, drift и status; Playwright; сборка всех 6 образов; `compose config`. `security.yml`: `pnpm audit`, dependency review, gitleaks, shellcheck, actionlint. Последний результат на `main`: зелёный на `26af6f0` |
| Рабочая среда | `/opt/endemion-life`, Compose-проект `endemion-life-prod`, режим behind-proxy за Caddy основного сайта (`/opt/endemion`). Сервисы: postgres 18, redis 8, migrate, api, web, nginx, backup, monitor. Docker 27.3.1, Compose 2.29.7, 2 ГБ памяти, 11 ГБ свободного диска |
| Текущий деплой | Ручной. Образы собираются на машине разработки, переносятся `docker save \| ssh docker load`; код обновляется из git bundle (`origin` = `/opt/endemion-life.bundle`, `merge --ff-only`), затем `up -d --no-build migrate api web nginx`. Сервер к GitHub не подключён. Причина сборки вне сервера — 2 ГБ памяти и соседний сайт |
| Миграции | Сервис `migrate` (`prisma migrate deploy`) выполняется при каждом `up`; `api` стартует только после его успеха |
| Сервер на момент аудита | Код `26af6f0` на `main`; образы `:latest` = `:stage04`, откат — `:pre-stage04`, `:pre-stage02`; все сервисы `healthy` (чтение 2026-11-04) |
| GitHub | Репозиторий **публичный** (API: `visibility: public`; при первом чтении во время аудита API вернул `private`, видимость могла смениться в 16:44 UTC). Environment `production` создан владельцем в 17:30 UTC: required reviewers — `Yuta2Endo`, deployment branches — только `main`. Secrets в environment не заданы. `main` не защищена. Repository variables (`DEPLOY_AUTO`) не заданы |
| Документация | docs/DEPLOYMENT.md, docs/ROLLBACK.md, docs/DATABASE_BACKUPS.md, docs/PRODUCTION_CHECKLIST.md, docs/GIT_WORKFLOW.md |

## 2. Созданные и изменённые файлы

| Файл | Что |
| --- | --- |
| `.github/workflows/deploy.yml` | **Новый.** Выкладка, откат и просмотр состояния |
| `infrastructure/deploy/lib.sh` | **Новый.** Общие функции |
| `infrastructure/deploy/deploy.sh` | **Новый.** Выкладка с проверками, копией базы, health check, автоматическим откатом |
| `infrastructure/deploy/rollback.sh` | **Новый.** Откат на релиз, который уже работал |
| `infrastructure/deploy/health-check.sh` | **Новый.** Проверка сайта снаружи |
| `infrastructure/deploy/status.sh` | **Новый.** Состояние выкладки (только чтение) |
| `infrastructure/deploy/ssh-gateway.sh` | **Новый.** Forced command ключа выкладки: белый список операций |
| `docs/GITHUB_ACTIONS_DEPLOYMENT.md` | **Новый.** Инструкция |
| `GITHUB_ACTIONS_SETUP_REPORT.md` | **Новый.** Этот отчёт |
| `.github/workflows/security.yml` | shellcheck проверяет и `infrastructure/deploy/*.sh` |
| `docs/DEPLOYMENT.md`, `docs/ROLLBACK.md`, `docs/GIT_WORKFLOW.md` | Ссылки на новый порядок, secrets выкладки |

Не менялись: `ci.yml`, Dockerfile, compose-файлы, Nginx, Caddy, `.env`, PostgreSQL, Redis, код приложения.

## 3. CI workflow

`ci.yml` уже выполняет всё, что требует этап 2, поэтому не переписывался:

| Требование | Где в `ci.yml` |
| --- | --- |
| PR в `main`, push в `main` | `on: push` и `pull_request` (все ветки, включая `main`) |
| Node проекта | `NODE_VERSION: "24"`, `actions/setup-node` |
| Package manager и lock | `pnpm/action-setup` (версия из `packageManager`), `pnpm install --frozen-lockfile` |
| Типы | `pnpm typecheck` |
| Unit / API / e2e | `pnpm test`; `pnpm test:api` с PostgreSQL и Redis; `pnpm test:e2e` (Playwright) |
| Миграции | `prisma migrate deploy` на пустой базе, `migrate diff --exit-code`, `migrate status` |
| Production build | `pnpm build`; сборка образов `migrate`, `api`, `web`, `nginx`, `backup`, `monitor` |
| Ошибка = красный статус | Каждая команда — отдельный шаг без `continue-on-error` |

Выкладка (`deploy.yml`) дополнительно требует зелёный `Security` на том же коммите.

## 4. Архитектура выкладки

```
push main → CI + Security → Deploy (DEPLOY_AUTO=true)   или   Run workflow (main)
  gate:       коммит входит в main; CI и Security на нём success
  production: сборка 4 образов на runner (метка org.opencontainers.image.revision=SHA)
              ssh upload-images SHA  → проверка архива (ровно 4 образа релиза) → docker load
              ssh upload-bundle SHA  → git bundle (одна ветка deploy-release → SHA)
              ssh deploy SHA [--allow-migrations] [--allow-infra]
server deploy.sh:
  проверки → копия базы (backup.sh) → git checkout -B main SHA → :SHA → :latest
  → up -d --no-build migrate api web nginx → healthy + health-check.sh → ok
  ошибка: без миграций — автоматический откат на прежний релиз; с миграциями — стоп, нужен человек
```

**Выбор схемы.** Отдельные каталоги кода на релиз отклонены: `.env`, имя Compose-проекта и пути томов (`BACKUP_HOST_DIR` и др.) привязаны к `/opt/endemion-life`, и перенос был бы изменением рабочей среды. Вместо этого релиз — это неизменяемый набор образов `:<SHA>` плюс коммит. Переключение — перетегирование на `:latest` и `up --no-build`, ровно как при ручной выкладке. Откат — те же действия с прежним SHA, без migrate. Хранятся текущий, прежний и 2 последних успешных релиза (около 2 ГБ каждый).

**Защита:**

- Ключ GitHub Actions ограничен `restrict,command="…/ssh-gateway.sh"`. Терминал, проброс портов и произвольные команды запрещены. Архив образов не может перезаписать другие образы, например `postgres`.
- Включена `StrictHostKeyChecking yes` с `DEPLOY_KNOWN_HOSTS`.
- Ключ хранится только в secret, на runner — в файле с правами 600. После задачи файл удаляется.
- Журналы контейнеров при ошибке сохраняются на сервере, не в GitHub.
- Скрипты читают из `.env` только `DOMAIN` и `NGINX_MODE`.
- Изменённые или удалённые старые миграции блокируются всегда. Новые миграции и изменения compose, backup и monitor требуют явного флага.
- Выкладка идёт только вперёд по `main` и только при чистом дереве Git.
- Перед переключением делается обязательная копия базы.
- Одновременно выполняется одна операция: `concurrency` в GitHub и `flock` на сервере.

## 5. GitHub Secrets

| Имя | Где | Значение |
| --- | --- | --- |
| `DEPLOY_HOST` | environment `production`, secret | `185.175.156.196` |
| `DEPLOY_USER` | environment `production`, secret | `root` |
| `DEPLOY_SSH_KEY` | environment `production`, secret | Закрытый ed25519 без пароля, только для GitHub Actions |
| `DEPLOY_KNOWN_HOSTS` | environment `production`, secret | `ssh-keyscan -t ed25519 185.175.156.196`, отпечаток сверить |
| `DEPLOY_PORT` | environment `production`, variable | Порт SSH, если не 22 |
| `DEPLOY_AUTO` | репозиторий, variable | `true` включает выкладку после CI; по умолчанию выключена |

Задача `production` в `deploy.yml` работает в environment `production`. Его нужно создать заранее с правилами: required reviewers — владелец, deployment branches — только `main`. Задача `gate` проверяет, что в environment есть required reviewers, и без них останавливает любую операцию.

## 6. Подготовка сервера

Подробно — docs/GITHUB_ACTIONS_DEPLOYMENT.md, «Подготовка SSH-доступа». Кратко:

1. Скопировать `infrastructure/deploy/*.sh` в `/opt/endemion-life-deploy/` (root, 700). Скрипты не берутся из рабочей копии, чтобы выкладка не меняла сама себя.
2. Проверить, что на сервере есть `flock`, `git`, `curl`, `docker`.
3. Добавить в `/root/.ssh/authorized_keys` строку `restrict,command="/opt/endemion-life-deploy/ssh-gateway.sh" ssh-ed25519 … github-actions-endemion-life`.
4. Выполнить `ssh -i <ключ> root@185.175.156.196 status`: должно показать состояние. Команда `… id` должна получить отказ.

Каталог `/opt/endemion-life-releases/` создаётся при первом запуске.

## 7. Результаты проверки

| Проверка | Результат |
| --- | --- |
| actionlint 1.7.12 (все workflow) | 0 ошибок |
| shellcheck 0.10.0 `--severity=style -x` (новые скрипты) | 0 замечаний |
| shellcheck как в `security.yml` (все скрипты) | 0 замечаний |
| `pnpm check` (lint, typecheck, unit, build) | успех; unit 289 тестов (256 + 11 + 4 + 18) |
| `pnpm test:api` | 82 теста, 7 файлов — успех |
| gitleaks: новые файлы и вся история (31 коммит) | утечек нет |
| Шаблоны ключей и токенов в tracked и новых файлах | нет (одно совпадение — сам шаблон поиска в docs/GIT_WORKFLOW.md) |
| CRLF в скриптах и workflow | нет |
| `ssh-gateway.sh`: проверка архива на образах-заглушках | 4 образа релиза принимаются; лишний образ (`postgres`) или неполный набор отклоняются до `docker load` |
| `ssh-gateway.sh`: белый список | `bash`, `sh -c id`, `status; id`, `deploy SHA;id`, `--force`, путь вместо SHA, лишние аргументы, пустая команда — отказ |
| Сценарии `deploy.sh`/`rollback.sh`: настоящий Git и `ssh-gateway.sh`, заглушки `docker` и `curl`, одноразовый контейнер | 28 из 28 проверок прошли на `6d39bf4` (подробно ниже) |
| `.env` после всех сценариев | не изменён (хеш совпал) |

В сценариях проверено:

- выкладка вперёд и первая отметка работающей версии;
- повторная выкладка без действий;
- миграция без флага — код 3;
- миграция с флагом и провалом health check — код 2, без автоотката;
- откат на схему старее — нужен флаг;
- автооткат при провале без миграций;
- запрет выкладки назад;
- запрет правки старой миграции;
- изменение compose без флага — код 3;
- сбой копии базы — ничего не переключается;
- откат без SHA и повторный откат;
- отказ отката на релиз, который не работал;
- очистка старых релизов.

Найденная симуляцией ошибка исправлена: очистка удаляла загруженные, но ещё не выложенные релизы. В `6d39bf4` добавлены проверки: вывод `backup.sh` остаётся на сервере, первый `status` не выдаёт ложного предупреждения.

Сборка на runner, передача образов по SSH, скрипты на настоящем сервере и health check через Caddy с самого сервера проверены первой выкладкой (раздел 12). Не проверены на настоящем сервере: автоматический откат, ручной `rollback` и выкладка с миграциями. `pnpm test:e2e` локально не запускался, его выполняет CI.

## 8. Оставшиеся ручные шаги (владелец)

Выполнено 2026-11-04:

- PR #1 слит в `main`. CI и Security зелёные на `6d39bf4`. Dependency graph включён: задача dependency review в Security теперь работает.
- Создан ключ выкладки (`SHA256:UAn05ROpDj8HD8Ss0gLXNhpvYHRFVoJ8of16zC9v+aA`), четыре secrets записаны в environment `production`.
- Скрипты из `6d39bf4` установлены в `/opt/endemion-life-deploy/`, контрольные суммы совпали. Ограниченный ключ добавлен в `/root/.ssh/authorized_keys`, копия до изменения — `authorized_keys.bak-before-deploy-key`. Ограничение проверено: `status` работает; `id`, чтение `.env`, `bash`, `status; id`, проброс порта и сеанс без команды отклоняются.
- Первая выкладка выполнена (раздел 12).
- `DEPLOY_AUTO=true` — решение владельца; задаётся после слияния этого отчёта, чтобы коммит с документацией не создал запрос на выкладку.
- Удалены образы `:pre-stage02` и `:stage04` (освобождено 860 МБ).

Остаётся:

1. Включить защиту ветки `main` с обязательными проверками (docs/GIT_WORKFLOW.md).
2. Удалить закрытый ключ выкладки на машине разработки (`~/.ssh/endemion_life_deploy`), если он больше не нужен: в GitHub он уже записан.
3. Разобрать 2 уязвимости средней серьёзности, которые показал Dependabot после включения Dependency graph.
4. Не связано с этой задачей: остатки Stage 04 (`endemion_life_stage04_check`, `/opt/endemion-life.bundle.stage04`), SMTP, канал оповещений.

## 9. Первая выкладка

1. Actions → Deploy → Run workflow (`main`), operation `status`, затем Review deployments → Approve. Шаг проверяет SSH, ограничение ключа и правила environment и ничего не меняет.
2. Сравнить работающий коммит (`26af6f0`) с `main`. Сейчас разница — только документация и файлы этой задачи, миграций и изменений compose нет.
3. Run workflow, operation `deploy`, `sha` пусто, флаги выключены.
4. Скрипт отметит работающую версию тегом `:26af6f0…` (прежний релиз), сделает копию базы, выложит, проверит.
5. Проверить: `check-https.sh`, сайт в браузере, `status`.

## 10. Откат

- **Автоматический:** если новый релиз без миграций не прошёл health check, возвращается прежний релиз, код 1.
- **Ручной:** Run workflow → `rollback`. `sha` пусто — релиз до последней выкладки, либо указать SHA из `status`. Если после выбранного релиза добавлялись миграции, нужен флаг `allow_newer_schema`.
- **Без GitHub:** `sh /opt/endemion-life-deploy/rollback.sh [SHA]`.
- Откат не меняет базу. Если игроки уже сохранились в новом формате, нужно ещё восстановить копию базы (docs/ROLLBACK.md). Это решение владельца, workflow его не выполняет.
- Версия до Stage 03/04 откатывается образами `:pre-stage04` по docs/ROLLBACK.md. Образы `:pre-stage02` и `:stage04` удалены 2026-11-04: `:stage04` совпадал с релизом `26af6f0`, который хранится под своим SHA.

## 11. Риски и ограничения

- **Публичный репозиторий.** Журналы запусков видны всем: SHA, состояние контейнеров, свободное место, результат health check. Секреты и журналы контейнеров в них не попадают. Запуски от pull request из fork выкладку не вызывают: `gate` требует событие `push` в `main` этого репозитория.
- **Защита ветки `main` не включена.** В `main` можно отправить код без CI. Выкладку такого коммита остановит `gate`, потому что CI и Security на нём должны быть зелёными. Без required reviewers в environment `production` `gate` останавливает любую операцию.
- **Ключ на root.** Ограничен forced command, но `ssh-gateway.sh` выполняется от root. Ошибка в этом скрипте дала бы права root. Белый список проверен тестами. Более строгий вариант — отдельный пользователь в группе `docker`, но это тоже фактически root и требует изменений на сервере.
- **Простой при выкладке:** несколько секунд 502 при перезапуске API, как при ручной выкладке. Бесшовного переключения нет, API работает в одной копии.
- **Миграции применяются при каждом `up`** (архитектура compose). Защита — флаг и копия базы перед выкладкой. При провале релиза с миграциями автоматического отката нет.
- **backup и monitor** выкладка не обновляет: их образы собираются отдельно, вручную.
- **Скрипты на сервере обновляются вручную.** `status` предупреждает о расхождении.
- **Место на диске:** первая выкладка заняла около 0,9 ГБ (общие слои с прежним релизом не дублируются). После неё и удаления старых образов свободно 10 984 МБ. Загрузка образов требует `MIN_FREE_MB + 2 × MAX_UPLOAD_MB` = 7048 МБ свободного места.
- **Автоматическая выкладка включена.** Каждый push в `main` с зелёным CI создаёт запрос на выкладку, в том числе коммиты только с документацией. Одобренная выкладка пересобирает образы, делает копию базы и перезапускает api, web и nginx (несколько секунд 502). Ненужный запрос можно отклонить в Review deployments.
- **Health check идёт через Caddy с самого сервера.** Если Caddy недоступен, выкладка считается неудачной и откатывается, хотя приложение может быть исправно.
- **Ключ сервера в `DEPLOY_KNOWN_HOSTS`.** При переустановке сервера выкладка остановится, пока secret не обновят.

## 12. Первая выкладка: журнал

2026-11-04, по решению владельца. Оба запуска одобрил `Yuta2Endo` в environment `production`.

| Запуск | Что |
| --- | --- |
| [41887020961](https://github.com/Yuta2Endo/Endemion-Life/actions/runs/41887020961) `status` | SSH, ключ сервера и ограничение ключа работают. Сервер: `26af6f0`, все сервисы `healthy`, свободно 10 990 МБ |
| [41887939537](https://github.com/Yuta2Endo/Endemion-Life/actions/runs/41887939537) `deploy` `6d39bf4`, без флагов | Успех за 18:34:23–18:34:55 UTC |

Ход выкладки:

1. Работающая версия `26af6f0` отмечена как релиз (образы `:latest` → `:26af6f0…`).
2. Новых миграций нет; migrate: «No pending migrations to apply», 6 из 6.
3. Копия базы `endemion_life-manual-20261104T183425Z.dump` (180 КБ). Вывод `backup.sh` — на сервере в `/opt/endemion-life-releases/logs/` (права 600), в журнал Actions попало только имя файла.
4. Перезапущены migrate, api, web, nginx; postgres, redis, backup, monitor не перезапускались.
5. api, web, nginx `healthy`; health check через Caddy с сервера прошёл с первой попытки (`/api/health`, `/`, `/worlds`, `/api/universes` — 200).

Проверки после выкладки:

| Проверка | Результат |
| --- | --- |
| `check-https.sh` с машины разработки | все проверки OK (HTTPS, HSTS, заголовки, флаги cookie, отказ чужому Origin, TLS) |
| Ошибки API после выкладки | 0; одно предупреждение — `POST /api/session` 403 от проверки чужого Origin |
| Ответы 5xx Nginx после выкладки | 0 |
| `.env` и рабочее дерево Git на сервере | не изменены |
| Секреты, ключи, число игроков в журналах Actions | нет |
| Свободно на диске | 10 125 МБ после выкладки, 10 984 МБ после удаления `:pre-stage02` и `:stage04` |

Релизы для отката на сервере: `6d39bf4` (текущий), `26af6f0` (прежний), а также `:pre-stage04`.
