# R5.10 — «Мир, который слышно»

**Статус:** реализовано и проверено локально; релиз ожидает деплоя  
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

## 4. Ограничения

- Звук синтезированный, без записанной музыки и без аудио-ассетов.
- Нет отдельных SFX на события, выборы и переходы.
- Нет регулятора громкости и микшера.
- Ambient работает только на экране игры, не на всех страницах.
- Браузерная политика autoplay требует жеста; после включения может понадобиться ещё один клик.
- Нет Android WebView smoke и Lighthouse-проверки звука.

## 5. Откат

Миграций нет. Достаточно откатить web-коммит R5.10; сохранения и API не затрагиваются.
