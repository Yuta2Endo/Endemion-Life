// Stage 02.3: компактная панель жилья и дела в досье — рендер, пустое состояние, RU/EN
import { newGame } from "@endemion/game-core";
import { toLifeView, type LifeView } from "@endemion/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "../locale-provider";
import { EstatePanel } from "./estate-panel";

const meta = { id: "id", createdAt: "", updatedAt: "" };

function render(life: LifeView, locale: "ru" | "en" = "ru"): string {
  return renderToStaticMarkup(
    <LocaleProvider locale={locale}>
      <EstatePanel life={life} />
    </LocaleProvider>
  );
}

describe("Stage 02.3: дом и дело", () => {
  it("показывает бездомность и отсутствие дела без выдуманных людей и чисел", () => {
    const { state } = newGame({ seed: "estate-panel-empty", universeId: "dark-fantasy" });
    const view = toLifeView(meta, state);
    const html = render(view);
    expect(html).toContain('data-testid="estate"');
    expect(html).toContain('data-testid="household"');
    expect(html).toContain('data-residence="homeless"');
    expect(html).toContain("Нет отдельного жилья");
    expect(html).toContain('data-testid="business-empty"');
    expect(html).toContain("Своего дела нет.");
    expect(html).not.toContain("NaN");
  });

  it("показывает дом, расходы, домашних и своё дело", () => {
    const { state } = newGame({ seed: "estate-panel-own", universeId: "dark-fantasy" });
    state.life.age = 30;
    state.character.wealth = 100;
    state.household = { residence: "own", homeId: "df-home-small", since: 20, condition: 80, arrears: 0 };
    state.business.ventures.push({ id: "df-business-stall", foundedAge: 22, level: 1, capital: 20, years: 6, losses: 0, lastNet: 4 });
    const view = toLifeView(meta, state);
    const html = render(view);
    expect(html).toContain('data-residence="own"');
    expect(html).toContain("Угол у соборной стены");
    expect(html).toContain('data-testid="household-costs"');
    expect(html).toContain('data-testid="household-members"');
    expect(html).toContain('data-testid="business-venture"');
    expect(html).toContain("Свечная лавка");
    expect(html).toContain('data-business="df-business-stall"');
    expect(html).toContain("Цена продажи");
  });

  it("показывает английские подписи", () => {
    const { state } = newGame({ seed: "estate-panel-en", universeId: "dark-fantasy" });
    state.life.age = 30;
    state.household = { residence: "rent", homeId: "df-home-large", since: 20, condition: 0, arrears: 0 };
    state.business.ventures.push({ id: "df-business-stall", foundedAge: 22, level: 0, capital: 10, years: 1, losses: 0, lastNet: 3 });
    const html = render(toLifeView(meta, state), "en");
    expect(html).toContain("Household and business");
    expect(html).toContain("Rented home");
    expect(html).toContain("Chandler&#x27;s stall");
    expect(html).toContain("Rent: 11 a year");
  });
});
