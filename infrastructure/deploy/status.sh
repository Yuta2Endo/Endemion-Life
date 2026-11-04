#!/bin/sh
# Состояние выкладки: текущий коммит, релизы, контейнеры, журнал выкладок. Ничего не меняет и не печатает настройки
set -u
# shellcheck source=infrastructure/deploy/lib.sh
. "$(cd "$(dirname "$(readlink -f "$0")")" && pwd)/lib.sh"
enter_app

echo "Коммит в $APP_DIR: $(git rev-parse HEAD) ($(git symbolic-ref -q --short HEAD || echo 'detached HEAD'))"
git log -1 --format='  %s (%ci)'
echo "Текущий релиз: $(state_get current)"
echo "Прежний релиз (откат по умолчанию): $(state_get previous)"
[ -z "$(git status --porcelain --untracked-files=no)" ] || echo "ВНИМАНИЕ: изменены отслеживаемые файлы (git status)"

echo
echo "Контейнеры:"
dc ps --format '  {{.Service}}: {{.Status}}' 2> /dev/null
for s in api web nginx; do
  cid=$(container_id "$s")
  [ -n "$cid" ] || continue
  running=$(container_image "$cid")
  tags=$(docker image inspect --format '{{join .RepoTags " "}}' "$running" 2> /dev/null)
  echo "  $s: образ ${tags:-$running}"
done

echo
echo "Релизы на сервере (есть все образы — можно откатиться):"
for dir in "$RELEASES_DIR"/*/; do
  [ -d "$dir" ] || continue
  release=$(basename "$dir")
  is_sha "$release" || continue
  if release_images_present "$release"; then
    echo "  $release  $(git log -1 --format='%cs %s' "$release" 2> /dev/null)"
  fi
done

echo
echo "Последние выкладки:"
tail -n 10 "$RELEASES_DIR/history.log" 2> /dev/null | sed 's/^/  /'

echo
echo "Свободно на диске: $(df -Pm "$APP_DIR" | awk 'NR == 2 {print $4}') МБ"

# Скрипты выкладки на сервере ставятся вручную: напоминание, если в коде новая версия
for f in "$APP_DIR"/infrastructure/deploy/*.sh; do
  # Работающий коммит ещё без infrastructure/deploy/ (первая выкладка): сравнивать не с чем
  [ -f "$f" ] || continue
  installed="$DEPLOY_HOME/$(basename "$f")"
  if [ ! -f "$installed" ] || ! cmp -s "$f" "$installed"; then
    echo "ВНИМАНИЕ: $installed отличается от версии в коде — обновите скрипты (docs/GITHUB_ACTIONS_DEPLOYMENT.md)"
  fi
done
exit 0
