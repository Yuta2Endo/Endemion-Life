// R5.11: семейный совет — наследник, опекун и судьба родового дома.
// Проверяем решения живого главы, ограничения, последствия при наследовании и совместимость сохранений.
import { describe, expect, it } from "vitest";
import {
  applyAction,
  deepClone,
  heirCandidates,
  potentialHeirs,
  presentLineage,
  SELF_ID,
  succeed,
  type GameState,
  type NpcState,
  type UniverseId
} from "../src/index.js";
import { playLife, start } from "./helpers.js";

/** Мёртвая жизнь с живым ребёнком: берём готовую династию и оживляем главу для совета */
function deadWithChild(universeId: UniverseId, tag: string): GameState {
  for (let k = 0; k < 40; k++) {
    const { state } = playLife(start({ seed: `r511-${tag}-${universeId}-${k}`, universeId }), 6000, (n, i) => (i * 3 + k) % n);
    if (!state.life.alive && heirCandidates(state).some((candidate) => candidate.available && candidate.relation === "child")) return state;
  }
  throw new Error(`нет жизни с ребёнком: ${universeId}`);
}

function controlledDead(universeId: UniverseId, ages: readonly number[], tag: string): { dead: GameState; children: NpcState[] } {
  const dead = deadWithChild(universeId, `${tag}-${ages.join("-")}`);
  const pool = heirCandidates(dead).filter((candidate) => candidate.available && candidate.relation === "child");
  const template = pool[0]!.npc;
  const children: NpcState[] = [];
  for (const [index, age] of ages.entries()) {
    let npc: NpcState;
    if (index === 0) npc = dead.npcs.find((item) => item.id === template.id)!;
    else {
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
  return { dead, children };
}

/** Семья живого главы в 30 лет: только дети из ages остаются живыми */
function livingFamily(universeId: UniverseId, ages: readonly number[], tag: string, wealth = 100): { state: GameState; children: NpcState[] } {
  const { dead, children } = controlledDead(universeId, ages, tag);
  const state = deepClone(dead);
  const baseAge = 30;
  state.life = { age: baseAge, stage: "adult", alive: true, deathAge: null, deathCause: null };
  state.pending = null;
  state.character.wealth = wealth;
  state.lineage.council = { current: null, history: [] };
  state.lineage.continuedBy = null;
  state.lineage.renown = 0;
  state.lineage.startRenown = 0;
  const ids = new Set(children.map((child) => child.id));
  for (const npc of state.npcs) {
    if (!ids.has(npc.id)) continue;
    npc.bornAt = baseAge - ages[children.findIndex((child) => child.id === npc.id)]!;
    npc.metAt = 0;
  }
  return { state, children: state.npcs.filter((npc) => ids.has(npc.id)) };
}

function kill(state: GameState): GameState {
  const dead = deepClone(state);
  dead.life = { age: 30, stage: "adult", alive: false, deathAge: 30, deathCause: { ru: "Испытание", en: "A trial" } };
  dead.pending = null;
  return dead;
}

function withHome(state: GameState, homeId: string): GameState {
  state.household = { residence: "own", homeId, since: 0, condition: 60, arrears: 0 };
  return state;
}

describe("R5.11: семейный совет", () => {
  it("собирает совет, записывает наследника, опекуна и судьбу дома", () => {
    const { state, children } = livingFamily("dark-fantasy", [14, 25], "hold");
    const [minor, adult] = children;
    const result = applyAction(state, { type: "holdCouncil", heirId: minor!.id, guardianId: adult!.id, estate: "keep" });
    const council = result.state.lineage.council!;
    expect(council.current).toMatchObject({ gen: 1, age: 30, heirId: minor!.id, heirName: minor!.name, guardianId: adult!.id, guardianName: adult!.name, estate: "keep" });
    expect(council.history).toHaveLength(1);
    expect(result.entries[0]?.kind).toBe("legacy");
    expect(presentLineage(result.state).council.current?.estateName).toEqual({ ru: "Сохранить родовой дом", en: "Keep the family home" });
  });

  it("не собирает совет слишком рано, повторно и с чужим опекуном", () => {
    const { state, children } = livingFamily("dark-fantasy", [14, 25], "limits");
    const young = deepClone(state);
    young.life.age = 10;
    young.life.stage = "child";
    expect(() => applyAction(young, { type: "holdCouncil" })).toThrow(expect.objectContaining({ code: "COUNCIL_LOCKED" }));
    const first = applyAction(state, { type: "holdCouncil", heirId: children[0]!.id, guardianId: children[1]!.id });
    expect(() => applyAction(first.state, { type: "holdCouncil" })).toThrow(expect.objectContaining({ code: "COUNCIL_COOLDOWN" }));
    expect(() => applyAction(state, { type: "holdCouncil", guardianId: "n999" })).toThrow(expect.objectContaining({ code: "COUNCIL_LOCKED" }));
  });

  it("передаёт опеку выбранному совету взрослому и награждает исполненную волю славой", () => {
    const { state, children } = livingFamily("dark-fantasy", [14, 25], "guardian");
    const [minor, adult] = children;
    const councilState = applyAction(state, { type: "holdCouncil", heirId: minor!.id, guardianId: adult!.id, estate: "law" }).state;
    const result = succeed(kill(councilState), minor!.id, "council-guardian");
    expect(result.state.lineage.inheritance?.guardianName).toBe(adult!.name);
    expect(result.state.lineage.renown).toBe(2);
    expect(result.state.lineage.council?.current).toBeNull();
    expect(result.state.lineage.council?.history).toHaveLength(1);
  });

  it("наказывает род, если совет выбрал одного наследника, а продолжил другой", () => {
    const { state, children } = livingFamily("dark-fantasy", [14, 25], "broken-will");
    const [minor, adult] = children;
    const councilState = applyAction(state, { type: "holdCouncil", heirId: adult!.id, guardianId: null, estate: "law" }).state;
    const result = succeed(kill(councilState), minor!.id, "council-broken");
    expect(result.state.lineage.renown).toBe(-1);
  });

  it("сохраняет дом в семье по воле совета и продаёт его по другому решению", () => {
    const first = livingFamily("dark-fantasy", [25, 20], "estate-keep", 600);
    withHome(first.state, "df-home-large");
    const [younger] = first.children.slice(1);
    const keep = applyAction(first.state, { type: "holdCouncil", heirId: younger!.id, estate: "keep" }).state;
    const kept = succeed(kill(keep), younger!.id, "council-keep");
    expect(kept.state.lineage.inheritance?.homeInherited).toBe(true);

    const second = livingFamily("dark-fantasy", [25, 20], "estate-sell", 600);
    withHome(second.state, "df-home-large");
    const secondOlder = second.children[0]!;
    const sell = applyAction(second.state, { type: "holdCouncil", heirId: secondOlder.id, estate: "sell" }).state;
    const sold = succeed(kill(sell), secondOlder.id, "council-sell");
    expect(sold.state.lineage.inheritance?.homeInherited).toBe(false);
  });

  it("открывает старые сохранения без поля совета", () => {
    const { state } = livingFamily("isekai", [20], "old-save");
    const old = deepClone(state) as GameState & { lineage: { council?: unknown } };
    delete old.lineage.council;
    const normalized = applyAction(old, { type: "setMode", mode: "manual" }).state;
    expect(normalized.lineage.council).toEqual({ current: null, history: [] });
    expect(potentialHeirs(normalized).length).toBeGreaterThan(0);
  });
});
