#!/bin/sh
# Общие функции резервного копирования. Подключается из backup.sh, verify-backup.sh, restore.sh
# shellcheck disable=SC2034  # переменные используются в подключающих скриптах

# Настройки из окружения контейнера. Под cron окружение читается из файла, который пишет entrypoint
if [ -z "${PGHOST:-}" ] && [ -r /opt/backup/runtime.env ]; then
  # shellcheck disable=SC1091
  . /opt/backup/runtime.env
fi

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_PREFIX="${BACKUP_PREFIX:-endemion_life}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_KEEP_MIN="${BACKUP_KEEP_MIN:-7}"
BACKUP_VERIFY_FULL="${BACKUP_VERIFY_FULL:-true}"
DAILY_DIR="$BACKUP_DIR/daily"
MANUAL_DIR="$BACKUP_DIR/manual"
PRE_RESTORE_DIR="$BACKUP_DIR/pre-restore"
LOG_DIR="$BACKUP_DIR/logs"
LOG_FILE="$LOG_DIR/backup.log"
STATUS_FILE="$BACKUP_DIR/last-success"
LOCK_FILE="$BACKUP_DIR/.lock"
SCRIPT_DIR="${SCRIPT_DIR:-/opt/backup}"

: "${PGHOST:?Задайте PGHOST (адрес PostgreSQL)}"
: "${PGUSER:?Задайте PGUSER}"
: "${PGDATABASE:?Задайте PGDATABASE (рабочая база)}"
export PGHOST PGUSER PGDATABASE
export PGPORT="${PGPORT:-5432}"
[ -n "${PGPASSWORD:-}" ] && export PGPASSWORD

umask 077

# Журнал: строка JSON в stdout (docker logs) и в файл на томе с копиями
log() {
  level="$1"
  shift
  msg=$(printf '%s' "$*" | sed 's/\\/\\\\/g; s/"/\\"/g')
  line=$(printf '{"time":"%s","level":"%s","context":"backup","msg":"%s"}' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$level" "$msg")
  printf '%s\n' "$line"
  if mkdir -p "$LOG_DIR" 2>/dev/null; then printf '%s\n' "$line" >> "$LOG_FILE" 2>/dev/null || true; fi
}

die() {
  log error "$*"
  notify "Endemion Life: ошибка резервного копирования — $*"
  exit 1
}

# Оповещение (если настроено ALERT_WEBHOOK_URL). Сбой отправки не прерывает работу
notify() {
  if [ -n "${ALERT_WEBHOOK_URL:-}" ] && [ -x "$SCRIPT_DIR/notify.sh" ]; then
    "$SCRIPT_DIR/notify.sh" "$1" || log warn "Не удалось отправить оповещение"
  fi
}

# Пауза до освобождения блокировки: два резервных копирования одновременно не идут
with_lock() {
  mkdir -p "$BACKUP_DIR"
  exec 9>"$LOCK_FILE"
  # flock из busybox не умеет ждать с таймаутом (-w): ожидание — циклом с -n
  waited=0
  until flock -n 9; do
    [ "$waited" -ge 600 ] && die "Другая операция с резервными копиями идёт больше 10 минут"
    sleep 5
    waited=$((waited + 5))
  done
}

timestamp() { date -u +%Y%m%dT%H%M%SZ; }

# Имя служебной базы без спецсимволов
safe_name() { printf '%s' "$1" | tr -c 'A-Za-z0-9_' '_' | cut -c1-55; }

psql_admin() { psql -X -v ON_ERROR_STOP=1 -d postgres -tA "$@"; }

db_exists() {
  [ "$(psql_admin -c "SELECT 1 FROM pg_database WHERE datname = '$1'")" = 1 ]
}

human_size() {
  size=$(wc -c < "$1" | tr -d ' ')
  if [ "$size" -ge 1048576 ]; then echo "$((size / 1048576)) МБ"; elif [ "$size" -ge 1024 ]; then echo "$((size / 1024)) КБ"; else echo "$size Б"; fi
}

# Создаёт копию базы $1 в каталоге $2. Печатает путь к файлу.
# Файл пишется во временный и переименовывается только после успешного pg_dump: неполных копий в каталоге не бывает
dump_database() {
  db="$1"
  dir="$2"
  label="$3"
  mkdir -p "$dir"
  file="$dir/${BACKUP_PREFIX}-${label}-$(timestamp).dump"
  tmp="$file.partial"
  if ! pg_dump --format=custom --compress=6 --no-owner --no-privileges --dbname="$db" --file="$tmp" 2>>"$LOG_FILE"; then
    rm -f "$tmp"
    return 1
  fi
  mv "$tmp" "$file"
  (cd "$dir" && sha256sum "$(basename "$file")" > "$(basename "$file").sha256")
  # Только чтение: случайная перезапись или удаление через rm без -f потребуют подтверждения
  chmod 0440 "$file" "$file.sha256"
  printf '%s\n' "$file"
}
