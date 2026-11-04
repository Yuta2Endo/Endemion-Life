-- Stage 02: версия формата сохранения отдельным столбцом. Только добавление: данные и прежние столбцы не меняются.
-- Значение берётся из самого сохранения; у жизней Stage 01 это 1, они переводятся в формат 2 при следующем действии
ALTER TABLE "lives" ADD COLUMN "schema_version" INTEGER NOT NULL DEFAULT 1;

UPDATE "lives"
SET "schema_version" = ("state"->>'schemaVersion')::INTEGER
WHERE jsonb_typeof("state"->'schemaVersion') = 'number';

CREATE INDEX "lives_schema_version_idx" ON "lives"("schema_version");
