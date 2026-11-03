#!/bin/sh
# Проверка резервной копии.
#   verify-backup.sh ФАЙЛ           — контрольная сумма и оглавление архива (быстро)
#   verify-backup.sh ФАЙЛ --full    — плюс пробное восстановление во временную базу и проверка таблиц
#   verify-backup.sh --latest [--full] — последняя ежедневная копия
# Код выхода 0 — копия пригодна для восстановления
set -eu
SCRIPT_DIR=$(cd "$(dirname "$(readlink -f "$0")")" && pwd)
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

FILE=""
FULL=false
for arg in "$@"; do
  case "$arg" in
    --full) FULL=true ;;
    --latest) FILE=$(find "$DAILY_DIR" "$MANUAL_DIR" -maxdepth 1 -name "${BACKUP_PREFIX}-*.dump" 2>/dev/null | sort -t- -k3 | tail -n 1) ;;
    -h|--help) sed -n '2,7p' "$0"; exit 0 ;;
    *) FILE="$arg" ;;
  esac
done
[ -n "$FILE" ] || die "Укажите файл копии или --latest"
[ -f "$FILE" ] || die "Файл не найден: $FILE"

# 1. Контрольная сумма: файл не повреждён и не подменён после создания
SUM="$FILE.sha256"
[ -f "$SUM" ] || die "Нет файла контрольной суммы: $SUM"
if ! (cd "$(dirname "$FILE")" && sha256sum -c -s "$(basename "$SUM")"); then
  die "Контрольная сумма не совпадает: $(basename "$FILE")"
fi

# 2. Оглавление архива: pg_restore читает его целиком, в нём есть таблицы приложения и журнал миграций
LIST=$(pg_restore --list "$FILE" 2>&1) || die "Архив не читается: $(basename "$FILE")"
for table in _prisma_migrations players sessions accounts lives life_snapshots history_entries game_actions; do
  printf '%s\n' "$LIST" | grep -q "TABLE DATA public $table " || die "В копии нет данных таблицы $table: $(basename "$FILE")"
done
log info "Проверка копии пройдена: $(basename "$FILE") ($(human_size "$FILE")), контрольная сумма и оглавление в порядке"

[ "$FULL" = true ] || exit 0

# 3. Пробное восстановление во временную базу. Рабочая база не затрагивается
SCRATCH=$(safe_name "${PGDATABASE}_verify_$(timestamp)")
cleanup() { psql_admin -c "DROP DATABASE IF EXISTS \"$SCRATCH\" WITH (FORCE)" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM

psql_admin -c "CREATE DATABASE \"$SCRATCH\"" >/dev/null || die "Не удалось создать временную базу для проверки"
if ! pg_restore --no-owner --no-privileges --exit-on-error --dbname="$SCRATCH" "$FILE" 2>>"$LOG_FILE"; then
  die "Пробное восстановление не удалось: $(basename "$FILE")"
fi
COUNTS=$(psql -X -v ON_ERROR_STOP=1 -tA -d "$SCRATCH" -c "
  SELECT 'migrations=' || (SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL)
      || ' players=' || (SELECT count(*) FROM players)
      || ' lives=' || (SELECT count(*) FROM lives)
      || ' snapshots=' || (SELECT count(*) FROM life_snapshots)
      || ' history=' || (SELECT count(*) FROM history_entries)
      || ' actions=' || (SELECT count(*) FROM game_actions)") || die "Восстановленная база не читается"
MIGRATIONS=$(printf '%s' "$COUNTS" | sed -n 's/^migrations=\([0-9]*\).*/\1/p')
[ "${MIGRATIONS:-0}" -ge 1 ] || die "В восстановленной базе нет применённых миграций"
log info "Пробное восстановление пройдено: $(basename "$FILE"): $COUNTS"
