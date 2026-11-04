-- Stage 04: перенос жизней из браузера. Только добавление: данные и прежние столбцы не меняются, прежний код новых столбцов не читает.
-- origin — откуда жизнь ('server' у всех прежних), import_id — ключ переноса от клиента.
-- Уникальность (player_id, import_id) не даёт повтору переноса создать вторую жизнь; у жизней без переноса import_id = NULL
ALTER TABLE "lives" ADD COLUMN "origin" VARCHAR(16) NOT NULL DEFAULT 'server';
ALTER TABLE "lives" ADD COLUMN "import_id" UUID;

CREATE UNIQUE INDEX "lives_player_id_import_id_key" ON "lives"("player_id", "import_id");
