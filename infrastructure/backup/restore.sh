#!/bin/sh
# Восстановление базы из резервной копии.
#   restore.sh ФАЙЛ [--target БАЗА] [--yes]
#
# Порядок:
#   1. Копия проверяется (контрольная сумма, оглавление).
#   2. Если целевая база существует — сначала создаётся её копия в pre-restore/.
#   3. Копия восстанавливается в НОВУЮ временную базу и проверяется там.
#   4. Только после этого целевая база переименовывается в <база>_before_<время>,
#      а восстановленная получает её имя. Прежняя база не удаляется: откат — обратное переименование.
#
# Целевая база по умолчанию — рабочая (PGDATABASE). Перезапись рабочей базы требует
# ввести её имя вручную или передать --yes вместе с RESTORE_CONFIRM=<имя базы>.
# Перед восстановлением рабочей базы остановите API: docker compose stop api web
set -eu
SCRIPT_DIR=$(cd "$(dirname "$(readlink -f "$0")")" && pwd)
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

FILE=""
TARGET="$PGDATABASE"
ASSUME_YES=false
while [ $# -gt 0 ]; do
  case "$1" in
    --target) TARGET="${2:?--target требует имя базы}"; shift ;;
    --yes) ASSUME_YES=true ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) FILE="$1" ;;
  esac
  shift
done
[ -n "$FILE" ] || die "Укажите файл копии"
[ "$(safe_name "$TARGET")" = "$TARGET" ] || die "Имя целевой базы может содержать только латинские буквы, цифры и _"

with_lock

# 1. Проверка копии до любых изменений
"$SCRIPT_DIR/verify-backup.sh" "$FILE" || die "Копия не прошла проверку, восстановление отменено"

# 2. Подтверждение
if [ "$TARGET" = "$PGDATABASE" ]; then
  log warn "Целевая база $TARGET — РАБОЧАЯ. Её содержимое будет заменено копией $(basename "$FILE")"
  if [ "$ASSUME_YES" = true ]; then
    [ "${RESTORE_CONFIRM:-}" = "$TARGET" ] || die "Для --yes с рабочей базой задайте RESTORE_CONFIRM=$TARGET"
  else
    printf 'Текущая база %s будет переименована и заменена копией.\nВведите имя базы для подтверждения: ' "$TARGET" >&2
    read -r answer || answer=""
    [ "$answer" = "$TARGET" ] || die "Подтверждение не совпало, восстановление отменено"
  fi
elif db_exists "$TARGET" && [ "$ASSUME_YES" != true ]; then
  printf 'База %s существует и будет заменена. Продолжить? Введите yes: ' "$TARGET" >&2
  read -r answer || answer=""
  [ "$answer" = yes ] || die "Восстановление отменено"
fi

STAMP=$(timestamp)
RESTORED=$(safe_name "${TARGET}_restore_${STAMP}")
BEFORE=$(safe_name "${TARGET}_before_${STAMP}")

# 3. Копия текущего состояния целевой базы
if db_exists "$TARGET"; then
  PRE=$(dump_database "$TARGET" "$PRE_RESTORE_DIR" "pre-restore") || die "Не удалось сделать копию текущей базы $TARGET, восстановление отменено"
  "$SCRIPT_DIR/verify-backup.sh" "$PRE" || die "Копия текущей базы не прошла проверку, восстановление отменено"
  log info "Копия текущей базы перед восстановлением: $PRE"
fi

# 4. Восстановление в новую базу. При ошибке она удаляется, целевая база не тронута
cleanup_restored() { psql_admin -c "DROP DATABASE IF EXISTS \"$RESTORED\" WITH (FORCE)" >/dev/null 2>&1 || true; }
trap cleanup_restored EXIT INT TERM
psql_admin -c "CREATE DATABASE \"$RESTORED\"" >/dev/null || die "Не удалось создать базу $RESTORED"
if ! pg_restore --no-owner --no-privileges --exit-on-error --dbname="$RESTORED" "$FILE" 2>>"$LOG_FILE"; then
  die "pg_restore завершился с ошибкой, целевая база $TARGET не изменена (подробности в $LOG_FILE)"
fi
MIGRATIONS=$(psql -X -tA -v ON_ERROR_STOP=1 -d "$RESTORED" -c "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL") || die "Восстановленная база не читается"
[ "$MIGRATIONS" -ge 1 ] || die "В восстановленной базе нет применённых миграций, целевая база не изменена"

# 5. Замена: соединения с целевой базой закрываются, базы меняются именами
if db_exists "$TARGET"; then
  psql_admin -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TARGET' AND pid <> pg_backend_pid()" >/dev/null
  psql_admin -c "ALTER DATABASE \"$TARGET\" RENAME TO \"$BEFORE\"" >/dev/null || die "Не удалось переименовать $TARGET: база занята? Остановите API и повторите"
fi
if ! psql_admin -c "ALTER DATABASE \"$RESTORED\" RENAME TO \"$TARGET\"" >/dev/null; then
  # Вернуть прежнюю базу на место
  db_exists "$BEFORE" && psql_admin -c "ALTER DATABASE \"$BEFORE\" RENAME TO \"$TARGET\"" >/dev/null
  die "Не удалось переименовать восстановленную базу, прежняя база возвращена на место"
fi
trap - EXIT INT TERM

# 6. Проверка результата на месте
COUNTS=$(psql -X -tA -v ON_ERROR_STOP=1 -d "$TARGET" -c "SELECT 'lives=' || count(*) FROM lives") || die "База $TARGET после восстановления не читается"
log info "Восстановление завершено: $TARGET из $(basename "$FILE") ($COUNTS)"
if db_exists "$BEFORE"; then
  log info "Прежняя база сохранена как $BEFORE. Откат: docs/DATABASE_BACKUPS.md, раздел «Откат восстановления»"
fi
notify "Endemion Life: база $TARGET восстановлена из $(basename "$FILE")"
