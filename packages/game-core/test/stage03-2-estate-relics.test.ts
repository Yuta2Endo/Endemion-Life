// Stage 03.1: полная оценка наследства (дом и дела), передача родового дома в натуре,
// реликвии в обычной игре, потеря реликвии и совместимость сохранений формата 13
import { describe, expect, it } from "vitest";
import {
  applyAction,
  businessSaleValue,
  deepClone,
  findEvent,
  getUniverse,
  heirCandidates,
  isEligible,
  parseSave,
  presentLegacy,
  SAVE_SCHEMA_VERSION,
  saleValue,
  SELF_ID,
  succeed,
  type GameState,
  type NpcState,
  type UniverseId
} from "../src/index.js";
import { applyEffect } from "../src/engine/effects.js";
import { findRelic } from "../src/legacy/stories.js";
import { fx } from "../src/narrative/dsl.js";
import type { EngineContext } from "../src/engine/context.js";
import { Rng } from "../src/rng.js";
import { SAVES_V13 } from "./fixtures/saves-v13.js";
import { choiceIds, playLife, start } from "./helpers.js";

const RELIC_EVENTS: Readonly<Record<UniverseId, { eventId: string; relicId: string }>> = {
  "dark-fantasy": { eventId: "legacy.relic-ancestral-blade", relicId: "ancestral-blade" },
  isekai: { eventId: "legacy.relic-system-crystal", relicId: "system-crystal" },
  murim: { eventId: "legacy.relic-clan-scroll", relicId: "clan-scroll" },
  xianxia: { eventId: "legacy.relic-spirit-root-amulet", relicId: "spirit-root-amulet" },
  hunter: { eventId: "legacy.relic-gate-hunter-badge", relicId: "gate-hunter-badge" },
  academy: { eventId: "legacy.relic-noble-signet", relicId: "noble-signet" }
};

function withPending(state: GameState, eventId: string): GameState {
  return { ...deepClone(state), pending: { eventId, age: state.life.age } };
}

function at(state: GameState, age: number): GameState {
  const copy = deepClone(state);
  copy.life = { ...copy.life, age, stage: age < 13 ? "child" : age < 18 ? "teen" : "adult" };
  return copy;
}

function makeCtx(state: GameState): EngineContext {
  return { state, rng: Rng.fromSeed("stage-03-2", "relic"), universe: getUniverse(state.character.universeId), changes: [] };
}

function relicOf(id: string) {
  const def = findRelic(id);
  if (!def) throw new Error(`нет реликвии ${id}`);
  return { id: def.id, name: def.name, description: def.description, acquiredGen: 1, acquiredAge: 20, source: "test" };
}

/** Мёртвая жизнь, в которой есть хотя бы один живой ребёнок-наследник */
function deadWithChild(universeId: UniverseId, tag: string): GameState {
  for (let k = 0; k < 40; k++) {
    const { state } = playLife(start({ seed: `s032-${tag}-${universeId}-${k}`, universeId }), 6000, (n, i) => (i * 3 + k) % n);
    if (!state.life.alive && heirCandidates(state).some((candidate) => candidate.available && candidate.relation === "child")) return state;
  }
  throw new Error(`нет жизни с ребёнком-наследником: ${universeId}`);
}

/**
 * Управляемая семья для проверки наследства: дети нужных возрастов, остальные NPC мертвы,
 * при желании — вдова с долей супруга. Все связи с персонажем сохранены.
 */
function controlledDead(universeId: UniverseId, ages: readonly number[], tag: string, widow = true): { dead: GameState; children: NpcState[] } {
  const dead = deadWithChild(universeId, `${tag}-${ages.join("-")}`);
  const pool = heirCandidates(dead).filter((candidate) => candidate.available && candidate.relation === "child");
  const template = pool[0]!.npc;
  const children: NpcState[] = [];
  for (const [index, age] of ages.entries()) {
    let npc: NpcState;
    if (index === 0) {
      npc = dead.npcs.find((item) => item.id === template.id)!;
    } else {
      npc = deepClone(template);
      npc.id = `n${dead.nextNpcId++}`;
      npc.log = [];
      dead.npcs.push(npc);
    }
    npc.parents = [SELF_ID];
    npc.adopted = false;
    npc.bornAt = dead.life.age - age;
    npc.alive = true;
    npc.status = "alive";
    npc.diedAt = null;
    npc.cause = null;
    npc.spouseId = null;
    npc.formerSpouses = [];
    npc.wealth = 5;
    children.push(npc);
  }
  const kept = new Set(children.map((npc) => npc.id));
  for (const npc of dead.npcs) {
    if (kept.has(npc.id)) continue;
    npc.alive = false;
    npc.status = "deceased";
    npc.diedAt = Math.max(0, dead.life.age - 1);
    npc.cause = "unknown";
  }
  if (widow) {
    const spouse = deepClone(template);
    spouse.id = `n${dead.nextNpcId++}`;
    spouse.role = "relative";
    spouse.gender = "female";
    spouse.parents = [];
    spouse.adopted = false;
    spouse.bornAt = dead.life.age - 42;
    spouse.alive = true;
    spouse.status = "alive";
    spouse.diedAt = null;
    spouse.cause = null;
    spouse.spouseId = null;
    spouse.formerSpouses = [SELF_ID];
    spouse.wealth = 7;
    spouse.log = [{ at: dead.life.age, kind: "widowed", value: SELF_ID }];
    dead.npcs.push(spouse);
  }
  return { dead, children };
}

function withEstate(dead: GameState, homeId: string | null, ventureId: string | null, wealth = 100): GameState {
  dead.character.wealth = wealth;
  dead.household = homeId ? { residence: "own", homeId, since: 0, condition: 60, arrears: 0 } : { residence: "homeless", homeId: null, since: 0, condition: 0, arrears: 0 };
  dead.business = {
    ventures: ventureId ? [{ id: ventureId, foundedAge: 20, level: 0, capital: 20, years: 5, losses: 0, lastNet: 4 }] : []
  };
  return dead;
}

/** Сумма, которую действительно получил наследник: золото + дом в натуре (если перешёл) */
function distributed(record: NonNullable<GameState["lineage"]["inheritance"]>): number {
  const shares = record.shares.reduce((sum, item) => sum + item.amount, 0);
  return record.wealth + (record.homeInherited ? (record.assets?.home?.value ?? 0) : 0) + shares;
}

describe("Stage 03.1: оценка наследства", () => {
  it("дом и дела входят в наследство, а не только золото", () => {
    const { dead } = controlledDead("dark-fantasy", [30, 25], "estate-total");
    withEstate(dead, "df-home-large", "df-business-workshop");
    const homeValue = saleValue(dead);
    const businessValue = businessSaleValue(dead, dead.business.ventures[0]!);
    const candidate = heirCandidates(dead).find((item) => item.primary)!;
    expect(candidate.wealth).toBeGreaterThan(90);

    const { state } = succeed(dead, candidate.npc.id, "estate");
    const record = state.lineage.inheritance!;
    expect(record.assets).toEqual({
      liquid: 100,
      home: { id: "df-home-large", value: homeValue },
      businesses: [{ id: "df-business-workshop", value: businessValue }],
      total: 100 + homeValue + businessValue
    });
    expect(record.assets!.total).toBeGreaterThan(200);
  });

  it("главный совершеннолетний наследник получает дом в натуре, а его золото уменьшено на стоимость дома", () => {
    const { dead, children } = controlledDead("dark-fantasy", [30, 25], "estate-home");
    withEstate(dead, "df-home-large", "df-business-workshop");
    const homeValue = saleValue(dead);
    const candidate = heirCandidates(dead).find((item) => item.primary)!;
    const heir = children.find((npc) => npc.id === candidate.npc.id)!;
    const { state } = succeed(dead, candidate.npc.id, "home");
    const record = state.lineage.inheritance!;

    expect(record.homeInherited).toBe(true);
    expect(state.household).toEqual({ residence: "own", homeId: "df-home-large", since: candidate.age, condition: 60, arrears: 0 });
    expect(record.wealth).toBe(candidate.wealth - homeValue);
    expect(state.character.wealth).toBe(heir.wealth + record.wealth);
    expect(state.business.ventures).toEqual([]);
    expect(record.assets!.home).not.toBeNull();
  });

  it("равный раздел и несовершеннолетний наследник получают золото, а дом продаётся в наследство", () => {
    const equal = controlledDead("isekai", [30, 26], "estate-equal");
    withEstate(equal.dead, "is-home-large", "is-business-workshop");
    const equalCandidate = heirCandidates(equal.dead).find((item) => item.primary)!;
    const equalResult = succeed(equal.dead, equalCandidate.npc.id, "equal");
    const equalRecord = equalResult.state.lineage.inheritance!;
    expect(equalRecord.homeInherited).toBe(false);
    expect(equalResult.state.household.residence).toBe("homeless");
    expect(equalRecord.assets!.home).not.toBeNull();
    expect(equalRecord.wealth).toBeGreaterThan(0);

    const minor = controlledDead("dark-fantasy", [10], "estate-minor");
    withEstate(minor.dead, "df-home-large", null);
    const minorCandidate = heirCandidates(minor.dead).find((item) => item.primary)!;
    expect(minorCandidate.regency).toBe(true);
    const minorResult = succeed(minor.dead, minorCandidate.npc.id, "minor");
    const minorRecord = minorResult.state.lineage.inheritance!;
    expect(minorRecord.homeInherited).toBe(false);
    expect(minorResult.state.household.residence).toBe("homeless");
    expect(minorRecord.held).toBe(minorRecord.wealth);
    expect(minorResult.state.character.wealth).toBe(minor.children[0]!.wealth);
  });

  it("доли закона, супруга, наследника и сонаследников в сумме дают всё имущество", () => {
    const { dead } = controlledDead("dark-fantasy", [30, 25], "estate-conservation");
    withEstate(dead, "df-home-large", "df-business-workshop");
    const total = dead.character.wealth + saleValue(dead) + businessSaleValue(dead, dead.business.ventures[0]!);
    const candidate = heirCandidates(dead).find((item) => item.primary)!;
    const widow = dead.npcs.find((npc) => npc.formerSpouses.includes(SELF_ID) && npc.log.some((entry) => entry.kind === "widowed"))!;
    const widowBefore = widow.wealth;
    const { state } = succeed(dead, candidate.npc.id, "conservation");
    const record = state.lineage.inheritance!;
    const levy = Math.round(total * 0.1);
    const spouse = Math.round((total - levy) * 0.1);
    expect(levy + spouse + distributed(record)).toBe(total);
    const afterWidow = state.npcs.find((npc) => npc.id === widow.id);
    expect(afterWidow?.wealth).toBe(widowBefore + spouse);
  });

  it("старое сохранение формата 13 без assets загружается и переходит в формат 14", () => {
    expect(SAVE_SCHEMA_VERSION).toBe(14);
    const old = parseSave(deepClone(SAVES_V13["dark-fantasy-old-inheritance"]));
    expect(old.schemaVersion).toBe(14);
    expect(old.lineage.inheritance?.wealth).toBe(42);
    expect(old.lineage.inheritance?.assets).toBeUndefined();
    const alive = parseSave(deepClone(SAVES_V13["murim-alive"]));
    const next = applyAction(alive, alive.pending ? { type: "choose", choiceId: choiceIds(alive)[0]! } : { type: "advance" });
    expect(next.state.version).toBe(alive.version + 1);
  });
});

describe("Stage 03.1: реликвии в обычной игре", () => {
  it("у каждого мира есть свой сюжет получения реликвии, доступный через общий пул", () => {
    for (const [universeId, { eventId, relicId }] of Object.entries(RELIC_EVENTS) as [UniverseId, { eventId: string; relicId: string }][]) {
      const universe = getUniverse(universeId);
      const event = findEvent(universe, eventId);
      expect(event, eventId).toBeDefined();
      expect(event!.kind).toBe("legacy");
      expect(event!.lineageMax).toBe(1);
      const state = at(start({ seed: `relic-pool-${universeId}`, universeId }), 30);
      expect(isEligible(state, event!)).toBe(true);
      const after = applyAction(withPending(state, eventId), { type: "choose", choiceId: "keep" }).state;
      expect(after.lineage.relics.map((relic) => relic.id)).toContain(relicId);
    }
  });

  it("реликвию можно получить обычным ходом, а не только тестовым эффектом", () => {
    for (const [universeId, { relicId }] of Object.entries(RELIC_EVENTS) as [UniverseId, { eventId: string; relicId: string }][]) {
      let acquired = false;
      for (let seed = 0; seed < 12 && !acquired; seed++) {
        let state = start({ seed: `relic-life-${universeId}-${seed}`, universeId });
        for (let step = 0; step < 45 && state.life.alive && state.life.age < 65 && !acquired; step++) {
          state = state.pending ? applyAction(state, { type: "choose", choiceId: choiceIds(state)[0]! }).state : applyAction(state, { type: "advance", years: 2 }).state;
          acquired = state.lineage.relics.some((relic) => relic.id === relicId);
        }
      }
      expect(acquired, universeId).toBe(true);
    }
  });

  it("реликвия переходит к наследнику и попадает в запись о наследстве", () => {
    const { dead } = controlledDead("hunter", [25], "relic-inherit");
    dead.lineage.relics = [relicOf("gate-hunter-badge")];
    const candidate = heirCandidates(dead).find((item) => item.primary)!;
    const { state } = succeed(dead, candidate.npc.id, "relic-inherit");
    expect(state.lineage.relics.map((relic) => relic.id)).toEqual(["gate-hunter-badge"]);
    expect(state.lineage.inheritance!.relics).toEqual(["gate-hunter-badge"]);
    expect(presentLegacy(state).inheritance!.relics.map((relic) => relic.id)).toEqual(["gate-hunter-badge"]);
  });

  it("потеря реликвии убирает её из рода и не даёт унаследовать", () => {
    const state = at(start({ seed: "relic-loss", universeId: "dark-fantasy" }), 30);
    state.lineage.relics = [relicOf("ancestral-blade"), relicOf("system-crystal")];
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.loseRelic("ancestral-blade"));
    expect(state.lineage.relics.map((relic) => relic.id)).toEqual(["system-crystal"]);
    expect(state.lineage.chronicle.some((entry) => entry.kind === "relic" && entry.v.lost === 1)).toBe(true);
    applyEffect(ctx, fx.loseRelic("ancestral-blade"));
    expect(state.lineage.chronicle.filter((entry) => entry.kind === "relic" && entry.v.lost === 1)).toHaveLength(1);

    const { dead } = controlledDead("dark-fantasy", [30], "relic-loss-heir");
    dead.lineage.relics = [relicOf("ancestral-blade"), relicOf("system-crystal")];
    applyEffect(makeCtx(dead), fx.loseRelic("ancestral-blade"));
    const candidate = heirCandidates(dead).find((item) => item.primary)!;
    const { state: heir } = succeed(dead, candidate.npc.id, "loss");
    expect(heir.lineage.relics.map((relic) => relic.id)).toEqual(["system-crystal"]);
    expect(heir.lineage.inheritance!.relics).toEqual(["system-crystal"]);
  });

  it("сюжет долга требует реликвию и позволяет её лишиться по выбору", () => {
    const eventId = "legacy.relic-demand";
    const without = at(start({ seed: "relic-demand-none", universeId: "academy" }), 30);
    expect(isEligible(without, findEvent(getUniverse("academy"), eventId)!)).toBe(false);
    const withRelic = at(start({ seed: "relic-demand-one", universeId: "academy" }), 30);
    withRelic.lineage.relics = [relicOf("noble-signet")];
    expect(isEligible(withRelic, findEvent(getUniverse("academy"), eventId)!)).toBe(true);
    const after = applyAction(withPending(withRelic, eventId), { type: "choose", choiceId: "give-noble-signet" }).state;
    expect(after.lineage.relics).toEqual([]);
    expect(after.lineage.chronicle.some((entry) => entry.kind === "relic" && entry.v.lost === 1)).toBe(true);
  });
});

describe("Stage 03.1: повторное наследование", () => {
  it("дом и реликвия не дублируются, а второй succeed по продолженной жизни запрещён", () => {
    const { dead } = controlledDead("dark-fantasy", [30], "repeat");
    withEstate(dead, "df-home-large", null);
    dead.lineage.relics = [relicOf("ancestral-blade")];
    const candidate = heirCandidates(dead).find((item) => item.primary)!;
    const first = succeed(dead, candidate.npc.id, "repeat-salt");
    expect(first.state.household.residence).toBe("own");
    expect(first.state.lineage.relics).toHaveLength(1);
    expect(first.state.lineage.relics[0]!.id).toBe("ancestral-blade");
    expect(first.previous.lineage.continuedBy).toBe(candidate.npc.id);
    expect(() => succeed(first.previous, candidate.npc.id, "repeat-salt")).toThrow(expect.objectContaining({ code: "LINEAGE_CONTINUED" }));
    const again = succeed(dead, candidate.npc.id, "repeat-salt");
    expect(again.state).toEqual(first.state);
    expect(again.state.lineage.relics).toHaveLength(1);
  });

  it("вид наследства показывает золото, дом, проданные дела и реликвии без повторов", () => {
    const { dead } = controlledDead("dark-fantasy", [30], "present");
    withEstate(dead, "df-home-large", "df-business-workshop");
    dead.lineage.relics = [relicOf("ancestral-blade")];
    const candidate = heirCandidates(dead).find((item) => item.primary)!;
    const { state } = succeed(dead, candidate.npc.id, "present");
    const view = presentLegacy(state).inheritance!;
    expect(view.assets).not.toBeNull();
    expect(view.assets!.liquid).toBe(100);
    expect(view.assets!.home?.id).toBe("df-home-large");
    expect(view.assets!.home?.name.en).toBeTruthy();
    expect(view.assets!.businesses).toHaveLength(1);
    expect(view.assets!.businesses[0]!.name.ru).toBeTruthy();
    expect(view.assets!.total).toBe(view.assets!.liquid + view.assets!.home!.value + view.assets!.businesses[0]!.value);
    expect(view.homeInherited).toBe(true);
    expect(view.relics.map((relic) => relic.id)).toEqual(["ancestral-blade"]);
    expect(view.relics.filter((relic) => relic.id === "ancestral-blade")).toHaveLength(1);
  });
});
