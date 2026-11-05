-- Stage 07: связи игроков. Только новая таблица: прежние данные не меняются.
-- player_a всегда меньше player_b, уникальность не даёт завести пару дважды.
CREATE TABLE "ties" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "player_a" UUID NOT NULL,
  "player_b" UUID NOT NULL,
  "status" VARCHAR(16) NOT NULL,
  "asked_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ties_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ties_player_a_player_b_key" ON "ties"("player_a", "player_b");
CREATE INDEX "ties_player_a_idx" ON "ties"("player_a");
CREATE INDEX "ties_player_b_idx" ON "ties"("player_b");

ALTER TABLE "ties" ADD CONSTRAINT "ties_player_a_fkey" FOREIGN KEY ("player_a") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ties" ADD CONSTRAINT "ties_player_b_fkey" FOREIGN KEY ("player_b") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
