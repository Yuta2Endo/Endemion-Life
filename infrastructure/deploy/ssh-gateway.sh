#!/bin/sh
# Единственная команда, которую разрешает ключ GitHub Actions (authorized_keys: restrict,command="…/ssh-gateway.sh").
# Команду клиента OpenSSH передаёт в SSH_ORIGINAL_COMMAND; разрешены только:
#   upload-images <SHA>   — stdin: docker save … | gzip, ровно четыре образа endemion-life-prod-{migrate,api,web,nginx}:<SHA>
#   upload-bundle <SHA>   — stdin: git bundle с одной веткой deploy-release, указывающей на <SHA>
#   deploy <SHA> [--allow-migrations] [--allow-infra]
#   rollback [<SHA>] [--allow-newer-schema]
#   status | health
# Остальное — отказ. Оболочки, проброса портов и произвольных команд у этого ключа нет
set -eu
# shellcheck source=infrastructure/deploy/lib.sh
. "$(cd "$(dirname "$(readlink -f "$0")")" && pwd)/lib.sh"

# Разбор на слова без подстановки шаблонов; каждое слово проверяется ниже
set -f
# shellcheck disable=SC2086
set -- ${SSH_ORIGINAL_COMMAND:-}
set +f
COMMAND="${1:-}"
[ $# -gt 0 ] && shift

need_sha() { is_sha "${1:-}" || die "нужен полный SHA коммита (40 символов [0-9a-f])"; }

check_free_space() {
  free_mb=$(df -Pm "$RELEASES_DIR" | awk 'NR == 2 {print $4}')
  [ "$free_mb" -ge "$((MIN_FREE_MB + $1))" ] || die "свободно $free_mb МБ: мало места для загрузки"
}

# stdin → файл, не больше $2 МБ
receive() {
  limit=$(($2 * 1024 * 1024))
  head -c "$((limit + 1))" > "$1"
  size=$(wc -c < "$1")
  [ "$size" -gt 0 ] || die "пустая загрузка"
  [ "$size" -le "$limit" ] || die "загрузка больше $2 МБ"
}

# Архив docker save может перезаписать любой образ на сервере (например, postgres). Поэтому до docker load
# проверяется, что в архиве ровно образы релиза и никаких других имён
check_image_archive() {
  expected=$(for s in $RELEASE_SERVICES; do printf '%s:%s\n' "$IMAGE_PREFIX-$s" "$2"; done | sort)
  manifest=$(tar -xzOf "$1" manifest.json 2> /dev/null) || die "в архиве нет manifest.json"
  tags=$(printf '%s' "$manifest" | grep -o '"RepoTags":\[[^]]*\]' | sed 's/^"RepoTags":\[//; s/\]$//' |
    tr ',' '\n' | tr -d '"' | sed '/^$/d' | sort)
  [ "$tags" = "$expected" ] || die "архив содержит не те образы (ожидались $IMAGE_PREFIX-{$(echo "$RELEASE_SERVICES" | tr ' ' ',')}:$2)"
  if index=$(tar -xzOf "$1" index.json 2> /dev/null); then
    names=$(printf '%s' "$index" | grep -o '"io.containerd.image.name":"[^"]*"' | sed 's/^[^:]*:"//; s/"$//; s#^docker.io/library/##' | sort)
    [ -z "$names" ] || [ "$names" = "$expected" ] || die "index.json архива содержит не те образы"
  fi
}

case "$COMMAND" in
  upload-images)
    need_sha "${1:-}"
    [ $# -eq 1 ] || die "лишние аргументы"
    take_lock
    # Архив и распакованные образы (общие слои с прежним релизом не занимают места повторно)
    check_free_space "$((MAX_UPLOAD_MB * 2))"
    mkdir -p "$RELEASES_DIR/$1"
    archive="$RELEASES_DIR/$1/images.tar.gz"
    trap 'rm -f "$archive"' EXIT
    receive "$archive" "$MAX_UPLOAD_MB"
    check_image_archive "$archive" "$1"
    docker load -q -i "$archive" > /dev/null || die "docker load завершился с ошибкой"
    for s in $RELEASE_SERVICES; do
      if [ "$(image_revision "$IMAGE_PREFIX-$s:$1")" != "$1" ]; then
        for t in $RELEASE_SERVICES; do docker rmi "$IMAGE_PREFIX-$t:$1" > /dev/null 2>&1 || true; done
        die "образ $IMAGE_PREFIX-$s:$1 собран не из коммита $1: загруженные образы удалены"
      fi
    done
    log "Образы релиза $1 загружены"
    ;;
  upload-bundle)
    need_sha "${1:-}"
    [ $# -eq 1 ] || die "лишние аргументы"
    take_lock
    check_free_space 100
    mkdir -p "$RELEASES_DIR/$1"
    bundle="$RELEASES_DIR/$1/code.bundle"
    receive "$bundle.tmp" 100
    cd "$APP_DIR"
    heads=$(git bundle list-heads "$bundle.tmp") || { rm -f "$bundle.tmp"; die "не bundle Git"; }
    [ "$heads" = "$1 refs/heads/deploy-release" ] || { rm -f "$bundle.tmp"; die "bundle должен содержать только deploy-release → $1"; }
    git bundle verify -q "$bundle.tmp" > /dev/null 2>&1 || { rm -f "$bundle.tmp"; die "bundle не проходит git bundle verify"; }
    mv "$bundle.tmp" "$bundle"
    log "Код релиза $1 загружен"
    ;;
  deploy)
    need_sha "${1:-}"
    sha="$1"
    shift
    for arg in "$@"; do
      case "$arg" in --allow-migrations | --allow-infra) ;; *) die "недопустимый аргумент: $arg" ;; esac
    done
    exec sh "$DEPLOY_HOME/deploy.sh" "$sha" "$@"
    ;;
  rollback)
    for arg in "$@"; do
      case "$arg" in --allow-newer-schema) ;; *) need_sha "$arg" ;; esac
    done
    exec sh "$DEPLOY_HOME/rollback.sh" "$@"
    ;;
  status)
    [ $# -eq 0 ] || die "лишние аргументы"
    exec sh "$DEPLOY_HOME/status.sh"
    ;;
  health)
    [ $# -eq 0 ] || die "лишние аргументы"
    enter_app
    exec sh "$DEPLOY_HOME/health-check.sh" "$(health_url)"
    ;;
  *)
    die "команда не разрешена для ключа выкладки"
    ;;
esac
