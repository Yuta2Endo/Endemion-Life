-- R4.7: private contract targets, expiry and restore guards.
ALTER TABLE "player_contracts"
  ADD COLUMN "target_player_id" UUID,
  ADD COLUMN "seller_version_after" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "buyer_version_after" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "expires_at" TIMESTAMPTZ(3);
CREATE INDEX "player_contracts_target_player_id_status_idx" ON "player_contracts"("target_player_id", "status");
