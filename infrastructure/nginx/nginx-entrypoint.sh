#!/bin/sh
# Запуск Nginx Endemion Life. Выбирает конфигурацию по NGINX_MODE и наличию сертификата:
#   tls          — свой сертификат Let's Encrypt (порты 80 и 443). Пока сертификата нет — режим bootstrap:
#                  порт 80 отвечает только на проверку ACME, остальное — 503
#   behind-proxy — HTTPS завершает внешний прокси (например, Caddy на том же сервере), Nginx слушает только 80
# Фоновый цикл перечитывает сертификат: после выпуска переключается bootstrap → tls, после продления — reload.
# Ручная перезагрузка: docker compose exec nginx sh /opt/endemion/nginx-entrypoint.sh reload
set -eu

MODE="${NGINX_MODE:-tls}"
DOMAIN="${DOMAIN:?Задайте DOMAIN, например life.endemion.online}"
HSTS_MAX_AGE="${HSTS_MAX_AGE:-0}"
PUBLIC_HTTPS_PORT="${PUBLIC_HTTPS_PORT:-443}"
NGINX_API_RATE="${NGINX_API_RATE:-30r/s}"
NGINX_AUTH_RATE="${NGINX_AUTH_RATE:-30r/m}"
REAL_IP_FROM="${REAL_IP_FROM:-}"

BASE=/opt/endemion
OUT=/etc/nginx/conf.d/default.conf
SNIPPETS=/etc/nginx/snippets
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
STATE=/tmp/endemion-nginx-mode

log() { printf '%s nginx-entrypoint: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

case "$DOMAIN" in
  *[!A-Za-z0-9.-]*) log "Некорректный DOMAIN"; exit 1 ;;
esac
case "$NGINX_API_RATE$NGINX_AUTH_RATE" in
  *[!0-9rsm/]*) log "Некорректный NGINX_API_RATE или NGINX_AUTH_RATE (пример: 30r/s, 30r/m)"; exit 1 ;;
esac

# Общие заголовки. В Nginx add_header внутри location отменяет заголовки сервера,
# поэтому файл подключается в каждый location
write_snippets() {
  mkdir -p "$SNIPPETS"
  {
    echo 'add_header X-Content-Type-Options "nosniff" always;'
    echo 'add_header Referrer-Policy "strict-origin-when-cross-origin" always;'
    echo 'add_header X-Frame-Options "DENY" always;'
    echo 'add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;'
    if [ "$1" != bootstrap ] && [ "$HSTS_MAX_AGE" -gt 0 ] 2>/dev/null; then
      echo "add_header Strict-Transport-Security \"max-age=${HSTS_MAX_AGE}; includeSubDomains\" always;"
    else
      echo "# HSTS выключен (HSTS_MAX_AGE=${HSTS_MAX_AGE}). Включайте после проверки HTTPS: docs/HTTPS_SETUP.md"
    fi
  } > "$SNIPPETS/security-headers.conf"

  # Адрес клиента от внешнего прокси принимается только из доверенных сетей
  : > "$SNIPPETS/real-ip.conf"
  if [ "$1" = behind-proxy ]; then
    old_ifs=$IFS
    IFS=', '
    for cidr in $REAL_IP_FROM; do
      case "$cidr" in
        *[!0-9a-fA-F.:/]*) log "Некорректная сеть в REAL_IP_FROM: $cidr"; exit 1 ;;
        "") ;;
        *) echo "set_real_ip_from ${cidr};" >> "$SNIPPETS/real-ip.conf" ;;
      esac
    done
    IFS=$old_ifs
    if [ -s "$SNIPPETS/real-ip.conf" ]; then
      echo 'real_ip_header X-Forwarded-For;' >> "$SNIPPETS/real-ip.conf"
      echo 'real_ip_recursive on;' >> "$SNIPPETS/real-ip.conf"
    else
      log "REAL_IP_FROM не задан: адрес клиента будет адресом внешнего прокси, лимиты запросов станут общими"
    fi
  fi
}

choose() {
  case "$MODE" in
    tls)
      if [ -s "$CERT_DIR/fullchain.pem" ] && [ -s "$CERT_DIR/privkey.pem" ]; then echo tls; else echo bootstrap; fi ;;
    behind-proxy) echo behind-proxy ;;
    *) log "Неизвестный NGINX_MODE=$MODE (tls | behind-proxy)"; exit 1 ;;
  esac
}

render() {
  template="$1"
  if [ "$PUBLIC_HTTPS_PORT" = 443 ]; then HTTPS_PORT_SUFFIX=""; else HTTPS_PORT_SUFFIX=":${PUBLIC_HTTPS_PORT}"; fi
  export DOMAIN HTTPS_PORT_SUFFIX NGINX_API_RATE NGINX_AUTH_RATE
  write_snippets "$template"
  # Подставляются только перечисленные переменные: переменные самого Nginx ($host, $uri) остаются как есть
  envsubst '${DOMAIN} ${HTTPS_PORT_SUFFIX} ${NGINX_API_RATE} ${NGINX_AUTH_RATE}' < "$BASE/templates/${template}.conf.template" > "$OUT.new"
  mv "$OUT.new" "$OUT"
  echo "$template" > "$STATE"
}

reload() {
  next=$(choose)
  render "$next"
  if nginx -t -q; then
    nginx -s reload
    log "Nginx перезагружен: режим $next"
  else
    log "Ошибка в конфигурации, перезагрузка отменена"
    return 1
  fi
}

watch() {
  while :; do
    current=$(cat "$STATE" 2>/dev/null || echo none)
    # Пока сертификата нет — проверка раз в 30 секунд, потом раз в 6 часов (подхватить продлённый сертификат)
    if [ "$current" = bootstrap ]; then sleep 30; else sleep 21600; fi
    next=$(choose) || continue
    if [ "$next" != "$current" ] || [ "$next" = tls ]; then reload || true; fi
  done
}

if [ "${1:-}" = reload ]; then
  reload
  exit $?
fi

mode=$(choose)
render "$mode"
log "Режим: $mode, домен: $DOMAIN"
[ "$mode" = bootstrap ] && log "Сертификата для $DOMAIN нет: выпустите его (infrastructure/scripts/issue-certificate.sh)"
nginx -t
watch &
exec nginx -g 'daemon off;'
