-- Stage 15: живые окна. Только новые таблицы. Прежние жизни не меняются.
CREATE TABLE "live_windows" (
  "id" UUID NOT NULL,
  "template_id" VARCHAR(40),
  "slot_key" VARCHAR(80),
  "title_ru" VARCHAR(80) NOT NULL,
  "title_en" VARCHAR(80) NOT NULL,
  "text_ru" VARCHAR(400) NOT NULL,
  "text_en" VARCHAR(400) NOT NULL,
  "status" VARCHAR(16) NOT NULL,
  "worlds" VARCHAR(80) NOT NULL DEFAULT '',
  "min_age" INTEGER NOT NULL DEFAULT 10,
  "goal" INTEGER NOT NULL,
  "per_life" INTEGER NOT NULL DEFAULT 1,
  "gold" INTEGER NOT NULL DEFAULT 0,
  "flag" VARCHAR(40) NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "starts_at" TIMESTAMPTZ(3) NOT NULL,
  "ends_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "live_windows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "live_windows_slot_key_key" ON "live_windows"("slot_key");
CREATE INDEX "live_windows_status_ends_at_idx" ON "live_windows"("status", "ends_at");

CREATE TABLE "live_parts" (
  "id" UUID NOT NULL,
  "window_id" UUID NOT NULL,
  "player_id" UUID NOT NULL,
  "life_id" UUID NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "last_age" INTEGER,
  "claimed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "live_parts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "live_parts_window_id_life_id_key" ON "live_parts"("window_id", "life_id");
CREATE INDEX "live_parts_player_id_idx" ON "live_parts"("player_id");

CREATE TABLE "live_log" (
  "id" UUID NOT NULL,
  "window_id" UUID NOT NULL,
  "actor" VARCHAR(16) NOT NULL,
  "from" VARCHAR(16) NOT NULL,
  "to" VARCHAR(16) NOT NULL,
  "note" VARCHAR(120) NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "live_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "live_log_window_id_created_at_idx" ON "live_log"("window_id", "created_at");

ALTER TABLE "live_windows" ADD CONSTRAINT "live_windows_progress_nonneg" CHECK ("progress" >= 0);
ALTER TABLE "live_parts" ADD CONSTRAINT "live_parts_count_nonneg" CHECK ("count" >= 0);
ALTER TABLE "live_parts" ADD CONSTRAINT "live_parts_window_id_fkey" FOREIGN KEY ("window_id") REFERENCES "live_windows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_parts" ADD CONSTRAINT "live_parts_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_log" ADD CONSTRAINT "live_log_window_id_fkey" FOREIGN KEY ("window_id") REFERENCES "live_windows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
