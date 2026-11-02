import { applyAction, newGame, presentEvent, type GameState, type HistoryEntry, type NewGameInput } from "../src/index.js";

export function start(input: Partial<NewGameInput> = {}): GameState {
  return newGame({ seed: "test-seed", universeId: "dark-fantasy", ...input }).state;
}

/** Доступные варианты текущего события — так их видит игрок */
export function choiceIds(state: GameState): string[] {
  const view = presentEvent(state);
  if (!view) throw new Error("нет события");
  return view.choices.filter((c) => c.available).map((c) => c.id);
}

/** Проживает жизнь до конца или до maxSteps действий. pick выбирает индекс варианта из доступных */
export function playLife(
  state: GameState,
  maxSteps = 2000,
  pick: (count: number, step: number) => number = () => 0
): { state: GameState; entries: HistoryEntry[] } {
  const entries: HistoryEntry[] = [];
  let current = state;
  for (let step = 0; step < maxSteps && current.life.alive; step++) {
    let action: { type: "advance" } | { type: "choose"; choiceId: string } = { type: "advance" };
    if (current.pending) {
      const ids = choiceIds(current);
      action = { type: "choose", choiceId: ids[pick(ids.length, step) % ids.length] ?? ids[0]! };
    }
    const result = applyAction(current, action);
    entries.push(...result.entries);
    current = result.state;
  }
  return { state: current, entries };
}
