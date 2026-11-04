#!/bin/sh
# Проверка работающей версии снаружи: health-check.sh [адрес]
# Адрес по умолчанию — https://DOMAIN из .env. Проверяет /api/health (база up), главную, /worlds и /api/universes.
# Несколько попыток: Caddy и Nginx подхватывают новые контейнеры не мгновенно. Код 0 — всё в порядке
set -u
BASE="${1:-}"
if [ -z "$BASE" ]; then
  DOMAIN=$(sed -n 's/^DOMAIN=//p' "${ENV_FILE:-.env}" 2> /dev/null | tail -n 1 | tr -d "\"'\r")
  [ -n "$DOMAIN" ] || { echo "Укажите адрес или задайте DOMAIN в .env" >&2; exit 1; }
  BASE="https://$DOMAIN"
fi
ATTEMPTS="${HEALTH_ATTEMPTS:-12}"
DELAY="${HEALTH_DELAY:-5}"
CURL="curl -sS -m 15 ${CHECK_INSECURE:+-k}"

check_once() {
  failed=0
  body=$($CURL -w '\n%{http_code}' "$BASE/api/health" 2> /dev/null) || body="
000"
  code=$(printf '%s' "$body" | tail -n 1)
  json=$(printf '%s' "$body" | sed '$d')
  if [ "$code" = 200 ] && printf '%s' "$json" | grep -q '"database":"up"'; then
    printf '  OK   /api/health %s\n' "$(printf '%s' "$json" | sed -n 's/.*"status":"\([a-z]*\)".*/status=\1/p')"
  else
    printf '  FAIL /api/health: HTTP %s\n' "$code"
    failed=1
  fi
  for path in / /worlds /api/universes; do
    code=$($CURL -o /dev/null -w '%{http_code}' "$BASE$path" 2> /dev/null) || code=000
    if [ "$code" = 200 ]; then
      printf '  OK   %s\n' "$path"
    else
      printf '  FAIL %s: HTTP %s\n' "$path" "$code"
      failed=1
    fi
  done
  return $failed
}

i=1
while :; do
  echo "Проверка $BASE (попытка $i из $ATTEMPTS)"
  check_once && { echo "Проверка пройдена"; exit 0; }
  [ "$i" -ge "$ATTEMPTS" ] && break
  i=$((i + 1))
  sleep "$DELAY"
done
echo "Проверка не пройдена" >&2
exit 1
