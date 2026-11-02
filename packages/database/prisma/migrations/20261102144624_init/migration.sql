-- CreateEnum
CREATE TYPE "LifeStatus" AS ENUM ('alive', 'dead');

-- CreateEnum
CREATE TYPE "SnapshotReason" AS ENUM ('create', 'action', 'restore');

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL,
    "session_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lives" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "universe_id" VARCHAR(32) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "seed" VARCHAR(64) NOT NULL,
    "status" "LifeStatus" NOT NULL DEFAULT 'alive',
    "version" INTEGER NOT NULL,
    "age" INTEGER NOT NULL,
    "state" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "lives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "life_snapshots" (
    "id" UUID NOT NULL,
    "life_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "age" INTEGER NOT NULL,
    "reason" "SnapshotReason" NOT NULL,
    "state" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "life_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "history_entries" (
    "id" UUID NOT NULL,
    "life_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "age" INTEGER NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "history_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_actions" (
    "id" UUID NOT NULL,
    "life_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "action_id" UUID NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "payload" JSONB NOT NULL,
    "from_version" INTEGER NOT NULL,
    "to_version" INTEGER NOT NULL,
    "entries" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_session_hash_key" ON "players"("session_hash");

-- CreateIndex
CREATE INDEX "lives_player_id_updated_at_idx" ON "lives"("player_id", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "life_snapshots_life_id_version_key" ON "life_snapshots"("life_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "history_entries_life_id_seq_key" ON "history_entries"("life_id", "seq");

-- CreateIndex
CREATE INDEX "game_actions_player_id_created_at_idx" ON "game_actions"("player_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "game_actions_life_id_action_id_key" ON "game_actions"("life_id", "action_id");

-- AddForeignKey
ALTER TABLE "lives" ADD CONSTRAINT "lives_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "life_snapshots" ADD CONSTRAINT "life_snapshots_life_id_fkey" FOREIGN KEY ("life_id") REFERENCES "lives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history_entries" ADD CONSTRAINT "history_entries_life_id_fkey" FOREIGN KEY ("life_id") REFERENCES "lives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_actions" ADD CONSTRAINT "game_actions_life_id_fkey" FOREIGN KEY ("life_id") REFERENCES "lives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_actions" ADD CONSTRAINT "game_actions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
