#!/bin/sh
# Проверка HTTPS снаружи: sh infrastructure/scripts/check-https.sh [адрес]
# По умолчанию адрес — https://DOMAIN из .env. Код 0 — все проверки пройдены
set -u
ENV_FILE="${ENV_FILE:-.env}"
BASE="${1:-}"
if [ -z "$BASE" ]; then
  DOMAIN=$(sed -n 's/^DOMAIN=//p' "$ENV_FILE" 2>/dev/null | tail -n 1)
  [ -n "$DOMAIN" ] || { echo "Укажите адрес или задайте DOMAIN в $ENV_FILE" >&2; exit 1; }
  BASE="https://$DOMAIN"
fi
CURL="curl -sS -m 15 ${CHECK_INSECURE:+-k}"
HOST=$(printf '%s' "$BASE" | sed -E 's#^https://([^/:]+).*#\1#')
PORT=$(printf '%s' "$BASE" | sed -nE 's#^https://[^/:]+:([0-9]+).*#\1#p')
HTTP_BASE="http://$HOST${HTTP_PORT:+:$HTTP_PORT}"
failed=0
ok() { printf '  OK   %s\n' "$1"; }
bad() { printf '  FAIL %s\n' "$1"; failed=1; }

echo "Проверка $BASE"

status=$($CURL -o /dev/null -w '%{http_code}' "$BASE/api/health") || status=000
[ "$status" = 200 ] && ok "HTTPS отвечает, /api/health 200" || bad "/api/health: HTTP $status"

location=$($CURL -o /dev/null -w '%{http_code} %{redirect_url}' "$HTTP_BASE/worlds?x=1")
case "$location" in
  "301 https://$HOST"*"/worlds?x=1") ok "HTTP перенаправляет на HTTPS" ;;
  *) bad "HTTP → HTTPS: получено «$location»" ;;
esac

headers=$($CURL -D - -o /dev/null "$BASE/")
printf '%s' "$headers" | grep -qi '^strict-transport-security: max-age=[1-9]' && ok "HSTS включён" || echo "  WARN HSTS не включён (HSTS_MAX_AGE=0): включите после проверки HTTPS"
printf '%s' "$headers" | grep -qi '^x-content-type-options: nosniff' && ok "X-Content-Type-Options" || bad "нет X-Content-Type-Options"
printf '%s' "$headers" | grep -qi '^x-frame-options: deny' && ok "X-Frame-Options" || bad "нет X-Frame-Options"
printf '%s' "$headers" | grep -qi '^server: nginx/' && bad "Nginx показывает версию" || ok "версия сервера скрыта"

cookie=$($CURL -D - -o /dev/null -X POST -H "Origin: $BASE" -H 'Content-Type: application/json' --data '{}' "$BASE/api/session" | grep -i '^set-cookie: el_session=')
if [ -n "$cookie" ]; then
  for flag in HttpOnly Secure "SameSite=Lax"; do
    printf '%s' "$cookie" | grep -qi "$flag" && ok "cookie сессии: $flag" || bad "cookie сессии без $flag"
  done
else
  bad "API не выдал cookie сессии"
fi

foreign=$($CURL -o /dev/null -w '%{http_code}' -X POST -H 'Origin: https://evil.example' -H 'Content-Type: application/json' --data '{}' "$BASE/api/session")
[ "$foreign" = 403 ] && ok "запрос с чужого сайта отклонён (403)" || bad "запрос с чужого сайта: HTTP $foreign"

for proto in tls1 tls1_1; do
  if echo | openssl s_client -connect "$HOST:${PORT:-443}" -servername "$HOST" "-$proto" >/dev/null 2>&1; then bad "принимается устаревший протокол $proto"; else ok "устаревший протокол $proto отклонён"; fi
done
if echo | openssl s_client -connect "$HOST:${PORT:-443}" -servername "$HOST" -tls1_3 >/dev/null 2>&1; then ok "TLS 1.3"; else bad "TLS 1.3 недоступен"; fi

exit $failed
