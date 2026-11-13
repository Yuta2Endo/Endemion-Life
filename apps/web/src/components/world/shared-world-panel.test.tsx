// Stage 04: представление общего мира проверяется без сети — фикстура вместо ответа API.
import type { SharedWorldState } from "@endemion/game-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "../locale-provider";
import { SharedWorldPanel, SharedWorldView } from "./shared-world-panel";

const world: SharedWorldState = {
  version: 1,
  universeId: "dark-fantasy",
  seed: "shared:dark-fantasy:v1",
  season: 7,
  settlements: [
    {
      id: "ashford",
      name: { ru: "Эшфорд", en: "Ashford" },
      kind: "city",
      tags: ["market"],
      wageFactor: 1.1,
      costFactor: 1.2,
      travelCost: 10,
      population: 12_400,
      prosperity: 62,
      stability: 48,
      dominantFactionId: "order",
      goods: [
        {
          id: "grain",
          name: { ru: "Зерно", en: "Grain" },
          description: { ru: "Хлеб и крупа", en: "Bread and grain" },
          base: 4,
          supply: 70,
          buy: 5,
          sell: 2
        }
      ]
    },
    {
      id: "watcher-hill",
      name: { ru: "Сторожевой холм", en: "Watcher's Hill" },
      kind: "frontier",
      tags: ["frontier", "wilds"],
      wageFactor: 0.9,
      costFactor: 0.8,
      travelCost: 14,
      population: 700,
      prosperity: 30,
      stability: 55,
      dominantFactionId: null,
      goods: []
    }
  ],
  factions: [
    { id: "order", name: { ru: "Орден Пепла", en: "Ash Order" }, power: 64, influence: 12, standing: -8 }
  ],
  events: [
    {
      id: "harvest",
      season: 7,
      kind: "festival",
      title: { ru: "Праздник урожая", en: "Harvest festival" },
      text: { ru: "Город празднует до утра.", en: "The city celebrates until dawn." },
      settlementId: "ashford",
      factionId: "order",
      severity: 3
    }
  ]
};

function renderView(locale: "ru" | "en"): string {
  return renderToStaticMarkup(
    <LocaleProvider locale={locale}>
      <SharedWorldView
        name={{ ru: "Тёмное фэнтези", en: "Dark fantasy" }}
        world={world}
        checksum="abcdef1234567890"
        updatedAt="2026-11-14T12:00:00.000Z"
      />
    </LocaleProvider>
  );
}

describe("Stage 04: общий мир на /worlds", () => {
  it("показывает сезон, поселения, товары, фракции и вести по-русски", () => {
    const html = renderView("ru");
    expect(html).toContain('data-testid="shared-world-detail"');
    expect(html).toContain("Тёмное фэнтези");
    expect(html).toContain("Сезон 7");
    expect(html).toContain("Население:");
    expect(html).toContain("Достаток");
    expect(html).toContain("Порядок");
    expect(html).toContain("Главная фракция: Орден Пепла");
    expect(html).toContain("Нет главной фракции");
    expect(html).toContain("Зерно");
    expect(html).toContain("Купить");
    expect(html).toContain("Продать");
    expect(html).toContain("Орден Пепла");
    expect(html).toContain("Праздник урожая");
    expect(html).toContain("Город празднует до утра.");
    expect(html).toContain("Поселение: Эшфорд");
    expect(html).toContain("Фракция: Орден Пепла");
    expect(html).toContain("Важность 3");
  });

  it("показывает те же данные по-английски", () => {
    const html = renderView("en");
    expect(html).toContain("Dark fantasy");
    expect(html).toContain("Season 7");
    expect(html).toContain("Population:");
    expect(html).toContain("Prosperity");
    expect(html).toContain("Stability");
    expect(html).toContain("Dominant faction: Ash Order");
    expect(html).toContain("No dominant faction");
    expect(html).toContain("Grain");
    expect(html).toContain("Buy");
    expect(html).toContain("Sell");
    expect(html).toContain("Harvest festival");
    expect(html).toContain("The city celebrates until dawn.");
    expect(html).toContain("Settlement: Ashford");
    expect(html).toContain("Faction: Ash Order");
    expect(html).toContain("Severity 3");
  });

  it("не оставляет пустую секцию до ответа сервера", () => {
    const ru = renderToStaticMarkup(
      <LocaleProvider locale="ru">
        <SharedWorldPanel />
      </LocaleProvider>
    );
    expect(ru).toContain('data-testid="shared-world-panel"');
    expect(ru).toContain("Живые миры");
    expect(ru).toContain("Загрузка общего мира…");
    expect(ru).toContain('data-testid="shared-world-loading"');

    const en = renderToStaticMarkup(
      <LocaleProvider locale="en">
        <SharedWorldPanel />
      </LocaleProvider>
    );
    expect(en).toContain("Living worlds");
    expect(en).toContain("Loading the shared world…");
  });
});
