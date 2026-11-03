#!/bin/sh
# Оповещение в мессенджер. notify.sh "текст"
#   ALERT_WEBHOOK_URL     — адрес webhook (Slack, Discord, Telegram Bot API или любой, принимающий JSON)
#   ALERT_WEBHOOK_FORMAT  — slack (по умолчанию, поле text) | discord (content) | telegram | generic
#   ALERT_TELEGRAM_CHAT_ID — для telegram: ALERT_WEBHOOK_URL=https://api.telegram.org/bot<токен>/sendMessage
# Без ALERT_WEBHOOK_URL ничего не делает. Код 1 — оповещение не доставлено
set -eu
TEXT="${1:?Текст оповещения}"
URL="${ALERT_WEBHOOK_URL:-}"
[ -n "$URL" ] || exit 0

# Экранирование для JSON: обратная косая, кавычки, переводы строк
ESCAPED=$(printf '%s' "$TEXT" | sed 's/\\/\\\\/g; s/"/\\"/g' | awk 'BEGIN{ORS="\\n"} {print}' | sed 's/\\n$//')
case "${ALERT_WEBHOOK_FORMAT:-slack}" in
  slack) BODY="{\"text\":\"$ESCAPED\"}" ;;
  discord) BODY="{\"content\":\"$ESCAPED\"}" ;;
  telegram)
    CHAT="${ALERT_TELEGRAM_CHAT_ID:?Для telegram задайте ALERT_TELEGRAM_CHAT_ID}"
    BODY="{\"chat_id\":\"$CHAT\",\"text\":\"$ESCAPED\",\"disable_web_page_preview\":true}" ;;
  generic) BODY="{\"source\":\"endemion-life\",\"time\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"text\":\"$ESCAPED\"}" ;;
  *) echo "Неизвестный ALERT_WEBHOOK_FORMAT" >&2; exit 1 ;;
esac

curl -fsS -m 15 -o /dev/null -H "Content-Type: application/json" --data "$BODY" "$URL"
