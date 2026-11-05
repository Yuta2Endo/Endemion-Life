import { describe, expect, it } from "vitest";
import { ageLabel } from "./format";
import { M, msg, toLocale } from "./messages";

describe("тексты интерфейса", () => {
  it("у каждого текста есть русский и английский вариант", () => {
    for (const [key, text] of Object.entries(M)) {
      expect(text.ru.trim(), key).not.toBe("");
      expect(text.en.trim(), key).not.toBe("");
    }
  });

  it("переменные подставляются", () => {
    expect(msg("ru", "play.chance", { n: 65 })).toBe("Шанс 65%");
    expect(msg("en", "sheet.level", { n: 3 })).toBe("Level 3");
  });

  it("неизвестный язык заменяется языком по умолчанию", () => {
    expect(toLocale("de")).toBe("ru");
    expect(toLocale("en")).toBe("en");
    expect(toLocale(undefined)).toBe("ru");
  });

  it("сводка и справка есть на обоих языках", () => {
    expect(msg("ru", "now.nextYear")).toContain("год");
    expect(msg("en", "now.nextEvent")).toContain("event");
    expect(msg("ru", "guide.hide")).toBe("Скрыть");
    expect(msg("en", "play.advanceBlockedEvent")).toContain("event");
    expect(msg("ru", "play.advance5")).toContain("до");
    expect(msg("en", "play.scheduled")).toContain("earlier");
    expect(msg("ru", "play.thisYear")).toContain("год");
    expect(msg("ru", "dossier.lockedDead")).toContain("живых");
  });

  it("возраст склоняется", () => {
    expect(ageLabel(1, "ru")).toBe("1 год");
    expect(ageLabel(3, "ru")).toBe("3 года");
    expect(ageLabel(11, "ru")).toBe("11 лет");
    expect(ageLabel(21, "ru")).toBe("21 год");
    expect(ageLabel(1, "en")).toBe("1 year");
  });
});
