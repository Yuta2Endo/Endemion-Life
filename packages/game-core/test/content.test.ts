// Проверка контента: опечатка в id события или способности должна ронять тесты, а не ломать игру
import { describe, expect, it } from "vitest";
import { COMMON_EVENTS, eventIndex, listUniverses, UNIVERSE_IDS, type Condition, type Effect, type EventDefinition } from "../src/index.js";

function allEffects(event: EventDefinition): Effect[] {
  return event.choices.flatMap((c) => [...c.success.effects, ...(c.failure?.effects ?? [])]);
}

function allConditions(event: EventDefinition): Condition[] {
  return [...(event.conditions ?? []), ...event.choices.flatMap((c) => c.requires ?? [])];
}

describe("Контент вселенных", () => {
  it("шесть вселенных", () => {
    expect(listUniverses().map((u) => u.id)).toEqual([...UNIVERSE_IDS]);
  });

  it.each(listUniverses().map((u) => [u.id, u] as const))("%s: ссылки в событиях указывают на существующее", (_id, universe) => {
    const index = eventIndex(universe);
    const abilityIds = new Set(universe.abilities.map((a) => a.id));
    const setFlags = new Set([
      ...universe.origins.flatMap((o) => o.flags ?? []),
      ...[...index.values()].flatMap((e) => allEffects(e).flatMap((fx) => (fx.type === "flag" && fx.set ? [fx.flag] : []))),
      // Stage 18: флаг ставит веха доверия, не эффект события
      "bond"
    ]);

    expect(universe.events.length).toBeGreaterThanOrEqual(5);
    expect(universe.races.length).toBeGreaterThanOrEqual(1);
    expect(universe.origins.length).toBeGreaterThanOrEqual(3);
    expect(universe.track.ranks[0]?.threshold).toBe(0);
    const thresholds = universe.track.ranks.map((r) => r.threshold);
    expect(thresholds).toEqual([...thresholds].sort((a, b) => a - b));
    for (const rank of universe.track.ranks) for (const id of rank.abilities ?? []) expect(abilityIds).toContain(id);
    if (universe.track.requiresFlag) expect(setFlags).toContain(universe.track.requiresFlag);

    for (const event of index.values()) {
      expect(event.choices.length, event.id).toBeGreaterThanOrEqual(1);
      expect(new Set(event.choices.map((c) => c.id)).size, event.id).toBe(event.choices.length);
      for (const effect of allEffects(event)) {
        if (effect.type === "schedule") expect(index.has(effect.eventId), `${event.id} → ${effect.eventId}`).toBe(true);
        if (effect.type === "ability" && COMMON_EVENTS.every((e) => e.id !== event.id)) expect(abilityIds, event.id).toContain(effect.id);
      }
      for (const condition of allConditions(event)) {
        if (condition.type === "flag" && condition.has) expect(setFlags, `${event.id}: флаг ${condition.flag}`).toContain(condition.flag);
        if (condition.type === "ability") expect(abilityIds, event.id).toContain(condition.id);
        if (condition.type === "origin") for (const id of condition.ids) expect(universe.origins.map((o) => o.id), event.id).toContain(id);
      }
    }
  });

  it("id событий уникальны во всех вселенных", () => {
    const ids = [...COMMON_EVENTS, ...listUniverses().flatMap((u) => u.events)].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("у всех текстов есть русский и английский вариант", () => {
    const texts = listUniverses().flatMap((u) => [u.name, u.tagline, u.description, ...u.rules, ...[...eventIndex(u).values()].flatMap((e) => [e.title, e.text, ...e.choices.flatMap((c) => [c.text, c.success.text, ...(c.failure ? [c.failure.text] : [])])])]);
    for (const text of texts) {
      expect(text.ru.trim().length).toBeGreaterThan(0);
      expect(text.en.trim().length).toBeGreaterThan(0);
    }
  });
});
