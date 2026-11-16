#!/bin/sh
# R6.2: non-destructive PostgreSQL restore drill.
#
# Run from the repository root on the production host (or any host that can
# reach the production Compose project):
#   sh infrastructure/scripts/backup-drill.sh
#   sh infrastructure/scripts/backup-drill.sh --max-age-hours 30
#
# The script uses the running `backup` container. It checks that the latest
# dump is fresh, restores it into a temporary scratch database, validates
# Prisma migrations and core row counts, and drops the scratch database.
# The live database is never modified.
set -eu

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$REPO_ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-infrastructure/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env}"
MAX_AGE_HOURS="${DRILL_MAX_AGE_HOURS:-26}"

while [ $# -gt 0 ]; do
  case "$1" in
    --max-age-hours)
      MAX_AGE_HOURS="${2:?--max-age-hours needs a number}"
      shift
      ;;
    -h|--help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
  shift
done

case "$MAX_AGE_HOURS" in
  ''|*[!0-9]*)
    echo "DRILL_MAX_AGE_HOURS must be a whole number" >&2
    exit 2
    ;;
esac

DC="docker compose --env-file $ENV_FILE -f $COMPOSE_FILE"

$DC exec -T -e DRILL_MAX_HOURS="$MAX_AGE_HOURS" backup sh -lc '
set -eu
SCRIPT_DIR=/opt/backup
# shellcheck source=/dev/null
. "$SCRIPT_DIR/lib.sh"

with_lock
mkdir -p "$BACKUP_DIR/drills"

LATEST=$(find "$DAILY_DIR" "$MANUAL_DIR" -maxdepth 1 -name "${BACKUP_PREFIX}-*.dump" 2>/dev/null | sort | tail -n 1)
[ -n "$LATEST" ] || die "restore drill: no backup files found"

NOW=$(date +%s)
MTIME=$(stat -c %Y "$LATEST")
AGE_HOURS=$(( (NOW - MTIME) / 3600 ))
MAX_AGE="${DRILL_MAX_HOURS:-26}"
[ "$AGE_HOURS" -le "$MAX_AGE" ] || die "restore drill: latest backup is ${AGE_HOURS}h old (max ${MAX_AGE}h)"

log info "Restore drill started: $(basename "$LATEST") (${AGE_HOURS}h old)"
"$SCRIPT_DIR/verify-backup.sh" "$LATEST" --full || die "restore drill failed: $(basename "$LATEST")"

REPORT="$BACKUP_DIR/drills/restore-drill-$(timestamp).json"
printf "{\"time\":\"%s\",\"file\":\"%s\",\"ageHours\":%s,\"maxAgeHours\":%s,\"status\":\"passed\"}\n" \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(basename "$LATEST")" "$AGE_HOURS" "$MAX_AGE" > "$REPORT"
chmod 0440 "$REPORT"
log info "Restore drill passed: $(basename "$LATEST"), report $(basename "$REPORT")"
notify "Endemion Life: restore drill passed for $(basename "$LATEST")"
'
