// Stage 12: сводка мира в досье — рендер, пустое состояние, обновление
import { newGame } from "@endemion/game-core";
import { toLifeView, type LifeView } from "@endemion/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "../locale-provider";
import { WorldPanel } from "./world-panel";

const meta = { id: "id", createdAt: "", updatedAt: "" };

function render(life: LifeView, locale: "ru" | "en" = "ru"): string {
  return renderToStaticMarkup(
    <LocaleProvider locale={locale}>
      <WorldPanel life={life} />
    </LocaleProvider>
  );
}

describe("Stage 12: сводка мира", () => {
  it("показывает поселения, достаток, порядок, отношения и род", () => {
    const { state } = newGame({ seed: "s12-summary", universeId: "dark-fantasy" });
    const view = toLifeView(meta, state);
    const html = render(view);
    expect(html).toContain('data-testid="world-summary"');
    expect(html).toContain('data-testid="world-summary-settlements"');
    expect(html).toContain('data-testid="world-summary-prosperity"');
    expect(html).toContain('data-testid="world-summary-stability"');
    expect(html).toContain('data-testid="world-summary-relations"');
    expect(html).toContain(`data-testid="world-summary-renown">${view.metrics.dynastyRenown}<`);
    expect(html).toContain(`data-testid="world-summary-threads">${view.metrics.activeThreads}<`);
    expect(html).toContain(`data-testid="world-summary-activities">${view.metrics.activities.count}<`);
  });

  it("показывает английские подписи", () => {
    const { state } = newGame({ seed: "s12-en", universeId: "hunter" });
    const view = toLifeView(meta, state);
    const html = render(view, "en");
    expect(html).toContain("World summary");
    expect(html).toContain("Average prosperity");
    expect(html).toContain("Settlements");
  });

  it("безопасно показывает пустое состояние без мира", () => {
    const { state } = newGame({ seed: "s12-empty", universeId: "academy" });
    delete state.world;
    const view = toLifeView(meta, state);
    view.world = { tick: 0, settlements: [], factions: [], activities: [] };
    const html = render(view);
    expect(html).toContain("Данных о мире пока нет.");
    expect(html).not.toContain('data-testid="world-summary-settlements"');
    expect(html).not.toContain("NaN");
  });

  it("обновляется при изменении состояния", () => {
    const { state } = newGame({ seed: "s12-update", universeId: "murim" });
    const before = toLifeView(meta, state);
    state.world!.tick += 7;
    state.world!.settlements[0]!.prosperity = 100;
    const after = toLifeView(meta, state);
    expect(after.metrics.tick).toBe(before.metrics.tick + 7);
    expect(after.metrics.settlements.prosperity.max).toBe(100);
    expect(render(after)).not.toBe(render(before));
  });
});