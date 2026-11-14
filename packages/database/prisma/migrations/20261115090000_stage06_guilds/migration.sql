-- Stage 06.1: guild / association foundation. Additive only.
CREATE TABLE "guilds" (
    "id" UUID NOT NULL,
    "universe_id" VARCHAR(32) NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "name_key" VARCHAR(40) NOT NULL,
    "description" VARCHAR(500) NOT NULL DEFAULT '',
    "visibility" VARCHAR(10) NOT NULL DEFAULT 'public',
    "leader_id" UUID NOT NULL,
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guilds_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "guilds_universe_id_name_key_key" UNIQUE ("universe_id", "name_key"),
    CONSTRAINT "guilds_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "guild_members" (
    "id" UUID NOT NULL,
    "guild_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "universe_id" VARCHAR(32) NOT NULL,
    "role" VARCHAR(10) NOT NULL DEFAULT 'member',
    "contributed" INTEGER NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guild_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "guild_members_player_id_universe_id_key" UNIQUE ("player_id", "universe_id"),
    CONSTRAINT "guild_members_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guild_members_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "guild_join_requests" (
    "id" UUID NOT NULL,
    "guild_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "status" VARCHAR(10) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ(3),
    CONSTRAINT "guild_join_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "guild_join_requests_guild_id_player_id_key" UNIQUE ("guild_id", "player_id"),
    CONSTRAINT "guild_join_requests_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guild_join_requests_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "guild_projects" (
    "id" UUID NOT NULL,
    "guild_id" UUID NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "description" VARCHAR(500) NOT NULL DEFAULT '',
    "target" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(10) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),
    CONSTRAINT "guild_projects_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "guild_projects_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guild_projects_target_check" CHECK ("target" > 0),
    CONSTRAINT "guild_projects_progress_check" CHECK ("progress" >= 0)
);

CREATE TABLE "guild_contributions" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "action_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guild_contributions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "guild_contributions_player_id_action_id_key" UNIQUE ("player_id", "action_id"),
    CONSTRAINT "guild_contributions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "guild_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guild_contributions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guild_contributions_amount_check" CHECK ("amount" > 0)
);

CREATE TABLE "guild_audits" (
    "id" UUID NOT NULL,
    "guild_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guild_audits_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "guild_audits_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "guilds_universe_id_visibility_reputation_idx" ON "guilds"("universe_id", "visibility", "reputation");
CREATE INDEX "guild_members_guild_id_role_idx" ON "guild_members"("guild_id", "role");
CREATE INDEX "guild_join_requests_guild_id_status_created_at_idx" ON "guild_join_requests"("guild_id", "status", "created_at");
CREATE INDEX "guild_projects_guild_id_status_created_at_idx" ON "guild_projects"("guild_id", "status", "created_at");
CREATE INDEX "guild_contributions_project_id_created_at_idx" ON "guild_contributions"("project_id", "created_at");
CREATE INDEX "guild_audits_guild_id_created_at_idx" ON "guild_audits"("guild_id", "created_at");
