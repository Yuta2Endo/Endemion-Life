# HTTPS для life.endemion.online

Состояние на 2026-11-03: **HTTPS работает**. DNS: `life A 185.175.156.196` (spaceweb.ru). Режим behind-proxy: сертификат Let's Encrypt (выпущен 2026-11-03, до 2027-02-01) получает и продлевает Caddy основного сайта. Блок `life.{$SITE_DOMAIN}` лежит в Caddyfile репозитория Endemion. `check-https.sh https://life.endemion.online` — все проверки OK. HSTS пока выключен (`HSTS_MAX_AGE=0`).

## Два режима

| Режим | Когда | Кто держит порты 80/443 и сертификат |
| --- | --- | --- |
| `NGINX_MODE=tls` | Отдельный сервер, порты 80 и 443 свободны | Nginx Endemion Life, сертификат Let's Encrypt через certbot |
| `NGINX_MODE=behind-proxy` | Общий сервер, где 80/443 уже заняты (сейчас на 185.175.156.196 их держит Caddy сайта endemion.online) | Внешний прокси (Caddy выпускает и продлевает сертификат сам) |

Для текущего сервера подходит `behind-proxy`: второй процесс на порты 80/443 не встанет.

В обоих режимах API получает `COOKIE_SECURE=true` (по умолчанию в `docker-compose.prod.yml`), а `CORS_ORIGINS` и `PUBLIC_URL` по умолчанию равны `https://${DOMAIN}`.

## Предварительное условие: DNS

В панели DNS spaceweb.ru для зоны `endemion.online` создайте запись:

```
life   A   185.175.156.196      (или IP другого сервера)
```

Если у сервера есть IPv6 — ещё и запись `AAAA`. Проверка:

```bash
dig +short life.endemion.online A      # должен вернуть IP сервера
```

Без этой записи Let's Encrypt (и Caddy) сертификат не выдадут.

## Режим tls: свой сертификат Let's Encrypt

1. В `.env` на сервере: `NGINX_MODE=tls`, `DOMAIN=life.endemion.online`, `LETSENCRYPT_EMAIL=…`, `HSTS_MAX_AGE=0`.
2. Запустите стек (`docs/DEPLOYMENT.md`). Пока сертификата нет, Nginx работает в режиме **bootstrap**: на порту 80 отвечает только `/.well-known/acme-challenge/` и `/nginx-health`, остальное — 503.
3. Пробный выпуск (тестовый сертификат, лимиты Let's Encrypt не тратятся):
   ```bash
   sh infrastructure/scripts/issue-certificate.sh --staging
   ```
   Скрипт проверяет DNS (имя указывает на внешний IP этого сервера), доступность ACME снаружи, выпускает сертификат и перезагружает Nginx.
4. Если пробный выпуск прошёл, удалите тестовый сертификат и выпустите настоящий:
   ```bash
   docker compose -f infrastructure/docker-compose.prod.yml --env-file .env run --rm --entrypoint certbot certbot delete --cert-name life.endemion.online
   sh infrastructure/scripts/issue-certificate.sh
   ```
5. Проверка снаружи:
   ```bash
   sh infrastructure/scripts/check-https.sh
   ```
6. Только когда все проверки `OK` и сайт открывается в браузере без предупреждений — включите HSTS: `HSTS_MAX_AGE=63072000` в `.env`, затем `docker compose … up -d nginx`. Повторите `check-https.sh`: строка «HSTS включён».

### Продление

Сервис `certbot` раз в 12 часов выполняет `certbot renew --webroot` (продление за 30 дней до окончания). Nginx перечитывает сертификат раз в 6 часов. Ручная перезагрузка:

```bash
docker compose -f infrastructure/docker-compose.prod.yml --env-file .env exec nginx /opt/endemion/nginx-entrypoint.sh reload
```

Монитор (`docs/MONITORING.md`) предупреждает, если до окончания сертификата меньше `MONITOR_CERT_WARN_DAYS` (14) дней.

## Режим behind-proxy: за Caddy на общем сервере

1. Узнайте сеть Docker, в которой работает Caddy, и её подсеть:
   ```bash
   docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' <контейнер caddy>
   docker network inspect <сеть> -f '{{range .IPAM.Config}}{{.Subnet}}{{end}}'
   ```
2. В `.env` Endemion Life: `NGINX_MODE=behind-proxy`, `PROXY_NETWORK=<сеть>`, `REAL_IP_FROM=<подсеть>`, `HSTS_MAX_AGE=0`.
3. Запуск с дополнением (Nginx не публикует порты, certbot выключен):
   ```bash
   docker compose -f infrastructure/docker-compose.prod.yml -f infrastructure/docker-compose.behind-proxy.yml --env-file .env up -d --build
   ```
4. В Caddyfile сайта endemion.online добавьте блок и перезагрузите Caddy (`docker compose exec <caddy> caddy reload --config /etc/caddy/Caddyfile`):
   ```
   life.endemion.online {
       reverse_proxy endemion-life-nginx:80
   }
   ```
   Caddy сам получит сертификат и перенаправит HTTP на HTTPS. Заголовок `X-Forwarded-For` от клиентов Caddy не доверяет и выставляет сам; Nginx берёт адрес клиента из него только для подсети `REAL_IP_FROM`.
5. `sh infrastructure/scripts/check-https.sh https://life.endemion.online`, затем HSTS — как в шаге 6 выше (заголовок добавляет Nginx).

Изменение Caddyfile затрагивает рабочий сайт endemion.online: перед `caddy reload` проверьте конфигурацию (`caddy validate`) и держите копию прежнего файла.

## Параметры TLS

`infrastructure/nginx/snippets/tls-params.conf` — профиль Mozilla intermediate: TLS 1.2 и 1.3, только AEAD-шифры с прямой секретностью, `ssl_session_tickets off`. OCSP stapling не включён: Let's Encrypt прекратил OCSP в 2025 году. Запросы к другим именам: HTTP — `444` (соединение закрывается), HTTPS — `ssl_reject_handshake`.

## Защита запросов (проверено)

| Что | Где | Значение |
| --- | --- | --- |
| Cookie сессии `el_session` | API | `HttpOnly`, `SameSite=Lax`, `Secure` при `COOKIE_SECURE=true`, `Path=/`, 365 дней |
| CORS / CSRF | API (`RequestGuard`) | Изменяющие запросы — только `application/json` и только с `Origin` из `CORS_ORIGINS`; иначе 403/415 |
| Доверие прокси | API `TRUST_PROXY=loopback, uniquelocal`; Nginx заменяет `X-Forwarded-For` на `$remote_addr` | Подставить чужой IP своим заголовком нельзя |
| Размер тела | Nginx `client_max_body_size 32k`, API 16 КБ | 413 |
| Лимиты | Nginx: `/api/` 30 запросов/с (burst 60), `/api/auth/` 30/мин (burst 10). API: `RATE_LIMIT_PER_MINUTE` (Redis), `AUTH_RATE_LIMIT_PER_MINUTE` на IP и на почту (Redis или память) | 429 |
| Заголовки | Nginx | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS после включения; версия Nginx скрыта |
| Секреты | Журналы API | Пароли, токены, cookie, DSN, пароли в URL заменяются на `[redacted]` |

## Разработка

Локально всё по HTTP: `pnpm dev`, `COOKIE_SECURE` по умолчанию `false` вне `NODE_ENV=production`, Nginx не нужен. Настройки разработки — `.env.example`, рабочей среды — `infrastructure/env.production.example`.

## Что проверено (локально, не на сервере)

Стек `docker-compose.prod.yml` с `DOMAIN=localhost`, порты 8088/8443, самоподписанный сертификат в томе `letsencrypt`:

- без сертификата — режим bootstrap, HTTP 503; после появления файлов сертификата Nginx сам перешёл в tls;
- `CHECK_INSECURE=1 HTTP_PORT=8088 sh infrastructure/scripts/check-https.sh https://localhost:8443` — все проверки OK: health 200, редирект HTTP→HTTPS с сохранением пути, заголовки, cookie `HttpOnly; Secure; SameSite=Lax`, чужой Origin — 403, TLS 1.0/1.1 отклонены, TLS 1.3 работает;
- HSTS появляется только после `HSTS_MAX_AGE>0`;
- чужой `Host` по HTTP — 444, неизвестное имя по HTTPS — рукопожатие отклонено.

На сервере (2026-11-03): режим behind-proxy за Caddy 2.11.7, сертификат Let's Encrypt (YE2), `check-https.sh https://life.endemion.online` — все OK. Caddy отвечает на HTTP редиректом `308`, а не `301`; скрипт принимает оба. Адрес клиента доходит до API (проверено по журналу). Режим tls (свой certbot) на сервере не применялся.
