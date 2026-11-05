// Stage 18: веха доверия один раз, общение в тот же год закрыто, событие не блокирует жизнь без флага
import { describe, expect, it } from "vitest";
import { applyAction, BOND_AT, BOND_FLAG, changeNpcAffinity, eventIndex, getUniverse, interactionBlock, isEligible } from "../src/index.js";
import type { EngineContext } from "../src/engine/context.js";
import { Rng } from "../src/rng.js";
import { start } from "./helpers.js";

describe("Stage 18: доверие", () => {
  it("порог 75 ставит флаг и репутацию один раз, второй человек флаг не удваивает", () => {
    const state = start({ seed: "bond" });
    const npc = state.npcs[0];
    if (!npc) throw new Error("нет людей");
    const other = state.npcs[1];
    npc.affinity = BOND_AT - 1;
    const ctx: EngineContext = { state, rng: new Rng(1), universe: getUniverse(state.character.universeId), changes: [] };
    const reputation = state.character.reputation;
    changeNpcAffinity(ctx, npc.id, 2);
    expect(state.flags).toContain(BOND_FLAG);
    expect(state.character.reputation).toBe(reputation + 2);
    expect(npc.log.some((entry) => entry.kind === "bond")).toBe(true);
    if (other) {
      other.affinity = BOND_AT - 1;
      changeNpcAffinity(ctx, other.id, 2);
      expect(state.flags.filter((flag) => flag === BOND_FLAG)).toHaveLength(1);
      expect(state.character.reputation).toBe(reputation + 2);
    }
    changeNpcAffinity(ctx, npc.id, -10);
    changeNpcAffinity(ctx, npc.id, 20);
    expect(npc.log.filter((entry) => entry.kind === "bond")).toHaveLength(1);
  });

  it("повтор общения в тот же год закрыт, чужой id не проходит", () => {
    const state = start({ seed: "talk" });
    state.life = { ...state.life, age: 20, stage: "adult" };
    state.pending = null;
    const npc = state.npcs.find((item) => item.alive);
    if (!npc) throw new Error("нет живых");
    npc.affinity = 20;
    const ctx: EngineContext = { state, rng: new Rng(1), universe: getUniverse(state.character.universeId), changes: [] };
    expect(interactionBlock(ctx, npc, "talk")).toBe("");
    const once = applyAction(state, { type: "interact", npcId: npc.id, interaction: "talk" });
    expect(once.entries.some((entry) => entry.kind === "people")).toBe(true);
    const again = once.state.npcs.find((item) => item.id === npc.id)!;
    const ctx2: EngineContext = { state: once.state, rng: new Rng(1), universe: getUniverse(state.character.universeId), changes: [] };
    expect(interactionBlock(ctx2, again, "talk")).toBe("уже в этом году");
    expect(() => applyAction(once.state, { type: "interact", npcId: npc.id, interaction: "gift" })).toThrow();
    expect(() => applyAction(once.state, { type: "interact", npcId: "n999", interaction: "talk" })).toThrow();
  });

  it("событие доверия не приходит без флага и не обязательно для жизни", () => {
    const state = start({ seed: "kept" });
    state.life = { ...state.life, age: 20, stage: "adult" };
    const event = eventIndex(getUniverse(state.character.universeId)).get("common.kept-word");
    expect(event).toBeDefined();
    expect(isEligible(state, event!)).toBe(false);
    state.flags.push(BOND_FLAG);
    expect(isEligible(state, event!)).toBe(true);
  });
});
