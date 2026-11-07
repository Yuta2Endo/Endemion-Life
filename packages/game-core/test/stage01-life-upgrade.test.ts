import { describe, expect, it } from "vitest";
import { applyAction, newGame, parseSave, presentEvent, toLifeChronicle, type UniverseId } from "../src/index.js";

function life(seed = "stage01", universeId: UniverseId = "academy") {
  return newGame({ seed, universeId, gender: "female" }).state;
}

describe("Stage 01: life experience upgrade", () => {
  it("stores the progression mode and keeps it through save parsing", () => {
    const state = life();
    const changed = applyAction(state, { type: "setMode", mode: "milestones" }).state;
    expect(changed.autoMode).toBe("milestones");
    expect(parseSave(JSON.parse(JSON.stringify(changed))).autoMode).toBe("milestones");
  });

  it("offers an age milestone through the existing pending-event flow", () => {
    let state = life("milestone-flow");
    state = applyAction(state, { type: "setMode", mode: "milestones" }).state;
    const result = applyAction(state, { type: "advance" });
    expect(result.state.pending?.eventId).toBe("milestone.1");
    expect(result.state.milestones.triggered).toContain("milestone.1");
    expect(result.entries.some((entry) => entry.kind === "year")).toBe(true);

    const chosen = applyAction(result.state, { type: "choose", choiceId: "reach" });
    expect(chosen.entries.some((entry) => entry.eventId === "milestone.1" && entry.choiceId === "reach")).toBe(true);
    expect(chosen.state.pending).toBeNull();
  });

  it("lets automatic mode pass age milestones while milestones mode interrupts on them", () => {
    let automatic = life("automatic-flow");
    automatic = applyAction(automatic, { type: "setMode", mode: "auto" }).state;
    const automaticYear = applyAction(automatic, { type: "advance" });
    expect(automaticYear.state.pending?.eventId).not.toBe("milestone.1");

    let interrupted = life("interrupted-flow");
    interrupted = applyAction(interrupted, { type: "setMode", mode: "milestones" }).state;
    const milestoneYear = applyAction(interrupted, { type: "advance" });
    expect(milestoneYear.state.pending?.eventId).toBe("milestone.1");
  });

  it("projects the existing history into a stable life chronicle without a second journal", () => {
    const state = life("chronicle-flow");
    const result = applyAction(state, { type: "advance" });
    const entries = [{
      seq: 0,
      age: 0,
      kind: "birth" as const,
      title: { ru: "Рождение", en: "Birth" },
      text: { ru: "Рождение", en: "Birth" },
      changes: []
    }, ...result.entries];
    const chronicle = toLifeChronicle(entries, state.character.universeId, "self");
    expect(chronicle.map((entry) => entry.source.seq)).toEqual(entries.map((entry) => entry.seq));
    expect(chronicle.every((entry) => entry.characterId === "self")).toBe(true);
    expect(chronicle.some((entry) => entry.category === "birth" || entry.category === "childhood")).toBe(true);
  });

  it("keeps the decision provenance when a delayed consequence arrives", () => {
    let state = life("provenance-flow", "murim");
    state.life = { ...state.life, age: 20, stage: "adult" };
    for (const key of Object.keys(state.character.stats) as (keyof typeof state.character.stats)[]) state.character.stats[key] = 60;
    state.pending = { eventId: "mu.bandits", age: 20 };
    const chosen = applyAction(state, { type: "choose", choiceId: "save" });
    expect(chosen.state.consequences.find((item) => item.id === "mu.c-saved-merchant")?.source).toBe("mu.bandits");
    let next = chosen.state;
    let entries = chosen.entries;
    for (let i = 0; i < 6 && next.life.alive && next.consequences.some((item) => item.id === "mu.c-saved-merchant"); i += 1) {
      const result = next.pending
        ? applyAction(next, { type: "choose", choiceId: presentEvent(next)!.choices.find((choice) => choice.available)?.id ?? presentEvent(next)!.choices[0]!.id })
        : applyAction(next, { type: "advance" });
      next = result.state;
      entries = [...entries, ...result.entries];
    }
    const consequence = entries.find((entry) => entry.kind === "consequence" && entry.eventId === "mu.c-saved-merchant");
    expect(consequence?.sourceEventId).toBe("mu.bandits");
    expect(consequence?.consequenceOf).toBe("mu.bandits");
    expect(toLifeChronicle(entries, "murim", "self").find((entry) => entry.source.seq === consequence?.seq)?.consequenceOf).toBe("mu.bandits");
  });
});
