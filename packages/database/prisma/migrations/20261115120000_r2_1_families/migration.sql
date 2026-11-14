-- R2.1: account-level families (social shell). Additive only.
CREATE TABLE "families" (
  "id" UUID NOT NULL,
  "universe_id" VARCHAR(32) NOT NULL,
  "name" VARCHAR(40) NOT NULL,
  "name_key" VARCHAR(40) NOT NULL,
  "motto" VARCHAR(80) NOT NULL DEFAULT '',
  "description" VARCHAR(500) NOT NULL DEFAULT '',
  "visibility" VARCHAR(10) NOT NULL DEFAULT 'public',
  "leader_id" UUID NOT NULL,
  "reputation" INTEGER NOT NULL DEFAULT 0,
  "treasury" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "family_members" (
  "id" UUID NOT NULL,
  "family_id" UUID NOT NULL,
  "player_id" UUID NOT NULL,
  "universe_id" VARCHAR(32) NOT NULL,
  "role" VARCHAR(10) NOT NULL DEFAULT 'member',
  "contribution" INTEGER NOT NULL DEFAULT 0,
  "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "family_invites" (
  "id" UUID NOT NULL,
  "family_id" UUID NOT NULL,
  "inviter_id" UUID NOT NULL,
  "invitee_id" UUID NOT NULL,
  "status" VARCHAR(10) NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decided_at" TIMESTAMPTZ(3),
  CONSTRAINT "family_invites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "family_audits" (
  "id" UUID NOT NULL,
  "family_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "action" VARCHAR(32) NOT NULL,
  "detail" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "family_audits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "families_universe_id_name_key_key" ON "families"("universe_id", "name_key");
CREATE INDEX "families_universe_id_reputation_idx" ON "families"("universe_id", "reputation");
CREATE UNIQUE INDEX "family_members_player_id_universe_id_key" ON "family_members"("player_id", "universe_id");
CREATE UNIQUE INDEX "family_members_family_id_player_id_key" ON "family_members"("family_id", "player_id");
CREATE INDEX "family_members_family_id_role_idx" ON "family_members"("family_id", "role");
CREATE UNIQUE INDEX "family_invites_family_id_invitee_id_key" ON "family_invites"("family_id", "invitee_id");
CREATE INDEX "family_invites_invitee_id_status_created_at_idx" ON "family_invites"("invitee_id", "status", "created_at");
CREATE INDEX "family_audits_family_id_created_at_idx" ON "family_audits"("family_id", "created_at");

ALTER TABLE "families" ADD CONSTRAINT "families_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_audits" ADD CONSTRAINT "family_audits_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_audits" ADD CONSTRAINT "family_audits_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "families" ADD CONSTRAINT "families_visibility_check" CHECK ("visibility" IN ('public', 'invite'));
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_role_check" CHECK ("role" IN ('leader', 'elder', 'member'));
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_status_check" CHECK ("status" IN ('pending', 'accepted', 'declined', 'cancelled'));
