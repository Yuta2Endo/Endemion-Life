#!/bin/sh
# Контейнер резервного копирования: cron запускает backup.sh scheduled по расписанию BACKUP_SCHEDULE.
# Ручной запуск: docker compose exec backup backup.sh
set -eu

SCHEDULE="${BACKUP_SCHEDULE:-30 3 * * *}"
case "$SCHEDULE" in
  *[!0-9\ \*/,-]*) echo "Некорректное BACKUP_SCHEDULE: $SCHEDULE (пример: 30 3 * * *)" >&2; exit 1 ;;
esac

# cron не передаёт окружение контейнера заданиям: нужные переменные сохраняются в файл, доступный только root
export -p | grep -E '^export (PG|POSTGRES_|BACKUP_|RCLONE_|ALERT_|HEALTHCHECKS_|TZ=)' > /opt/backup/runtime.env
chmod 0600 /opt/backup/runtime.env

mkdir -p "${BACKUP_DIR:-/backups}/daily" "${BACKUP_DIR:-/backups}/manual" "${BACKUP_DIR:-/backups}/pre-restore" "${BACKUP_DIR:-/backups}/logs"
printf '%s /opt/backup/backup.sh scheduled > /proc/1/fd/1 2>&1\n' "$SCHEDULE" > /etc/crontabs/root

echo "{\"time\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"level\":\"info\",\"context\":\"backup\",\"msg\":\"Расписание резервного копирования: $SCHEDULE (TZ=${TZ:-UTC})\"}"
if [ "${BACKUP_ON_START:-false}" = true ]; then /opt/backup/backup.sh scheduled || true; fi
exec crond -f -l 8
