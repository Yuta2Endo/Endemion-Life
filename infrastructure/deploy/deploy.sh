#!/bin/sh
# Выкладка релиза: deploy.sh <SHA> [--allow-migrations] [--allow-infra]
# До запуска на сервере должны быть образы endemion-life-prod-*:<SHA> и code.bundle (ssh-gateway.sh upload-*).
# Порядок: проверки → резервная копия базы → код (fast-forward main) → образы :<SHA> → :latest → up --no-build →
# healthcheck контейнеров и health-check.sh. При ошибке без новых миграций — автоматический откат на прежний релиз.
# Нужно явное разрешение владельца:
#   --allow-migrations — в релизе новые миграции (migrate применит их к рабочей базе);
#   --allow-infra      — изменены docker-compose.prod.yml, behind-proxy, backup или monitor (могут пересоздаться
#                        postgres и redis; backup и monitor выкладка не обновляет — вручную)
# Изменённые или удалённые старые миграции — отказ всегда.
# Коды: 0 — выложено; 1 — ошибка, работает прежний релиз; 2 — ошибка, откат НЕ выполнен (нужен человек);
#       3 — нужно разрешение (--allow-…); 4 — занято другой выкладкой
set -eu
# shellcheck source=infrastructure/deploy/lib.sh
. "$(cd "$(dirname "$(readlink -f "$0")")" && pwd)/lib.sh"

SHA=""
ALLOW_MIGRATIONS=false
ALLOW_INFRA=false
for arg in "$@"; do
  case "$arg" in
    --allow-migrations) ALLOW_MIGRATIONS=true ;;
    --allow-infra) ALLOW_INFRA=true ;;
    *)
      [ -z "$SHA" ] || die "лишний аргумент: $arg"
      SHA="$arg"
      ;;
  esac
done
is_sha "$SHA" || die "укажите полный SHA коммита (40 символов)"

take_lock
enter_app
require_clean_tree

CURRENT=$(git rev-parse HEAD)
if [ "$CURRENT" = "$SHA" ] && release_is_running "$SHA"; then
  log "Релиз $SHA уже работает, выкладка не нужна"
  exit 0
fi

log "Выкладка $SHA (сейчас работает $CURRENT)"
verify_release_images "$SHA"

free_mb=$(df -Pm "$APP_DIR" | awk 'NR == 2 {print $4}')
[ "$free_mb" -ge "$MIN_FREE_MB" ] || die "свободно $free_mb МБ, нужно не меньше $MIN_FREE_MB МБ"

ensure_current_tagged "$CURRENT" || die "работающая версия $CURRENT не отмечена как релиз: откатиться было бы не на что"
fetch_release_code "$SHA"
git merge-base --is-ancestor "$CURRENT" "$SHA" ||
  die "$SHA не продолжает работающий коммит $CURRENT: выкладываются только коммиты main вперёд (для возврата — rollback.sh)"

CHANGED=$(migrations_changed "$CURRENT" "$SHA")
[ -z "$CHANGED" ] || die "изменены или удалены уже применённые миграции — выкладка запрещена:
$CHANGED"

NEED_CONFIRM=false
ADDED=$(migrations_added "$CURRENT" "$SHA")
if [ -n "$ADDED" ]; then
  log "Новые миграции в релизе:"
  printf '%s\n' "$ADDED" | sed 's/^/  /'
  if [ "$ALLOW_MIGRATIONS" != true ]; then
    log "Нужно разрешение allow_migrations: проверьте миграции (docs/ROLLBACK.md, «Миграции»)"
    NEED_CONFIRM=true
  fi
else
  log "Новых миграций нет"
fi

INFRA=$(git diff --name-only "$CURRENT" "$SHA" -- infrastructure/docker-compose.prod.yml \
  infrastructure/docker-compose.behind-proxy.yml infrastructure/backup infrastructure/monitor)
if [ -n "$INFRA" ]; then
  log "Изменена конфигурация сервисов рабочей среды:"
  printf '%s\n' "$INFRA" | sed 's/^/  /'
  if [ "$ALLOW_INFRA" != true ]; then
    log "Нужно разрешение allow_infra: проверьте изменения (postgres и redis могут быть пересозданы)"
    NEED_CONFIRM=true
  fi
fi
[ "$NEED_CONFIRM" = false ] || die "выкладка остановлена до решения владельца, рабочая версия не менялась" 3

if [ -n "$(git diff --name-only "$CURRENT" "$SHA" -- infrastructure/deploy)" ]; then
  warn "изменены скрипты выкладки: на сервере они обновляются вручную (docs/GITHUB_ACTIONS_DEPLOYMENT.md)"
fi
if [ -n "$(git diff --name-only "$CURRENT" "$SHA" -- infrastructure/env.production.example)" ]; then
  warn "изменён образец настроек env.production.example: проверьте, не нужны ли новые переменные в .env"
fi

log "Резервная копия базы перед выкладкой"
dc exec -T backup backup.sh || die "резервная копия не создана: выкладка остановлена, рабочая версия не менялась"

history_add deploy-start "$SHA" from "$CURRENT"
if switch_code "$SHA" forward && start_release "$SHA" deploy; then
  state_set previous "$CURRENT"
  state_set current "$SHA"
  history_add deploy "$SHA" ok from "$CURRENT"
  prune_releases
  log "Выкладка $SHA завершена. Прежний релиз для отката: $CURRENT"
  exit 0
fi

history_add deploy "$SHA" failed from "$CURRENT"
save_failure_logs
if [ -n "$ADDED" ]; then
  # migrate мог изменить базу: откат кода без решения владельца опасен (форматы сохранений, docs/ROLLBACK.md)
  die "выкладка не прошла проверку, а релиз содержал миграции — автоматический откат НЕ выполнен.
Прежний релиз: $CURRENT. Порядок действий: docs/ROLLBACK.md, затем rollback.sh $CURRENT --allow-newer-schema" 2
fi

if rollback_to "$CURRENT"; then
  state_set current "$CURRENT"
  history_add rollback "$CURRENT" ok auto
  die "выкладка $SHA не прошла проверку, работает прежний релиз $CURRENT" 1
fi
history_add rollback "$CURRENT" failed auto
save_failure_logs
die "выкладка $SHA не прошла проверку, и автоматический откат на $CURRENT тоже не удался — нужен человек" 2
