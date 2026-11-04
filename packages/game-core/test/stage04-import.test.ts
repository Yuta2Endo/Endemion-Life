// Stage 04: перенос жизни из браузера на сервер — строгая проверка, новый seed, повторный бросок скрытого,
// срез невозможных значений, честные сохранения без исправлений
import { describe, expect, it } from "vitest";
import {
  applyAction,
  deepClone,
  heirCandidates,
  importLevelCap,
  importWealthCap,
  maxResources,
  parseSave,
  prepareImport,
  succeed,
  UNIVERSE_IDS,
  type GameState,
  type UniverseId
} from "../src/index.js";
import { SAVES_V1 } from "./fixtures/saves-v1.js";
import { SAVES_V2 } from "./fixtures/saves-v2.js";
import { choiceIds, playLife, start } from "./helpers.js";

/** Как сохранение лежит в браузере: JSON */
function fromBrowser(state: GameState): unknown {
  return JSON.parse(JSON.stringify(state));
}

/** Состояния по ходу честной жизни: каждые step действий */
function samples(universeId: UniverseId, seed: string, step = 15): GameState[] {
  const list: GameState[] = [];
  let state = start({ seed, universeId });
  for (let i = 0; i < 6000 && state.life.alive; i++) {
    state = applyAction(state, state.pending ? { type: "choose", choiceId: choiceIds(state)[i % choiceIds(state).length]! } : { type: "advance" }).state;
    if (i % step === 0) list.push(state);
  }
  list.push(state);
  return list;
}

describe("Stage 04: перенос жизни из браузера", () => {
  it.each(UNIVERSE_IDS)("%s: честные сохранения переносятся без исправлений", (universeId) => {
    for (let k = 0; k < 6; k++) {
      for (const state of samples(universeId, `import-honest-${universeId}-${k}`)) {
        if (state.lineage.continuedBy !== null) continue;
        const { adjustments } = prepareImport(fromBrowser(state), "salt");
        expect(adjustments, `${universeId} age ${state.life.age}`).toEqual([]);
      }
    }
  });

  it("наследник: честная жизнь второго поколения переносится без исправлений", () => {
    for (const universeId of UNIVERSE_IDS) {
      const dead = playLife(start({ seed: `import-heir-${universeId}`, universeId }), 6000, (n, i) => (i * 3) % n).state;
      const heir = heirCandidates(dead).find((c) => c.available);
      if (!heir) continue;
      const next = succeed(dead, heir.npc.id, "srv").state;
      expect(prepareImport(fromBrowser(next), "salt").adjustments).toEqual([]);
    }
  });

  it("новый seed и генератор: из прежнего seed и присланного генератора будущее не вычислить; та же соль — тот же итог", () => {
    const state = samples("murim", "import-seed")[3]!;
    const a = prepareImport(fromBrowser(state), "salt-a").state;
    const again = prepareImport(fromBrowser(state), "salt-a").state;
    const b = prepareImport(fromBrowser(state), "salt-b").state;
    expect(a.seed).not.toBe(state.seed);
    expect(a.rngState).not.toBe(state.rngState);
    expect(a).toEqual(again);
    expect(b.seed).not.toBe(a.seed);
    // Подменённое состояние генератора не влияет на результат
    const forged = { ...deepClone(state), rngState: 12345 };
    expect(prepareImport(fromBrowser(forged), "salt-a").state.rngState).toBe(a.rngState);
  });

  it("нераскрытые потенциал, судьба и спящие таланты бросаются заново, раскрытое остаётся", () => {
    const state = deepClone(samples("xianxia", "import-hidden")[2]!);
    state.hidden.potential = 10;
    state.hidden.destiny = 10;
    state.hidden.revealed = [];
    const rolled = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const hidden = prepareImport(fromBrowser(state), `salt-${i}`).state.hidden;
      rolled.add(`${hidden.potential}/${hidden.destiny}`);
      expect(hidden.dormantTalents.length).toBeLessThanOrEqual(Math.min(2, state.hidden.dormantTalents.length));
    }
    expect(rolled.size).toBeGreaterThan(1);
    // Присланные 10/10 не сохраняются: броски сервера дают и другие значения
    expect([...rolled].some((x) => x !== "10/10")).toBe(true);

    const revealed = deepClone(state);
    revealed.hidden.revealed = ["potential", "destiny"];
    const kept = prepareImport(fromBrowser(revealed), "salt").state.hidden;
    expect(kept.potential).toBe(10);
    expect(kept.destiny).toBe(10);
  });

  it("невозможные значения срезаются и перечисляются: золото, уровень, опыт, запасы, золото NPC", () => {
    const state = deepClone(samples("hunter", "import-forged")[2]!);
    state.character.wealth = 50_000_000;
    state.character.level = 90;
    state.character.xp = 1_000_000;
    state.character.resources.health = 99_999;
    if (state.npcs[0]) state.npcs[0].wealth = 9_000_000;
    const { state: fixed, adjustments } = prepareImport(fromBrowser(state), "salt");
    expect(fixed.character.wealth).toBe(importWealthCap(fixed));
    expect(fixed.character.level).toBe(importLevelCap(fixed));
    expect(fixed.character.xp).toBeLessThan(100 * fixed.character.level);
    expect(fixed.character.resources.health).toBe(maxResources(fixed.character).health);
    const fields = adjustments.map((a) => a.field);
    expect(fields).toEqual(expect.arrayContaining(["wealth", "level", "xp", "resources.health"]));
    if (state.npcs[0]) expect(fields).toContain(`npc.${state.npcs[0].id}.wealth`);
    expect(adjustments.find((a) => a.field === "wealth")).toEqual({ field: "wealth", from: 50_000_000, to: importWealthCap(fixed) });
    // После исправлений сохранение проходит проверку и жизнь продолжается
    expect(() => parseSave(fromBrowser(fixed))).not.toThrow();
    expect(() => applyAction(fixed, fixed.pending ? { type: "choose", choiceId: choiceIds(fixed)[0]! } : { type: "advance" })).not.toThrow();
  });

  it("запись истории о переносе — последняя, номер продолжает историю", () => {
    const state = samples("academy", "import-entry")[2]!;
    const { state: next, entry } = prepareImport(fromBrowser(state), "salt");
    expect(entry.kind).toBe("import");
    expect(entry.seq).toBe(state.nextSeq);
    expect(next.nextSeq).toBe(state.nextSeq + 1);
    expect(entry.text.en.length).toBeGreaterThan(0);
  });

  it("событие, которого нет в игре, не остаётся ждать ответа", () => {
    const state = deepClone(samples("isekai", "import-pending")[2]!);
    state.pending = { eventId: "no.such-event", age: state.life.age };
    state.scheduled = [{ eventId: "no.such-event", age: state.life.age + 1 }];
    const fixed = prepareImport(fromBrowser(state), "salt").state;
    expect(fixed.pending).toBeNull();
    expect(fixed.scheduled).toEqual([]);
  });

  it("повреждённое сохранение отклоняется (INVALID_SAVE), продолженная жизнь — LINEAGE_CONTINUED", () => {
    expect(() => prepareImport({ hello: "world" }, "salt")).toThrow(expect.objectContaining({ code: "INVALID_SAVE" }));
    expect(() => prepareImport(null, "salt")).toThrow(expect.objectContaining({ code: "INVALID_SAVE" }));
    const broken = deepClone(samples("murim", "import-broken")[2]!) as unknown as Record<string, unknown>;
    (broken.character as Record<string, unknown>).wealth = -5;
    expect(() => prepareImport(broken, "salt")).toThrow(expect.objectContaining({ code: "INVALID_SAVE" }));
    const continued = deepClone(samples("murim", "import-continued")[2]!);
    continued.lineage.continuedBy = "n1";
    expect(() => prepareImport(fromBrowser(continued), "salt")).toThrow(expect.objectContaining({ code: "LINEAGE_CONTINUED" }));
    expect(() => prepareImport(fromBrowser(samples("murim", "import-salt")[1]!), "")).toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
  });

  it("сохранения форматов 1 и 2 переносятся: перевод формата, затем проверка", () => {
    for (const save of [...Object.values(SAVES_V1), ...Object.values(SAVES_V2)]) {
      const original = save as { lineage?: { continuedBy: string | null } };
      if (original.lineage?.continuedBy) continue;
      const { state } = prepareImport(deepClone(save), "salt");
      expect(() => parseSave(fromBrowser(state))).not.toThrow();
    }
  });
});
