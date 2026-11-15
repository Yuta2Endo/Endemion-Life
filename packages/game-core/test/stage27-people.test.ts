// R5.5: досье людей — полный журнал, возраст уз, запись отношений и авторские сцены NPC
import { describe, expect, it } from "vitest";
import {
  applyAction,
  contentProblems,
  deepClone,
  eventIndex,
  eventProblems,
  getUniverse,
  INTERACTION_RULES,
  isEligible,
  PEOPLE_EVENTS,
  presentProfile,
  type GameState,
  type NpcState
} from "../src/index.js";
import type { EngineContext } from "../src/engine/context.js";
import { Rng } from "../src/rng.js";
import { start } from "./helpers.js";

const R55_SCENES = [
  "common.friend-difficult-favor",
  "common.friend-favor-return",
  "common.rival-truce",
  "common.mentor-final-test",
  "common.family-duty",
  "common.child-dangerous-path",
  "common.partner-distance"
] as const;

function context(state: GameState, seed = 7): EngineContext {
  return { state, rng: new Rng(seed), universe: getUniverse(state.character.universeId), changes: [] };
}

function eventOf(id: string) {
  const event = eventIndex(getUniverse("academy")).get(id);
  if (!event) throw new Error(`нет события ${id}`);
  return event;
}

function adultState(seed: string, age = 40): GameState {
  const state = start({ seed, universeId: "academy" });
  state.life = { ...state.life, age, stage: "adult" };
  state.pending = null;
  return state;
}

/** Один живой NPC получает нужную роль: сцены адресованы ролям, а не конкретным id */
function withRole(seed: string, role: NpcState["role"], affinity = 40, age = 40): { state: GameState; npc: NpcState } {
  const state = adultState(seed, age);
  const npc = state.npcs.find((item) => item.alive);
  if (!npc) throw new Error("нет живых людей");
  npc.role = role;
  npc.affinity = affinity;
  if (role === "child") {
    npc.bornAt = age - 14;
    npc.parents = ["self"];
  }
  return { state, npc };
}

describe("R5.5: досье людей", () => {
  it("отдаёт полный журнал сначала новые и возраст уз из записи bond", () => {
    const state = adultState("r55-profile-log", 12);
    const npc = state.npcs.find((item) => item.alive);
    if (!npc) throw new Error("нет людей");
    npc.log = [
      { at: 6, kind: "relationship", value: "friend:+4" },
      { at: 8, kind: "bond" },
      { at: 11, kind: "story", value: "craft-ambition" }
    ];
    const profile = presentProfile(state);
    const view = profile.npcs.find((item) => item.id === npc.id);
    expect(view).toBeDefined();
    expect(view!.log.map((entry) => entry.age)).toEqual([11, 8, 6]);
    expect(view!.events.map((entry) => entry.age)).toEqual([11, 8, 6]);
    expect(view!.bond).toBe(true);
    expect(view!.bondAt).toBe(8);
    expect(view!.log.every((entry) => entry.text.ru.trim().length > 0 && entry.text.en.trim().length > 0)).toBe(true);
  });

  it("bond вне последних шести событий остаётся в полном журнале, а после вытеснения даёт null", () => {
    const state = adultState("r55-profile-evict", 30);
    const npc = state.npcs.find((item) => item.alive);
    if (!npc) throw new Error("нет людей");
    const events = Array.from({ length: 6 }, (_, index) => ({ at: 21 + index, kind: "relationship" as const, value: "friend:+1" }));
    npc.log = [{ at: 20, kind: "bond" }, ...events];
    let view = presentProfile(state).npcs.find((item) => item.id === npc.id)!;
    expect(view.log).toHaveLength(7);
    expect(view.events).toHaveLength(6);
    expect(view.events.some((entry) => entry.kind === "bond")).toBe(false);
    expect(view.bondAt).toBe(20);
    expect(view.bond).toBe(true);

    // Журнал NPC хранит 12 записей: bond вытесняется и возраст уз больше не восстановить
    npc.log = [...npc.log, ...Array.from({ length: 6 }, (_, index) => ({ at: 27 + index, kind: "relationship" as const, value: "friend:+1" }))].slice(-12);
    view = presentProfile(state).npcs.find((item) => item.id === npc.id)!;
    expect(view.log).toHaveLength(12);
    expect(view.bond).toBe(false);
    expect(view.bondAt).toBeNull();
  });

  it("learn, spar и ask-help пишут изменения отношений в историю и recentChanges", () => {
    const state = adultState("r55-interaction-logs", 30);
    const npc = state.npcs.find((item) => item.alive);
    if (!npc) throw new Error("нет людей");
    npc.role = "friend";
    npc.affinity = 60;
    npc.skillId = npc.skillId ?? "lore";
    const ctx = context(state, 11);

    INTERACTION_RULES.learn.success(ctx, npc);
    INTERACTION_RULES.spar.success(ctx, npc);
    INTERACTION_RULES["ask-help"].success(ctx, npc);

    const profile = presentProfile(state);
    const view = profile.npcs.find((item) => item.id === npc.id)!;
    const relationshipLog = view.log.filter((entry) => entry.kind === "relationship");
    expect(relationshipLog).toHaveLength(3);
    expect(relationshipLog.map((entry) => entry.text.ru)).toEqual(["друг -3", "друг +2", "наставник +3"]);
    expect(profile.recentChanges.filter((entry) => entry.npcId === npc.id)).toHaveLength(3);

    const rival = state.npcs.find((item) => item.alive && item.id !== npc.id);
    if (rival) {
      rival.role = "rival";
      rival.affinity = 30;
      INTERACTION_RULES.spar.failure(ctx, rival);
      INTERACTION_RULES["ask-help"].failure(ctx, rival);
      const rivalView = presentProfile(state).npcs.find((item) => item.id === rival.id)!;
      expect(rivalView.log.filter((entry) => entry.kind === "relationship")).toHaveLength(2);
    }
  });

  it("действие interact тоже оставляет запись отношения", () => {
    const state = adultState("r55-interact-action", 30);
    const npc = state.npcs.find((item) => item.alive);
    if (!npc) throw new Error("нет людей");
    npc.role = "friend";
    npc.affinity = 60;
    npc.skillId = npc.skillId ?? "lore";
    let acted: GameState | undefined;
    for (let seed = 0; seed < 64 && !acted; seed++) {
      const candidate = deepClone(state);
      candidate.rngState = seed;
      const result = applyAction(candidate, { type: "interact", npcId: npc.id, interaction: "learn" });
      const entry = result.entries.find((item) => item.kind === "people");
      if (entry?.check?.success) acted = result.state;
    }
    expect(acted).toBeDefined();
    const view = presentProfile(acted!).npcs.find((item) => item.id === npc.id)!;
    expect(view.log.some((entry) => entry.kind === "relationship")).toBe(true);
    expect(presentProfile(acted!).recentChanges.some((entry) => entry.npcId === npc.id)).toBe(true);
  });
});

describe("R5.5: авторские сцены людей", () => {
  it("семь сцен добавлены в индекс, у них уникальные id и по 2–3 варианта", () => {
    expect(PEOPLE_EVENTS.length).toBeGreaterThanOrEqual(7);
    const index = eventIndex(getUniverse("academy"));
    const scenes = R55_SCENES.map((id) => eventOf(id));
    expect(new Set(R55_SCENES).size).toBe(R55_SCENES.length);
    for (const scene of scenes) {
      expect(scene.kind, scene.id).toBe("npc");
      expect(scene.choices.length, scene.id).toBeGreaterThanOrEqual(2);
      expect(scene.choices.length, scene.id).toBeLessThanOrEqual(3);
      expect(scene.title.ru.trim().length && scene.title.en.trim().length, scene.id).toBeGreaterThan(0);
      expect(index.has(scene.id), scene.id).toBe(true);
    }
    expect(eventOf("common.friend-favor-return").scheduledOnly).toBe(true);
    expect(eventProblems()).toEqual([]);
    expect(contentProblems()).toEqual([]);
  });

  it("сцены доступны по своим ролям и закрыты без них", () => {
    const friend = withRole("r55-eligibility-friend", "friend", 30);
    expect(isEligible(friend.state, eventOf("common.friend-difficult-favor"))).toBe(true);
    expect(isEligible(friend.state, eventOf("common.friend-favor-return"))).toBe(true);

    const rival = withRole("r55-eligibility-rival", "rival", 20);
    expect(isEligible(rival.state, eventOf("common.rival-truce"))).toBe(true);

    const mentor = withRole("r55-eligibility-mentor", "mentor", 40);
    expect(isEligible(mentor.state, eventOf("common.mentor-final-test"))).toBe(true);

    const parentState = adultState("r55-eligibility-parent", 30);
    const parent = parentState.npcs.find((item) => item.alive && (item.role === "father" || item.role === "mother"));
    if (!parent) throw new Error("нет родителя");
    parent.affinity = 25;
    expect(isEligible(parentState, eventOf("common.family-duty"))).toBe(true);

    const child = withRole("r55-eligibility-child", "child", 20, 40);
    expect(isEligible(child.state, eventOf("common.child-dangerous-path"))).toBe(true);

    const partner = withRole("r55-eligibility-partner", "partner", 30);
    expect(isEligible(partner.state, eventOf("common.partner-distance"))).toBe(true);

    const cold = withRole("r55-eligibility-cold", "friend", 0);
    expect(isEligible(cold.state, eventOf("common.friend-difficult-favor"))).toBe(false);
    const noMentor = adultState("r55-eligibility-no-mentor", 30);
    expect(isEligible(noMentor, eventOf("common.mentor-final-test"))).toBe(false);
  });

  it("выбор применяется детерминированно, а трудная просьба ставит продолжение в расписание", () => {
    const { state, npc } = withRole("r55-friend-choice", "friend", 40);
    const event = eventOf("common.friend-difficult-favor");
    const prepared = deepClone(state);
    prepared.pending = { eventId: event.id, age: prepared.life.age };
    const first = applyAction(prepared, { type: "choose", choiceId: "hide" });
    const second = applyAction(prepared, { type: "choose", choiceId: "hide" });
    const firstNpc = first.state.npcs.find((item) => item.id === npc.id)!;
    const secondNpc = second.state.npcs.find((item) => item.id === npc.id)!;
    expect(firstNpc.affinity).toBe(npc.affinity + 12);
    expect(secondNpc.affinity).toBe(firstNpc.affinity);
    expect(second.state.scheduled).toEqual(first.state.scheduled);
    expect(first.state.scheduled.some((item) => item.eventId === "common.friend-favor-return" && item.age === prepared.life.age + 3)).toBe(true);

    const due = deepClone(first.state);
    due.life = { ...due.life, age: due.life.age + 3 };
    due.scheduled = due.scheduled.map((item) => ({ ...item, age: due.life.age }));
    const advanced = applyAction(due, { type: "advance", years: 1 });
    expect(advanced.state.pending?.eventId).toBe("common.friend-favor-return");

    const beforeChain = advanced.state.npcs.find((item) => item.id === npc.id)!.affinity;
    const chained = applyAction(advanced.state, { type: "choose", choiceId: "no-debt" });
    expect(chained.state.npcs.find((item) => item.id === npc.id)!.affinity).toBe(beforeChain + 14);
  });
});
