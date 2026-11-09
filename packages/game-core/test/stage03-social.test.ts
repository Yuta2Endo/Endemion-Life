// Stage 03: социальная симуляция — связи NPC–NPC, личные сюжеты, детерминизм, сохранения и досье.
import { describe, expect, it } from "vitest";
import {
  advanceStory,
  applyAction,
  deepClone,
  failStory,
  getUniverse,
  interactionBlock,
  MAX_ACTIVE_STORIES,
  newSocialState,
  npcLifeStage,
  npcSettlementId,
  parseSave,
  presentProfile,
  readSocialState,
  RELATIONSHIP_TYPES,
  SELF_ID,
  settlementSeeds,
  storyTick,
  UNIVERSE_IDS,
  type GameState,
  type NpcStoryState
} from "../src/index.js";
import type { EngineContext } from "../src/engine/context.js";
import { Rng } from "../src/rng.js";
import { choiceIds, playLife, start } from "./helpers.js";

function context(state: GameState, rng = new Rng(7)): EngineContext {
  return { state, rng, universe: getUniverse(state.character.universeId), changes: [] };
}

function withStory(state: GameState, npcId: string, storyId = "craft-ambition"): NpcStoryState {
  const story: NpcStoryState = { id: "story-1", npcId, storyId, stage: 0, status: "active", since: state.life.age, updatedAt: state.life.age, source: "story" };
  state.social = { ...newSocialState(), stories: [story], nextStoryId: 2 };
  return story;
}

/** Жизнь с NPC, дожившая до взрослого возраста: сюжеты и связи должны успеть появиться. */
function adultLife(seed: string, universeId: (typeof UNIVERSE_IDS)[number] = "dark-fantasy"): GameState {
  let state = start({ seed, universeId });
  for (let i = 0; i < 80 && state.life.alive && state.life.age < 24; i++) {
    if (state.pending) {
      const ids = choiceIds(state);
      state = applyAction(state, { type: "choose", choiceId: ids[0]! }).state;
    } else {
      state = applyAction(state, { type: "advance", years: 1 }).state;
    }
  }
  return state;
}

describe("Stage 03: социальная память", () => {
  it("новая жизнь получает пустую социальную память, а профиль читается без мутаций", () => {
    const state = start({ seed: "social-empty" });
    expect(state.social).toEqual(newSocialState());
    const before = JSON.stringify(state.social);
    const profile = presentProfile(state);
    expect(Array.isArray(profile.connections)).toBe(true);
    expect(profile.connections.every((connection) => connection.type.ru.length > 0 && typeof connection.strength === "number")).toBe(true);
    expect(profile.recentChanges).toEqual([]);
    expect(JSON.stringify(state.social)).toBe(before);
  });

  it("старое сохранение без social читается, нормализуется на действии и не теряет данные", () => {
    const state = start({ seed: "social-old" });
    delete state.social;
    const parsed = parseSave(JSON.parse(JSON.stringify(state)));
    expect(parsed.social).toBeUndefined();
    expect(presentProfile(parsed).npcs.length).toBeGreaterThan(0);
    const acted = applyAction(parsed, { type: "advance", years: 1 }).state;
    expect(acted.social).toBeDefined();
    expect(acted.social!.nextRelationshipId).toBeGreaterThanOrEqual(1);
    expect(acted.social!.nextStoryId).toBeGreaterThanOrEqual(1);
  });

  it("связи NPC–NPC не дублируются, не ссылаются на себя и переживают сохранение", () => {
    const { state } = playLife(start({ seed: "social-ties", universeId: "academy" }), 3000, (n, i) => i % n);
    const social = readSocialState(state);
    const pairs = new Set<string>();
    for (const item of social.relationships) {
      expect(item.a).not.toBe(item.b);
      expect(item.a).not.toBe(SELF_ID);
      expect(item.b).not.toBe(SELF_ID);
      expect(RELATIONSHIP_TYPES).toContain(item.type);
      const key = item.a < item.b ? `${item.a}|${item.b}` : `${item.b}|${item.a}`;
      expect(pairs.has(key)).toBe(false);
      pairs.add(key);
      expect(state.npcs.some((npc) => npc.id === item.a)).toBe(true);
      expect(state.npcs.some((npc) => npc.id === item.b)).toBe(true);
    }
    const roundTrip = parseSave(JSON.parse(JSON.stringify(state)));
    expect(readSocialState(roundTrip).relationships).toEqual(social.relationships);
    expect(readSocialState(roundTrip).stories).toEqual(social.stories);
  });

  it("личные сюжеты детерминированы, не дублируются и не превышают лимит активных", () => {
    const base = adultLife("social-stories");
    const a = deepClone(base);
    const b = deepClone(base);
    for (let age = 16; age < 42; age++) {
      a.life = { ...a.life, age };
      b.life = { ...b.life, age };
      storyTick(context(a, new Rng(11)), () => {});
      storyTick(context(b, new Rng(11)), () => {});
      const active = readSocialState(a).stories.filter((story) => story.status === "active");
      expect(active.length).toBeLessThanOrEqual(MAX_ACTIVE_STORIES);
    }
    expect(readSocialState(a).stories).toEqual(readSocialState(b).stories);
    const keys = new Set<string>();
    for (const story of readSocialState(a).stories) {
      const key = `${story.npcId}::${story.storyId}`;
      expect(keys.has(key)).toBe(false);
      keys.add(key);
      expect(story.stage).toBeGreaterThan(0);
    }
    expect(readSocialState(a).stories.length).toBeGreaterThan(0);
  });

  it("сюжет завершается по стадиям и меняет жизнь NPC, а мёртвый NPC не продолжает линию", () => {
    const state = start({ seed: "social-story-finish", universeId: "academy" });
    const npc = state.npcs.find((item) => item.alive && item.professionId !== null) ?? state.npcs.find((item) => item.alive)!;
    npc.careerRank = 1;
    withStory(state, npc.id);
    const ctx = context(state);
    const rank = npc.careerRank;
    advanceStory(ctx, npc);
    advanceStory(ctx, npc);
    advanceStory(ctx, npc);
    expect(readSocialState(state).stories[0]!.status).toBe("done");
    expect(npc.careerRank).toBeGreaterThanOrEqual(rank);
    expect(npc.log.some((entry) => entry.kind === "story")).toBe(true);

    const deadState = start({ seed: "social-story-dead", universeId: "academy", originId: "duke-heir" });
    const dead = deadState.npcs.find((item) => item.alive)!;
    withStory(deadState, dead.id);
    dead.alive = false;
    dead.status = "deceased";
    dead.diedAt = deadState.life.age;
    storyTick(context(deadState), () => {});
    expect(readSocialState(deadState).stories[0]!.status).toBe("abandoned");

    const failedState = start({ seed: "social-story-failed", universeId: "academy", originId: "duke-heir" });
    const failedNpc = failedState.npcs.find((item) => item.alive)!;
    withStory(failedState, failedNpc.id, "family-crisis");
    const text = failStory(context(failedState), failedNpc);
    expect(text).not.toBeNull();
    expect(readSocialState(failedState).stories[0]!.status).toBe("failed");
  });

  it("новые взаимодействия доступны по правилам и не ломают семью", () => {
    const state = start({ seed: "social-interactions", universeId: "academy" });
    state.life = { ...state.life, age: 25, stage: "adult" };
    const friend = state.npcs.find((item) => item.alive)!;
    friend.role = "friend";
    friend.affinity = 50;
    friend.spouseId = null;
    const ctx = context(state);
    for (const id of ["help", "invite", "court"] as const) {
      expect(interactionBlock(ctx, friend, id)).toBe("");
    }
    const parent = state.npcs.find((item) => item.role === "father" || item.role === "mother")!;
    parent.affinity = 50;
    expect(interactionBlock(ctx, parent, "court")).toBe("rule");
  });

  it("досье показывает стадию, цель, сословие, поселение, связи, сюжет и события на двух языках", () => {
    const state = start({ seed: "social-dossier", universeId: "academy", originId: "duke-heir" });
    state.life = { ...state.life, age: 24, stage: "adult" };
    const profile = presentProfile(state);
    const alive = profile.npcs.filter((npc) => npc.alive);
    expect(alive.length).toBeGreaterThan(0);
    const universe = getUniverse(state.character.universeId);
    for (const npc of alive.slice(0, 5)) {
      expect(npc.stage.ru.length).toBeGreaterThan(0);
      expect(npc.stage.en.length).toBeGreaterThan(0);
      expect(npc.socialClass.ru.length).toBeGreaterThan(0);
      expect(npc.settlement?.ru.length ?? 1).toBeGreaterThan(0);
      expect(npc.events.every((event) => event.text.ru.length > 0 && event.text.en.length > 0)).toBe(true);
      expect(npc.relationships.every((relationship) => relationship.type.ru.length > 0 && relationship.type.en.length > 0)).toBe(true);
      const settlement = npcSettlementId(universe, npc.id);
      expect(settlementSeeds(universe).some((seed) => seed.id === settlement)).toBe(true);
    }
    expect(profile.connections.every((connection) => connection.type.ru.length > 0 && connection.type.en.length > 0)).toBe(true);
  });

  it("все шесть миров дают валидную социальную память и стадии жизни", () => {
    for (const universeId of UNIVERSE_IDS) {
      const state = adultLife(`social-world-${universeId}`, universeId);
      const social = readSocialState(state);
      expect(social.relationships.every((item) => RELATIONSHIP_TYPES.includes(item.type))).toBe(true);
      const universe = getUniverse(universeId);
      for (const npc of state.npcs.slice(0, 8)) {
        expect(npcLifeStage(universe, npc, Math.max(0, state.life.age - npc.bornAt)).ru.length).toBeGreaterThan(0);
      }
    }
  });
});
