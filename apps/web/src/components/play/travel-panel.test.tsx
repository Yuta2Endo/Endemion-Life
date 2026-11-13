// Stage 02.4: панель дороги — текущее поселение, цена, доступность и RU/EN.
import { newGame } from "@endemion/game-core";
import { toLifeView, type LifeView } from "@endemion/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "../locale-provider";
import { TravelPanel } from "./travel-panel";

const meta = { id: "id", createdAt: "", updatedAt: "" };

function render(life: LifeView, locale: "ru" | "en" = "ru", busy = false): string {
  return renderToStaticMarkup(
    <LocaleProvider locale={locale}>
      <TravelPanel life={life} busy={busy} onTravel={() => undefined} />
    </LocaleProvider>
  );
}

describe("Stage 02.4: панель дороги", () => {
  it("показывает текущее поселение и все существующие направления", () => {
    const { state } = newGame({ seed: "travel-panel", universeId: "dark-fantasy" });
    state.character.wealth = 100;
    const view = toLifeView(meta, state);
    const html = render(view);
    expect(html).toContain('data-testid="travel-panel"');
    expect(html).toContain('data-testid="location-current"');
    expect(html).toContain('data-settlement="ash-capital"');
    expect(html).toContain("Пепельная столица");
    expect(html).toContain('data-testid="travel-destination"');
    expect(html).toContain('data-settlement="mist-border"');
    expect(html).toContain("Вы здесь");
    expect(html).not.toContain("NaN");
  });

  it("показывает цену и блокирует дорогу, пока ждёт событие", () => {
    const { state } = newGame({ seed: "travel-panel-pending", universeId: "murim" });
    state.character.wealth = 100;
    state.pending = { eventId: "common.first-steps", age: state.life.age };
    const view = toLifeView(meta, state);
    const html = render(view);
    expect(html).toContain("Сначала ответьте на событие");
    expect(html).toContain("Дорога:");
    expect(html.match(/data-testid="travel-destination"/g)?.length).toBe(3);
    expect(html).not.toContain("NaN");
  });

  it("английские подписи и нехватка золота видны без отрицательных чисел", () => {
    const { state } = newGame({ seed: "travel-panel-en", universeId: "academy" });
    state.character.wealth = 0;
    const view = toLifeView(meta, state);
    const html = render(view, "en");
    expect(html).toContain("Current location");
    expect(html).toContain("Travel");
    expect(html).toContain("You are here");
    expect(html).toContain("not enough");
    expect(html).not.toContain(">-");
  });
});
