-- Stage 05: multiplayer foundation. Additive only.
CREATE TABLE "world_contributions" (
    "id" UUID NOT NULL,
    "world_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "action_id" UUID NOT NULL,
    "season" INTEGER NOT NULL,
    "target_kind" VARCHAR(16) NOT NULL,
    "target_id" VARCHAR(48) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "world_contributions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "player_reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" VARCHAR(32) NOT NULL,
    "details" VARCHAR(500),
    "status" VARCHAR(16) NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "player_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "world_contributions_player_id_action_id_key" ON "world_contributions"("player_id", "action_id");
CREATE UNIQUE INDEX "world_contributions_world_id_player_id_season_key" ON "world_contributions"("world_id", "player_id", "season");
CREATE INDEX "world_contributions_world_id_season_idx" ON "world_contributions"("world_id", "season");
CREATE INDEX "player_reports_target_id_created_at_idx" ON "player_reports"("target_id", "created_at");
CREATE INDEX "player_reports_status_created_at_idx" ON "player_reports"("status", "created_at");

ALTER TABLE "world_contributions" ADD CONSTRAINT "world_contributions_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "world_contributions" ADD CONSTRAINT "world_contributions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Actor ids for account-driven world commands need the full UUID (36 chars + prefix).
ALTER TABLE "world_commands" ALTER COLUMN "actor" TYPE VARCHAR(64);
ALTER TABLE "world_audits" ALTER COLUMN "actor" TYPE VARCHAR(64);
