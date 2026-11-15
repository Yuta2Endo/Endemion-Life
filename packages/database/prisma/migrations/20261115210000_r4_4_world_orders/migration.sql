-- R4.4: settlement seasonal orders. Additive only.
CREATE TABLE "world_orders" (
  "id" UUID NOT NULL,
  "world_id" UUID NOT NULL,
  "season" INTEGER NOT NULL,
  "slot" INTEGER NOT NULL,
  "settlement_id" VARCHAR(48) NOT NULL,
  "good_id" VARCHAR(48) NOT NULL,
  "qty" INTEGER NOT NULL,
  "reward" INTEGER NOT NULL,
  "status" VARCHAR(10) NOT NULL DEFAULT 'open',
  "fulfilled_by_player_id" UUID,
  "fulfilled_by_life_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fulfilled_at" TIMESTAMPTZ(3),
  CONSTRAINT "world_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "world_orders_status_check" CHECK ("status" IN ('open', 'fulfilled', 'expired')),
  CONSTRAINT "world_orders_qty_check" CHECK ("qty" > 0),
  CONSTRAINT "world_orders_reward_check" CHECK ("reward" >= 0)
);
CREATE UNIQUE INDEX "world_orders_world_id_season_slot_key" ON "world_orders"("world_id", "season", "slot");
CREATE INDEX "world_orders_world_id_season_status_idx" ON "world_orders"("world_id", "season", "status");
ALTER TABLE "world_orders" ADD CONSTRAINT "world_orders_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "world_orders" ADD CONSTRAINT "world_orders_fulfilled_by_player_id_fkey" FOREIGN KEY ("fulfilled_by_player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "world_orders" ADD CONSTRAINT "world_orders_fulfilled_by_life_id_fkey" FOREIGN KEY ("fulfilled_by_life_id") REFERENCES "lives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
