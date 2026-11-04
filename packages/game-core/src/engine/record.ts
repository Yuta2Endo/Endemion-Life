import type { ChangeKind, HistoryChange } from "../types.js";
import type { EngineContext } from "./context.js";

/** Добавляет изменение в итог действия. Изменения одной величины складываются: «Сила +3», а не «+1, +2» */
export function record(ctx: EngineContext, change: HistoryChange): void {
  if (change.delta !== undefined) {
    if (change.delta === 0) return;
    const same = ctx.changes.find((c) => c.kind === change.kind && c.key === change.key && c.delta !== undefined);
    if (same) {
      same.delta = (same.delta ?? 0) + change.delta;
      if (same.delta === 0) ctx.changes.splice(ctx.changes.indexOf(same), 1);
      return;
    }
  }
  ctx.changes.push({ ...change });
}

export function recordDelta(ctx: EngineContext, kind: ChangeKind, before: number, after: number, key?: string): void {
  if (after !== before) record(ctx, key === undefined ? { kind, delta: after - before } : { kind, key, delta: after - before });
}
