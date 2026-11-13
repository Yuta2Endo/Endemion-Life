import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../common/api-error.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import { PortalAuditService } from "./portal-audit.service.js";
import { PortalService } from "./portal.service.js";
import { hashPortalSubject, type PortalIdentity } from "./portal.constants.js";

interface FakePlayer {
  id: string;
  idDisplayName: string | null;
}

function fakePrisma(options: {
  players?: Map<string, FakePlayer>;
  lives?: Map<string, Array<{ id: string; alive: boolean }>>;
  owned?: Set<string>;
} = {}) {
  const players = options.players ?? new Map<string, FakePlayer>();
  const lives = options.lives ?? new Map<string, Array<{ id: string; alive: boolean }>>();
  const owned = options.owned ?? new Set<string>();
  const findUnique = vi.fn(({ where }: { where: { endemionSub: string } }) => Promise.resolve(players.get(where.endemionSub) ?? null));
  const count = vi.fn(({ where }: { where: { playerId: string; status?: string } }) => {
    const list = lives.get(where.playerId) ?? [];
    return Promise.resolve(where.status === "alive" ? list.filter((life) => life.alive).length : list.length);
  });
  const findFirst = vi.fn(({ where }: { where: { id: string; playerId: string } }) =>
    Promise.resolve(owned.has(`${where.playerId}:${where.id}`) ? { id: where.id } : null)
  );
  const prisma = { client: { player: { findUnique }, life: { count, findFirst } } };
  return { prisma: prisma as unknown as PrismaService, findUnique, count, findFirst };
}

function identity(sub: string): PortalIdentity {
  return { sub, subHash: hashPortalSubject(sub), jti: crypto.randomUUID() };
}

function auditSpy() {
  return {
    noProfile: vi.fn(),
    dataAccess: vi.fn(),
    success: vi.fn(),
    failed: vi.fn(),
    rateLimited: vi.fn()
  };
}

describe("PortalService: sub → player", () => {
  it("находит игрока только по players.endemion_sub и не раскрывает playerId", async () => {
    const sub = crypto.randomUUID();
    const player = { id: "internal-player-uuid", idDisplayName: "Странник" };
    const fake = fakePrisma({ players: new Map([[sub, player]]), lives: new Map([[player.id, [{ id: "a", alive: true }, { id: "b", alive: false }]]]) });
    const audit = auditSpy();
    const service = new PortalService(fake.prisma, audit as unknown as PortalAuditService);

    const view = await service.profile(identity(sub), "/api/portal/profile");

    expect(fake.findUnique).toHaveBeenCalledWith({ where: { endemionSub: sub }, select: { id: true, idDisplayName: true } });
    expect(view).toEqual({ exists: true, displayName: "Странник", lives: { total: 2, alive: 1 } });
    expect(JSON.stringify(view)).not.toContain(player.id);
    expect(audit.dataAccess).toHaveBeenCalledOnce();
  });

  it("возвращает 404 NO_LIFE_PROFILE, если привязки нет, и не ищет по почте/имени", async () => {
    const fake = fakePrisma({
      players: new Map([["other-sub", { id: "p2", idDisplayName: "Другой" }]])
    });
    const audit = auditSpy();
    const service = new PortalService(fake.prisma, audit as unknown as PortalAuditService);

    await expect(service.profile(identity("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), "/api/portal/profile")).rejects.toMatchObject({
      status: 404,
      code: "NO_LIFE_PROFILE"
    });
    expect(fake.findUnique).toHaveBeenCalledOnce();
    expect(audit.noProfile).toHaveBeenCalledOnce();
  });

  it("не принимает не-UUID sub", async () => {
    const fake = fakePrisma();
    const service = new PortalService(fake.prisma, auditSpy() as unknown as PortalAuditService);
    await expect(service.resolvePlayer("not-a-uuid")).resolves.toBeNull();
    expect(fake.findUnique).not.toHaveBeenCalled();
  });

  it("чужой lifeId неотличим от несуществующего: 404 NOT_FOUND", async () => {
    const lifeA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const lifeB = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const fake = fakePrisma({ owned: new Set([`player-a:${lifeA}`]) });
    const service = new PortalService(fake.prisma, auditSpy() as unknown as PortalAuditService);

    await expect(service.requireOwnedLife("player-a", lifeA)).resolves.toBeUndefined();
    await expect(service.requireOwnedLife("player-a", lifeB)).rejects.toBeInstanceOf(ApiError);
    await expect(service.requireOwnedLife("player-a", lifeB)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
    await expect(service.requireOwnedLife("player-a", "not-a-uuid")).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
    expect(fake.findFirst).toHaveBeenCalledTimes(3);
  });
});
