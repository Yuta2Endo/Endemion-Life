// Stage 02.5: полная форма создания показывает уклад и очки, а быстрый путь остаётся одной кнопкой.
import { getUniverse, summarizeUniverse, temperamentCatalog } from "@endemion/game-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "./locale-provider";
import { CreateForm } from "./create-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const universe = summarizeUniverse(getUniverse("academy"));

function render(locale: "ru" | "en" = "ru"): string {
  return renderToStaticMarkup(
    <LocaleProvider locale={locale}>
      <CreateForm universe={universe} temperaments={temperamentCatalog()} />
    </LocaleProvider>
  );
}

describe("Stage 02.5: форма создания", () => {
  it("показывает выбор уклада и очков внутри формы, не ломая быстрый старт", () => {
    const html = render();
    expect(html).toContain('data-testid="create-form"');
    expect(html).toContain('data-testid="creation-choices"');
    expect(html).toContain("Учёные годы");
    expect(html).toContain("Воспитание в салоне");
    expect(html).toContain("Очки развития");
    expect(html).toContain("Осталось очков: 3 из 3");
    expect(html).toContain("Родиться сразу");
  });

  it("показывает английские подписи", () => {
    const html = render("en");
    expect(html).toContain("Upbringing");
    expect(html).toContain("Development points");
    expect(html).toContain("3 of 3 points left");
    expect(html).toContain("Be born now");
  });
});
