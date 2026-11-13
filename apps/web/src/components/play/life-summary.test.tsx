// Stage 03.3: смерть персонажа показывает закон наследования, причину главного наследника и его долю
import { newGame } from "@endemion/game-core";
import { toLifeView, type LifeView } from "@endemion/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "../locale-provider";
import { LifeSummary } from "./life-summary";

const meta = { id: "id", createdAt: "", updatedAt: "" };

function deadLife(seed: string): LifeView {
  const { state } = newGame({ seed, universeId: "dark-fantasy" });
  state.life.alive = false;
  state.life.age = 70;
  return toLifeView(meta, state);
}

function render(life: LifeView, locale: "ru" | "en" = "ru"): string {
  return renderToStaticMarkup(
    <LocaleProvider locale={locale}>
      <LifeSummary life={life} busy={false} onSucceed={() => {}} />
    </LocaleProvider>
  );
}

describe("Stage 03.3: экран наследования", () => {
  it("показывает закон мира и причину, почему наследник главный", () => {
    const html = render(deadLife("summary-law-ru"));
    expect(html).toContain('data-testid="succession-law"');
    expect(html).toContain("Право первородства");
    expect(html).toContain("Совершеннолетие наследника: 16");
    expect(html).toContain('data-testid="heir-primary-reason"');
    expect(html).toContain("Старший доступный наследник по праву первородства");
    expect(html).not.toContain("NaN");
  });

  it("показывает английские подписи закона и причины", () => {
    const html = render(deadLife("summary-law-ru"), "en");
    expect(html).toContain('data-testid="succession-law"');
    expect(html).toContain("Primogeniture");
    expect(html).toContain("Heir comes of age: 16");
    expect(html).toContain("Eldest available heir under primogeniture");
  });
});
