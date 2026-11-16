// R5.12: сезонная история общего мира. Чистая функция, четыре главы на мир, статусы из общих целей.
import { describe, expect, it } from "vitest";
import { presentSeasonStory, seasonStoryProblems, SEASON_STORIES, UNIVERSE_IDS, type SeasonGoalView } from "../src/index.js";

function goals(met: readonly string[] = [], progress = 40): SeasonGoalView[] {
  return [
    { id: "prosperity", title: { ru: "Процветание", en: "Prosperity" }, current: 50, target: 60, progress, met: met.includes("prosperity") },
    { id: "stability", title: { ru: "Порядок", en: "Order" }, current: 50, target: 60, progress, met: met.includes("stability") },
    { id: "factions", title: { ru: "Силы", en: "Powers" }, current: 50, target: 60, progress, met: met.includes("factions") }
  ];
}

describe("R5.12: сезонная история", () => {
  it("у каждого мира четыре уникальные главы и финал", () => {
    expect(seasonStoryProblems()).toEqual([]);
    for (const universeId of UNIVERSE_IDS) {
      const story = SEASON_STORIES[universeId];
      expect(story.chapters).toHaveLength(4);
      expect(new Set(story.chapters.map((chapter) => chapter.id)).size).toBe(4);
      expect(story.chapters.at(-1)?.goal).toBe("final");
    }
  });

  it("без выполненных целей открыта только первая глава", () => {
    const story = presentSeasonStory("dark-fantasy", 3, goals());
    expect(story.season).toBe(3);
    expect(story.completed).toBe(false);
    expect(story.chapters.map((chapter) => chapter.status)).toEqual(["active", "locked", "locked", "locked"]);
    expect(story.progress).toBe(40);
  });

  it("каждая цель открывает следующую главу", () => {
    const first = presentSeasonStory("isekai", 1, goals(["prosperity"]));
    expect(first.chapters.map((chapter) => chapter.status)).toEqual(["done", "active", "locked", "locked"]);
    expect(first.chapters[0]?.epilogue).toBeTruthy();

    const second = presentSeasonStory("isekai", 1, goals(["prosperity", "stability"]));
    expect(second.chapters.map((chapter) => chapter.status)).toEqual(["done", "done", "active", "locked"]);
  });

  it("финал закрывает сезон только после всех трёх целей", () => {
    const story = presentSeasonStory("hunter", 7, goals(["prosperity", "stability", "factions"], 100));
    expect(story.completed).toBe(true);
    expect(story.progress).toBe(100);
    expect(story.chapters.map((chapter) => chapter.status)).toEqual(["done", "done", "done", "done"]);
  });

  it("детерминирована и не меняет цели", () => {
    const input = goals(["prosperity"], 55);
    const before = JSON.stringify(input);
    const first = presentSeasonStory("academy", 2, input);
    const second = presentSeasonStory("academy", 2, input);
    expect(second).toEqual(first);
    expect(JSON.stringify(input)).toBe(before);
    expect(first.title.en).toBe("The Court Season");
  });
});
