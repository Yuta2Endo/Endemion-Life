#!/bin/sh
# Откат кода на релиз, который уже работал: rollback.sh [<SHA>] [--allow-newer-schema]
# Без SHA — релиз, работавший до последней выкладки. Миграции не запускаются, база данных не меняется.
# --allow-newer-schema — между выбранным релизом и текущим добавлены миграции: прежний код будет работать с новой
#   схемой. При миграциях «сначала расширять» это допустимо; решение владельца по docs/ROLLBACK.md.
# Прежний код не откроет сохранения формата новее своего (docs/ROLLBACK.md) — откат кода не откатывает данные.
# Коды: 0 — откат выполнен; 2 — откат не прошёл проверку (нужен человек); 3 — нужно разрешение; 4 — занято
set -eu
# shellcheck source=infrastructure/deploy/lib.sh
. "$(cd "$(dirname "$(readlink -f "$0")")" && pwd)/lib.sh"

TARGET=""
ALLOW_NEWER_SCHEMA=false
for arg in "$@"; do
  case "$arg" in
    --allow-newer-schema) ALLOW_NEWER_SCHEMA=true ;;
    *)
      [ -z "$TARGET" ] || die "лишний аргумент: $arg"
      TARGET="$arg"
      ;;
  esac
done

take_lock
enter_app
require_clean_tree

[ -n "$TARGET" ] || TARGET=$(state_get previous)
is_sha "$TARGET" || die "не задан релиз для отката: укажите полный SHA (список — status)"
CURRENT=$(git rev-parse HEAD)
[ "$TARGET" != "$CURRENT" ] || die "релиз $TARGET уже работает"

grep -Eq "^[^ ]+ (deploy|bootstrap) $TARGET ok" "$RELEASES_DIR/history.log" 2> /dev/null ||
  die "релиз $TARGET ни разу не работал на сервере: откат только на проверенный релиз, новый код — через deploy"
release_images_present "$TARGET" || die "образов релиза $TARGET на сервере нет (удалены при очистке)"
git cat-file -e "$TARGET^{commit}" 2> /dev/null || die "коммита $TARGET нет в $APP_DIR"

AHEAD=$(migrations_added "$CURRENT" "$TARGET")
[ -z "$AHEAD" ] || die "в релизе $TARGET есть миграции, которых нет в текущем: используйте deploy" 3

NEWER=$(migrations_added "$TARGET" "$CURRENT")
if [ -n "$NEWER" ]; then
  log "После релиза $TARGET в базу добавлены миграции:"
  printf '%s\n' "$NEWER" | sed 's/^/  /'
  [ "$ALLOW_NEWER_SCHEMA" = true ] ||
    die "прежний код будет работать с новой схемой базы. Проверьте docs/ROLLBACK.md и запустите откат с allow_newer_schema" 3
fi

ensure_current_tagged "$CURRENT" || warn "текущая версия не отмечена как релиз: вернуться к ней можно будет только новой выкладкой"

history_add rollback-start "$TARGET" from "$CURRENT"
if rollback_to "$TARGET"; then
  state_set current "$TARGET"
  # Повторный откат без SHA не должен вернуть только что откаченную версию
  rm -f "$RELEASES_DIR/previous"
  history_add rollback "$TARGET" ok from "$CURRENT"
  log "Откат выполнен: работает $TARGET (до отката — $CURRENT)"
  exit 0
fi
history_add rollback "$TARGET" failed from "$CURRENT"
save_failure_logs
die "откат на $TARGET не прошёл проверку — нужен человек (status, docs/ROLLBACK.md)" 2
