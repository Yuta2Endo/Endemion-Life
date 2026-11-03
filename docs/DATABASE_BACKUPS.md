# Резервные копии PostgreSQL

Копии делает отдельный контейнер `backup` (образ `postgres:18-alpine` + rclone, cron). Копии лежат на диске сервера в `BACKUP_HOST_DIR`, а не в контейнере базы: удаление контейнера или тома `postgres-data` их не затрагивает.

Ниже `DC` — команда Compose из корня проекта:

```bash
DC="docker compose -f infrastructure/docker-compose.prod.yml --env-file .env"
```

## Каталог копий

```
BACKUP_HOST_DIR/            (по умолчанию в образце: /var/backups/endemion-life)
  daily/        плановые копии; удаляются по сроку хранения
  manual/       ручные копии; автоматически не удаляются
  pre-restore/  копии базы, сделанные перед восстановлением; автоматически не удаляются
  logs/backup.log
  last-success  время последней успешной копии
```

Файл копии: `endemion_life-<вид>-<UTC время>.dump` (формат `pg_dump --format=custom`, сжатие 6) и рядом `.dump.sha256`. Права `0440`: случайная перезапись невозможна, `rm` без `-f` спросит подтверждение. Копия сначала пишется в `.partial` и переименовывается только после успешного `pg_dump`: неполных копий в каталоге не бывает. Две операции одновременно не идут (блокировка `flock`).

Закройте каталог от остальных пользователей сервера: `chmod 700 /var/backups/endemion-life`.

## Настройки (`.env`)

| Переменная | По умолчанию | Значение |
| --- | --- | --- |
| `BACKUP_HOST_DIR` | `../backups` | Каталог на сервере |
| `BACKUP_SCHEDULE` | `30 3 * * *` | Расписание cron: минута час день месяц день_недели |
| `BACKUP_TZ` | `UTC` | Часовой пояс расписания, например `Europe/Moscow` |
| `BACKUP_RETENTION_DAYS` | `14` | Срок хранения плановых копий, дней |
| `BACKUP_KEEP_MIN` | `7` | Сколько самых новых плановых копий не удаляются никогда, даже старше срока |
| `BACKUP_VERIFY_FULL` | `true` | Проверять каждую копию пробным восстановлением во временную базу |
| `BACKUP_S3_REMOTE` | пусто | Внешнее хранилище, например `backup:endemion-life-backups` |
| `RCLONE_CONFIG_BACKUP_*` | | Доступ к S3-совместимому хранилищу (тип, провайдер, endpoint, ключи) |
| `ALERT_WEBHOOK_URL` | пусто | Оповещение об ошибке копирования (`docs/MONITORING.md`) |
| `HEALTHCHECKS_BACKUP_PING_URL` | пусто | Отметка во внешнем мониторе после каждой успешной копии |

После изменения: `$DC up -d backup`.

## Ручная копия

```bash
$DC exec backup backup.sh
```

Копия попадает в `manual/`, проверяется пробным восстановлением, путь печатается последней строкой. Делайте её перед каждым обновлением (`docs/DEPLOYMENT.md`).

## Проверка копии

```bash
$DC exec backup verify-backup.sh /backups/daily/<файл>.dump          # контрольная сумма и оглавление
$DC exec backup verify-backup.sh /backups/daily/<файл>.dump --full   # плюс восстановление во временную базу
$DC exec backup verify-backup.sh --latest --full                     # последняя плановая копия
```

Полная проверка восстанавливает копию во временную базу, проверяет наличие применённых миграций Prisma и таблиц игры, печатает количество строк и удаляет временную базу.

## Восстановление

`restore.sh ФАЙЛ [--target БАЗА] [--yes]`. Порядок действий скрипта:

1. Проверяет копию (сумма, оглавление). Повреждённая копия — отказ, база не тронута.
2. Просит подтверждение. Для рабочей базы нужно ввести её имя; с `--yes` — ещё и `RESTORE_CONFIRM=<имя базы>`.
3. Делает копию текущей целевой базы в `pre-restore/` и проверяет её.
4. Восстанавливает файл в **новую** временную базу и проверяет её. При ошибке временная база удаляется, целевая не меняется.
5. Переименовывает: целевая база → `<база>_before_<время>`, восстановленная → `<база>`. Прежняя база не удаляется.
6. Проверяет результат на месте и пишет в журнал.

### Пробное восстановление в отдельную базу (безопасно)

```bash
$DC exec backup restore.sh /backups/daily/<файл>.dump --target endemion_life_check
$DC exec postgres psql -U endemion -d endemion_life_check -c "SELECT count(*) FROM lives"
$DC exec postgres psql -U endemion -d postgres -c 'DROP DATABASE endemion_life_check'
```

### Восстановление рабочей базы

Только с явного решения владельца: все изменения после времени копии будут потеряны.

```bash
$DC stop api web monitor                  # никто не пишет в базу
$DC exec backup restore.sh /backups/daily/<файл>.dump
# ввести имя базы: endemion_life
$DC start api web monitor
curl -fsS https://life.endemion.online/api/health
```

Сессии игроков (cookie) продолжают работать, если сессия существовала на момент копии.

### Откат восстановления

Прежняя база сохранена как `<база>_before_<время>` (имя — в журнале restore). Вернуть её:

```bash
$DC stop api web monitor
$DC exec postgres psql -U endemion -d postgres -v ON_ERROR_STOP=1 \
  -c 'ALTER DATABASE endemion_life RENAME TO endemion_life_restored_bad' \
  -c 'ALTER DATABASE endemion_life_before_<время> RENAME TO endemion_life'
$DC start api web monitor
```

Когда результат проверен, лишние базы удаляются вручную (`DROP DATABASE …`). Копия из `pre-restore/` остаётся как ещё один путь назад.

## Внешнее хранилище (S3-совместимое)

Копия на том же диске не защищает от потери сервера. Для хранения вне сервера (Yandex Object Storage, Selectel, Cloudflare R2, AWS S3 и др.):

```
BACKUP_S3_REMOTE=backup:endemion-life-backups
RCLONE_CONFIG_BACKUP_TYPE=s3
RCLONE_CONFIG_BACKUP_PROVIDER=Other            # или AWS, Cloudflare, Selectel …
RCLONE_CONFIG_BACKUP_ENDPOINT=https://storage.yandexcloud.net
RCLONE_CONFIG_BACKUP_REGION=ru-central1
RCLONE_CONFIG_BACKUP_ACCESS_KEY_ID=…
RCLONE_CONFIG_BACKUP_SECRET_ACCESS_KEY=…
```

Каждая копия после проверки отправляется в `<remote>/daily/` или `<remote>/manual/` (`rclone copy --immutable --checksum`). Ошибка отправки — ошибка копирования и оповещение. Ключу доступа достаточно прав на запись в один бакет; срок хранения в бакете настраивается правилом жизненного цикла бакета. Отправка в S3 **не проверялась**: нужны ключи хранилища.

## Наблюдение

- Журнал: `$DC logs backup` и `BACKUP_HOST_DIR/logs/backup.log` (JSON-строки).
- Healthcheck контейнера: `crond` работает и последняя успешная копия не старше `BACKUP_MAX_AGE_HOURS` (26 ч).
- Ошибка любого шага → код 1, запись в журнал, оповещение в `ALERT_WEBHOOK_URL`.

## Что проверено (локально, стек `docker-compose.prod.yml`)

- ручная копия с полной проверкой: восстановлены и подсчитаны миграции, игроки, жизни, снимки, история, действия;
- повреждённая копия (изменён байт) отклоняется и `verify-backup.sh`, и `restore.sh`;
- восстановление в новую базу; восстановление поверх существующей: копия в `pre-restore/`, прежняя база сохранена как `_before_<время>` с исходными данными, откат переименованием работает;
- рабочая база без подтверждения не восстанавливается (неверное имя; `--yes` без `RESTORE_CONFIRM`);
- учение на рабочей базе тестового стека с остановленным API: жизнь, созданная после копии, исчезла, старая cookie работает, health OK;
- плановая копия по cron (`*/30 * * * *`) и срок хранения: удалены 4 устаревшие копии, оставлены 7 новых (`BACKUP_KEEP_MIN`), ручные не тронуты;
- healthcheck контейнера, журнал в файле.
