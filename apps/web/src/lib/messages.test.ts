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

  it("возраст склоняется", () => {
    expect(ageLabel(1, "ru")).toBe("1 год");
    expect(ageLabel(3, "ru")).toBe("3 года");
    expect(ageLabel(11, "ru")).toBe("11 лет");
    expect(ageLabel(21, "ru")).toBe("21 год");
    expect(ageLabel(1, "en")).toBe("1 year");
  });
});
