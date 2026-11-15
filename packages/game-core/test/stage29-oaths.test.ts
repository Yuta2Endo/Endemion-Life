// R5.7: обеты мира — добровольные цепочки, которые игрок принимает сам.
import { describe, expect, it } from "vitest";
import {
  acceptOath,
  applyAction,
  GameRuleError,
  getUniverse,
  oathProblems,
  presentAdventure,
  presentAtlas,
  presentProfile,
  Rng,
  UNIVERSE_IDS,
  type GameErrorCode,
  type GameState,
  type UniverseId
} from "../src/index.js";
import type { EngineContext } from "../src/engine/context.js";
import { findRelic } from "../src/legacy/stories.js";
import { questYearly } from "../src/world/quests.js";
import { start } from "./helpers.js";

function grown(universeId: UniverseId, age = 30): GameState {
  const state = start({ universeId });
  state.life = { ...state.life, age, stage: "adult" };
  state.pending = null;
  return state;
}

function ctxOf(state: GameState): EngineContext {
  return { state, rng: new Rng(state.rngState), universe: getUniverse(state.character.universeId), changes: [] };
}

function yearly(state: GameState): string[] {
  const kinds: string[] = [];
  questYearly(ctxOf(state), (kind) => kinds.push(kind));
  return kinds;
}

function codeOf(run: () => unknown): GameErrorCode | null {
  try {
    run();
    return null;
  } catch (error) {
    return error instanceof GameRuleError ? error.code : null;
  }
}

describe("R5.7: обеты мира", () => {
  it("у каждого мира есть четыре обета, цепочка и валидный контент", () => {
    for (const universeId of UNIVERSE_IDS) {
      const oaths = getUniverse(universeId).oaths ?? [];
      expect(oaths, universeId).toHaveLength(4);
      expect(oaths[0]?.requires ?? [], `${universeId}:first`).toHaveLength(0);
      expect(oaths[1]?.requires, `${universeId}:second`).toEqual([oaths[0]!.id]);
      expect(oaths[2]?.requires, `${universeId}:third`).toEqual([oaths[1]!.id]);
      expect(oaths[3]?.requires, `${universeId}:fourth`).toEqual([oaths[2]!.id]);
      expect(oaths[0]?.next, `${universeId}:next-1`).toBe(oaths[1]!.id);
      expect(oaths[1]?.next, `${universeId}:next-2`).toBe(oaths[2]!.id);
      expect(oaths[2]?.next, `${universeId}:next-3`).toBe(oaths[3]!.id);
      expect(oaths[3]?.next, `${universeId}:last`).toBeUndefined();
    }
    expect(oathProblems()).toEqual([]);
  });

  it("финальный обет каждого мира выдаёт свою реликвию", () => {
    const expected: Record<UniverseId, string> = {
      "dark-fantasy": "oath-ember",
      isekai: "guild-seal",
      murim: "nameless-blade",
      xianxia: "dao-feather",
      hunter: "red-gate-mark",
      academy: "court-star"
    };
    for (const universeId of UNIVERSE_IDS) {
      const capstone = (getUniverse(universeId).oaths ?? [])[3]!;
      const relic = capstone.reward.find((effect) => effect.type === "relic");
      expect(relic?.type === "relic" ? relic.id : null, universeId).toBe(expected[universeId]);
      expect(findRelic(expected[universeId])?.universeId, universeId).toBe(universeId);
    }
  });

  it("обет принимается вручную, второй нельзя взять поверх активного", () => {
    const state = grown("dark-fantasy");
    const ctx = ctxOf(state);
    const accepted = acceptOath(ctx, "df.q-wall");
    expect(accepted.title.en).toBe("Oath accepted: The first watch");
    expect(state.quest).toEqual({ id: "df.q-wall", since: 30 });
    expect(codeOf(() => acceptOath(ctx, "df.q-ash"))).toBe("QUEST_ACTIVE");
  });

  it("обет закрыт без возраста, прошлого обета или при неизвестном id", () => {
    expect(codeOf(() => acceptOath(ctxOf(grown("hunter", 12)), "hu.q-license"))).toBe("OATH_LOCKED");
    expect(codeOf(() => acceptOath(ctxOf(grown("dark-fantasy")), "df.q-ash"))).toBe("OATH_LOCKED");
    expect(codeOf(() => acceptOath(ctxOf(grown("murim")), "mu.q-unknown"))).toBe("OATH_LOCKED");
  });

  it("успех ведёт по цепочке, выдаёт награды и финальную способность", () => {
    const state = grown("dark-fantasy");
    const ctx = ctxOf(state);
    acceptOath(ctx, "df.q-wall");
    state.character.skills.melee = 8;
    yearly(state);
    expect(state.questsDone).toContain("df.q-wall");
    expect(state.quest?.id).toBe("df.q-ash");

    state.character.factions["order-of-ash"] = 10;
    yearly(state);
    expect(state.questsDone).toContain("df.q-ash");
    expect(state.quest?.id).toBe("df.q-cathedral");

    state.character.skills.oathcraft = 15;
    state.character.factions["order-of-ash"] = 20;
    yearly(state);
    expect(state.questsDone).toContain("df.q-cathedral");
    expect(state.quest?.id).toBe("df.q-last-light");

    state.character.skills.oathcraft = 25;
    state.character.factions["order-of-ash"] = 35;
    yearly(state);
    expect(state.questsDone).toContain("df.q-last-light");
    expect(state.quest).toBeNull();
    expect(state.character.abilities).toContain("ember-ward");
    expect(state.character.abilities).toContain("last-light");
    expect(state.lineage.relics.map((relic) => relic.id)).toContain("oath-ember");
  });

  it("провал закрывает обет, накладывает штраф и не ведёт дальше", () => {
    const state = grown("murim");
    const ctx = ctxOf(state);
    acceptOath(ctx, "mu.q-stance");
    state.quest!.since = state.life.age - 5;
    const before = state.meters["qi-deviation"] ?? 0;
    yearly(state);
    expect(state.quest).toBeNull();
    expect(state.questsDone).not.toContain("mu.q-stance");
    expect(state.questsDone).not.toContain("mu.q-debt");
    expect(state.meters["qi-deviation"] ?? 0).toBeGreaterThan(before);
  });

  it("обеты не тратят генератор до принятия", () => {
    for (const universeId of UNIVERSE_IDS.filter((id) => id !== "isekai")) {
      const state = grown(universeId);
      const ctx = ctxOf(state);
      const before = ctx.rng.state;
      questYearly(ctx, () => undefined);
      expect(ctx.rng.state, universeId).toBe(before);
    }
  });

  it("профиль показывает заказчика, линию и список завершённых обетов", () => {
    const state = grown("xianxia");
    acceptOath(ctxOf(state), "xi.q-breath");
    const active = presentProfile(state);
    expect(active.quest?.issuer?.ru).toContain("Облачный Пик");
    expect(active.quest?.arc?.en).toContain("Dao Road");
    expect(active.questsDoneIds).toEqual([]);

    state.questsDone.push("xi.q-breath");
    state.quest = null;
    expect(presentProfile(state).questsDoneIds).toEqual(["xi.q-breath"]);
  });

  it("Атлас показывает статусы обетов и прогресс", () => {
    const state = grown("hunter", 19);
    const ctx = ctxOf(state);
    acceptOath(ctx, "hu.q-license");
    const before = presentAtlas({
      universeId: state.character.universeId,
      age: state.life.age,
      track: state.character.track,
      factions: state.character.factions,
      socialClassId: state.character.socialClassId,
      meters: presentProfile(state).meters,
      adventure: presentAdventure(state),
      relics: state.lineage.relics.map((relic) => relic.id),
      quest: state.quest ? { id: state.quest.id } : null,
      questsDone: [...state.questsDone]
    });
    expect(before.oaths).toHaveLength(4);
    expect(before.oaths.map((oath) => oath.status)).toEqual(["active", "locked", "locked", "locked"]);
    expect(before.oaths[1]?.blocked).toBe("requires");
    expect(before.progress.oathsDone).toBe(0);
    expect(before.progress.oathsTotal).toBe(4);

    state.questsDone.push("hu.q-license");
    state.quest = { id: "hu.q-gate", since: 19 };
    const after = presentAtlas({
      universeId: state.character.universeId,
      age: state.life.age,
      track: state.character.track,
      factions: state.character.factions,
      socialClassId: state.character.socialClassId,
      meters: presentProfile(state).meters,
      adventure: presentAdventure(state),
      relics: state.lineage.relics.map((relic) => relic.id),
      quest: state.quest ? { id: state.quest.id } : null,
      questsDone: [...state.questsDone]
    });
    expect(after.oaths[0]?.status).toBe("completed");
    expect(after.oaths[1]?.status).toBe("active");
    expect(after.progress.oathsDone).toBe(1);
  });

  it("действие acceptOath проходит через applyAction и пишет запись квестов", () => {
    const state = grown("academy");
    const result = applyAction(state, { type: "acceptOath", oathId: "ac.q-etiquette" });
    expect(result.state.quest?.id).toBe("ac.q-etiquette");
    expect(result.entries.some((entry) => entry.kind === "quest")).toBe(true);
  });
});
