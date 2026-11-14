// Stage 06.1: guild foundation. Account-only, server-authoritative membership/roles/projects.
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, ORIGIN, resetDatabase, sessionCookieOf, type TestApp } from "./helpers.js";

let t: TestApp;
const PASSWORD = "correct-horse-battery";

function agent() {
  return request.agent(t.app.getHttpServer());
}
type Agent = ReturnType<typeof agent>;
const post = (client: Agent, path: string, body: unknown = {}) => client.post(path).set("Origin", ORIGIN).send(body as object);

async function account(client: Agent, email: string): Promise<{ playerId: string; cookie: string }> {
  const res = await post(client, "/api/auth/register", { email, password: PASSWORD }).expect(201);
  return { playerId: (res.body as { player: { id: string } }).player.id, cookie: sessionCookieOf(res)! };
}

async function createGuild(client: Agent, name = "Ashen Pack", visibility: "public" | "request" = "public") {
  const res = await post(client, "/api/guilds", { universeId: "dark-fantasy", name, visibility }).expect(201);
  return res.body as { id: string; name: string; myRole: string; memberCount: number; projects: Array<{ id: string; progress: number; target: number; status: string }>; requests: Array<{ id: string; playerId: string }> };
}

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.app.close();
});
beforeEach(async () => {
  await resetDatabase(t.prisma);
});

describe("Stage 06.1: guilds", () => {
  it("account-only: guest cannot create or list guilds", async () => {
    const guest = agent();
    await guest.post("/api/session").set("Origin", ORIGIN).send({}).expect(200);
    const denied = await post(guest, "/api/guilds", { universeId: "hunter", name: "Guest Hall" }).expect(403);
    expect(denied.body.error.code).toBe("ACCOUNT_REQUIRED");
    const list = await guest.get("/api/guilds?universeId=hunter").expect(403);
    expect(list.body.error.code).toBe("ACCOUNT_REQUIRED");
  });

  it("creates a guild with leader membership and rejects duplicate names case-insensitively", async () => {
    const owner = agent();
    const rival = agent();
    await account(owner, "guild-owner@example.com");
    await account(rival, "guild-rival@example.com");
    const guild = await createGuild(owner);
    expect(guild.myRole).toBe("leader");
    expect(guild.memberCount).toBe(1);
    const duplicate = await post(rival, "/api/guilds", { universeId: "dark-fantasy", name: "ASHEN PACK", visibility: "public" }).expect(409);
    expect(duplicate.body.error.code).toBe("GUILD_NAME_TAKEN");
  });

  it("public join adds a member; one guild per universe is enforced", async () => {
    const owner = agent();
    const member = agent();
    await account(owner, "join-owner@example.com");
    await account(member, "join-member@example.com");
    const guild = await createGuild(owner);
    const joined = await post(member, `/api/guilds/${guild.id}/join`).expect(200);
    expect(joined.body.memberCount).toBe(2);
    expect(joined.body.myRole).toBe("member");
    const again = await post(member, `/api/guilds/${guild.id}/join`).expect(409);
    expect(again.body.error.code).toBe("ALREADY_IN_GUILD");
  });

  it("request guild: officer accepts, rejects and kicks with role checks", async () => {
    const owner = agent();
    const member = agent();
    const outsider = agent();
    await account(owner, "request-owner@example.com");
    await account(member, "request-member@example.com");
    const outsiderAccount = await account(outsider, "request-outsider@example.com");
    const guild = await createGuild(owner, "Veiled Court", "request");

    await post(member, `/api/guilds/${guild.id}/join`).expect(200);
    const memberRequest = await owner.get(`/api/guilds/${guild.id}`).expect(200);
    await post(owner, `/api/guilds/${guild.id}/requests/${memberRequest.body.requests[0]!.id}/accept`).expect(200);
    await post(outsider, `/api/guilds/${guild.id}/join`).expect(200);
    const pending = await owner.get(`/api/guilds/${guild.id}`).expect(200);
    expect(pending.body.requests).toHaveLength(1);

    const memberCannotApprove = await post(member, `/api/guilds/${guild.id}/requests/${pending.body.requests[0]!.id}/accept`).expect(403);
    expect(memberCannotApprove.body.error.code).toBe("FORBIDDEN");

    const accepted = await post(owner, `/api/guilds/${guild.id}/requests/${pending.body.requests[0]!.id}/accept`).expect(200);
    expect(accepted.body.memberCount).toBe(3);

    const kick = await post(owner, `/api/guilds/${guild.id}/kick`, { playerId: outsiderAccount.playerId }).expect(200);
    expect(kick.body.memberCount).toBe(2);
  });

  it("project contribution is idempotent and completes reputation once", async () => {
    const owner = agent();
    await account(owner, "project-owner@example.com");
    const guild = await createGuild(owner);
    const project = await post(owner, `/api/guilds/${guild.id}/projects`, { title: "Mist Survey", target: 100 }).expect(201);
    const projectId = project.body.projects[0]!.id;
    const actionId = randomUUID();
    const first = await post(owner, `/api/guilds/${guild.id}/projects/${projectId}/contribute`, { actionId, amount: 60 }).expect(200);
    expect(first.body.projects[0]!.progress).toBe(60);
    const replay = await post(owner, `/api/guilds/${guild.id}/projects/${projectId}/contribute`, { actionId, amount: 60 }).expect(200);
    expect(replay.body.replayed).toBe(true);
    expect(replay.body.projects[0]!.progress).toBe(60);
    const done = await post(owner, `/api/guilds/${guild.id}/projects/${projectId}/contribute`, { actionId: randomUUID(), amount: 40 }).expect(200);
    expect(done.body.projects[0]!.status).toBe("completed");
    expect(done.body.reputation).toBe(10);
    const after = await post(owner, `/api/guilds/${guild.id}/projects/${projectId}/contribute`, { actionId: randomUUID(), amount: 1 }).expect(409);
    expect(after.body.error.code).toBe("VALIDATION");
  });

  it("leader transfer, leave rules, disband and audit trail", async () => {
    const owner = agent();
    const member = agent();
    await account(owner, "leave-owner@example.com");
    const memberAccount = await account(member, "leave-member@example.com");
    const guild = await createGuild(owner);
    await post(member, `/api/guilds/${guild.id}/join`).expect(200);

    const cannotLeave = await post(owner, `/api/guilds/${guild.id}/leave`).expect(400);
    expect(cannotLeave.body.error.code).toBe("VALIDATION");

    const transferred = await post(owner, `/api/guilds/${guild.id}/transfer`, { playerId: memberAccount.playerId }).expect(200);
    expect(transferred.body.leaderId).toBe(memberAccount.playerId);
    expect(transferred.body.myRole).toBe("officer");

    await post(owner, `/api/guilds/${guild.id}/leave`).expect(200);
    const audit = await member.get(`/api/guilds/${guild.id}/audit`).expect(200);
    expect(audit.body.entries.some((row: { action: string }) => row.action === "leader.transfer")).toBe(true);

    await post(member, `/api/guilds/${guild.id}/disband`).expect(200);
    await member.get(`/api/guilds/${guild.id}`).expect(404);
  });
});

