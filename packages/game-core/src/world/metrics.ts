import { getUniverse } from "../universes/registry.js";
import type { GameState } from "../types.js";
import { dynastyFactionRelations } from "../legacy/present.js";

/** Диапазон значений метрики: min/max/mean и количество. Для пустого набора count = 0 и все нули, без NaN. */
export interface MetricRange {
  min: number;
  max: number;
  mean: number;
  count: number;
}

export interface SettlementMetrics {
  count: number;
  prosperity: MetricRange;
  stability: MetricRange;
  /** Число поселений на верхней границе процветания (100). */
  atProsperityMax: number;
  /** Число поселений на нижней границе процветания (0). */
  atProsperityMin: number;
  atStabilityMax: number;
  atStabilityMin: number;
}

export interface FactionMetrics {
  count: number;
  /** Отношения дома с фракциями: диапазон значений (clamp ±30). */
  relation: MetricRange;
}

export interface ActivityMetrics {
  count: number;
  byKind: Record<string, number>;
}

/** Чистые производные метрики мира. Не мутируют GameState, не зависят от действий игрока и не влияют на баланс. */
export interface WorldMetrics {
  /** Есть ли мир в состоянии (старые сохранения могут не содержать мира). */
  hasWorld: boolean;
  tick: number;
  settlements: SettlementMetrics;
  factions: FactionMetrics;
  dynastyRenown: number;
  activeThreads: number;
  activities: ActivityMetrics;
}

function summary(values: readonly number[]): MetricRange {
  if (values.length === 0) return { min: 0, max: 0, mean: 0, count: 0 };
  let min = values[0]!;
  let max = values[0]!;
  let total = 0;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
    total += value;
  }
  return { min, max, mean: total / values.length, count: values.length };
}

function emptySettlements(): SettlementMetrics {
  return {
    count: 0,
    prosperity: summary([]),
    stability: summary([]),
    atProsperityMax: 0,
    atProsperityMin: 0,
    atStabilityMax: 0,
    atStabilityMin: 0
  };
}

/**
 * Вычисляет метрики мира по чистому снимку состояния.
 * Устойчиво к отсутствию или повреждённым данным: пустые наборы дают count = 0.
 */
export function worldMetrics(state: GameState): WorldMetrics {
  const dynastyRenown = state.lineage.renown;
  const activeThreads = state.lineage.threads.length;
  const world = state.world;
  if (!world) {
    return {
      hasWorld: false,
      tick: 0,
      settlements: emptySettlements(),
      factions: { count: 0, relation: summary([]) },
      dynastyRenown,
      activeThreads,
      activities: { count: 0, byKind: {} }
    };
  }
  const prosperity = world.settlements.map((settlement) => settlement.prosperity);
  const stability = world.settlements.map((settlement) => settlement.stability);
  const relations = dynastyFactionRelations(state.lineage, getUniverse(state.character.universeId)).map(
    (relation) => relation.standing
  );
  const byKind: Record<string, number> = {};
  for (const activity of world.activities) {
    byKind[activity.kind] = (byKind[activity.kind] ?? 0) + 1;
  }
  return {
    hasWorld: true,
    tick: world.tick,
    settlements: {
      count: world.settlements.length,
      prosperity: summary(prosperity),
      stability: summary(stability),
      atProsperityMax: prosperity.filter((value) => value >= 100).length,
      atProsperityMin: prosperity.filter((value) => value <= 0).length,
      atStabilityMax: stability.filter((value) => value >= 100).length,
      atStabilityMin: stability.filter((value) => value <= 0).length
    },
    factions: { count: world.factions.length, relation: summary(relations) },
    dynastyRenown,
    activeThreads,
    activities: { count: world.activities.length, byKind }
  };
}