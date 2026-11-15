// R5.6: пробуждение реликвий Третьей дороги — каталог, условия, выбор и последствия.
import { describe, expect, it } from "vitest";
import {
  applyAction,
  eventProblems,
  findEvent,
  getUniverse,
  isEligible,
  presentLegacy,
  RELIC_AWAKENING_EVENTS,
  type GameState,
  type UniverseId
} from "../src/index.js";
import { findRelic, RELICS, type RelicDefinition } from "../src/legacy/stories.js";
import { start } from "./helpers.js";

const AWAKENINGS: Readonly<Record<UniverseId, { eventId: string; relicId: string; awakenedId: string }>> = {
  "dark-fantasy": { eventId: "common.awakening-drowned-bell", relicId: "drowned-bell", awakenedId: "drowned-toll" },
  isekai: { eventId: "common.awakening-caravan-ledger", relicId: "caravan-ledger", awakenedId: "ledger-unbound" },
  murim: { eventId: "common.awakening-iron-shrine-tablet", relicId: "iron-shrine-tablet", awakenedId: "named-tablet" },
  xianxia: { eventId: "common.awakening-star-well-cup", relicId: "star-well-cup", awakenedId: "full-sky-cup" },
  hunter: { eventId: "common.awakening-red-gate-core", relicId: "red-gate-core", awakenedId: "red-gate-heart" },
  academy: { eventId: "common.awakening-star-chart", relicId: "star-chart", awakenedId: "starless-chart" }
};

function grown(universeId: UniverseId, age = 30): GameState {
  const state = start({ universeId });
  state.life = { ...state.life, age, stage: "adult" };
  state.pending = null;
  return state;
}

function relicOf(definition: RelicDefinition) {
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    acquiredGen: 1,
    acquiredAge: 20,
    source: "test"
  };
}

function withPending(state: GameState, eventId: string): GameState {
  return { ...state, pending: { eventId, age: state.life.age } };
}

describe("R5.6: пробуждение реликвий", () => {
  it("добавляет по две реликвии каждому миру и усиливает каталог до 18 предметов", () => {
    expect(Object.keys(RELICS)).toHaveLength(18);
    for (const [universeId, { relicId, awakenedId }] of Object.entries(AWAKENINGS) as [UniverseId, { relicId: string; awakenedId: string }][]) {
      const base = findRelic(relicId);
      const awakened = findRelic(awakenedId);
      expect(base, relicId).toBeDefined();
      expect(awakened, awakenedId).toBeDefined();
      expect(base!.universeId, relicId).toBe(universeId);
      expect(awakened!.universeId, awakenedId).toBe(universeId);
      expect(base!.effects.length, relicId).toBeGreaterThan(0);
      expect(awakened!.effects.length, awakenedId).toBeGreaterThan(0);
    }
  });

  it("событие пробуждения закрыто без реликвии и открыто с ней", () => {
    for (const [universeId, { eventId, relicId }] of Object.entries(AWAKENINGS) as [UniverseId, { eventId: string; relicId: string }][]) {
      const universe = getUniverse(universeId);
      const event = findEvent(universe, eventId);
      expect(event, eventId).toBeDefined();
      expect(event!.kind, eventId).toBe("legacy");
      expect(event!.maxOccurrences, eventId).toBe(1);
      expect(event!.lineageMax, eventId).toBe(1);
      expect(event!.conditions?.length, eventId).toBe(2);

      const without = grown(universeId);
      expect(isEligible(without, event!), `${universeId}: without relic`).toBe(false);

      const withRelic = grown(universeId);
      withRelic.lineage.relics = [relicOf(findRelic(relicId)!)];
      expect(isEligible(withRelic, event!), `${universeId}: with relic`).toBe(true);
    }
  });

  it("выбор «пробудить» даёт усиленную реликвию, а «запечатать» — нет", () => {
    for (const [universeId, { eventId, relicId, awakenedId }] of Object.entries(AWAKENINGS) as [UniverseId, { eventId: string; relicId: string; awakenedId: string }][]) {
      const base = grown(universeId);
      base.lineage.relics = [relicOf(findRelic(relicId)!)];
      const awakened = applyAction(withPending(base, eventId), { type: "choose", choiceId: "awaken" }).state;
      const ids = awakened.lineage.relics.map((relic) => relic.id);
      expect(ids, `${universeId}: awakened`).toContain(relicId);
      expect(ids, `${universeId}: awakened`).toContain(awakenedId);

      const sealed = applyAction(withPending(base, eventId), { type: "choose", choiceId: "seal" }).state;
      const sealedIds = sealed.lineage.relics.map((relic) => relic.id);
      expect(sealedIds, `${universeId}: sealed`).toContain(relicId);
      expect(sealedIds, `${universeId}: sealed`).not.toContain(awakenedId);
    }
  });

  it("старый снимок без реликвий не роняет представление рода", () => {
    const state = grown("dark-fantasy");
    (state.lineage as { relics?: unknown }).relics = undefined;
    expect(presentLegacy(state).relics).toEqual([]);
  });

  it("события проходят проверку контента и не повторяются в роду", () => {
    expect(RELIC_AWAKENING_EVENTS).toHaveLength(6);
    expect(eventProblems()).toEqual([]);
    for (const event of RELIC_AWAKENING_EVENTS) {
      expect(event.maxOccurrences).toBe(1);
      expect(event.lineageMax).toBe(1);
      expect(event.choices.map((choice) => choice.id).sort()).toEqual(["awaken", "seal"]);
    }
  });
});
