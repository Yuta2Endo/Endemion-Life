#!/bin/sh
# Резервная копия рабочей базы PostgreSQL.
#   backup.sh            — ручная копия (каталог manual/, автоматически не удаляется)
#   backup.sh scheduled  — плановая копия (каталог daily/, срок хранения BACKUP_RETENTION_DAYS)
# После создания копия проверяется (verify-backup.sh; при BACKUP_VERIFY_FULL=true — пробным восстановлением),
# затем, если задан BACKUP_S3_REMOTE, отправляется во внешнее хранилище. Ошибка любого шага — код 1 и оповещение
set -eu
SCRIPT_DIR=$(cd "$(dirname "$(readlink -f "$0")")" && pwd)
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

KIND="${1:-manual}"
case "$KIND" in
  scheduled) DIR="$DAILY_DIR"; LABEL=daily ;;
  manual) DIR="$MANUAL_DIR"; LABEL=manual ;;
  -h|--help) sed -n '2,7p' "$0"; exit 0 ;;
  *) die "Неизвестный вид копии: $KIND (manual | scheduled)" ;;
esac

with_lock
STARTED=$(date +%s)
log info "Резервное копирование ($LABEL) базы $PGDATABASE на $PGHOST:$PGPORT"

pg_isready -q -t 30 || die "PostgreSQL недоступен ($PGHOST:$PGPORT)"
FILE=$(dump_database "$PGDATABASE" "$DIR" "$LABEL") || die "pg_dump завершился с ошибкой (подробности в $LOG_FILE)"
log info "Копия создана: $(basename "$FILE") ($(human_size "$FILE"))"

if [ "$BACKUP_VERIFY_FULL" = true ]; then
  "$SCRIPT_DIR/verify-backup.sh" "$FILE" --full || die "Созданная копия не прошла проверку: $(basename "$FILE")"
else
  "$SCRIPT_DIR/verify-backup.sh" "$FILE" || die "Созданная копия не прошла проверку: $(basename "$FILE")"
fi

# Внешнее хранилище (S3-совместимое). Настройка — переменные RCLONE_CONFIG_*: docs/DATABASE_BACKUPS.md
if [ -n "${BACKUP_S3_REMOTE:-}" ]; then
  if rclone copy --immutable --checksum "$FILE" "$BACKUP_S3_REMOTE/$LABEL/" && rclone copy --immutable --checksum "$FILE.sha256" "$BACKUP_S3_REMOTE/$LABEL/"; then
    log info "Копия отправлена во внешнее хранилище: $BACKUP_S3_REMOTE/$LABEL/"
  else
    die "Не удалось отправить копию во внешнее хранилище $BACKUP_S3_REMOTE"
  fi
fi

# Срок хранения — только для плановых копий. Самые новые BACKUP_KEEP_MIN копий не удаляются никогда,
# даже если плановое копирование долго не работало
if [ "$LABEL" = daily ]; then
  REMOVED=0
  find "$DAILY_DIR" -maxdepth 1 -name "${BACKUP_PREFIX}-daily-*.dump" | sort | head -n "-$BACKUP_KEEP_MIN" > /tmp/backup-candidates 2>/dev/null || true
  while IFS= read -r old; do
    [ -n "$old" ] || continue
    if [ -n "$(find "$old" -mtime "+$BACKUP_RETENTION_DAYS")" ]; then
      rm -f "$old" "$old.sha256"
      REMOVED=$((REMOVED + 1))
    fi
  done < /tmp/backup-candidates
  rm -f /tmp/backup-candidates
  [ "$REMOVED" -gt 0 ] && log info "Удалено устаревших плановых копий: $REMOVED (срок хранения $BACKUP_RETENTION_DAYS дн.)"
fi

# Отметка об успехе: по ней healthcheck контейнера и монитор следят, что копии создаются
date -u +%Y-%m-%dT%H:%M:%SZ > "$STATUS_FILE.tmp" && mv "$STATUS_FILE.tmp" "$STATUS_FILE"
log info "Резервное копирование завершено за $(( $(date +%s) - STARTED )) с: $FILE"

if [ -n "${HEALTHCHECKS_BACKUP_PING_URL:-}" ]; then
  curl -fsS -m 10 -o /dev/null "$HEALTHCHECKS_BACKUP_PING_URL" || log warn "Не удалось отправить отметку во внешний монитор"
fi
printf '%s\n' "$FILE"
