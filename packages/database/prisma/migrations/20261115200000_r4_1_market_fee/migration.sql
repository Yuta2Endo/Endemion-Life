-- R4.1: seller-side market fee as an economic sink.
ALTER TABLE "market_trades"
  ADD COLUMN "fee" INTEGER NOT NULL DEFAULT 0;
