# Откат

```bash
cd /opt/endemion-life
DC="docker compose -f infrastructure/docker-compose.prod.yml --env-file .env"   # + -f …behind-proxy.yml, если используется
```

## Сначала — понять, что сломалось

```bash
$DC ps
$DC logs --since 15m api migrate | grep -E '"level":"(error|warn)"|Error'
```

| Симптом | Действие |
| --- | --- |
| `migrate` завершился с ошибкой, API не стартовал | Код откатить (ниже). База не изменилась или изменилась частично — см. «Миграции» |
| API работает, но с ошибками в новом коде | Откат кода |
| Испорчены данные | Восстановление базы из копии (docs/DATABASE_BACKUPS.md) |
| Сломан только Nginx / сертификат | `$DC logs nginx`, `$DC exec nginx nginx -t`; откат кода затрагивает и конфигурацию Nginx |

## Откат кода (без изменений схемы базы)

```bash
git log --oneline -5                     # найти прежнюю версию (её записывали перед обновлением)
git checkout <прежний коммит>
$DC build api web nginx
$DC up -d
$DC ps
curl -fsS https://life.endemion.online/api/health
```

Вернуться на актуальную ветку после исправления: `git checkout main && git pull --ff-only`.

## Миграции

Prisma не откатывает миграции автоматически. Правило для новых миграций: **сначала расширять, потом сужать** — новый столбец добавляется так, чтобы прежний код продолжал работать; удаление столбцов и таблиц — отдельным обновлением, когда новый код уже в работе. Тогда откат кода не требует отката базы.

Если обновление содержало несовместимую миграцию или миграция упала посередине:

1. Остановить приложение: `$DC stop api web monitor`.
2. Посмотреть состояние: `$DC run --rm migrate node_modules/.bin/prisma migrate status`.
3. Восстановить базу из копии, сделанной перед обновлением (решение владельца: изменения после копии теряются):
   ```bash
   $DC exec backup restore.sh /backups/manual/<копия перед обновлением>.dump
   ```
4. Откатить код (раздел выше) и запустить: `$DC up -d`.

Упавшую миграцию на копии базы можно разобрать отдельно: `restore.sh … --target endemion_life_debug`.

## Откат восстановления базы

Restore не удаляет прежнюю базу: она остаётся как `<база>_before_<время>`. Возврат — переименованием, docs/DATABASE_BACKUPS.md, раздел «Откат восстановления». Кроме того, есть копия в `pre-restore/`.

## Откат HTTPS / HSTS

- Новый сертификат не работает: `HSTS_MAX_AGE` не трогать; `$DC exec nginx /opt/endemion/nginx-entrypoint.sh reload` после исправления файлов в томе `letsencrypt`.
- HSTS включён, а HTTPS сломан: выключить HSTS нельзя для браузеров, которые его уже запомнили (до `max-age`). Поэтому HSTS включается только после `check-https.sh` и проверки в браузере, а чинить нужно HTTPS.
- Режим behind-proxy: откат блока `life.endemion.online` в Caddyfile — по сохранённой копии файла, затем `caddy reload`.

## После отката

- `sh infrastructure/scripts/check-https.sh https://life.endemion.online`
- `$DC exec backup backup.sh` — свежая копия текущего состояния.
- Запись в журнале изменений: что откатили и почему.
