#!/bin/sh
# Монитор доступности Endemion Life. Раз в MONITOR_INTERVAL секунд проверяет:
#   MONITOR_URL         — /api/health внутри сети Docker (API, PostgreSQL, Redis);
#   MONITOR_PUBLIC_URL  — тот же адрес снаружи через Nginx и HTTPS (необязательно) и срок сертификата.
# Оповещение (notify.sh) уходит при смене состояния: после MONITOR_FAILURES неудач подряд — «недоступно»,
# при восстановлении — «снова работает». Повтор раз в MONITOR_REPEAT_MINUTES, пока сбой не устранён.
# HEALTHCHECKS_PING_URL — внешний монитор «пульса» (healthchecks.io и аналоги): заметит, если упал весь сервер
set -u

INTERVAL="${MONITOR_INTERVAL:-60}"
FAILURES="${MONITOR_FAILURES:-3}"
REPEAT="${MONITOR_REPEAT_MINUTES:-60}"
INTERNAL="${MONITOR_URL:-http://api:4000/api/health}"
PUBLIC="${MONITOR_PUBLIC_URL:-}"
CERT_WARN_DAYS="${MONITOR_CERT_WARN_DAYS:-14}"
HEARTBEAT=/tmp/monitor-heartbeat
NOTIFY=/opt/monitor/notify.sh

log() {
  level="$1"
  shift
  msg=$(printf '%s' "$*" | sed 's/\\/\\\\/g; s/"/\\"/g')
  printf '{"time":"%s","level":"%s","context":"monitor","msg":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$level" "$msg"
}

alert() {
  log warn "Оповещение: $1"
  if [ -n "${ALERT_WEBHOOK_URL:-}" ]; then "$NOTIFY" "$1" || log error "Оповещение не доставлено"; fi
}

# Проверка одного адреса. Печатает причину сбоя; код 0 — всё в порядке, 2 — работает с ограничениями
check() {
  body=$(curl -sS -m 10 -w '\n%{http_code}' "$1" 2>&1) || { echo "нет ответа: $(printf '%s' "$body" | head -n 1)"; return 1; }
  code=$(printf '%s' "$body" | tail -n 1)
  json=$(printf '%s' "$body" | sed '$d')
  [ "$code" = 200 ] || { echo "HTTP $code: $(printf '%s' "$json" | head -c 200)"; return 1; }
  printf '%s' "$json" | grep -q '"database":"up"' || { echo "база данных недоступна"; return 1; }
  printf '%s' "$json" | grep -q '"redis":"up"' || { echo "Redis недоступен (игра работает, общий лимит запросов отключён)"; return 2; }
  return 0
}

# Сколько дней действует сертификат публичного адреса. Пусто — не https или не удалось узнать
cert_days_left() {
  case "$1" in https://*) ;; *) return 0 ;; esac
  host=$(printf '%s' "$1" | sed -E 's#^https://([^/:]+).*#\1#')
  port=$(printf '%s' "$1" | sed -nE 's#^https://[^/:]+:([0-9]+).*#\1#p')
  end=$(echo | openssl s_client -servername "$host" -connect "$host:${port:-443}" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  [ -n "$end" ] || return 0
  end_epoch=$(date -d "$end" +%s 2>/dev/null) || return 0
  echo $(( (end_epoch - $(date +%s)) / 86400 ))
}

fails=0
state=up
last_alert=0
last_cert_check=0
log info "Монитор запущен: $INTERNAL${PUBLIC:+, $PUBLIC}, интервал ${INTERVAL} с, порог $FAILURES"

while :; do
  problem=""
  degraded=""
  reason=$(check "$INTERNAL"); rc=$?
  if [ "$rc" = 1 ]; then problem="API: $reason"; elif [ "$rc" = 2 ]; then degraded="$reason"; fi
  if [ -z "$problem" ] && [ -n "$PUBLIC" ]; then
    reason=$(check "$PUBLIC"); rc=$?
    [ "$rc" = 1 ] && problem="Публичный адрес $PUBLIC: $reason"
  fi

  now=$(date +%s)
  if [ -n "$problem" ]; then
    fails=$((fails + 1))
    log warn "Проверка не пройдена ($fails/$FAILURES): $problem"
    if [ "$fails" -ge "$FAILURES" ]; then
      if [ "$state" != down ] || [ $((now - last_alert)) -ge $((REPEAT * 60)) ]; then
        alert "🔴 Endemion Life недоступен: $problem"
        last_alert=$now
      fi
      state=down
    fi
  else
    [ "$state" = down ] && alert "🟢 Endemion Life снова работает"
    if [ -n "$degraded" ] && [ "$state" != degraded ]; then
      alert "🟡 Endemion Life работает с ограничениями: $degraded"
      state=degraded
    elif [ -z "$degraded" ] && [ "$state" = degraded ]; then
      alert "🟢 Endemion Life: все сервисы снова работают"
      state=up
    elif [ -z "$degraded" ]; then
      state=up
    fi
    fails=0
    if [ -n "${HEALTHCHECKS_PING_URL:-}" ]; then curl -fsS -m 10 -o /dev/null "$HEALTHCHECKS_PING_URL" || log warn "Внешний монитор недоступен"; fi
  fi

  # Срок сертификата — раз в 12 часов
  if [ -n "$PUBLIC" ] && [ $((now - last_cert_check)) -ge 43200 ]; then
    days=$(cert_days_left "$PUBLIC")
    if [ -n "$days" ]; then
      log info "Сертификат действует ещё $days дн."
      [ "$days" -lt "$CERT_WARN_DAYS" ] && alert "🟡 Сертификат HTTPS истекает через $days дн.: проверьте продление (docs/HTTPS_SETUP.md)"
    fi
    last_cert_check=$now
  fi

  touch "$HEARTBEAT"
  sleep "$INTERVAL"
done
