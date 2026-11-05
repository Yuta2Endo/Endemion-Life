-- Stage 13: поиск игрока по точному имени без учёта регистра.
-- Запрос Prisma: lower(column) = lower($1). PostgreSQL берёт для него обычный btree (планировщик).
-- Функциональный индекс по lower() Prisma в схеме не описывает, и сверка миграций сочла бы его дрейфом.
CREATE INDEX "players_id_display_name_idx" ON "players"("id_display_name");
CREATE INDEX "players_id_username_idx" ON "players"("id_username");
