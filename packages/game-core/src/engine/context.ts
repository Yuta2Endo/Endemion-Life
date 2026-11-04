import type { Rng } from "../rng.js";
import type { UniverseDefinition } from "../universes/types.js";
import type { GameState, HistoryChange } from "../types.js";

/** Всё, что нужно правилам во время одного действия. Состояние — рабочая копия, её можно менять */
export interface EngineContext {
  state: GameState;
  rng: Rng;
  universe: UniverseDefinition;
  /** Изменения, накопленные за действие: попадают в запись истории */
  changes: HistoryChange[];
  /** Событие, чьи эффекты сейчас применяются: от него отложенные последствия запоминают источник */
  source?: string;
}
