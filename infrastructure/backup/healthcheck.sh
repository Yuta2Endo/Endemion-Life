#!/bin/sh
# Healthcheck контейнера резервного копирования: cron работает, а последняя успешная копия
# не старше BACKUP_MAX_AGE_HOURS (по умолчанию 26 часов). Пока копий нет вовсе (первые сутки) — только cron
set -eu
pgrep crond >/dev/null || { echo "crond не запущен"; exit 1; }
STATUS="${BACKUP_DIR:-/backups}/last-success"
[ -f "$STATUS" ] || exit 0
MAX=$(( ${BACKUP_MAX_AGE_HOURS:-26} * 3600 ))
AGE=$(( $(date +%s) - $(stat -c %Y "$STATUS") ))
[ "$AGE" -le "$MAX" ] || { echo "Последняя успешная копия $((AGE / 3600)) ч назад"; exit 1; }
