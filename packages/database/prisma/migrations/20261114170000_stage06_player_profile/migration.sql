-- Stage 06.3: player profile fields. Additive only; existing identities are untouched.
ALTER TABLE "players"
  ADD COLUMN "headline" VARCHAR(48) NOT NULL DEFAULT '',
  ADD COLUMN "bio" VARCHAR(280) NOT NULL DEFAULT '',
  ADD COLUMN "favorite_universe_id" VARCHAR(32),
  ADD COLUMN "profile_visibility" VARCHAR(10) NOT NULL DEFAULT 'public',
  ADD COLUMN "profile_updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "players"
  ADD CONSTRAINT "players_profile_visibility_check"
  CHECK ("profile_visibility" IN ('public', 'friends', 'private'));
