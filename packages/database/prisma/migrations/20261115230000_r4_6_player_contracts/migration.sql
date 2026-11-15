-- R4.6: escrowed player-to-player goods contract. Additive only.
CREATE TABLE "player_contracts" (
  "id" UUID NOT NULL,
  "seller_player_id" UUID NOT NULL,
  "seller_life_id" UUID NOT NULL,
  "universe_id" VARCHAR(32) NOT NULL,
  "good_id" VARCHAR(48) NOT NULL,
  "qty" INTEGER NOT NULL,
  "price" INTEGER NOT NULL,
  "status" VARCHAR(12) NOT NULL DEFAULT 'open',
  "action_id" UUID NOT NULL,
  "buyer_player_id" UUID,
  "buyer_life_id" UUID,
  "accept_action_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accepted_at" TIMESTAMPTZ(3),
  "cancelled_at" TIMESTAMPTZ(3),
  CONSTRAINT "player_contracts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "player_contracts_status_check" CHECK ("status" IN ('open', 'accepted', 'cancelled')),
  CONSTRAINT "player_contracts_qty_check" CHECK ("qty" > 0 AND "qty" <= 5),
  CONSTRAINT "player_contracts_price_check" CHECK ("price" > 0)
);
CREATE UNIQUE INDEX "player_contracts_seller_life_id_action_id_key" ON "player_contracts"("seller_life_id", "action_id");
CREATE UNIQUE INDEX "player_contracts_buyer_life_id_accept_action_id_key" ON "player_contracts"("buyer_life_id", "accept_action_id");
CREATE INDEX "player_contracts_universe_id_status_created_at_idx" ON "player_contracts"("universe_id", "status", "created_at");
CREATE INDEX "player_contracts_seller_player_id_status_idx" ON "player_contracts"("seller_player_id", "status");
ALTER TABLE "player_contracts" ADD CONSTRAINT "player_contracts_seller_player_id_fkey" FOREIGN KEY ("seller_player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "player_contracts" ADD CONSTRAINT "player_contracts_buyer_player_id_fkey" FOREIGN KEY ("buyer_player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "player_contracts" ADD CONSTRAINT "player_contracts_seller_life_id_fkey" FOREIGN KEY ("seller_life_id") REFERENCES "lives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "player_contracts" ADD CONSTRAINT "player_contracts_buyer_life_id_fkey" FOREIGN KEY ("buyer_life_id") REFERENCES "lives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
