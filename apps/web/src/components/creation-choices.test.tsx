// Stage 02.5: форма показывает уклады, навыки/талант и остаток бюджета; управление доступно с клавиатуры.
import { getUniverse, summarizeUniverse } from "@endemion/game-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "./locale-provider";
import { CreationChoices, type CreationChoicesProps } from "./creation-choices";

const universe = summarizeUniverse(getUniverse("academy"));

function buttonTag(html: string, testId: string): string {
  return html.match(new RegExp(`<button[^>]*data-testid="${testId}"[^>]*>`))?.[0] ?? "";
}

function isDisabled(html: string, testId: string): boolean {
  return buttonTag(html, testId).includes(' disabled=""');
}

function render(props: Partial<CreationChoicesProps> = {}, locale: "ru" | "en" = "ru"): string {
  return renderToStaticMarkup(
    <LocaleProvider locale={locale}>
      <CreationChoices
        upbringings={universe.upbringings}
        upbringingId={null}
        onUpbringing={() => undefined}
        points={{}}
        onPoint={() => undefined}
        total={universe.pointBuy.total}
        perStat={universe.pointBuy.perStat}
        {...props}
      />
    </LocaleProvider>
  );
}

describe("Stage 02.5: уклад и очки при создании", () => {
  it("показывает уклады мира, их навыки и талант, а также остаток бюджета", () => {
    const html = render({ upbringingId: "ac-salon-upbringing", points: { charisma: 2, wisdom: 1 } });
    expect(html).toContain('data-testid="upbringing-picker"');
    expect(html).toContain('data-testid="stat-focus"');
    expect(html).toContain("Воспитание в салоне");
    expect(html).toContain("Этикет +7");
    expect(html).toContain("Придворное изящество");
    expect(html).toContain("Осталось очков: 0 из 3");
    expect(html).toContain('data-points-left="0"');
    expect(html).toContain('data-point-value="2"');
    // Плюс заблокирован, когда бюджет исчерпан; минус доступен только у вложенных очков
    expect(isDisabled(html, "point-plus-strength")).toBe(true);
    expect(isDisabled(html, "point-minus-charisma")).toBe(false);
    expect(isDisabled(html, "point-minus-strength")).toBe(true);
  });

  it("случайное рождение остаётся вариантом по умолчанию", () => {
    const html = render();
    expect(html).toContain("Без особого уклада");
    expect(html).toContain("Осталось очков: 3 из 3");
    expect(html).toContain("Добавить очко: Сила");
    expect(html).toContain("Убрать очко: Сила");
  });

  it("показывает английские подписи и названия", () => {
    const html = render({ upbringingId: "ac-salon-upbringing" }, "en");
    expect(html).toContain("Salon upbringing");
    expect(html).toContain("Etiquette +7");
    expect(html).toContain("Courtly grace");
    expect(html).toContain("3 of 3 points left");
    expect(html).toContain("Add a point to Strength");
  });
});
