-- Stage 04 — Living Worlds: общий мир сервера. Только новые таблицы и индексы.
-- Жизни, их сохранения и прежние проекции не меняются. Одна строка worlds на вселенную.

CREATE TABLE "worlds" (
  "id" UUID NOT NULL,
  "universe_id" VARCHAR(32) NOT NULL,
  "seed" VARCHAR(64) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "season" INTEGER NOT NULL,
  "checksum" VARCHAR(32) NOT NULL,
  "state" JSONB NOT NULL,
  "last_tick_duration_ms" INTEGER NOT NULL DEFAULT 0,
  "last_tick_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "worlds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "worlds_universe_id_key" ON "worlds"("universe_id");
ALTER TABLE "worlds" ADD CONSTRAINT "worlds_season_positive" CHECK ("season" >= 1);
ALTER TABLE "worlds" ADD CONSTRAINT "worlds_tick_duration_nonneg" CHECK ("last_tick_duration_ms" >= 0);

CREATE TABLE "world_seasons" (
  "id" UUID NOT NULL,
  "world_id" UUID NOT NULL,
  "season" INTEGER NOT NULL,
  "checksum" VARCHAR(32) NOT NULL,
  "state" JSONB NOT NULL,
  "duration_ms" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "world_seasons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "world_seasons_world_id_season_key" ON "world_seasons"("world_id", "season");
CREATE INDEX "world_seasons_world_id_season_idx" ON "world_seasons"("world_id", "season");
ALTER TABLE "world_seasons" ADD CONSTRAINT "world_seasons_season_positive" CHECK ("season" >= 1);
ALTER TABLE "world_seasons" ADD CONSTRAINT "world_seasons_duration_nonneg" CHECK ("duration_ms" >= 0);

CREATE TABLE "settlements" (
  "id" UUID NOT NULL,
  "world_id" UUID NOT NULL,
  "settlement_id" VARCHAR(48) NOT NULL,
  "name_ru" VARCHAR(120) NOT NULL,
  "name_en" VARCHAR(120) NOT NULL,
  "kind" VARCHAR(16) NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "wage_factor" DOUBLE PRECISION NOT NULL,
  "cost_factor" DOUBLE PRECISION NOT NULL,
  "travel_cost" INTEGER NOT NULL,
  "population" INTEGER NOT NULL,
  "prosperity" INTEGER NOT NULL,
  "stability" INTEGER NOT NULL,
  "dominant_faction_id" VARCHAR(48),
  "goods" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "settlements_world_id_settlement_id_key" ON "settlements"("world_id", "settlement_id");
CREATE INDEX "settlements_world_id_idx" ON "settlements"("world_id");
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_population_range" CHECK ("population" >= 100 AND "population" <= 1000000);
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_prosperity_range" CHECK ("prosperity" >= 0 AND "prosperity" <= 100);
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_stability_range" CHECK ("stability" >= 0 AND "stability" <= 100);

CREATE TABLE "factions" (
  "id" UUID NOT NULL,
  "world_id" UUID NOT NULL,
  "faction_id" VARCHAR(48) NOT NULL,
  "name_ru" VARCHAR(120) NOT NULL,
  "name_en" VARCHAR(120) NOT NULL,
  "power" INTEGER NOT NULL,
  "influence" INTEGER NOT NULL,
  "standing" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "factions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "factions_world_id_faction_id_key" ON "factions"("world_id", "faction_id");
CREATE INDEX "factions_world_id_idx" ON "factions"("world_id");
ALTER TABLE "factions" ADD CONSTRAINT "factions_power_range" CHECK ("power" >= 0 AND "power" <= 100);
ALTER TABLE "factions" ADD CONSTRAINT "factions_influence_range" CHECK ("influence" >= -100 AND "influence" <= 100);
ALTER TABLE "factions" ADD CONSTRAINT "factions_standing_range" CHECK ("standing" >= -100 AND "standing" <= 100);

CREATE TABLE "world_events" (
  "id" VARCHAR(96) NOT NULL,
  "world_id" UUID NOT NULL,
  "season" INTEGER NOT NULL,
  "kind" VARCHAR(16) NOT NULL,
  "title_ru" VARCHAR(160) NOT NULL,
  "title_en" VARCHAR(160) NOT NULL,
  "text_ru" VARCHAR(600) NOT NULL,
  "text_en" VARCHAR(600) NOT NULL,
  "settlement_id" VARCHAR(48),
  "faction_id" VARCHAR(48),
  "severity" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "world_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "world_events_world_id_season_idx" ON "world_events"("world_id", "season");
CREATE INDEX "world_events_world_id_created_at_idx" ON "world_events"("world_id", "created_at");
ALTER TABLE "world_events" ADD CONSTRAINT "world_events_season_positive" CHECK ("season" >= 1);
ALTER TABLE "world_events" ADD CONSTRAINT "world_events_severity_range" CHECK ("severity" >= 1 AND "severity" <= 5);

CREATE TABLE "world_commands" (
  "id" UUID NOT NULL,
  "world_id" UUID NOT NULL,
  "seq" INTEGER NOT NULL,
  "type" VARCHAR(16) NOT NULL,
  "payload" JSONB NOT NULL,
  "season_before" INTEGER NOT NULL,
  "season_after" INTEGER NOT NULL,
  "checksum" VARCHAR(32) NOT NULL,
  "actor" VARCHAR(32) NOT NULL DEFAULT 'ops',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "world_commands_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "world_commands_world_id_seq_key" ON "world_commands"("world_id", "seq");
CREATE INDEX "world_commands_world_id_created_at_idx" ON "world_commands"("world_id", "created_at");
ALTER TABLE "world_commands" ADD CONSTRAINT "world_commands_seq_positive" CHECK ("seq" >= 1);
ALTER TABLE "world_commands" ADD CONSTRAINT "world_commands_season_after_positive" CHECK ("season_after" >= 1);

CREATE TABLE "world_audits" (
  "id" UUID NOT NULL,
  "world_id" UUID NOT NULL,
  "action" VARCHAR(48) NOT NULL,
  "actor" VARCHAR(32) NOT NULL DEFAULT 'ops',
  "detail" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "world_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "world_audits_world_id_created_at_idx" ON "world_audits"("world_id", "created_at");

ALTER TABLE "world_seasons" ADD CONSTRAINT "world_seasons_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "factions" ADD CONSTRAINT "factions_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "world_events" ADD CONSTRAINT "world_events_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "world_commands" ADD CONSTRAINT "world_commands_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "world_audits" ADD CONSTRAINT "world_audits_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
