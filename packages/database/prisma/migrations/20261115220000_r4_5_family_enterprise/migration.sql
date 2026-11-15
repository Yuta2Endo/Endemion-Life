-- R4.5: family enterprise. Additive only.
CREATE TABLE "family_enterprises" (
  "id" UUID NOT NULL,
  "family_id" UUID NOT NULL,
  "universe_id" VARCHAR(32) NOT NULL,
  "name" VARCHAR(40) NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 1,
  "invested" INTEGER NOT NULL DEFAULT 0,
  "last_collected_season" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "family_enterprises_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "family_enterprises_level_check" CHECK ("level" >= 1 AND "level" <= 5),
  CONSTRAINT "family_enterprises_invested_check" CHECK ("invested" >= 0)
);
CREATE UNIQUE INDEX "family_enterprises_family_id_key" ON "family_enterprises"("family_id");
CREATE INDEX "family_enterprises_universe_id_idx" ON "family_enterprises"("universe_id");
ALTER TABLE "family_enterprises" ADD CONSTRAINT "family_enterprises_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
