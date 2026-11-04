-- Stage 03: поколения рода. Только добавление: данные и прежние столбцы не меняются, прежний код новых столбцов не читает.
-- lineage_id — id жизни основателя рода (NULL у жизней до Stage 03: их род — они сами), generation — поколение,
-- predecessor_id — жизнь, после которой эта продолжила род. Уникальность predecessor_id не даёт создать двух наследников
ALTER TABLE "lives" ADD COLUMN "lineage_id" UUID;
ALTER TABLE "lives" ADD COLUMN "generation" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "lives" ADD COLUMN "predecessor_id" UUID;

CREATE UNIQUE INDEX "lives_predecessor_id_key" ON "lives"("predecessor_id");
CREATE INDEX "lives_lineage_id_generation_idx" ON "lives"("lineage_id", "generation");

ALTER TABLE "lives" ADD CONSTRAINT "lives_predecessor_id_fkey" FOREIGN KEY ("predecessor_id") REFERENCES "lives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
