# Работа с Git

## Состояние

- Репозиторий инициализирован 2026-11-02, основная ветка `main`.
- Автор коммитов задан в настройках этого репозитория (`git config user.name/user.email`), как в проекте Endemion: `Yuta2Endo <71448123+Yuta2Endo@users.noreply.github.com>`.
- Удалённый репозиторий **не подключён**. GitHub CLI на машине разработки не установлен. Публикация — только после решения владельца (см. ниже).

## Что не попадает в Git

`.gitignore` исключает:

| Что | Шаблон |
| --- | --- |
| Пароли и ключи | `.env`, `.env.*` (кроме `.env.example`), `*.pem`, `*.key`, `*.crt` |
| Зависимости и сборка | `node_modules/`, `dist/`, `.next/`, `out/`, `coverage/`, `*.tsbuildinfo` |
| Сгенерированный Prisma Client | `packages/database/src/generated/` |
| Резервные копии базы | `backups/`, `*.dump`, `*.dump.sha256`, `*.sql.gz` |
| Письма в файлах (разработка) | `.mail-outbox/` |
| Временные файлы и отчёты тестов | `.shots/`, `tmp/`, `*.tmp`, `test-results/`, `playwright-report/`, `*.log` |

`.env.example` хранится в репозитории и содержит только значения для локальной разработки, без реальных паролей.

`.gitattributes` переводит текстовые файлы в LF. Скрипты резервного копирования и конфигурации запускаются на Linux, где CRLF ломает `#!/bin/sh` и cron.

## Проверка перед коммитом

```bash
git status --short                     # нет ли лишних файлов
git diff --cached --stat               # что именно попадёт в коммит
git grep --cached -nIE "BEGIN .*PRIVATE KEY|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36}"
pnpm check                             # lint, typecheck, тесты, сборка
```

В CI секреты дополнительно ищет gitleaks (`.github/workflows/security.yml`).

## Ветки и коммиты

- `main` — всегда рабочее состояние. Прямые коммиты в `main` только до появления удалённого репозитория.
- Новая работа — в ветке `feature/<кратко>` или `fix/<кратко>`, слияние через pull request после зелёного CI.
- Сообщение коммита: первая строка до 72 символов, в повелительном наклонении («Add backups», «Fix cookie flags»). Ниже, после пустой строки, — что и зачем изменено.
- Один коммит — одна законченная задача, которая сама по себе проходит `pnpm check`.
- Миграции Prisma коммитятся вместе с изменением `schema.prisma`. Уже применённые на сервере миграции не редактируются.

## Запрещено

- `git push --force` в `main` и в чужие ветки.
- Переписывание опубликованной истории (`rebase`, `commit --amend` после push).
- Коммит `.env`, дампов базы, сертификатов.

Если секрет всё же попал в коммит: считать его скомпрометированным и сменить (пароль базы, SMTP-пароль, ключи S3, токен бота оповещений, DSN Sentry), а уже затем чистить историю.

## Подключение GitHub (после решения владельца)

```bash
# 1. Создать пустой приватный репозиторий на GitHub (без README и .gitignore)
# 2. Подключить и отправить
git remote add origin git@github.com:Yuta2Endo/endemion-life.git
git push -u origin main
```

После первой отправки в настройках репозитория:

1. **Branch protection** для `main`: запрет прямого push, обязательный pull request, запрет force push и удаления ветки. Обязательные проверки (имена задач из `.github/workflows/ci.yml` и `security.yml`): `Lint, typecheck, unit tests, build`, `API tests and migrations (PostgreSQL, Redis)`, `Browser tests (Playwright)`, `Docker build (migrate)`, `Docker build (api)`, `Docker build (web)`, `Docker build (nginx)`, `Docker build (backup)`, `Docker build (monitor)`, `Compose files are valid`, `Dependency audit (production)`, `Secrets in Git history (gitleaks)`, `Shell scripts and workflows`.
2. **Secrets**: в CI секреты не нужны — тесты используют одноразовые PostgreSQL и Redis внутри GitHub Actions.
3. **Dependabot alerts** и **secret scanning** — включить.
