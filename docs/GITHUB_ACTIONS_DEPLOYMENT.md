# Выкладка через GitHub Actions

Рабочий сервер: life.endemion.online, `root@185.175.156.196`, стек в `/opt/endemion-life` (режим behind-proxy за Caddy сайта endemion.online). Ручной порядок и общая схема — docs/DEPLOYMENT.md, откат вручную — docs/ROLLBACK.md.

## Схема

```
push в main ──► CI (ci.yml) ──────────┐   lint, typecheck, unit, API-тесты и миграции на чистой базе,
           └──► Security (security.yml)│   Playwright, сборка всех образов, compose config; audit, gitleaks
                                       ▼
          Deploy (deploy.yml), если CI зелёный и DEPLOY_AUTO = true      ◄── или вручную: Actions → Deploy
            gate:        коммит входит в main, CI и Security на нём зелёные
            production:  сборка образов migrate, api, web, nginx на runner GitHub (метка revision = SHA)
                         ssh upload-images <SHA>  ── docker save | gzip ──►  docker load на сервере
                         ssh upload-bundle <SHA>  ── git bundle ─────────►  /opt/endemion-life-releases/<SHA>/
                         ssh deploy <SHA>
                                                     │  /opt/endemion-life-deploy/deploy.sh на сервере:
                                                     ▼
            1. проверки: образы из этого коммита, main только вперёд, чистое дерево Git, место на диске
            2. миграции: изменены старые — отказ; новые — только с allow_migrations
            3. изменён compose / backup / monitor — только с allow_infra
            4. резервная копия базы (backup.sh); не создалась — выкладка останавливается
            5. git checkout -B main <SHA>; образы :<SHA> → :latest; compose up -d --no-build migrate api web nginx
            6. healthcheck контейнеров + health-check.sh (/api/health, /, /worlds, /api/universes)
            7. ошибка → автоматический откат на прежний релиз (кроме релиза с миграциями — тогда человек)
```

Почему образы собираются в GitHub, а не на сервере: на сервере 2 ГБ памяти и рядом работает основной сайт. Так же выкладывали вручную до сих пор (`docker save | ssh … docker load`); workflow делает то же самое.

**Релиз** — четыре образа `endemion-life-prod-{migrate,api,web,nginx}:<SHA>` и коммит `<SHA>` в `/opt/endemion-life`. Compose запускает образы `:latest`. Переключение релиза — перетегирование `:<SHA>` → `:latest` и `up --no-build`. Отдельных каталогов кода на релиз нет: `.env`, compose-проект `endemion-life-prod` и тома привязаны к `/opt/endemion-life`. Переносить их ради каталогов релизов — изменение рабочей среды без необходимости. Код откатывается `git checkout` прежнего коммита.

Не затрагиваются: `.env` (не отслеживается Git, checkout его не трогает), тома `postgres-data`, `redis-data`, `letsencrypt`, каталог копий `/var/backups/endemion-life`, контейнеры postgres, redis, backup, monitor, Caddy и основной сайт. Выкладка не выполняет `down`, `prune`, удаление томов и операции с базой, кроме `prisma migrate deploy` (только с разрешением).

### Файлы

| Файл | Назначение |
| --- | --- |
| `.github/workflows/deploy.yml` | Workflow выкладки, отката и просмотра состояния |
| `infrastructure/deploy/ssh-gateway.sh` | Единственная команда ключа выкладки (forced command): разрешает только операции ниже |
| `infrastructure/deploy/deploy.sh` | Выкладка релиза с проверкой и автоматическим откатом |
| `infrastructure/deploy/rollback.sh` | Откат на релиз, который уже работал |
| `infrastructure/deploy/health-check.sh` | Проверка сайта снаружи |
| `infrastructure/deploy/status.sh` | Состояние: коммит, контейнеры, релизы, журнал выкладок |
| `infrastructure/deploy/lib.sh` | Общие функции |

На сервере:

| Путь | Что там |
| --- | --- |
| `/opt/endemion-life-deploy/` | Установленные скрипты выкладки (root, 700). **Не** из рабочей копии: выкладка меняет код в `/opt/endemion-life`, а скрипты, которые её выполняют, меняются только вручную |
| `/opt/endemion-life-releases/<SHA>/` | `code.bundle` релиза |
| `/opt/endemion-life-releases/current`, `previous` | Текущий релиз и релиз для отката по умолчанию |
| `/opt/endemion-life-releases/history.log` | Журнал выкладок и откатов |
| `/opt/endemion-life-releases/logs/` | Вывод `backup.sh` при каждой выкладке и журналы контейнеров при неудачной (на сервере, не в GitHub: в них могут быть данные игроков; в журнал Actions попадает только имя файла копии) |

Хранятся текущий и прежний релизы и последние `RELEASE_KEEP` (2) успешных; остальные теги `:<SHA>` удаляются после успешной выкладки. Теги `:latest`, `:pre-stage*`, `:stage*` очистка не трогает.

## GitHub Secrets и Variables

Secrets — в environment `production` (Settings → Environments → production → Environment secrets): тогда их получает только задача выкладки и только после одобрения. `DEPLOY_AUTO` — переменная репозитория (Settings → Secrets and variables → Actions → Variables): её читает задача `gate`, которая работает вне environment.

| Secret | Значение |
| --- | --- |
| `DEPLOY_HOST` | `185.175.156.196` |
| `DEPLOY_USER` | `root` (ключ ограничен forced command, см. ниже) |
| `DEPLOY_SSH_KEY` | Закрытый ключ ed25519 **без пароля**, созданный только для GitHub Actions (целиком, с `-----BEGIN` и `-----END`) |
| `DEPLOY_KNOWN_HOSTS` | Строка(и) ключа сервера в формате `known_hosts` |

| Variable | Где | Значение |
| --- | --- | --- |
| `DEPLOY_AUTO` | репозиторий | `true` — выкладывать после зелёного CI на `main`. Не задана или другое значение — только вручную |
| `DEPLOY_PORT` | environment `production` | Порт SSH, если не 22 (необязательно) |

### Environment `production`

Репозиторий публичный: на тарифе Free environments с правилами защиты доступны. Задача `production` в `deploy.yml` работает в environment `production`. Он создан 2026-11-04 (Settings → Environments → `production`) с настройками:

- **Required reviewers** — владелец (`Yuta2Endo`). Каждая операция (deploy, rollback, status) ждёт одобрения: Actions → запуск → Review deployments → Approve. «Prevent self-review» не включать, пока владелец единственный, кто одобряет.
- **Deployment branches and tags** — Selected branches → добавить правило `main`. Пустой список запрещает выкладку с любой ветки.

Задача `gate` проверяет, что в environment `production` есть required reviewers. Без них любая операция (deploy, rollback, status) останавливается до подключения к серверу, даже если задано `DEPLOY_AUTO=true`.
- **Environment secrets** — четыре `DEPLOY_*` из таблицы выше; secrets уровня репозитория для выкладки не создавать.

Дополнительные барьеры в самом workflow (работают и без правил environment): автоматическая выкладка выключена, пока не задано `DEPLOY_AUTO=true`; ручной запуск — только с `main`; задача `gate` проверяет, что коммит входит в `main` и что CI и Security на нём зелёные; запуски CI от pull request, в том числе из fork, выкладку не вызывают (`gate` требует событие `push` в `main` этого репозитория); новые миграции и изменения инфраструктуры требуют явных флагов.

### Защита ветки `main`

Для публичного репозитория доступна (сейчас не включена). Settings → Branches (или Rules → Rulesets) для `main`: обязательный pull request, обязательные проверки из docs/GIT_WORKFLOW.md, запрет force push и удаления. Тогда в `main`, а значит и на сервер, попадает только код, прошедший CI.

### Публичные журналы

Журналы запусков публичного репозитория видны всем. Секреты в них не выводятся (GitHub дополнительно маскирует значения secrets). Видны: SHA, состояние контейнеров и свободное место из `status`, результат health check. Журналы контейнеров при неудачной выкладке остаются на сервере. Адрес сервера и пути уже есть в docs/DEPLOYMENT.md.

Кто может запускать выкладку: любой с правом записи в репозиторий (сейчас — только владелец); выполнить её можно только после одобрения в environment.

## Подготовка SSH-доступа (владелец, один раз)

### 1. Ключ только для GitHub Actions

На своём компьютере (не на сервере и не в репозитории):

```bash
ssh-keygen -t ed25519 -N '' -C github-actions-endemion-life -f ./endemion-life-deploy
# endemion-life-deploy     — закрытый: в secret DEPLOY_SSH_KEY, затем удалить файл
# endemion-life-deploy.pub — открытый: на сервер, шаг 3
```

### 2. Скрипты выкладки на сервере

Скрипты ставятся из проверенного коммита `main` в отдельный каталог (root, 700):

```bash
# на рабочем компьютере, из корня репозитория на коммите main с infrastructure/deploy/
scp infrastructure/deploy/*.sh root@185.175.156.196:/tmp/
# на сервере
install -d -m 700 /opt/endemion-life-deploy
install -m 700 /tmp/lib.sh /tmp/deploy.sh /tmp/rollback.sh /tmp/health-check.sh /tmp/status.sh /tmp/ssh-gateway.sh /opt/endemion-life-deploy/
rm /tmp/lib.sh /tmp/deploy.sh /tmp/rollback.sh /tmp/health-check.sh /tmp/status.sh /tmp/ssh-gateway.sh
command -v flock git curl docker   # все четыре должны найтись
sh /opt/endemion-life-deploy/status.sh   # только читает
```

Настройки по умолчанию (`APP_DIR=/opt/endemion-life`, `RELEASES_DIR=/opt/endemion-life-releases`, `HEALTH_TIMEOUT=300`, `MIN_FREE_MB=5000`, `MAX_UPLOAD_MB=1024` — загрузка образов требует `MIN_FREE_MB + 2 × MAX_UPLOAD_MB` свободного места, `RELEASE_KEEP=2`) переопределяются файлом `/opt/endemion-life-deploy/deploy.conf` (строки `ИМЯ=значение`), если нужно.

Когда в `main` меняются `infrastructure/deploy/*.sh`, выкладка предупреждает об этом, а `status` показывает «отличается от версии в коде». Установленные скрипты обновляются тем же `install` — вручную, после просмотра изменений.

### 3. Открытый ключ с ограничением

В `/root/.ssh/authorized_keys` — отдельной строкой (существующие строки не трогать):

```
restrict,command="/opt/endemion-life-deploy/ssh-gateway.sh" ssh-ed25519 AAAA… github-actions-endemion-life
```

`restrict` запрещает терминал, проброс портов и агента; `command=` заменяет любую команду клиента на `ssh-gateway.sh`. Им разрешены только `upload-images <SHA>`, `upload-bundle <SHA>`, `deploy <SHA> [--allow-migrations] [--allow-infra]`, `rollback [<SHA>] [--allow-newer-schema]`, `status`, `health`. Архив образов принимается, только если в нём ровно четыре образа релиза с этим SHA: подменить `postgres:18-alpine` или образ основного сайта через загрузку нельзя.

Проверка с рабочего компьютера:

```bash
ssh -i ./endemion-life-deploy root@185.175.156.196 status   # состояние сервера
ssh -i ./endemion-life-deploy root@185.175.156.196 id       # «команда не разрешена для ключа выкладки»
```

### 4. `DEPLOY_KNOWN_HOSTS`

Проверка ключа сервера обязательна (`StrictHostKeyChecking yes`). Значение:

```bash
ssh-keyscan -t ed25519 185.175.156.196 2>/dev/null
```

Отпечаток сверить с сервером через уже доверенное соединение: `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` (на сервере) и `ssh-keyscan -t ed25519 185.175.156.196 | ssh-keygen -lf -` (локально) — должны совпасть. Если ключ сервера сменится (переустановка), выкладка остановится с «Host key verification failed», и secret нужно обновить.

## Первый запуск (вручную)

После слияния ветки с этими файлами в `main` (до этого GitHub не покажет workflow Deploy), установки скриптов и secrets:

1. **Actions → Deploy → Run workflow**, ветка `main`, operation `status`. Проверяет SSH, known_hosts и ограничение ключа, ничего не меняет.
2. Посмотреть, что изменилось между работающим коммитом (в выводе `status`) и `main`: `git diff --stat <работающий>..origin/main`, отдельно `packages/database/prisma/migrations` и `infrastructure/`.
3. **Run workflow**, operation `deploy`, `sha` пусто (последний `main`), флаги — только если шаг 2 показал миграции или изменения инфраструктуры и они проверены.
4. При первой выкладке скрипт отмечает работающую версию (образы `:latest`) тегом `:<её SHA>` — это прежний релиз для отката.
5. После выкладки: `sh infrastructure/scripts/check-https.sh https://life.endemion.online`, сайт в браузере, журнал API без ошибок (docs/PRODUCTION_CHECKLIST.md, «Приложение»).

## Последующие выкладки

- **Вручную** (по умолчанию): Run workflow → `deploy`.
- **Автоматически**: владелец задаёт variable `DEPLOY_AUTO=true`. Тогда каждый push в `main`, на котором CI зелёный, выкладывается. Если в коммите есть новые миграции или изменения compose / backup / monitor, выкладка останавливается до перезапуска вручную с нужным флагом (код 3, рабочая версия не меняется).
- Выкладывается только коммит, продолжающий работающий: «перескочить назад» через `deploy` нельзя, для этого — `rollback`.
- Параллельные запуски встают в очередь (`concurrency: production-deploy`), на сервере второй запуск отклоняется блокировкой.

Что делать с флагами:

| Флаг | Когда | Что проверить перед запуском |
| --- | --- | --- |
| `allow_migrations` | В релизе новые каталоги в `packages/database/prisma/migrations` | SQL миграции: только «расширение» (новые столбцы и таблицы, без удаления и переименования), блокировки на больших таблицах; см. docs/ROLLBACK.md, «Миграции». Копия базы создаётся автоматически перед выкладкой |
| `allow_infra` | Изменены `docker-compose.prod.yml`, `docker-compose.behind-proxy.yml`, `infrastructure/backup/`, `infrastructure/monitor/` | Не пересоздадутся ли postgres и redis; новые переменные в `.env`. Образы backup и monitor выкладка не собирает — их обновление вручную (docs/DEPLOYMENT.md) |

## Журналы

- **GitHub:** Actions → Deploy → запуск → задача `Production (…)`. Шаги `Server status before/after` — состояние сервера; `Deploy` — ход выкладки. Секреты в журнал не выводятся: ключ записывается в файл с правами 600, команды с ним не печатаются, содержимое `.env` скрипты не читают (кроме `DOMAIN` и `NGINX_MODE`).
- **Сервер:**
  ```bash
  cat /opt/endemion-life-releases/history.log
  ls /opt/endemion-life-releases/logs/          # журналы контейнеров при неудачных выкладках
  sh /opt/endemion-life-deploy/status.sh
  ```

## Health check

После каждой выкладки и отката:

1. healthcheck контейнеров api, web, nginx (из Dockerfile) — `healthy` на образах нового релиза, migrate — `exited 0`;
2. `health-check.sh https://life.endemion.online` с сервера через Caddy: `/api/health` — 200 и `"database":"up"`, `/`, `/worlds`, `/api/universes` — 200. До 12 попыток через 5 секунд.

Вручную: Run workflow → `status`, или на сервере `sh /opt/endemion-life-deploy/health-check.sh https://life.endemion.online`. Полная проверка HTTPS и заголовков — `infrastructure/scripts/check-https.sh`.

Перезапуск API при выкладке — несколько секунд ответов 502 (одна копия API, docs/DEPLOYMENT.md).

## Откат

| Ситуация | Что происходит |
| --- | --- |
| Новый релиз не прошёл проверку, миграций в нём нет | Автоматический откат на прежний релиз (без migrate). Код 1, в журнале «работает прежний релиз» |
| Новый релиз не прошёл проверку, в нём были миграции | Автоматического отката нет (код 2): migrate мог изменить базу. Решение владельца по docs/ROLLBACK.md |
| Релиз работает, но с ошибками | Ручной откат |

Ручной откат: Run workflow → operation `rollback`, `sha` пусто — релиз, работавший до последней выкладки, или полный SHA релиза из `status` («Релизы на сервере»). Откат возможен только на релиз, который уже работал на сервере и чьи образы ещё хранятся.

- Откат кода не запускает миграции и не меняет базу.
- Если после выбранного релиза добавлялись миграции, откат требует `allow_newer_schema`: прежний код будет работать с новой схемой. При миграциях «сначала расширять» это допустимо.
- Прежний код не откроет сохранения формата новее своего: если игроки уже играли на новом формате, нужен откат кода **и** восстановление копии базы (docs/ROLLBACK.md, разделы Stage 03/04). Копия перед каждой выкладкой — в `/var/backups/endemion-life/manual/`, имя файла — в журнале шага `Deploy`.
- Восстановление базы (`restore.sh`) workflow не выполняет — только вручную, решение владельца.

Без GitHub (ключ владельца): `sh /opt/endemion-life-deploy/rollback.sh [<SHA>] [--allow-newer-schema]`.

Откат до выкладок через GitHub Actions (Stage 03 и раньше) — образы `:pre-stage04`, `:pre-stage02`, docs/ROLLBACK.md.

## Действия, которые требуют решения владельца

- Слияние в `main` и push (запускают CI; при `DEPLOY_AUTO=true` — и выкладку).
- Установка и обновление скриптов в `/opt/endemion-life-deploy/`, строка в `authorized_keys`.
- Создание, замена и отзыв ключа выкладки и secrets.
- Включение автоматической выкладки (`DEPLOY_AUTO=true`).
- Каждый первый запуск `deploy` после перерыва и любой запуск с `allow_migrations`, `allow_infra`, `allow_newer_schema`.
- Восстановление базы из копии, удаление проверочных баз и старых образов (`:pre-stage*`).
- Изменения `.env`, Caddyfile, compose-файлов, PostgreSQL и Redis.

Отозвать доступ GitHub Actions: удалить строку `github-actions-endemion-life` из `/root/.ssh/authorized_keys` и secret `DEPLOY_SSH_KEY`.
