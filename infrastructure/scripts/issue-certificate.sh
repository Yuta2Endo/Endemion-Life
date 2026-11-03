#!/bin/sh
# Первый выпуск сертификата Let's Encrypt для DOMAIN. Запускать на сервере из корня проекта:
#   sh infrastructure/scripts/issue-certificate.sh            — настоящий сертификат
#   sh infrastructure/scripts/issue-certificate.sh --staging  — тестовый (лимиты Let's Encrypt не тратятся)
# Требования: DNS-запись A (и AAAA, если есть IPv6) указывает на этот сервер, порт 80 открыт,
# стек запущен (Nginx в режиме bootstrap отвечает на /.well-known/acme-challenge/).
# Продление дальше идёт само: сервис certbot проверяет сертификат дважды в сутки
set -eu

ENV_FILE="${ENV_FILE:-.env}"
COMPOSE="docker compose -f infrastructure/docker-compose.prod.yml --env-file $ENV_FILE"
STAGING=""
[ "${1:-}" = "--staging" ] && STAGING="--staging"

[ -f "$ENV_FILE" ] || { echo "Нет файла $ENV_FILE (образец: infrastructure/env.production.example)" >&2; exit 1; }
DOMAIN=$(sed -n 's/^DOMAIN=//p' "$ENV_FILE" | tail -n 1)
EMAIL=$(sed -n 's/^LETSENCRYPT_EMAIL=//p' "$ENV_FILE" | tail -n 1)
[ -n "$DOMAIN" ] || { echo "В $ENV_FILE не задан DOMAIN" >&2; exit 1; }
[ -n "$EMAIL" ] || { echo "В $ENV_FILE не задан LETSENCRYPT_EMAIL (адрес для уведомлений Let's Encrypt)" >&2; exit 1; }

# 1. DNS: имя должно указывать на этот сервер, иначе Let's Encrypt не пройдёт проверку
RESOLVED=$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1 {print $1}')
[ -n "$RESOLVED" ] || { echo "DNS: имя $DOMAIN не найдено. Создайте запись A на IP этого сервера и подождите обновления DNS" >&2; exit 1; }
PUBLIC_IP=$(curl -fsS -4 -m 10 https://api.ipify.org 2>/dev/null || true)
if [ -n "$PUBLIC_IP" ] && [ "$PUBLIC_IP" != "$RESOLVED" ]; then
  echo "DNS: $DOMAIN указывает на $RESOLVED, а внешний адрес этого сервера $PUBLIC_IP. Исправьте запись A" >&2
  exit 1
fi
echo "DNS: $DOMAIN → $RESOLVED"

# 2. Nginx отвечает на проверку ACME
$COMPOSE up -d nginx
TOKEN="endemion-check-$(date +%s)"
$COMPOSE exec -T nginx sh -c "printf ok > /var/www/certbot/.well-known/acme-challenge/$TOKEN 2>/dev/null || (mkdir -p /var/www/certbot/.well-known/acme-challenge && printf ok > /var/www/certbot/.well-known/acme-challenge/$TOKEN)"
if ! curl -fsS -m 10 "http://$DOMAIN/.well-known/acme-challenge/$TOKEN" | grep -q ok; then
  $COMPOSE exec -T nginx rm -f "/var/www/certbot/.well-known/acme-challenge/$TOKEN"
  echo "http://$DOMAIN/.well-known/acme-challenge/ недоступен снаружи: проверьте порт 80 и межсетевой экран" >&2
  exit 1
fi
$COMPOSE exec -T nginx rm -f "/var/www/certbot/.well-known/acme-challenge/$TOKEN"
echo "Проверка ACME доступна снаружи"

# 3. Выпуск
$COMPOSE run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
  -d "$DOMAIN" --email "$EMAIL" --agree-tos --no-eff-email --non-interactive --keep-until-expiring $STAGING

# 4. Nginx переходит в режим tls
$COMPOSE exec -T nginx /opt/endemion/nginx-entrypoint.sh reload
echo "Готово: https://$DOMAIN. Проверка: sh infrastructure/scripts/check-https.sh"
