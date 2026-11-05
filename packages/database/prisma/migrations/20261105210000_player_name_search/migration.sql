-- Stage 13: поиск игрока по точному имени без учёта регистра.
-- Запрос: lower(column) = lower($1). Обычный btree по колонке его не берёт.
-- Частичный: гости без имени в индекс не попадают. Данные строк не меняются.
CREATE INDEX "players_id_display_name_lower_idx" ON "players" (lower("id_display_name")) WHERE "id_display_name" IS NOT NULL;
CREATE INDEX "players_id_username_lower_idx" ON "players" (lower("id_username")) WHERE "id_username" IS NOT NULL;
