import { describe, expect, it } from "vitest";
import { canClaim, canMove, dayKey, dueStatus, joinBlock, utcDay, utcWeek, weekKey, worldFits } from "../src/live/ops.js";
import { findTemplate, LIVE_TEMPLATES } from "../src/live/templates.js";

const HOUR = 3_600_000;

describe("Stage 15: календарь", () => {
  it("ручной переход не перескакивает через срок", () => {
    expect(canMove("draft", "scheduled")).toBe(true);
    expect(canMove("draft", "active")).toBe(false);
    expect(canMove("scheduled", "draft")).toBe(true);
    expect(canMove("active", "completed")).toBe(false);
    expect(canMove("completed", "archived")).toBe(true);
    expect(canMove("archived", "active")).toBe(false);
    expect(canMove("cancelled", "scheduled")).toBe(false);
  });

  it("срок сам открывает и закрывает окно, границы включительно", () => {
    const start = Date.UTC(2026, 10, 5);
    const end = start + 86_400_000;
    expect(dueStatus("scheduled", start, end, start - 1)).toBe("scheduled");
    expect(dueStatus("scheduled", start, end, start)).toBe("active");
    expect(dueStatus("active", start, end, end - 1)).toBe("active");
    expect(dueStatus("active", start, end, end)).toBe("completed");
    expect(dueStatus("draft", start, end, end + HOUR)).toBe("draft");
    expect(dueStatus("cancelled", start, end, end + HOUR)).toBe("cancelled");
  });

  it("день и неделя UTC не двоятся на границе", () => {
    const late = Date.UTC(2026, 10, 5, 23, 30);
    const next = Date.UTC(2026, 10, 6, 0, 30);
    expect(dayKey("daily-watch", late)).not.toBe(dayKey("daily-watch", next));
    expect(utcDay(late).end).toBe(utcDay(next).start);
    // 5 ноября 2026 — четверг. Понедельник недели — 2 ноября, следующей — 9
    expect(utcWeek(late).start).toBe(Date.UTC(2026, 10, 2));
    expect(utcWeek(Date.UTC(2026, 10, 9)).start).toBe(utcWeek(late).end);
    expect(weekKey("weekly-store", late)).toBe(weekKey("weekly-store", Date.UTC(2026, 10, 2, 1)));
    expect(weekKey("weekly-store", late)).not.toBe(weekKey("weekly-store", Date.UTC(2026, 10, 9)));
  });

  it("неделя на стыке года считается от понедельника", () => {
    // 1 января 2027 — пятница. Понедельник той недели — 28 декабря 2026
    const friday = Date.UTC(2027, 0, 1, 12);
    expect(utcWeek(friday).start).toBe(Date.UTC(2026, 11, 28));
    expect(weekKey("weekly-store", friday)).toBe(weekKey("weekly-store", Date.UTC(2026, 11, 28, 23)));
  });

  it("мир, возраст и повтор вклада закрывают участие", () => {
    expect(worldFits([], "murim")).toBe(true);
    expect(worldFits(["academy"], "murim")).toBe(false);
    const base = { minAge: 16, goal: 10, perLife: 1, pending: false, alive: true, age: 20, universeId: "murim" as const };
    expect(joinBlock(base, [], 0)).toBe("");
    expect(joinBlock({ ...base, pending: true }, [], 0)).not.toBe("");
    expect(joinBlock({ ...base, alive: false }, [], 0)).not.toBe("");
    expect(joinBlock({ ...base, age: 10 }, [], 0)).not.toBe("");
    expect(joinBlock(base, ["academy"], 0)).not.toBe("");
    expect(joinBlock(base, [], 1)).not.toBe("");
  });

  it("награда один раз и не после отмены", () => {
    expect(canClaim("active", true, false)).toBe(true);
    expect(canClaim("completed", true, false)).toBe(true);
    expect(canClaim("completed", true, true)).toBe(false);
    expect(canClaim("active", false, false)).toBe(false);
    expect(canClaim("cancelled", true, false)).toBe(false);
    expect(canClaim("archived", true, false)).toBe(false);
  });

  it("шаблоны целы и слот дня уникален", () => {
    expect(LIVE_TEMPLATES.map((item) => item.id)).toEqual(["daily-watch", "weekly-store"]);
    const daily = findTemplate("daily-watch");
    expect(daily).toBeDefined();
    const now = Date.UTC(2026, 10, 5, 15);
    expect(daily!.slotKey(now)).toBe("daily-watch:2026-11-05");
    expect(daily!.window(now).end - daily!.window(now).start).toBe(86_400_000);
    expect(findTemplate("nope")).toBeUndefined();
  });
});
