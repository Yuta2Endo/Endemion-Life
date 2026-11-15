// R5.5: экран людей — сводка, возраст уз и полный журнал NPC на двух языках
import { newGame } from "@endemion/game-core";
import { toLifeView, type LifeView } from "@endemion/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "../locale-provider";
import { People } from "./dossier";

const meta = { id: "id", createdAt: "", updatedAt: "" };

function render(life: LifeView, locale: "ru" | "en" = "ru"): string {
  return renderToStaticMarkup(
    <LocaleProvider locale={locale}>
      <People life={life} busy={false} onInteract={() => undefined} />
    </LocaleProvider>
  );
}

function peopleState(seed: string): LifeView {
  let state = newGame({ seed, universeId: "dark-fantasy" }).state;
  for (let attempt = 0; attempt < 32 && !state.npcs.some((item) => item.alive); attempt++) {
    state = newGame({ seed: `${seed}-${attempt}`, universeId: "dark-fantasy" }).state;
  }
  state.life.age = 30;
  state.life.stage = "adult";
  const npc = state.npcs.find((item) => item.alive);
  if (!npc) throw new Error("нет людей");
  npc.role = "friend";
  npc.affinity = 80;
  npc.log = [
    { at: 20, kind: "bond" },
    ...Array.from({ length: 11 }, (_, index) => ({ at: 21 + index, kind: "relationship" as const, value: "friend:+1" }))
  ];
  for (const other of state.npcs) {
    if (other.id !== npc.id) other.affinity = 0;
  }
  return toLifeView(meta, state);
}

describe("R5.5: досье людей", () => {
  it("показывает сводку, возраст уз и все записи журнала, а не только последние", () => {
    const life = peopleState("r55-people-dossier-ru");
    const html = render(life);
    const people = life.profile.npcs;
    const living = people.filter((npc) => npc.alive).length;
    const bonds = people.filter((npc) => npc.bond).length;
    const family = people.filter((npc) => npc.family).length;
    expect(html).toContain('data-testid="people-summary"');
    expect(html).toContain(`data-summary="living" data-value="${living}"`);
    expect(html).toContain(`data-summary="bonds" data-value="${bonds}"`);
    expect(html).toContain(`data-summary="family" data-value="${family}"`);
    expect(html).toContain('data-testid="strongest-tie"');
    expect(html).toContain('data-testid="npc-bond-age" data-age="20"');
    expect(html).toContain("Узы с ваших 20");
    expect(html).toContain('data-testid="npc-log" data-count="12"');
    expect(html).toContain("Полная хроника");
    expect(html).toContain("Записей: 12");
    expect(html).toContain("друг +1");
    expect(html).not.toContain("NaN");
  });

  it("показывает английские подписи сводки и журнала", () => {
    const html = render(peopleState("r55-people-dossier-en"), "en");
    expect(html).toContain("People around you");
    expect(html).toContain("Full log");
    expect(html).toContain("Bond since your age 20");
    expect(html).toContain("Strongest tie:");
    expect(html).toContain("Entries: 12");
  });
});
