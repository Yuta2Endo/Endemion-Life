-- CreateTable
CREATE TABLE "market_offers" (
    "id" UUID NOT NULL,
    "seller_player_id" UUID NOT NULL,
    "seller_life_id" UUID NOT NULL,
    "universe_id" VARCHAR(32) NOT NULL,
    "good_id" VARCHAR(48) NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "action_id" UUID NOT NULL,
    "seller_version" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "sold_at" TIMESTAMPTZ(3),

    CONSTRAINT "market_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_trades" (
    "id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "universe_id" VARCHAR(32) NOT NULL,
    "good_id" VARCHAR(48) NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "seller_player_id" UUID NOT NULL,
    "seller_life_id" UUID NOT NULL,
    "buyer_player_id" UUID NOT NULL,
    "buyer_life_id" UUID NOT NULL,
    "buyer_action_id" UUID NOT NULL,
    "seller_version_after" INTEGER NOT NULL,
    "buyer_version_after" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_ledger" (
    "id" UUID NOT NULL,
    "trade_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "life_id" UUID NOT NULL,
    "kind" VARCHAR(8) NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "market_offers_universe_id_status_created_at_idx" ON "market_offers"("universe_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "market_offers_seller_life_id_status_idx" ON "market_offers"("seller_life_id", "status");

-- CreateIndex
CREATE INDEX "market_offers_status_expires_at_idx" ON "market_offers"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "market_offers_seller_life_id_action_id_key" ON "market_offers"("seller_life_id", "action_id");

-- CreateIndex
CREATE UNIQUE INDEX "market_trades_offer_id_key" ON "market_trades"("offer_id");

-- CreateIndex
CREATE INDEX "market_trades_seller_life_id_created_at_idx" ON "market_trades"("seller_life_id", "created_at");

-- CreateIndex
CREATE INDEX "market_trades_buyer_life_id_created_at_idx" ON "market_trades"("buyer_life_id", "created_at");

-- CreateIndex
CREATE INDEX "market_trades_universe_id_created_at_idx" ON "market_trades"("universe_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "market_trades_buyer_life_id_buyer_action_id_key" ON "market_trades"("buyer_life_id", "buyer_action_id");

-- CreateIndex
CREATE INDEX "market_ledger_life_id_created_at_idx" ON "market_ledger"("life_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "market_ledger_trade_id_player_id_kind_key" ON "market_ledger"("trade_id", "player_id", "kind");

-- AddForeignKey
ALTER TABLE "market_offers" ADD CONSTRAINT "market_offers_seller_player_id_fkey" FOREIGN KEY ("seller_player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_offers" ADD CONSTRAINT "market_offers_seller_life_id_fkey" FOREIGN KEY ("seller_life_id") REFERENCES "lives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_trades" ADD CONSTRAINT "market_trades_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "market_offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_trades" ADD CONSTRAINT "market_trades_seller_player_id_fkey" FOREIGN KEY ("seller_player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_trades" ADD CONSTRAINT "market_trades_buyer_player_id_fkey" FOREIGN KEY ("buyer_player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_trades" ADD CONSTRAINT "market_trades_seller_life_id_fkey" FOREIGN KEY ("seller_life_id") REFERENCES "lives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_trades" ADD CONSTRAINT "market_trades_buyer_life_id_fkey" FOREIGN KEY ("buyer_life_id") REFERENCES "lives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_ledger" ADD CONSTRAINT "market_ledger_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "market_trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_ledger" ADD CONSTRAINT "market_ledger_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_ledger" ADD CONSTRAINT "market_ledger_life_id_fkey" FOREIGN KEY ("life_id") REFERENCES "lives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
