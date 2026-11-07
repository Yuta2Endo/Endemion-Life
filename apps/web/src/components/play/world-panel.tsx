"use client";

import type { LifeView } from "@endemion/shared";
import { Meter, Panel } from "@endemion/ui";
import { useI18n } from "../locale-provider";

export function WorldPanel({ life }: { life: LifeView }) {
  const { l, t } = useI18n();
  const world = life.world;
  return (
    <Panel data-testid="world-panel" className="space-y-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl text-bone-100">{t("dossier.world")}</h2>
        <span className="text-[10px] uppercase tracking-wider text-bone-500">{world.tick > 0 ? `${t("play.current")} · ${world.tick}` : t("play.current")}</span>
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
