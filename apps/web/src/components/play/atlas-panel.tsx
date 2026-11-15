"use client";

import { presentAtlas, type AtlasAdventureStatus, type AtlasAdventureView } from "@endemion/game-core";
import type { LifeView } from "@endemion/shared";
import { Panel } from "@endemion/ui";
import { useI18n } from "../locale-provider";

const STATUS_STYLE: Record<AtlasAdventureStatus, string> = {
  completed: "border-jade-500/40 bg-jade-500/10 text-jade-300",
  failed: "border-blood-500/40 bg-blood-500/10 text-blood-300",
  active: "border-gold-500/40 bg-gold-500/10 text-gold-300",
  available: "border-azure-500/40 bg-azure-500/10 text-azure-300",
  locked: "border-line bg-ink-950/60 text-bone-500"
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-[11px] uppercase tracking-[0.22em] text-gold-400">{children}</h3>;
}

function Stat({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="rounded-md border border-line bg-ink-950/40 p-2 text-center" data-testid={testId}>
      <dt className="text-[10px] uppercase tracking-wider text-bone-500">{label}</dt>
      <dd className="font-display text-lg tabular-nums text-bone-100" data-value={value}>{value}</dd>
    </div>
  );
}

export function AtlasPanel({ life }: { life: LifeView }) {
  const { l, t } = useI18n();
  const atlas = presentAtlas({
    universeId: life.universeId,
    age: life.life.age,
    track: life.character.track,
    factions: life.character.factions,
    socialClassId: life.character.socialClassId,
    meters: life.profile.meters,
    adventure: life.adventure,
    relics: life.legacy.relics?.map((relic) => relic.id) ?? []
  });

  const statusLabel = (status: AtlasAdventureStatus) => {
    switch (status) {
      case "completed": return t("atlas.completed");
      case "failed": return t("atlas.failed");
      case "active": return t("atlas.active");
      case "available": return t("atlas.available");
      default: return t("atlas.locked");
    }
  };

  const blocker = (adventure: AtlasAdventureView) => {
    switch (adventure.blocked) {
      case "age": return t("atlas.age", { age: adventure.minAge });
      case "place": return t("atlas.needPlace");
      case "requires": return t("atlas.requires", { names: adventure.requires.map(l).join(", ") });
      case "pending": return t("atlas.pending");
      default: return null;
    }
  };

  return (
    <Panel data-testid="atlas-panel" className="space-y-5">
      <header className="space-y-2" data-testid="atlas-identity">
        <p className="text-[10px] uppercase tracking-[0.24em]" style={{ color: atlas.theme.accent }}>{t("atlas.eyebrow")}</p>
        <h2 className="font-display text-2xl text-bone-100">{l(atlas.name)}</h2>
        <p className="text-sm italic text-bone-400">{l(atlas.tagline)}</p>
        <p className="text-sm leading-relaxed text-bone-300">{l(atlas.description)}</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-bone-500">
          <span>{t("atlas.lifespan", { n: atlas.lifespan })}</span>
          <span>{t("atlas.mana", { name: l(atlas.manaName) })}</span>
          <span>{t("atlas.classes", { n: atlas.progress.socialClassCount })}</span>
        </p>
      </header>

      <section className="rounded-md border border-gold-500/30 bg-gold-500/5 p-3" data-testid="atlas-progress">
        <SectionTitle>{t("atlas.progress")}</SectionTitle>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label={t("atlas.progressPlaces")} value={`${atlas.progress.placesFound} / ${atlas.progress.placesTotal}`} testId="atlas-stat-places" />
          <Stat label={t("atlas.progressAdventures")} value={`${atlas.progress.adventuresDone} / ${atlas.progress.adventuresTotal}`} testId="atlas-stat-adventures" />
          <Stat label={t("atlas.progressFactions")} value={`${atlas.progress.factionsKnown} / ${atlas.progress.factionsTotal}`} testId="atlas-stat-factions" />
          <Stat label={t("atlas.progressRelics")} value={`${atlas.progress.relicsOwned} / ${atlas.progress.relicsTotal}`} testId="atlas-stat-relics" />
          <Stat label={t("atlas.progressMechanics")} value={String(atlas.progress.mechanicCount)} testId="atlas-stat-mechanics" />
        </dl>
      </section>

      <section>
        <SectionTitle>{t("atlas.rules")}</SectionTitle>
        <ul className="grid gap-2 sm:grid-cols-2">
          {atlas.rules.map((rule, index) => (
            <li key={`${index}-${rule.en}`} className="rounded-md border border-line bg-ink-950/40 px-3 py-2 text-sm leading-relaxed text-bone-300" data-testid="atlas-rule">
              {l(rule)}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle>{t("atlas.mechanics")}</SectionTitle>
        <ul className="grid gap-2 sm:grid-cols-2">
          {atlas.mechanics.map((mechanic) => (
            <li key={mechanic.name.en} className="rounded-md border border-line bg-ink-950/40 p-3" data-testid="atlas-mechanic">
              <p className="text-sm text-bone-100">{l(mechanic.name)}</p>
              <p className="mt-1 text-xs leading-relaxed text-bone-400">{l(mechanic.description)}</p>
            </li>
          ))}
        </ul>
      </section>

      {atlas.meters.length > 0 && (
        <section>
          <SectionTitle>{t("atlas.scales")}</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {atlas.meters.map((meter) => (
              <span key={meter.id} className="rounded-full border border-line bg-ink-950/50 px-2.5 py-1 text-[11px] text-bone-400" data-testid="atlas-meter">
                {l(meter.name)}: <span className={`tabular-nums ${meter.danger ? "text-blood-300" : "text-azure-300"}`}>{meter.value}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-md border border-line bg-ink-950/40 p-3" data-testid="atlas-track">
        <SectionTitle>{t("atlas.path")}</SectionTitle>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-bone-100">{l(atlas.track.name)} · {l(atlas.track.rankName)}</p>
          <p className="text-xs tabular-nums text-bone-400">{t("atlas.rank", { n: atlas.track.rank + 1 })}</p>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-bone-400">{l(atlas.track.description)}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-950">
          <div className="h-full rounded-full" style={{ width: `${Math.round(atlas.track.progress * 100)}%`, backgroundColor: atlas.theme.accent }} />
        </div>
        <div className="mt-1 flex flex-wrap justify-between gap-2 text-[11px] text-bone-500">
          <span>{l(atlas.track.pointsName)}: <span className="tabular-nums text-bone-200">{atlas.track.points}</span></span>
          <span>
            {atlas.track.nextRankName && atlas.track.nextThreshold !== null
              ? t("atlas.nextRank", { rank: l(atlas.track.nextRankName), n: atlas.track.nextThreshold })
              : t("atlas.maxRank")}
          </span>
        </div>
      </section>

      <section>
        <SectionTitle>{t("atlas.society")}</SectionTitle>
        <ul className="space-y-2">
          {atlas.socialClasses.map((socialClass) => (
            <li key={socialClass.id} className={`rounded-md border p-2.5 ${socialClass.current ? "border-gold-500/50 bg-gold-500/10" : "border-line bg-ink-950/40"}`} data-testid="atlas-social-class" data-current={socialClass.current}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-bone-100">{l(socialClass.name)}</p>
                {socialClass.current && <span className="text-[10px] uppercase tracking-wider text-gold-300">{t("atlas.currentClass")}</span>}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-bone-400">{l(socialClass.description)}</p>
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-bone-500">
                <span>{t("atlas.classStanding", { n: socialClass.standing })}</span>
                <span>{t("atlas.classIncome", { n: socialClass.income })}</span>
                <span>{t("atlas.occupations", { names: socialClass.occupations.map(l).join(", ") })}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle>{t("atlas.factions")}</SectionTitle>
        <ul className="space-y-2">
          {atlas.factions.map((faction) => (
            <li key={faction.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md border border-line bg-ink-950/40 px-3 py-2" data-testid="atlas-faction">
              <p className="min-w-0 flex-1 text-sm text-bone-100">{l(faction.name)}</p>
              <span className={`text-xs tabular-nums ${faction.known ? "text-bone-300" : "text-bone-500"}`}>
                {faction.known ? t("atlas.standing", { n: faction.standing }) : t("atlas.noTies")}
              </span>
              <p className="w-full text-xs leading-relaxed text-bone-500">{l(faction.description)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle>{t("atlas.relics")}</SectionTitle>
        <ul className="space-y-2">
          {atlas.relics.map((relic) => (
            <li key={relic.id} className="rounded-md border border-line bg-ink-950/40 p-3" data-testid="atlas-relic" data-owned={relic.owned}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-bone-100">{l(relic.name)}</p>
                <span className={`text-[10px] uppercase tracking-wider ${relic.owned ? "text-gold-300" : "text-bone-500"}`}>
                  {relic.owned ? t("atlas.relicOwned") : t("atlas.relicLost")}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-bone-400">{l(relic.description)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle>{t("atlas.places")}</SectionTitle>
        <ul className="space-y-3">
          {atlas.places.map((place) => (
            <li key={place.id} className="rounded-md border border-line bg-ink-950/40 p-3" data-testid="atlas-place" data-discovered={place.discovered}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className={`text-sm ${place.discovered ? "text-bone-100" : "text-bone-500"}`}>{place.name ? l(place.name) : t("atlas.unknownPlace")}</p>
                <span className="text-[10px] uppercase tracking-wider text-bone-500">{place.discovered ? t("atlas.placeFound") : t("atlas.placeLocked")}</span>
              </div>
              {place.text && <p className="mt-1 text-xs leading-relaxed text-bone-400">{l(place.text)}</p>}
              {!place.discovered && <p className="mt-1 text-[11px] text-bone-500">{t("atlas.unknownHint", { age: place.minAge })}</p>}
              {place.discovered && (
                <ul className="mt-2 space-y-2">
                  {place.adventures.map((adventure) => (
                    <li key={adventure.id} className="rounded border border-line/70 bg-ink-950/50 p-2.5" data-testid="atlas-adventure" data-status={adventure.status}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm text-bone-200">{l(adventure.name)}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_STYLE[adventure.status]}`}>{statusLabel(adventure.status)}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-bone-400">{l(adventure.text)}</p>
                      {adventure.requires.length > 0 && (
                        <p className="mt-1 text-[11px] text-bone-500">{t("atlas.requires", { names: adventure.requires.map(l).join(", ") })}</p>
                      )}
                      {adventure.status === "locked" && blocker(adventure) && <p className="mt-1 text-[11px] text-bone-500">{blocker(adventure)}</p>}
                      {adventure.rewards.length > 0 && (
                        <p className="mt-1 text-[11px] text-bone-500">{t("atlas.rewards")}: {adventure.rewards.map((reward) => l(reward.text)).join(" · ")}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>
    </Panel>
  );
}
