"use client";

import type { LifeView } from "@endemion/shared";
import { Meter, Panel } from "@endemion/ui";
import { useI18n } from "../locale-provider";

function Stat({ label, value, caption, testId }: { label: string; value: string; caption?: string; testId: string }) {
  return (
    <div className="rounded-md border border-line bg-ink-950/40 p-2 text-center" data-testid={testId}>
      <dt className="text-[10px] uppercase tracking-wider text-bone-500">{label}</dt>
      <dd className="font-display text-lg tabular-nums text-bone-100" data-value={value}>{value}</dd>
      {caption && <dd className="text-[10px] tabular-nums text-bone-500">{caption}</dd>}
    </div>
  );
}

export function WorldPanel({ life }: { life: LifeView }) {
  const { l, t } = useI18n();
  const world = life.world;
  const metrics = life.metrics;
  const empty = !metrics.hasWorld || metrics.settlements.count === 0;
  const relationValue = metrics.factions.count === 0 ? "—" : String(Math.round(metrics.factions.relation.mean));
  return (
    <Panel data-testid="world-panel" className="space-y-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl text-bone-100">{t("dossier.world")}</h2>
        <span className="text-[10px] uppercase tracking-wider text-bone-500">{world.tick > 0 ? `${t("play.current")} · ${world.tick}` : t("play.current")}</span>
      </div>
      <div className="rounded-md border border-gold-500/30 bg-gold-500/5 px-3 py-2" data-testid="world-current-location" data-settlement={life.location.settlementId}>
        <p className="text-[10px] uppercase tracking-wider text-gold-400">{t("location.title")}</p>
        <p className="text-sm text-bone-100">{l(life.location.name)}</p>
        <p className="text-[11px] text-bone-500">
          {l(life.location.kindName)}
          {life.location.wagePercent !== 0 && ` · ${t("location.wage", { n: `${life.location.wagePercent > 0 ? "+" : ""}${life.location.wagePercent}%` })}`}
          {life.location.costPercent !== 0 && ` · ${t("location.cost", { n: `${life.location.costPercent > 0 ? "+" : ""}${life.location.costPercent}%` })}`}
        </p>
      </div>
      <div className="rounded-md border border-line bg-ink-950/50 p-3" data-testid="world-summary">
        <h3 className="mb-2 text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("world.summary")}</h3>
        {empty ? (
          <p className="text-xs text-bone-500">{t("world.empty")}</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label={t("world.settlements")} value={String(metrics.settlements.count)} testId="world-summary-settlements" />
              <Stat
                label={t("world.avgProsperity")}
                value={String(Math.round(metrics.settlements.prosperity.mean))}
                caption={t("world.range", { min: metrics.settlements.prosperity.min, max: metrics.settlements.prosperity.max })}
                testId="world-summary-prosperity"
              />
              <Stat
                label={t("world.avgStability")}
                value={String(Math.round(metrics.settlements.stability.mean))}
                caption={t("world.range", { min: metrics.settlements.stability.min, max: metrics.settlements.stability.max })}
                testId="world-summary-stability"
              />
              <Stat
                label={t("world.relations")}
                value={relationValue}
                caption={metrics.factions.count === 0 ? undefined : t("world.range", { min: metrics.factions.relation.min, max: metrics.factions.relation.max })}
                testId="world-summary-relations"
              />
            </dl>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-bone-500">
              <span>{t("world.renown")}: <span className="tabular-nums text-bone-200" data-testid="world-summary-renown">{metrics.dynastyRenown}</span></span>
              <span>{t("world.threads")}: <span className="tabular-nums text-bone-200" data-testid="world-summary-threads">{metrics.activeThreads}</span></span>
              <span>{t("world.activities")}: <span className="tabular-nums text-bone-200" data-testid="world-summary-activities">{metrics.activities.count}</span></span>
            </p>
          </>
        )}
      </div>
      <div>
        <h3 className="mb-2 text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("dossier.settlements")}</h3>
        <ul className="space-y-3">
          {world.settlements.map((settlement) => (
            <li key={settlement.id} className="rounded-md border border-line bg-ink-950/50 p-3" data-testid="world-settlement">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm text-bone-100">{l(settlement.name)}</p>
                <span className="text-xs tabular-nums text-bone-400">{t("dossier.population", { n: settlement.population })}</span>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Meter label={t("dossier.prosperity", { n: settlement.prosperity })} value={settlement.prosperity} max={100} tone="gold" caption={String(settlement.prosperity)} />
                <Meter label={t("dossier.stability", { n: settlement.stability })} value={settlement.stability} max={100} tone="azure" caption={String(settlement.stability)} />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("dossier.factionPower")}</h3>
        <ul className="space-y-2">
          {world.factions.map((faction) => (
            <li key={faction.id} className="flex items-center gap-3" data-testid="world-faction">
              <span className="min-w-0 flex-1 truncate text-sm text-bone-300" title={l(faction.name)}>{l(faction.name)}</span>
              <span className="text-xs tabular-nums text-bone-400">{t("dossier.influence", { n: faction.influence })}</span>
              <div className="w-24"><Meter label="" value={faction.power} max={100} tone="blood" caption={String(faction.power)} /></div>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("dossier.worldFeed")}</h3>
        {world.activities.length === 0 ? <p className="text-xs text-bone-500">{t("dossier.noWorldFeed")}</p> : (
          <ol className="max-h-64 space-y-2 overflow-y-auto pr-1" data-testid="world-feed">
            {world.activities.map((item) => (
              <li key={item.id} className="border-l border-gold-500/40 pl-3 text-sm" data-testid="world-activity">
                <p className="text-[10px] uppercase tracking-wider text-bone-500">{item.age}</p>
                <p className="text-bone-100">{l(item.title)}</p>
                <p className="text-xs leading-relaxed text-bone-400">{l(item.text)}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Panel>
  );
}