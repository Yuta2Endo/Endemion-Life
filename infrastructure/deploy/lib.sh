#!/bin/sh
# Общие функции выкладки Endemion Life на сервер. Подключается из deploy.sh, rollback.sh, status.sh, ssh-gateway.sh.
# Релиз — четыре образа endemion-life-prod-{migrate,api,web,nginx}:<SHA> и коммит <SHA> в $APP_DIR.
# Compose запускает образы :latest, поэтому переключение релиза — перетегирование :<SHA> → :latest и up --no-build.
# Настройки ниже можно переопределить в deploy.conf рядом со скриптами (необязательный файл, владелец root)
# shellcheck disable=SC2034  # переменные используются в подключающих скриптах

DEPLOY_HOME="${DEPLOY_HOME:-$(cd "$(dirname "$(readlink -f "$0")")" && pwd)}"
if [ -r "$DEPLOY_HOME/deploy.conf" ]; then
  # shellcheck disable=SC1091
  . "$DEPLOY_HOME/deploy.conf"
fi

APP_DIR="${APP_DIR:-/opt/endemion-life}"
RELEASES_DIR="${RELEASES_DIR:-/opt/endemion-life-releases}"
IMAGE_PREFIX="${IMAGE_PREFIX:-endemion-life-prod}"
RELEASE_SERVICES="migrate api web nginx"
# Сколько последних успешных релизов хранить для отката (текущий и прежний хранятся всегда).
# Релиз — около 2 ГБ образов, а на сервере свободно около 11 ГБ: больше двух-трёх релизов не помещается
RELEASE_KEEP="${RELEASE_KEEP:-2}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-300}"
MIN_FREE_MB="${MIN_FREE_MB:-5000}"
# Предел архива образов (gzip). Четыре образа релиза сейчас — около 330 МБ в архиве. Загрузка требует
# MIN_FREE_MB + 2 × MAX_UPLOAD_MB свободного места: при 11 ГБ на сервере больший предел не оставил бы запаса
MAX_UPLOAD_MB="${MAX_UPLOAD_MB:-1024}"
# Адрес для проверки по HTTP(S). Пусто — https://DOMAIN из .env
HEALTH_URL="${HEALTH_URL:-}"
MIGRATIONS_PATH=packages/database/prisma/migrations

umask 027

log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
warn() { log "ВНИМАНИЕ: $*"; }
die() {
  log "ОШИБКА: $1" >&2
  exit "${2:-1}"
}

# Полный SHA коммита: ровно 40 символов [0-9a-f]
is_sha() {
  case "$1" in '' | *[!0-9a-f]*) return 1 ;; esac
  [ "${#1}" -eq 40 ]
}

# Значение одной переменной из .env. Используется только для NGINX_MODE и DOMAIN: пароли не читаются и не печатаются
env_value() {
  sed -n "s/^$1=//p" "$APP_DIR/.env" | tail -n 1 | tr -d "\"'\r"
}

enter_app() {
  cd "$APP_DIR" || die "нет каталога $APP_DIR"
  [ -f .env ] || die "нет $APP_DIR/.env: настройки рабочей среды не найдены"
  NGINX_MODE=$(env_value NGINX_MODE)
}

dc() {
  if [ "$NGINX_MODE" = behind-proxy ]; then
    docker compose -f infrastructure/docker-compose.prod.yml -f infrastructure/docker-compose.behind-proxy.yml --env-file .env "$@"
  else
    docker compose -f infrastructure/docker-compose.prod.yml --env-file .env "$@"
  fi
}

health_url() {
  if [ -n "$HEALTH_URL" ]; then
    printf '%s' "$HEALTH_URL"
  else
    printf 'https://%s' "$(env_value DOMAIN)"
  fi
}

# Одна выкладка, откат или загрузка одновременно
take_lock() {
  mkdir -p "$RELEASES_DIR"
  chmod 700 "$RELEASES_DIR"
  exec 9> "$RELEASES_DIR/.lock"
  flock -n 9 || die "уже выполняется другая выкладка, откат или загрузка" 4
}

state_get() {
  if [ -r "$RELEASES_DIR/$1" ]; then cat "$RELEASES_DIR/$1"; fi
}
state_set() {
  printf '%s\n' "$2" > "$RELEASES_DIR/$1.tmp" && mv "$RELEASES_DIR/$1.tmp" "$RELEASES_DIR/$1"
}
history_add() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$RELEASES_DIR/history.log"
}

image_id() { docker image inspect --format '{{.Id}}' "$1" 2> /dev/null; }
image_revision() { docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$1" 2> /dev/null; }
container_id() { dc ps -a -q "$1" 2> /dev/null | head -n 1; }
container_image() { docker inspect --format '{{.Image}}' "$1" 2> /dev/null; }

release_images_present() {
  for s in $RELEASE_SERVICES; do
    image_id "$IMAGE_PREFIX-$s:$1" > /dev/null || return 1
  done
}

# Образы релиза собраны в GitHub Actions из этого коммита: метка org.opencontainers.image.revision
verify_release_images() {
  for s in $RELEASE_SERVICES; do
    image_id "$IMAGE_PREFIX-$s:$1" > /dev/null || die "нет образа $IMAGE_PREFIX-$s:$1: сначала upload-images"
    [ "$(image_revision "$IMAGE_PREFIX-$s:$1")" = "$1" ] || die "образ $IMAGE_PREFIX-$s:$1 собран не из коммита $1"
  done
}

# api, web и nginx работают на образах релиза
release_is_running() {
  for s in api web nginx; do
    cid=$(container_id "$s")
    [ -n "$cid" ] || return 1
    [ "$(container_image "$cid")" = "$(image_id "$IMAGE_PREFIX-$s:$1")" ] || return 1
  done
}

# Первая выкладка через GitHub Actions: работающая версия (образы :latest) ещё не отмечена как релиз.
# Отмечаем её тегом :<SHA текущего коммита>, чтобы к ней можно было вернуться
ensure_current_tagged() {
  release_images_present "$1" && return 0
  for s in api web nginx; do
    cid=$(container_id "$s")
    [ -n "$cid" ] || { warn "контейнер $s не найден"; return 1; }
    [ "$(container_image "$cid")" = "$(image_id "$IMAGE_PREFIX-$s:latest")" ] || {
      warn "контейнер $s работает не на образе $IMAGE_PREFIX-$s:latest"
      return 1
    }
  done
  for s in $RELEASE_SERVICES; do
    docker tag "$IMAGE_PREFIX-$s:latest" "$IMAGE_PREFIX-$s:$1" || return 1
  done
  mkdir -p "$RELEASES_DIR/$1"
  history_add bootstrap "$1" ok
  log "Работающая версия $1 отмечена как релиз (образы :latest → :$1)"
}

require_clean_tree() {
  [ -z "$(git status --porcelain --untracked-files=no)" ] ||
    die "в $APP_DIR изменены отслеживаемые файлы (git status): выкладка их не перезаписывает, разберитесь вручную"
}

# Код релиза из загруженного bundle (ssh-gateway.sh upload-bundle). Только добавляет объекты Git, рабочие файлы не меняет
fetch_release_code() {
  bundle="$RELEASES_DIR/$1/code.bundle"
  [ -f "$bundle" ] || die "нет $bundle: сначала upload-bundle"
  git fetch -q --no-tags "$bundle" deploy-release || die "не удалось прочитать $bundle"
  [ "$(git rev-parse FETCH_HEAD)" = "$1" ] || die "bundle содержит другой коммит"
}

# forward — ветка main на <SHA> (deploy.sh заранее проверяет, что <SHA> продолжает работающий коммит;
# после отката main может указывать на неудачный релиз, поэтому -B, а не merge); detach — отдельный коммит (откат).
# Неотслеживаемые файлы (.env) checkout не трогает
switch_code() {
  if [ "$2" = forward ]; then
    git checkout -q -B main "$1" || return 1
  else
    git checkout -q --detach "$1" || return 1
  fi
  [ "$(git rev-parse HEAD)" = "$1" ]
}

wait_service_healthy() {
  want=$(image_id "$IMAGE_PREFIX-$1:$2") || return 1
  deadline=$(($(date +%s) + HEALTH_TIMEOUT))
  while :; do
    cid=$(container_id "$1")
    if [ -n "$cid" ]; then
      if [ "$(container_image "$cid")" != "$want" ]; then
        log "$1: контейнер работает не на образе релиза $2"
        return 1
      fi
      state=$(docker inspect --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid")
      case "$state" in
        "running healthy")
          log "$1: healthy"
          return 0
          ;;
        "running unhealthy")
          log "$1: unhealthy"
          return 1
          ;;
        running\ *) ;;
        *)
          log "$1: $state"
          return 1
          ;;
      esac
    fi
    if [ "$(date +%s)" -ge "$deadline" ]; then
      log "$1: не стал healthy за $HEALTH_TIMEOUT с"
      return 1
    fi
    sleep 5
  done
}

check_migrate() {
  cid=$(container_id migrate)
  [ -n "$cid" ] || { log "migrate: контейнер не найден"; return 1; }
  [ "$(container_image "$cid")" = "$(image_id "$IMAGE_PREFIX-migrate:$1")" ] || { log "migrate: не новый образ"; return 1; }
  result=$(docker inspect --format '{{.State.Status}} {{.State.ExitCode}}' "$cid")
  [ "$result" = "exited 0" ] || { log "migrate: $result"; return 1; }
  log "migrate: завершён успешно"
}

# deploy — migrate применяет миграции, затем api, web, nginx (как при ручной выкладке).
# rollback — без migrate (--no-deps): откат кода базу не меняет
start_release() {
  activate_images "$1" || return 1
  if [ "$2" = deploy ]; then
    dc up -d --no-build migrate api web nginx || return 1
    check_migrate "$1" || return 1
  else
    dc up -d --no-build --no-deps api || return 1
    wait_service_healthy api "$1" || return 1
    dc up -d --no-build --no-deps web nginx || return 1
  fi
  for s in api web nginx; do
    wait_service_healthy "$s" "$1" || return 1
  done
  sh "$DEPLOY_HOME/health-check.sh" "$(health_url)" || return 1
}

activate_images() {
  for s in $RELEASE_SERVICES; do
    docker tag "$IMAGE_PREFIX-$s:$1" "$IMAGE_PREFIX-$s:latest" || return 1
  done
}

rollback_to() {
  log "Откат на релиз $1"
  switch_code "$1" detach || return 1
  start_release "$1" rollback
}

# Миграции, которые есть в $2 и которых нет в $1 (имена каталогов)
migrations_added() {
  git diff --no-renames --name-status "$1" "$2" -- "$MIGRATIONS_PATH" |
    awk '$1 == "A" {print $2}' | sed -n "s#^$MIGRATIONS_PATH/\([^/]*\)/.*#\1#p" | sort -u
}

# Изменённые или удалённые файлы существующих миграций (их правка запрещена: docs/GIT_WORKFLOW.md)
migrations_changed() {
  git diff --no-renames --name-status "$1" "$2" -- "$MIGRATIONS_PATH" | awk 'NF && $1 != "A" {print $1, $2}'
}

# Сохранение диагностики на сервере, не в журнале GitHub Actions: журналы приложения могут содержать данные игроков
save_failure_logs() {
  mkdir -p "$RELEASES_DIR/logs"
  file="$RELEASES_DIR/logs/$(date -u +%Y%m%dT%H%M%SZ)-failure.log"
  {
    dc ps -a
    dc logs --no-color --since 15m --tail 300 migrate api web nginx
  } > "$file" 2>&1 || true
  chmod 600 "$file"
  log "Журналы контейнеров сохранены на сервере: $file"
}

# Удаляет образы и каталоги релизов, кроме текущего, прежнего и последних $RELEASE_KEEP успешных.
# Загруженные, но ещё не выложенные релизы (нет в history.log — например, выкладка ждёт allow_migrations)
# не удаляются первые двое суток. Трогает только теги :<SHA> и каталоги <SHA> в $RELEASES_DIR;
# :latest, :pre-stage*, :stage* не удаляются
prune_releases() {
  keep=" $(state_get current) $(state_get previous) "
  seen=" "
  if [ -r "$RELEASES_DIR/history.log" ]; then
    keep="$keep $(awk '$4 == "ok" && ($2 == "deploy" || $2 == "bootstrap") {print $3}' "$RELEASES_DIR/history.log" | tail -n "$RELEASE_KEEP" | tr '\n' ' ')"
    seen="$seen$(awk '{print $3}' "$RELEASES_DIR/history.log" | sort -u | tr '\n' ' ')"
  fi
  for dir in "$RELEASES_DIR"/*/; do
    [ -d "$dir" ] || continue
    release=$(basename "$dir")
    is_sha "$release" || continue
    case "$keep" in *" $release "*) continue ;; esac
    case "$seen" in
      *" $release "*) ;;
      *) [ -n "$(find "$dir" -maxdepth 0 -mtime +1)" ] || continue ;;
    esac
    for s in $RELEASE_SERVICES; do
      docker rmi "$IMAGE_PREFIX-$s:$release" > /dev/null 2>&1 || true
    done
    rm -rf "${RELEASES_DIR:?}/$release"
    log "Удалён старый релиз $release"
  done
}
