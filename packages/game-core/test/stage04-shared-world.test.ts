// Stage 04 — Living Worlds: общий мир, сезонный tick, replay, ограничения значений,
// контрольная сумма, проверка формы и сверка с мирами отдельных жизней.
import { describe, expect, it } from "vitest";
import {
  applySharedWorldCommand,
  canonicalSharedWorldJson,
  deepClone,
  getUniverse,
  MAX_SHARED_WORLD_EVENTS,
  newSharedWorld,
  newWorldState,
  parseSharedWorldState,
  reconcileSharedWorld,
  replaySharedWorld,
  SHARED_GOOD_SUPPLY_MAX,
  SHARED_POPULATION_MAX,
  SHARED_POPULATION_MIN,
  SHARED_WORLD_VERSION,
  sharedGoodPrices,
  sharedWorldChecksum,
  sharedWorldSeed,
  UNIVERSE_IDS,
  validateSharedWorldState,
  type SharedWorldCommand
} from "../src/index.js";

function isFiniteEverywhere(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isFiniteEverywhere);
  if (value !== null && typeof value === "object") return Object.values(value).every(isFiniteEverywhere);
  return true;
}

describe("Stage 04: общий мир", () => {
  it("у шести вселенных свои детерминированные миры: три поселения, фракции, три товара", () => {
    const checksums = new Set<string>();
    for (const universeId of UNIVERSE_IDS) {
      const universe = getUniverse(universeId);
      const state = newSharedWorld(universeId);
      expect(state.version, universeId).toBe(SHARED_WORLD_VERSION);
      expect(state.universeId).toBe(universeId);
      expect(state.seed).toBe(sharedWorldSeed(universeId));
      expect(state.season).toBe(1);
      expect(state.settlements).toHaveLength(3);
      expect(state.factions).toHaveLength(universe.factions.length);
      expect(state.events).toEqual([]);
      for (const settlement of state.settlements) {
        expect(settlement.name.ru.length).toBeGreaterThan(0);
        expect(settlement.name.en.length).toBeGreaterThan(0);
        expect(settlement.tags.length).toBeGreaterThan(0);
        expect(settlement.goods).toHaveLength(3);
        for (const good of settlement.goods) {
          expect(good.name.ru.length).toBeGreaterThan(0);
          expect(good.name.en.length).toBeGreaterThan(0);
          expect(good.description.en.length).toBeGreaterThan(0);
          expect(good.buy).toBe(sharedGoodPrices(good.base, good.supply).buy);
          expect(good.sell).toBe(sharedGoodPrices(good.base, good.supply).sell);
          expect(good.buy).toBeGreaterThan(good.sell);
        }
      }
      expect(validateSharedWorldState(state)).toEqual({ ok: true, problems: [] });
      const same = newSharedWorld(universeId);
      expect(sharedWorldChecksum(same)).toBe(sharedWorldChecksum(state));
      checksums.add(sharedWorldChecksum(state));
    }
    expect(checksums.size).toBe(UNIVERSE_IDS.length);
  });

  it("tick ровно на один сезон: одинаковый seed даёт одинаковый мир и одинаковое событие", () => {
    const seed = "shared-determinism";
    const one = newSharedWorld("murim", seed);
    const two = newSharedWorld("murim", seed);
    const tickedOne = applySharedWorldCommand(one, { type: "tick" });
    const tickedTwo = applySharedWorldCommand(two, { type: "tick" });
    expect(tickedOne.season).toBe(2);
    expect(tickedTwo.season).toBe(2);
    expect(sharedWorldChecksum(tickedOne)).toBe(sharedWorldChecksum(tickedTwo));
    expect(tickedOne.events).toHaveLength(1);
    expect(tickedOne.events[0]!.season).toBe(2);
    expect(tickedOne.events[0]!.id).toBe(tickedTwo.events[0]!.id);
    expect(tickedOne.events[0]!.title).toEqual(tickedTwo.events[0]!.title);
    // Исходное состояние не изменилось
    expect(one.season).toBe(1);
    expect(one.events).toHaveLength(0);
    expect(isFiniteEverywhere(tickedOne)).toBe(true);
  });

  it("replay из seed и журнала команд совпадает с пошаговым применением", () => {
    const commands: SharedWorldCommand[] = [
      { type: "tick" },
      { type: "tick" },
      {
        type: "event",
        kind: "politics",
        title: { ru: "Совет собрался", en: "The council meets" },
        text: { ru: "Старейшины обсуждают дороги.", en: "The elders discuss the roads." },
        settlementId: "nine-rivers",
        severity: 4
      },
      { type: "settlement", settlementId: "black-market", prosperity: 73, stability: 41, dominantFactionId: "beggars-sect" },
      { type: "faction", factionId: "beggars-sect", power: 66, influence: 21, standing: 12 },
      { type: "tick" }
    ];
    const stepByStep = commands.reduce((state, command) => applySharedWorldCommand(state, command), newSharedWorld("murim", "replay-seed"));
    const replayed = replaySharedWorld("murim", "replay-seed", commands);
    expect(replayed).toEqual(stepByStep);
    expect(sharedWorldChecksum(replayed)).toBe(sharedWorldChecksum(stepByStep));
    expect(replayed.season).toBe(4);
    expect(replayed.settlements.find((item) => item.id === "black-market")!.prosperity).toBe(73);
    // После правки был ещё один tick: влияние сдвинулось на +1 детерминированно
    expect(replayed.factions.find((item) => item.id === "beggars-sect")!.influence).toBe(22);
  });

  it("правки администратора не двигают сезон, а значения зажимаются и остаются конечными", () => {
    const start = newSharedWorld("dark-fantasy", "clamp-seed");
    const adjusted = [
      { type: "settlement", settlementId: "ash-capital", population: -1, prosperity: 500, stability: -40 },
      { type: "faction", factionId: "order-of-ash", power: 999, influence: -999, standing: 999 },
      {
        type: "event",
        kind: "admin",
        title: { ru: "Указ", en: "A decree" },
        text: { ru: "Так решил совет.", en: "So the council decided." },
        severity: 99
      }
    ] satisfies SharedWorldCommand[];
    const state = adjusted.reduce((current, command) => applySharedWorldCommand(current, command), start);
    expect(state.season).toBe(1);
    const settlement = state.settlements.find((item) => item.id === "ash-capital")!;
    expect(settlement.population).toBe(SHARED_POPULATION_MIN);
    expect(settlement.prosperity).toBe(100);
    expect(settlement.stability).toBe(0);
    const faction = state.factions.find((item) => item.id === "order-of-ash")!;
    expect(faction.power).toBe(100);
    expect(faction.influence).toBe(-100);
    expect(faction.standing).toBe(100);
    expect(state.events[0]!.severity).toBe(5);
    expect(state.events[0]!.season).toBe(1);
    expect(validateSharedWorldState(state).ok).toBe(true);
  });

  it("за 60 сезонов значения не выходят из пределов, событий не больше лимита", () => {
    let state = newSharedWorld("xianxia", "long-run");
    for (let i = 0; i < 60; i++) state = applySharedWorldCommand(state, { type: "tick" });
    expect(state.season).toBe(61);
    expect(state.events).toHaveLength(MAX_SHARED_WORLD_EVENTS);
    expect(state.events[0]!.season).toBe(61);
    expect(state.events.at(-1)!.season).toBe(61 - MAX_SHARED_WORLD_EVENTS + 1);
    for (const settlement of state.settlements) {
      expect(settlement.population).toBeGreaterThanOrEqual(SHARED_POPULATION_MIN);
      expect(settlement.population).toBeLessThanOrEqual(SHARED_POPULATION_MAX);
      expect(settlement.prosperity).toBeGreaterThanOrEqual(0);
      expect(settlement.prosperity).toBeLessThanOrEqual(100);
      expect(settlement.stability).toBeGreaterThanOrEqual(0);
      expect(settlement.stability).toBeLessThanOrEqual(100);
      for (const good of settlement.goods) {
        expect(good.supply).toBeGreaterThanOrEqual(0);
        expect(good.supply).toBeLessThanOrEqual(SHARED_GOOD_SUPPLY_MAX);
        expect(good.buy).toBeGreaterThan(good.sell);
      }
    }
    for (const faction of state.factions) {
      expect(faction.power).toBeGreaterThanOrEqual(0);
      expect(faction.power).toBeLessThanOrEqual(100);
      expect(faction.influence).toBeGreaterThanOrEqual(-100);
      expect(faction.influence).toBeLessThanOrEqual(100);
      expect(faction.standing).toBeGreaterThanOrEqual(-100);
      expect(faction.standing).toBeLessThanOrEqual(100);
    }
    expect(isFiniteEverywhere(state)).toBe(true);
    expect(validateSharedWorldState(state).ok).toBe(true);
  });

  it("контрольная сумма каноническая: порядок поселений и тегов не влияет, изменение события — влияет", () => {
    const state = newSharedWorld("hunter", "checksum-seed");
    const reordered = deepClone(state);
    reordered.settlements.reverse();
    for (const settlement of reordered.settlements) settlement.tags.reverse();
    expect(canonicalSharedWorldJson(reordered)).toBe(canonicalSharedWorldJson(state));
    expect(sharedWorldChecksum(reordered)).toBe(sharedWorldChecksum(state));

    const changed = deepClone(state);
    changed.settlements[0]!.prosperity += 1;
    expect(sharedWorldChecksum(changed)).not.toBe(sharedWorldChecksum(state));

    const withEvent = applySharedWorldCommand(state, {
      type: "event",
      kind: "discovery",
      title: { ru: "Находка", en: "A find" },
      text: { ru: "Нашли старую карту.", en: "An old map was found." },
      severity: 1
    });
    expect(sharedWorldChecksum(withEvent)).not.toBe(sharedWorldChecksum(state));

    const broken = deepClone(state);
    (broken.settlements[0] as unknown as { prosperity: number }).prosperity = Number.NaN;
    expect(() => sharedWorldChecksum(broken)).toThrow(/конечным числом/);
  });

  it("проверка формы ловит битые поля, parse не подменяет повреждённое состояние", () => {
    const good = newSharedWorld("academy");
    expect(validateSharedWorldState(good)).toEqual({ ok: true, problems: [] });
    expect(parseSharedWorldState(good)).toEqual(good);

    expect(validateSharedWorldState({ ...good, version: 99 }).ok).toBe(false);
    expect(validateSharedWorldState({ ...good, season: 0 }).ok).toBe(false);
    expect(validateSharedWorldState({ ...good, seed: "" }).ok).toBe(false);
    expect(validateSharedWorldState({ ...good, settlements: [] }).ok).toBe(false);

    const badSettlement = deepClone(good);
    badSettlement.settlements[0]!.population = -5;
    expect(validateSharedWorldState(badSettlement).ok).toBe(false);

    const badFaction = deepClone(good);
    badFaction.factions[0]!.power = 101;
    expect(validateSharedWorldState(badFaction).ok).toBe(false);

    const badEvent = applySharedWorldCommand(good, {
      type: "event",
      kind: "trade",
      title: { ru: "Торг", en: "Trade" },
      text: { ru: "Караван пришёл.", en: "A caravan arrived." },
      severity: 2
    });
    (badEvent.events[0] as unknown as { severity: number }).severity = 9;
    expect(validateSharedWorldState(badEvent).ok).toBe(false);
    expect(() => parseSharedWorldState(badEvent)).toThrow(/Повреждённое состояние/);
  });

  it("сверка: исходный мир жизни совпадает, расхождения дают счётчики и примеры без личности", () => {
    const shared = newSharedWorld("academy", "reconcile-seed");
    const universe = getUniverse("academy");
    const aligned = reconcileSharedWorld(shared, newWorldState(universe));
    expect(aligned.aligned).toBe(true);
    expect(aligned.settlements).toMatchObject({ total: 3, aligned: 3, drifted: 0, missing: 0, examples: [] });
    expect(aligned.factions).toMatchObject({ total: universe.factions.length, drifted: 0, missing: 0, examples: [] });

    const driftedWorld = newWorldState(universe);
    driftedWorld.settlements[0]!.prosperity += 40;
    driftedWorld.settlements[0]!.population += 10_000;
    driftedWorld.settlements[0]!.dominantFactionId = universe.factions[1]!.id;
    driftedWorld.factions[0]!.power = 100;
    driftedWorld.settlements.splice(1, 1);
    const drifted = reconcileSharedWorld(shared, driftedWorld);
    expect(drifted.aligned).toBe(false);
    expect(drifted.settlements.drifted).toBe(1);
    expect(drifted.settlements.missing).toBe(1);
    expect(drifted.settlements.examples.length).toBeGreaterThan(0);
    expect(drifted.factions.drifted).toBeGreaterThan(0);
    const example = drifted.settlements.examples[0]!;
    expect(example.settlementId.length).toBeGreaterThan(0);
    expect(example.name.ru.length).toBeGreaterThan(0);
    expect(JSON.stringify(drifted)).not.toMatch(/"(playerId|lifeId|seed)"/);
  });
});
