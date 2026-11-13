"use client";

import type { LifeView } from "@endemion/shared";
import { Panel } from "@endemion/ui";
import { useI18n } from "../locale-provider";

function percent(value: number): string {
  return `${value > 0 ? "+" : ""}${value}%`;
}

/**
 * Stage 02.4: текущее поселение и дорога. Все цены и допустимость приходят с сервера:
 * кнопка только отправляет travel, а исход считает game-core.
 */
export function TravelPanel({ life, busy, onTravel }: { life: LifeView; busy: boolean; onTravel: (settlementId: string) => void }) {
  const { l, t } = useI18n();
  const location = life.location;
  const dead = life.status === "dead";
  const pending = life.pendingEvent !== null;
  const canTravel = !dead && !pending && !busy;
  const hint = dead ? t("location.dead") : pending ? t("location.pending") : busy ? t("location.busy") : null;

  return (
    <Panel className="space-y-3" data-testid="travel-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold-400">{t("location.title")}</p>
          <p className="truncate font-display text-xl text-bone-100" data-testid="location-current" data-settlement={location.settlementId} data-kind={location.kind}>
            {l(location.name)}
          </p>
          <p className="text-[11px] text-bone-500">
            {l(location.kindName)}
            {location.tagNames.length > 0 && ` · ${location.tagNames.map((tag) => l(tag)).join(" · ")}`}
          </p>
        </div>
        <div className="shrink-0 text-right text-[11px] text-bone-400" data-testid="location-modifiers">
          <p>{t("location.since", { age: location.since })}</p>
          {location.wagePercent !== 0 && <p>{t("location.wage", { n: percent(location.wagePercent) })}</p>}
          {location.costPercent !== 0 && <p>{t("location.cost", { n: percent(location.costPercent) })}</p>}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] uppercase tracking-wider text-bone-500">{t("location.travel")}</p>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {location.destinations.map((destination) => {
            const here = destination.current;
            const disabled = !canTravel || here || !destination.affordable;
            return (
              <li key={destination.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onTravel(destination.id)}
                  className="flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-line bg-ink-950/50 px-2.5 py-2 text-left transition enabled:hover:border-gold-400/70 enabled:hover:text-gold-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 disabled:opacity-55"
                  data-testid="travel-destination"
                  data-settlement={destination.id}
                  data-cost={destination.cost}
                  data-current={here}
                  data-affordable={destination.affordable}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-bone-100">{l(destination.name)}</span>
                    <span className="block truncate text-[10px] text-bone-500">{l(destination.kindName)}</span>
                  </span>
                  <span className="shrink-0 text-right text-[11px] tabular-nums text-bone-400">
                    {here ? t("location.here") : destination.affordable ? t("location.price", { n: destination.cost }) : t("location.noGold", { n: destination.cost })}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {hint && <p className="text-xs text-bone-500">{hint}</p>}
      {location.history.length > 0 && (
        <div data-testid="location-history">
          <p className="text-[10px] uppercase tracking-wider text-bone-500">{t("location.history")}</p>
          <ul className="mt-1 space-y-0.5 text-[11px] text-bone-400">
            {location.history.slice(-3).reverse().map((move, index) => (
              <li key={`${move.age}-${move.to.ru}-${index}`}>
                {t("location.moved", { from: l(move.from), to: l(move.to), age: move.age })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
