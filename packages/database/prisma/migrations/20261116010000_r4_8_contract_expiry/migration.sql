-- R4.8: allow expired player contracts.
ALTER TABLE "player_contracts" DROP CONSTRAINT IF EXISTS "player_contracts_status_check";
ALTER TABLE "player_contracts"
  ADD CONSTRAINT "player_contracts_status_check"
  CHECK ("status" IN ('open', 'accepted', 'cancelled', 'expired'));
