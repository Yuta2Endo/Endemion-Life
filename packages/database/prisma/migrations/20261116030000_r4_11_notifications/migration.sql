-- R4.11: persistent in-app player notifications. Additive only.
CREATE TABLE "player_notifications" (
  "id" UUID NOT NULL,
  "player_id" UUID NOT NULL,
  "kind" VARCHAR(24) NOT NULL,
  "contract_id" UUID,
  "data" JSONB NOT NULL DEFAULT '{}',
  "read_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "player_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "player_notifications_player_id_created_at_idx"
  ON "player_notifications" ("player_id", "created_at" DESC);

CREATE INDEX "player_notifications_player_id_read_at_idx"
  ON "player_notifications" ("player_id", "read_at");
