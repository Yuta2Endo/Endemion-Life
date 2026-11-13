// Stage 03.2: непрерывность рода — социальная память NPC–NPC, живой мир и пять поколений подряд.
// Все сценарии детерминированы: состояния собираются из seed, время сдвигается вместе с возрастом наследника
import { describe, expect, it } from "vitest";
import {
  applyAction,
  deepClone,
  getUniverse,
  heirCandidates,
  lifespanOf,
  MAX_CHRONICLE,
  MAX_NPCS,
  MAX_WORLD_ACTIVITIES,
  newSocialState,
  parseSave,
  presentHeirs,
  readSocialState,
  SAVE_SCHEMA_VERSION,
  SELF_ID,
  stageForAge,
  succeed,
  UNIVERSE_IDS,
  t,
  WEALTH_MAX,
  type GameState,
  type NpcRole,
  type NpcState,
  type UniverseId,
  type WorldActivity
} from "../src/index.js";
import { createNpc, type NpcContext, type NpcOptions } from "../src/character/npcs.js";
import type { EngineContext } from "../src/engine/context.js";
import { finishLife } from "../src/legacy/lineage.js";
import { Rng } from "../src/rng.js";
import { choiceIds, start } from "./helpers.js";

function npcCtx(state: GameState, tag: string): NpcContext {
  return { state, rng: Rng.fromSeed(`stage-03-2-${tag}`, "npc"), universe: getUniverse(state.character.universeId) };
}

function engineCtx(state: GameState, tag: string): EngineContext {
  return { state, rng: Rng.fromSeed(`stage-03-2-${tag}`, "life"), universe: getUniverse(state.character.universeId), changes: [] };
}

/** Новый человек по правилам игры: фикстура не подменяет производство, а пользуется его же генератором NPC */
function addPerson(state: GameState, role: NpcRole, tag: string, options: NpcOptions = {}): NpcState {
  return createNpc(npcCtx(state, tag), role, options);
}

/**
 * Доводит нынешнюю жизнь до смерти и оставляет живого наследника-ребёнка. Возраст персонажа
 * поднимается до 50, ребёнку — 30: так у всех пяти поколений один и тот же сдвиг времени (20 лет).
 * Живой супруг персонажа становится вдовцом, иначе родство было бы невозможно.
 */
function prepareSuccession(state: GameState, tag: string): { dead: GameState; heir: NpcState } {
  const dead = deepClone(state);
  const age = Math.max(dead.life.age, 50);
  for (const npc of dead.npcs) {
    if (npc.spouseId !== SELF_ID) continue;
    npc.spouseId = null;
    if (!npc.formerSpouses.includes(SELF_ID)) npc.formerSpouses.push(SELF_ID);
  }
  dead.life = { age, stage: stageForAge(age, lifespanOf(dead.character)), alive: false, deathAge: age, deathCause: t("Старость", "Old age") };
  const heir = addPerson(dead, "child", `${tag}-heir`, { age: 30, parents: [SELF_ID], affinity: 60 });
  finishLife(engineCtx(dead, `${tag}-finish`));
  if (!heirCandidates(dead).some((candidate) => candidate.npc.id === heir.id && candidate.available)) {
    throw new Error(`фикстура: наследник ${heir.id} недоступен`);
  }
  return { dead, heir };
}

function deadState(seed: string, tag: string, universeId: UniverseId = "dark-fantasy"): { dead: GameState; heir: NpcState } {
  return prepareSuccession(start({ seed, universeId }), tag);
}

/** Все ссылки состояния указывают на существующего NPC или SELF_ID, id NPC не повторяются */
function expectReferencesValid(state: GameState): void {
  const ids = new Set<string>([SELF_ID, ...state.npcs.map((npc) => npc.id)]);
  expect(new Set(state.npcs.map((npc) => npc.id)).size).toBe(state.npcs.length);
  for (const id of state.lineage.selfParents) expect(ids.has(id), `selfParents: ${id}`).toBe(true);
  for (const npc of state.npcs) {
    for (const id of [...npc.parents, ...(npc.spouseId ? [npc.spouseId] : []), ...npc.formerSpouses]) {
      expect(ids.has(id), `${npc.id} -> ${id}`).toBe(true);
    }
  }
  const social = readSocialState(state);
  for (const item of social.relationships) {
    expect(ids.has(item.a), `relationship.a: ${item.a}`).toBe(true);
    expect(ids.has(item.b), `relationship.b: ${item.b}`).toBe(true);
    expect(item.a).not.toBe(item.b);
    if (item.a === SELF_ID || item.b === SELF_ID) throw new Error("связь персонажа с NPC попала в социальную память");
  }
  for (const item of social.stories) expect(ids.has(item.npcId), `story.npcId: ${item.npcId}`).toBe(true);
}

/** Каждое новое поколение — валидное сохранение и живая игра */
function expectPlayable(state: GameState): void {
  const restored = parseSave(deepClone(state));
  expect(restored.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
  const probe = deepClone(restored);
  const action = probe.pending ? { type: "choose" as const, choiceId: choiceIds(probe)[0]! } : { type: "advance" as const };
  const next = applyAction(probe, action).state;
  expect(next.version).toBe(probe.version + 1);
}

describe("Stage 03.2: социальная память переживает наследование", () => {
  it("связь NPC–NPC и личный сюжет переходят с теми же id, сдвинутым временем и валидными ссылками", () => {
    const { dead, heir } = deadState("s032-carry", "carry");
    const a = addPerson(dead, "relative", "carry-a", { age: 40, affinity: 60 });
    const b = addPerson(dead, "relative", "carry-b", { age: 38, affinity: 60 });
    dead.social = {
      relationships: [
        { id: 41, a: a.id, b: b.id, type: "friend", strength: 55, trust: 70, since: 25, updatedAt: 38, source: "world" }
      ],
      stories: [
        { id: "story-7", npcId: a.id, storyId: "craft-ambition", stage: 1, status: "active", since: 24, updatedAt: 39, source: "story" }
      ],
      nextRelationshipId: 1,
      nextStoryId: 1
    };
    const shift = heir.bornAt;

    const { state } = succeed(dead, heir.id, "carry-salt");
    const social = readSocialState(state);

    expect(social.relationships).toEqual([
      { id: 41, a: a.id, b: b.id, type: "friend", strength: 55, trust: 70, since: 25 - shift, updatedAt: 38 - shift, source: "world" }
    ]);
    expect(social.stories).toEqual([
      { id: "story-7", npcId: a.id, storyId: "craft-ambition", stage: 1, status: "active", since: 24 - shift, updatedAt: 39 - shift, source: "story" }
    ]);
    // Счётчики выше перенесённых максимумов: новые id не совпадут со старыми
    expect(social.nextRelationshipId).toBeGreaterThan(41);
    expect(social.nextStoryId).toBeGreaterThan(7);
    expectReferencesValid(state);
    expectPlayable(state);
  });

  it("связи умершего предшественника и наследника не остаются в новой жизни", () => {
    const { dead, heir } = deadState("s032-predecessor", "predecessor");
    const friend = addPerson(dead, "relative", "pred-friend", { age: 40, affinity: 60 });
    const heirNpc = dead.npcs.find((npc) => npc.id === heir.id)!;
    dead.social = {
      relationships: [
        { id: 1, a: SELF_ID, b: friend.id, type: "friend", strength: 40, trust: 60, since: 10, updatedAt: 20, source: "test" },
        { id: 2, a: heirNpc.id, b: friend.id, type: "mentor", strength: 30, trust: 55, since: 12, updatedAt: 22, source: "test" }
      ],
      stories: [
        { id: "story-1", npcId: SELF_ID, storyId: "family-crisis", stage: 1, status: "active", since: 10, updatedAt: 20, source: "test" },
        { id: "story-2", npcId: heirNpc.id, storyId: "craft-ambition", stage: 0, status: "active", since: 12, updatedAt: 22, source: "test" }
      ],
      nextRelationshipId: 3,
      nextStoryId: 3
    };

    const { state } = succeed(dead, heir.id, "predecessor-salt");
    const deadRecord = state.npcs.find((npc) => npc.lifeGen === 1)!;
    const social = readSocialState(state);

    expect(social.relationships).toEqual([]);
    expect(social.stories).toEqual([]);
    expect(social.relationships.some((item) => item.a === deadRecord.id || item.b === deadRecord.id)).toBe(false);
    expect(social.stories.some((item) => item.npcId === deadRecord.id || item.npcId === SELF_ID)).toBe(false);
    expectReferencesValid(state);
  });

  it("связь и сюжет с выпавшим малозначимым NPC не остаются", () => {
    const { dead, heir } = deadState("s032-dropped", "dropped");
    const kept = addPerson(dead, "relative", "drop-kept", { age: 40, affinity: 60 });
    const dropped = addPerson(dead, "acquaintance", "drop-lost", { age: 30, affinity: 5 });
    dead.social = {
      relationships: [
        { id: 5, a: kept.id, b: dropped.id, type: "acquaintance", strength: 5, trust: 20, since: 20, updatedAt: 30, source: "world" }
      ],
      stories: [{ id: "story-5", npcId: dropped.id, storyId: "old-rivalry", stage: 1, status: "active", since: 20, updatedAt: 30, source: "story" }],
      nextRelationshipId: 6,
      nextStoryId: 6
    };

    const { state } = succeed(dead, heir.id, "dropped-salt");
    const social = readSocialState(state);

    expect(state.npcs.some((npc) => npc.id === dropped.id)).toBe(false);
    expect(state.npcs.some((npc) => npc.id === kept.id)).toBe(true);
    expect(social.relationships).toEqual([]);
    expect(social.stories).toEqual([]);
    expectReferencesValid(state);
  });

  it("старое сохранение без social продолжается, получает пустую память и остаётся валидным", () => {
    const { dead, heir } = deadState("s032-no-social", "no-social");
    delete (dead as { social?: unknown }).social;
    expect(() => parseSave(deepClone(dead))).not.toThrow();

    const { state } = succeed(dead, heir.id, "no-social-salt");
    expect(state.social).toEqual(newSocialState());
    expect(readSocialState(state)).toEqual(newSocialState());
    expectPlayable(state);
  });
});

describe("Stage 03.2: мир переживает наследование", () => {
  it("тик мира, поселения, фракции, край и влияние рода не сбрасываются", () => {
    const { dead, heir } = deadState("s032-world", "world");
    const world = dead.world!;
    world.tick = 17;
    const settlement = world.settlements[0]!;
    settlement.prosperity = 77;
    settlement.stability = 66;
    settlement.population = 4321;
    const faction = world.factions[0]!;
    faction.power = 63;
    faction.influence = 14;
    faction.standing = 31;
    // Журнал уже длиннее предела: наследование добавляет запись сверху и не раздувает сохранение
    world.activities = Array.from(
      { length: MAX_WORLD_ACTIVITIES + 3 },
      (_, index): WorldActivity => ({
        id: `old.activity.${index}`,
        age: index,
        kind: index % 2 === 0 ? "settlement" : "crisis",
        title: t("Старое событие", "An old event"),
        text: t("Так было раньше.", "So it was before.")
      })
    );
    dead.region = { ...dead.region, strain: 42, prosperity: 58 };
    dead.lineage.worldInfluence = { settlements: [{ id: settlement.id, value: 3 }], factions: [{ id: faction.id, value: -2 }] };
    const worldBefore = deepClone(world);
    const regionBefore = deepClone(dead.region);
    const influenceBefore = deepClone(dead.lineage.worldInfluence);

    const { state } = succeed(dead, heir.id, "world-salt");

    expect(state.world!.tick).toBe(worldBefore.tick);
    expect(state.world!.settlements).toEqual(worldBefore.settlements);
    expect(state.world!.factions).toEqual(worldBefore.factions);
    expect(state.region).toEqual(regionBefore);
    expect(state.lineage.worldInfluence).toEqual(influenceBefore);
    // Новое событие только одно и стоит первым; журнал ограничен, прежние записи не размножаются
    expect(state.world!.activities).toHaveLength(MAX_WORLD_ACTIVITIES);
    expect(state.world!.activities[0]!.id).toBe(`succession.${heir.id}`);
    expect(state.world!.activities.slice(1)).toEqual(worldBefore.activities.slice(0, MAX_WORLD_ACTIVITIES - 1));
  });
});

describe("Stage 03.3: объяснение главного наследника", () => {
  it.each(UNIVERSE_IDS)("%s: причина первичности видна и локализована", (universeId) => {
    const { dead } = deadState(`s033-law-${universeId}`, `law-${universeId}`, universeId);
    const heirs = presentHeirs(dead);
    const primary = heirs.find((heir) => heir.primary);
    expect(primary).toBeDefined();
    expect(primary!.primaryReason?.ru.trim().length).toBeGreaterThan(0);
    expect(primary!.primaryReason?.en.trim().length).toBeGreaterThan(0);
    for (const heir of heirs.filter((item) => !item.primary)) expect(heir.primaryReason).toBeNull();
  });
});

describe("Stage 03.2: пять поколений подряд", () => {
  it("пять наследований не ломают род, ссылки, мир, имущество и сохранения", () => {
    const initial = deadState("s032-five", "five");
    const a = addPerson(initial.dead, "relative", "five-a", { age: 40, affinity: 60 });
    const b = addPerson(initial.dead, "relative", "five-b", { age: 38, affinity: 60 });
    initial.dead.social = {
      relationships: [
        { id: 41, a: a.id, b: b.id, type: "friend", strength: 55, trust: 70, since: 25, updatedAt: 38, source: "world" }
      ],
      stories: [
        { id: "story-7", npcId: a.id, storyId: "craft-ambition", stage: 1, status: "active", since: 24, updatedAt: 39, source: "story" }
      ],
      nextRelationshipId: 42,
      nextStoryId: 8
    };
    const world = initial.dead.world!;
    world.tick = 21;
    const settlement = world.settlements[0]!;
    settlement.prosperity = 70;
    settlement.stability = 60;
    settlement.population = 5000;
    const faction = world.factions[0]!;
    faction.power = 60;
    faction.standing = 25;
    const worldBefore = deepClone(world);
    let current = initial.dead;
    let heir = initial.heir;
    let previousGeneration = current.lineage.generation;
    let state = current;

    for (let step = 0; step < 5; step++) {
      const before = deepClone(current);
      const result = succeed(current, heir.id, `five-${step}`);
      state = result.state;

      // Поколение растёт ровно на единицу
      expect(state.lineage.generation).toBe(previousGeneration + 1);
      expect(result.previous.lineage.continuedBy).toBe(heir.id);
      // Четыре перехода — это и есть путь основателя до 5-го поколения
      if (step === 3) expect(state.lineage.generation).toBe(5);

      // Мир переживает наследование без сброса и без убыли
      expect(state.world!.tick).toBeGreaterThanOrEqual(before.world!.tick);
      for (const item of before.world!.settlements) {
        const after = state.world!.settlements.find((candidate) => candidate.id === item.id)!;
        expect(after.prosperity).toBeGreaterThanOrEqual(item.prosperity);
        expect(after.stability).toBeGreaterThanOrEqual(item.stability);
        expect(after.population).toBeGreaterThanOrEqual(item.population);
      }
      for (const item of before.world!.factions) {
        const after = state.world!.factions.find((candidate) => candidate.id === item.id)!;
        expect(after.power).toBeGreaterThanOrEqual(item.power);
        expect(after.influence).toBeGreaterThanOrEqual(item.influence);
        expect(after.standing).toBeGreaterThanOrEqual(item.standing);
      }
      expect(state.region.strain).toBeGreaterThanOrEqual(0);
      expect(state.region.prosperity).toBeGreaterThanOrEqual(0);

      // Род, хроника и люди
      expect(state.lineage.chronicle.length).toBeLessThanOrEqual(MAX_CHRONICLE);
      expect(state.npcs.length).toBeLessThanOrEqual(MAX_NPCS);
      expect(state.lineage.chronicle.filter((entry) => entry.kind === "succession")).toHaveLength(step + 1);
      expectReferencesValid(state);

      // Имущество: без дублей дома, дел и реликвий, золото в пределах
      expect(state.character.wealth).toBeGreaterThanOrEqual(0);
      expect(state.character.wealth).toBeLessThanOrEqual(WEALTH_MAX);
      for (const npc of state.npcs) {
        expect(npc.wealth).toBeGreaterThanOrEqual(0);
        expect(npc.wealth).toBeLessThanOrEqual(WEALTH_MAX);
      }
      expect(state.lineage.inheritance!.wealth).toBeGreaterThanOrEqual(0);
      expect(state.lineage.inheritance!.held).toBeGreaterThanOrEqual(0);
      expect(state.business.ventures).toEqual([]);
      expect(state.household.residence === "own" ? state.household.homeId !== null : state.household.homeId === null).toBe(true);
      const relics = state.lineage.relics.map((relic) => relic.id);
      expect(new Set(relics).size).toBe(relics.length);

      // Каждое новое поколение читается и продолжается
      expectPlayable(state);

      // Связь NPC–NPC и сюжет живут все пять поколений с теми же id
      const social = readSocialState(state);
      expect(social.relationships.map((item) => item.id)).toEqual([41]);
      expect(social.relationships[0]!.a).toBe(a.id);
      expect(social.relationships[0]!.b).toBe(b.id);
      expect(social.stories.map((item) => item.id)).toEqual(["story-7"]);
      expect(social.stories[0]!.npcId).toBe(a.id);
      expect(social.stories[0]!.since).toBeGreaterThanOrEqual(0);
      expect(social.stories[0]!.updatedAt).toBeGreaterThanOrEqual(0);

      if (step < 4) {
        const next = prepareSuccession(state, `five-${step + 1}`);
        current = next.dead;
        heir = next.heir;
        previousGeneration = state.lineage.generation;
      }
    }

    // После пяти наследований: шесть поколений, все прошлые жизни записаны, мир тот же
    expect(state.lineage.generation).toBe(6);
    expect(state.lineage.lives.map((life) => life.gen)).toEqual([1, 2, 3, 4, 5]);
    expect(state.world!.tick).toBeGreaterThanOrEqual(worldBefore.tick);
    expect(state.world!.settlements.find((item) => item.id === settlement.id)?.population).toBeGreaterThanOrEqual(5000);
    expectReferencesValid(state);
    expect(state.npcs.some((npc) => npc.id === a.id)).toBe(true);
    expect(state.npcs.some((npc) => npc.id === b.id)).toBe(true);
  });

  it("второй succeed по продолженному роду запрещён, а тот же salt даёт того же наследника без дублей", () => {
    const { dead, heir } = deadState("s032-repeat", "repeat");
    const first = succeed(dead, heir.id, "same-salt");
    const again = succeed(dead, heir.id, "same-salt");

    expect(again.state).toEqual(first.state);
    expect(again.state.npcs.map((npc) => npc.id)).toEqual(first.state.npcs.map((npc) => npc.id));
    expect(again.state.nextNpcId).toBe(first.state.nextNpcId);
    expect(first.previous.lineage.continuedBy).toBe(heir.id);
    expect(() => succeed(first.previous, heir.id, "same-salt")).toThrow(expect.objectContaining({ code: "LINEAGE_CONTINUED" }));
    expect(parseSave(deepClone(first.previous)).lineage.continuedBy).toBe(heir.id);
    expectPlayable(first.state);
  });
});
