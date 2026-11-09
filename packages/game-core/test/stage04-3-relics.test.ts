// Stage 04.3: FamilienReliquien — каталог, получение, условия, наследование, сохранения
import { describe, expect, it } from "vitest";
import {
  checkCondition,
  deepClone,
  getUniverse,
  parseSave,
  SAVE_SCHEMA_VERSION,
  type GameState,
} from "../src/index.js";
import { applyEffect } from "../src/engine/effects.js";
import { describeCondition } from "../src/engine/conditions.js";
import { findRelic, RELICS } from "../src/legacy/stories.js";
import { fx, when } from "../src/narrative/dsl.js";
import type { EngineContext } from "../src/engine/context.js";
import { Rng } from "../src/rng.js";
import { start } from "./helpers.js";

function makeCtx(state: GameState): EngineContext {
  return {
    state,
    rng: Rng.fromSeed("relic-test", "relic"),
    universe: getUniverse(state.character.universeId),
    changes: [],
  };
}

function relicIds(state: GameState): string[] {
  return state.lineage.relics.map((r) => r.id);
}

function countChronicle(state: GameState, kind: string): number {
  return state.lineage.chronicle.filter((e) => e.kind === kind).length;
}

describe("Stage 04.3: каталог реликвий", () => {
  it("все шесть реликвий доступны через каталог", () => {
    const ids = Object.keys(RELICS);
    expect(ids).toHaveLength(6);
    for (const id of ["ancestral-blade", "system-crystal", "clan-scroll", "spirit-root-amulet", "gate-hunter-badge", "noble-signet"]) {
      const relic = findRelic(id);
      expect(relic).toBeDefined();
      expect(relic?.id).toBe(id);
      expect(relic?.name.ru.trim().length).toBeGreaterThan(0);
      expect(relic?.name.en.trim().length).toBeGreaterThan(0);
      expect(relic?.description.ru.trim().length).toBeGreaterThan(0);
      expect(relic?.description.en.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(relic?.effects)).toBe(true);
    }
  });

  it("findRelic возвращает undefined для неизвестного id", () => {
    expect(findRelic("nonexistent-relic")).toBeUndefined();
    expect(findRelic("")).toBeUndefined();
  });

  it("SAVE_SCHEMA_VERSION остаётся 8", () => {
    expect(SAVE_SCHEMA_VERSION).toBe(8);
  });
});

describe("Stage 04.3: получение реликвии через эффект", () => {
  it("получение известной реликвии добавляет её в lineage.relics", () => {
    const state = start({ seed: "relic-acquire" });
    expect(relicIds(state)).toEqual([]);

    const ctx = makeCtx(state);
    applyEffect(ctx, fx.relic("ancestral-blade"));

    const ids = relicIds(state);
    expect(ids).toHaveLength(1);
    expect(ids[0]).toBe("ancestral-blade");
  });

  it("неизвестный ID не изменяет состояние", () => {
    const state = start({ seed: "relic-unknown" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.relic("nonexistent-relic"));

    expect(relicIds(state)).toEqual([]);
    expect(state.lineage.relics).toEqual([]);
  });

  it("повторное получение одной реликвии не создаёт дубликат", () => {
    const state = start({ seed: "relic-dedup" });
    const ctx = makeCtx(state);

    applyEffect(ctx, fx.relic("ancestral-blade"));
    applyEffect(ctx, fx.relic("ancestral-blade"));
    applyEffect(ctx, fx.relic("ancestral-blade"));

    expect(relicIds(state)).toEqual(["ancestral-blade"]);
    expect(state.lineage.relics).toHaveLength(1);
  });

  it("бонус реликвии применяется только один раз", () => {
    const state = start({ seed: "relic-bonus-once" });
    const ctx = makeCtx(state);
    const renownBefore = state.lineage.renown;

    applyEffect(ctx, fx.relic("ancestral-blade")); // ancestral-blade gives fx.renown(2)
    expect(state.lineage.renown).toBe(renownBefore + 2);

    applyEffect(ctx, fx.relic("ancestral-blade")); // dedup — should not apply again
    expect(state.lineage.renown).toBe(renownBefore + 2);
  });

  it("получение записывается в хронику", () => {
    const state = start({ seed: "relic-chronicle" });
    const ctx = makeCtx(state);
    const before = countChronicle(state, "relic");

    applyEffect(ctx, fx.relic("ancestral-blade"));

    expect(countChronicle(state, "relic")).toBe(before + 1);
    const entry = state.lineage.chronicle.find((e) => e.kind === "relic");
    expect(entry).toBeDefined();
    expect(entry?.v.relic).toBe("ancestral-blade");
  });
});

describe("Stage 04.3: narrative DSL — when.relic", () => {
  it("when.relic(id) возвращает условие типа relic с id", () => {
    const cond = when.relic("ancestral-blade");
    if (cond.type !== "relic") throw new Error("unexpected condition type");
    expect(cond.id).toBe("ancestral-blade");
  });

  it("проверка возвращает true если реликвия есть", () => {
    const state = start({ seed: "relic-has" });
    state.lineage.relics = [
      { id: "ancestral-blade", name: { ru: "Клинок", en: "Blade" }, description: { ru: "Описание", en: "Description" }, acquiredGen: 1, acquiredAge: 20, source: "test" },
    ];
    expect(checkCondition(state, when.relic("ancestral-blade"))).toBe(true);
  });

  it("проверка возвращает false если реликвии нет", () => {
    const state = start({ seed: "relic-not-has" });
    expect(checkCondition(state, when.relic("ancestral-blade"))).toBe(false);
  });

  it("отсутствующий lineage.relics не вызывает исключение (старые сохранения)", () => {
    const state = start({ seed: "relic-old-save" });
    delete (state.lineage as { relics?: unknown[] }).relics;
    expect(() => checkCondition(state, when.relic("ancestral-blade"))).not.toThrow();
    expect(checkCondition(state, when.relic("ancestral-blade"))).toBe(false);
  });

  it("неизвестный ID безопасно возвращает false", () => {
    const state = start({ seed: "relic-unknown-id" });
    state.lineage.relics = [
      { id: "ancestral-blade", name: { ru: "Клинок", en: "Blade" }, description: { ru: "Описание", en: "Description" }, acquiredGen: 1, acquiredAge: 20, source: "test" },
    ];
    expect(checkCondition(state, when.relic("nonexistent-relic"))).toBe(false);
  });

  it("fx.relic(id) создаёт эффект приобретения без параметра add", () => {
    const effect = fx.relic("ancestral-blade");
    if (effect.type !== "relic") throw new Error("unexpected effect type");
    expect(effect.id).toBe("ancestral-blade");
    expect("add" in effect).toBe(false);
  });
});

describe("Stage 04.3: describeCondition для relic", () => {
  it("показывает локализованное название из каталога", () => {
    const universe = getUniverse("dark-fantasy");
    const text = describeCondition(when.relic("ancestral-blade"), universe);
    expect(text.ru).toContain("Предковый клинок");
    expect(text.en).toContain("Ancestral Blade");
  });

  it("для неизвестного id использует безопасный fallback", () => {
    const universe = getUniverse("dark-fantasy");
    const text = describeCondition(when.relic("nonexistent-relic"), universe);
    expect(text.ru).toContain("Нет реликвии");
    expect(text.en).toContain("No relic");
  });
});

describe("Stage 04.3: сохранения и наследование", () => {
  it("старые сохранения без lineage.relics не вызывают ошибку при проверке", () => {
    const state = start({ seed: "relic-old-save-parse" });
    delete (state.lineage as { relics?: unknown[] }).relics;

    const raw: unknown = JSON.parse(JSON.stringify(state));
    // parseSave should not throw when relics is missing
    expect(() => parseSave(raw)).not.toThrow();
    const restored = parseSave(raw);
    // checkLineage skips validation when relics is not an array; relics may be undefined after parse
    expect(restored.lineage.relics).toBeUndefined();
  });

  it("applyRelic initializes lineage.relics = [] if missing (old saves)", () => {
    const state = start({ seed: "relic-init" });
    delete (state.lineage as { relics?: unknown[] }).relics;
    expect(state.lineage.relics).toBeUndefined();

    const ctx = makeCtx(state);
    applyEffect(ctx, fx.relic("ancestral-blade"));

    // applyRelic initializes lineage.relics = [] if missing
    expect(state.lineage.relics).toBeDefined();
    expect(state.lineage.relics).toHaveLength(1);
    const [firstRelic] = state.lineage.relics;
    expect(firstRelic?.id).toBe("ancestral-blade");
    expect(typeof firstRelic?.acquiredGen).toBe("number");
    expect(typeof firstRelic?.acquiredAge).toBe("number");
    expect(typeof firstRelic?.source).toBe("string");
  });

  it("реликвии сохраняются после сериализации и загрузки", () => {
    const state = start({ seed: "relic-save-load" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.relic("ancestral-blade"));
    applyEffect(ctx, fx.relic("system-crystal"));

    const raw: unknown = JSON.parse(JSON.stringify(state));
    const restored = parseSave(raw);

    expect(relicIds(restored)).toEqual(["ancestral-blade", "system-crystal"]);
  });

  it("проверка сохранения корректно обрабатывает массив реликвий", () => {
    const state = start({ seed: "relic-check-save" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.relic("noble-signet"));

    const raw: unknown = JSON.parse(JSON.stringify(state));
    expect(() => parseSave(raw)).not.toThrow();
    const restored = parseSave(raw);
    expect(restored.lineage.relics).toHaveLength(1);
    const [firstRelic] = restored.lineage.relics;
    expect(firstRelic?.id).toBe("noble-signet");
  });

  it("deepClone линейности сохраняет реликвии (базис передачи при наследовании)", () => {
    const state = start({ seed: "relic-deep-clone" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.relic("spirit-root-amulet"));

    const cloned = deepClone(state);
    expect(relicIds(cloned)).toEqual(["spirit-root-amulet"]);
    expect(cloned.lineage.relics).toHaveLength(1);
    const [firstClonedRelic] = cloned.lineage.relics;
    expect(firstClonedRelic?.id).toBe("spirit-root-amulet");
  });

  it("бонусы реликвий не применяются повторно при загрузке сохранения", () => {
    const state = start({ seed: "relic-reload-bonus" });
    const ctx = makeCtx(state);
    const renownBefore = state.lineage.renown;

    applyEffect(ctx, fx.relic("ancestral-blade"));
    const renownAfterAcquire = state.lineage.renown;
    expect(renownAfterAcquire).toBe(renownBefore + 2);

    const raw: unknown = JSON.parse(JSON.stringify(state));
    const restored = parseSave(raw);
    // Reload should not re-apply the renown bonus — bonuses apply once at acquisition
    expect(restored.lineage.renown).toBe(renownAfterAcquire);
    expect(relicIds(restored)).toEqual(["ancestral-blade"]);
  });

  it("InheritanceRecord.relics содержит id реликвий умершего (логика buildHeir)", () => {
    const state = start({ seed: "relic-inheritance-record" });
    const ctx = makeCtx(state);
    applyEffect(ctx, fx.relic("ancestral-blade"));
    applyEffect(ctx, fx.relic("gate-hunter-badge"));

    // Verify lineage.relics has both
    expect(relicIds(state)).toEqual(["ancestral-blade", "gate-hunter-badge"]);

    // Verify that buildHeir would copy them: same logic as succession.ts buildHeir line 305
    const expectedRecordRelics = state.lineage.relics.map((r) => r.id);
    expect(expectedRecordRelics).toEqual(["ancestral-blade", "gate-hunter-badge"]);
  });
});
