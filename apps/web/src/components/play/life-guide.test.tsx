import { newGame } from "@endemion/game-core";
import { toLifeView, type LifeView } from "@endemion/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "../locale-provider";
import { LifeGuide } from "./life-guide";

const meta = { id: "guide-life", createdAt: "", updatedAt: "" };

function life(): LifeView {
  const { state } = newGame({ seed: "guide-life", universeId: "hunter" });
  state.character.goal = "family";
  state.character.goalProgress = 40;
  return toLifeView(meta, state);
}

function render(locale: "ru" | "en"): string {
  return renderToStaticMarkup(
    <LocaleProvider locale={locale}>
      <LifeGuide life={life()} busy={false} onAdvance={() => {}} onEvent={() => {}} onDossier={() => {}} hasDecision={false} dossierOpened={false} />
    </LocaleProvider>
  );
}

describe("R1.1: life guide", () => {
  it("показывает главу, цель жизни и первые шаги", () => {
    const html = render("ru");
    expect(html).toContain('data-testid="life-guide"');
    expect(html).toContain("Первая жизнь");
    expect(html).toContain("Создать семью");
    expect(html).toContain("40%");
    expect(html).toContain('data-testid="guide-checklist"');
    expect(html).toContain("Прожить год");
    expect(html).toContain("Проживите детство");
  });

  it("переведён на английский", () => {
    const html = render("en");
    expect(html).toContain("First life");
    expect(html).toContain("Establish a family");
    expect(html).toContain("First steps");
    expect(html).toContain("Live a year");
  });
});
