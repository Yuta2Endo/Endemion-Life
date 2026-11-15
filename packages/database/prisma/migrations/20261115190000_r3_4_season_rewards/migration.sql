-- R3.4: season goal rewards. Additive only.
ALTER TABLE "world_seasons"
  ADD COLUMN "goals_met" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reward_pool" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "world_contributions"
  ADD COLUMN "reward_claimed_at" TIMESTAMPTZ(3),
  ADD COLUMN "reward_amount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reward_action_id" UUID;
