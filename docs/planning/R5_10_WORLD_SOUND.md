# R5.10 — «Мир, который слышно»

**Статус:** COMPLETE AND DEPLOYED (2026-11-15 22:12 UTC)  
**Save schema:** 14 (без изменений)  
**DB migration:** нет  
**Затронут только web**

## 1. Что добавлено

- Синтезированный ambient-звук для каждого из шести миров на Web Audio API, без бинарных ассетов:
  - свой корневой тон, квинта, шиммер, фильтр, шум и пульс;
  - три дрона, фильтрованный шум, медленная LFO и редкий «звон»;
  - плавное появление и затухание.
- Переключатель звука в шапке жизни:
  - 44×44 px;
  - `aria-label`, `aria-pressed`, `title`;
  - иконки включённого и выключенного звука;
  - выбор сохраняется в `localStorage` под ключом `endemion-world-sound`.
- Автозапуск после первого жеста пользователя, если звук был включён ранее; остановка при выключении и размонтировании.
- Визуальная атмосфера мира:
  - класс `world-atmosphere` и `data-world` на экране игры;
  - мягкие градиенты и медленное движение для каждого мира;
  - `prefers-reduced-motion` отключает анимации.
- Тесты на полноту шести профилей, fallback и сохранение настройки.

## 2. Файлы

- `apps/web/src/lib/ambient-audio.ts`
- `apps/web/src/lib/ambient-audio.test.ts`
- `apps/web/src/lib/sound-preference.ts`
- `apps/web/src/components/play/sound-toggle.tsx`
- `apps/web/src/components/icons.tsx`
- `apps/web/src/components/play/life-desk-header.tsx`
- `apps/web/src/components/play/play-screen.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/lib/messages.ts`

## 3. Проверка

| Проверка | Результат |
|---|---|
| Web tests | **13 файлов / 36 тестов** PASS |
| Web typecheck | PASS |
| Web lint | 0 ошибок, 2 прежних warning `react-hooks/exhaustive-deps` |
| Web build | PASS, 12 маршрутов |
| API / game-core / Prisma | без изменений |
| Save schema | 14 |
| DB migration | нет |

## 4. Деплой

- Code commit **`7542757`**; production runtime **`7542757`**.
- Deploy run **43767637700**, success; environment `26274376808` approved.
- CI **43767063135** success; Security **43767063146** success.
- Deploy history:
  - `2026-11-15T22:11:57Z deploy-start 7542757... from db43727...`
  - `2026-11-15T22:12:25Z deploy 7542757... ok from db43727...`
- Production migrations remain **26**; save schema 14.
- `/api/health` 200, database/redis up; `/api/contracts?universeId=hunter` 200; guest `/api/notifications` 401; web `/` 200.
- Rollback target **`db43727`**.

## 5. Ограничения

- В R5.10 звук был синтезированным; в R5.10.1 добавлены оригинальные LMMS-петли и аудиоассеты.
- Нет отдельных SFX на события, выборы и переходы.
- Нет регулятора громкости и микшера.
- Ambient работает только на экране игры, не на всех страницах.
- Браузерная политика autoplay требует жеста; после включения может понадобиться ещё один клик.
- Нет Android WebView smoke и Lighthouse-проверки звука.

## 6. Откат

Миграций нет. Достаточно откатить web-коммит R5.10; сохранения и API не затрагиваются.
