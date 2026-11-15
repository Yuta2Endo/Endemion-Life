-- R4.9: auctions with bids. Additive only.
ALTER TABLE "player_contracts"
  ADD COLUMN "kind" VARCHAR(10) NOT NULL DEFAULT 'fixed',
  ADD COLUMN "min_bid" INTEGER,
  ADD COLUMN "current_bid" INTEGER,
  ADD COLUMN "current_bidder_player_id" UUID,
  ADD COLUMN "current_bidder_life_id" UUID,
  ADD COLUMN "auction_ends_at" TIMESTAMPTZ(3);
ALTER TABLE "player_contracts"
  ADD CONSTRAINT "player_contracts_kind_check" CHECK ("kind" IN ('fixed', 'auction')),
  ADD CONSTRAINT "player_contracts_bid_check" CHECK ("current_bid" IS NULL OR "min_bid" IS NULL OR "current_bid" >= "min_bid");
