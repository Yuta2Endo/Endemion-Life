-- R2.2: family inheritance consent and shared treasury. Additive only.
ALTER TABLE "family_members"
  ADD COLUMN "accepts_inheritance" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "family_treasury_entries" (
  "id" UUID NOT NULL,
  "family_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "action_id" UUID NOT NULL,
  "direction" VARCHAR(8) NOT NULL,
  "amount" INTEGER NOT NULL,
  "balance_after" INTEGER NOT NULL,
  "note" VARCHAR(160) NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "family_treasury_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "family_treasury_entries_direction_check" CHECK ("direction" IN ('deposit', 'withdraw')),
  CONSTRAINT "family_treasury_entries_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "family_treasury_entries_balance_check" CHECK ("balance_after" >= 0)
);

CREATE UNIQUE INDEX "family_treasury_entries_family_id_action_id_key"
  ON "family_treasury_entries"("family_id", "action_id");
CREATE INDEX "family_treasury_entries_family_id_created_at_idx"
  ON "family_treasury_entries"("family_id", "created_at");

ALTER TABLE "family_treasury_entries"
  ADD CONSTRAINT "family_treasury_entries_family_id_fkey"
  FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "family_treasury_entries"
  ADD CONSTRAINT "family_treasury_entries_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
