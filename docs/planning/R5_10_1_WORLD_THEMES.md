# R5.10.1 — Оригинальные темы миров

**Статус:** COMPLETE AND DEPLOYED (2026-11-16 00:49 UTC)  
**Save schema:** 14 (без изменений)  
**DB migration:** нет  
**Затронут только web**

## 1. Что добавлено

- Шесть оригинальных ambient-петель, собранных в LMMS 1.2.2:
  - отдельная тональность, темп, гармония и мотив для каждого мира;
  - дроны, подложка, мотив, воздушный слой, пульс или контрапункт;
  - полный рендер 8 тактов, двухсекундный кроссфейд хвоста в начало;
  - нормализация до **−20.00 dBFS RMS**, потолок пика 0.89;
  - экспорт в OGG Vorbis 128 kbps, 44.1 kHz, stereo.
- Ассеты лежат в `apps/web/public/audio/worlds/` и загружаются только для текущего мира.
- `AmbientEngine` теперь:
  - загружает и декодирует OGG через Web Audio;
  - зацикливает петлю без разрыва;
  - плавно переключает миры;
  - останавливается с затуханием при выключении звука и размонтировании.
- Переключатель звука сохраняет выбор в `localStorage` (`endemion-world-sound`), остаётся 44×44 px с `aria-label` и `aria-pressed`.

## 2. Треки

| Мир | BPM | Петля | OGG |
|---|---:|---:|---:|
| dark-fantasy | 56 | 34.284 s | 589 148 B |
| isekai | 84 | 22.857 s | 404 032 B |
| murim | 72 | 26.665 s | 465 760 B |
| xianxia | 60 | 32.000 s | 552 074 B |
| hunter | 96 | 19.998 s | 357 507 B |
| academy | 88 | 21.818 s | 387 163 B |

Итого около **2.75 MB**; в сеть попадает только тема текущего мира.

## 3. Файлы

- `apps/web/public/audio/worlds/*.ogg` — шесть ассетов.
- `apps/web/src/lib/ambient-audio.ts` — загрузка, декодирование, зацикливание и переключение.
- `apps/web/src/lib/ambient-audio.test.ts` — проверка URL, наличия и размера ассетов, fallback и настроек.
- `apps/web/src/components/play/sound-toggle.tsx` — запуск и остановка нового движка.
- `docs/planning/R5_10_WORLD_SOUND.md` — ограничение о синтезе обновлено.

## 4. Проверка

| Проверка | Результат |
|---|---|
| Web tests | **13 файлов / 36 тестов** PASS |
| Web typecheck | PASS |
| Web lint | 0 ошибок, 2 прежних warning `react-hooks/exhaustive-deps` |
| Web build | PASS, 12 маршрутов |
| Браузерное декодирование | все 6 OGG, stereo, длительности совпадают |
| Content-Type ассетов | `audio/ogg` |
| API / game-core / Prisma | без изменений |
| Save schema | 14 |
| DB migration | нет |

## 5. Ограничения

- Нет отдельных SFX на события, выборы и переходы.
- Нет регулятора громкости и микшера.
- Ambient работает только на экране игры, не на всех страницах.
- Браузерная политика autoplay требует жеста; после включения может понадобиться ещё один клик.
- Нет Android WebView smoke и Lighthouse-проверки звука.
- Петли короткие (20–34 s), без вариативных слоёв внутри трека.

## 6. Деплой

- Code commit **`393428f`**; production runtime **`393428f`**.
- Deploy run **43780417166**, success.
- CI **43780004658** success; Security **43780004776** success.
- Deploy history:
  - `2026-11-16T00:48:57Z deploy-start 393428f... from 7542757...`
  - `2026-11-16T00:49:26Z deploy 393428f... ok from 7542757...`
- Production migrations remain **26**; save schema 14.
- `/api/health` 200, database/redis up; `/api/contracts?universeId=hunter` 200; guest `/api/notifications` 401; web `/` 200.
- `/audio/worlds/dark-fantasy.ogg` 200, `Content-Type: audio/ogg`, 589 148 bytes.
- Rollback target **`7542757`**.

## 7. Откат

Миграций нет. Достаточно откатить web-коммит R5.10.1 и удалить аудиоассеты; сохранения и API не затрагиваются.
