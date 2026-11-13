"use client";

import { getUniverse, STAGE_INFO, STAT_INFO, STAT_KEYS, TEMPERAMENTS, xpForLevel } from "@endemion/game-core";
import type { LifeView } from "@endemion/shared";
import { Meter, Ornament, Panel } from "@endemion/ui";
import { ageLabel } from "@/lib/format";
import type { MessageKey } from "@/lib/messages";
import { useI18n } from "../locale-provider";
import { WorldEmblem } from "../world-emblem";

function Signed({ value }: { value: number }) {
  const tone = value > 0 ? "text-jade-300" : value < 0 ? "text-blood-300" : "text-bone-300";
  return <span className={`tabular-nums ${tone}`}>{value > 0 ? `+${value}` : value}</span>;
}

/** Панель персонажа: кто он, запасы, характеристики, путь силы, положение и способности */
export function CharacterSheet({ life }: { life: LifeView }) {
  const { locale, l, t } = useI18n();
  const c = life.character;
  const s = life.summary;
  const universe = getUniverse(c.universeId);
  const race = universe.races.find((r) => r.id === c.raceId);
  const origin = universe.origins.find((o) => o.id === c.originId);
  const temperament = TEMPERAMENTS.find((x) => x.id === c.temperamentId);
  const socialClass = universe.socialClasses.find((x) => x.id === c.socialClassId);
  const upbringing = life.profile.upbringing;
  const ranks = universe.track.ranks;
  const currentThreshold = ranks[c.track.rank]?.threshold ?? 0;
  const deathCause = life.health.deathCause ?? life.life.deathCause;

  return (
    <Panel className="space-y-5" data-testid="character-sheet">
      <div className="flex items-center gap-3">
        <WorldEmblem id={c.universeId} accent={universe.theme.accent} size={52} />
        <div className="min-w-0">
          <h2 className="truncate font-display text-2xl leading-tight text-bone-100" data-testid="character-name">
            {c.name}
          </h2>
          <p className="text-xs text-bone-500">
            <span data-testid="character-age">{ageLabel(life.life.age, locale)}</span> · {l(STAGE_INFO[life.life.stage].name)} · {t("sheet.level", { n: c.level })}
          </p>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-bone-300">
        {[race && l(race.name), origin && l(origin.name), temperament && l(temperament.name)].filter(Boolean).join(" · ")}
      </p>
      {temperament && (
        <p className="text-xs text-bone-400" data-testid="sheet-bent">
          {l(temperament.description)}
        </p>
      )}
      {upbringing && (
        <p className="-mt-3 text-xs text-gold-300" data-testid="sheet-upbringing">
          {t("sheet.upbringing")}: {l(upbringing.name)}
          {upbringing.talent && <span className="text-bone-400"> · {l(upbringing.talent.name)}</span>}
        </p>
      )}
      {socialClass && (
        <p className="-mt-3 text-xs text-gold-300" data-testid="sheet-class">
          {t("sheet.class")}: {l(socialClass.name)}
        </p>
      )}
      <p className="-mt-3 text-xs text-bone-400" data-testid="sheet-education-career">
        {life.education.current
          ? t("sheet.studying", { name: l(life.education.current.name) })
          : life.education.completed
            ? l(life.education.completed.name)
            : t("sheet.noEducation")}
        {" · "}
        {life.career.profession ? l(life.career.profession) : t("career.noJob")}
        {life.career.profession ? ` (${l(life.career.statusName)})` : ""}
      </p>
      <p className="-mt-3 text-xs text-bone-400" data-testid="sheet-estate">
        {t("sheet.estate", {
          home: life.household.home ? l(life.household.home.name) : l(life.household.residenceName),
          business: life.business.ventures.length > 0 ? life.business.ventures.map((venture) => l(venture.name)).join(", ") : t("estate.noBusinessShort")
        })}
      </p>

      <div className="space-y-3">
        <Meter label={l({ ru: "Здоровье", en: "Health" })} value={c.resources.health} max={s.maxResources.health} tone="blood" />
        <Meter label={l({ ru: "Энергия", en: "Energy" })} value={c.resources.energy} max={s.maxResources.energy} tone="jade" />
        <Meter label={l(universe.manaName)} value={c.resources.mana} max={s.maxResources.mana} tone="azure" />
        <Meter label={l({ ru: "Выносливость", en: "Stamina" })} value={c.resources.stamina} max={s.maxResources.stamina} tone="bone" />
        <Meter label={t("sheet.xp")} value={c.xp} max={xpForLevel(c.level)} tone="gold" />
      </div>

      <div className="rounded-md border border-line bg-ink-950/40 p-3" data-testid="health-panel">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-gold-400">{t("health.title")}</h3>
          <span className="font-display text-lg tabular-nums text-bone-100" data-testid="health-value">
            {life.health.value}
            <span className="text-xs text-bone-500">/100</span>
          </span>
        </div>
        <Meter
          label={t("health.meter")}
          value={life.health.value}
          max={100}
          tone={life.health.value <= 25 ? "blood" : life.health.value <= 50 ? "gold" : "jade"}
        />
        {life.health.conditions.length === 0 ? (
          <p className="mt-2 text-xs text-bone-500">{t("health.noConditions")}</p>
        ) : (
          <ul className="mt-2 space-y-1.5" data-testid="health-conditions">
            {life.health.conditions.map((condition) => (
              <li key={condition.id} className="rounded border border-line/70 bg-ink-900/50 px-2 py-1.5" data-testid="health-condition" data-condition={condition.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs text-bone-100">{l(condition.name)}</span>
                  <span className="text-[10px] uppercase tracking-wider text-bone-500">
                    {t(`health.kind.${condition.kind}` as MessageKey)} · {t("health.severity", { n: condition.severity })}
                  </span>
                </div>
                {condition.description.ru.trim() && <p className="mt-0.5 text-[11px] text-bone-400">{l(condition.description)}</p>}
                <p className="mt-0.5 text-[10px] text-bone-500">
                  {condition.remaining > 0 ? t("health.remaining", { n: condition.remaining }) : t("health.chronic")} · {t("health.damage", { n: condition.damage })}
                  {condition.lethal ? ` · ${t("health.lethal")}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
        {deathCause && (
          <p className="mt-2 text-xs text-blood-300" data-testid="health-death-cause">
            {t("health.cause")}: {l(deathCause)}
          </p>
        )}
      </div>

      <Ornament />

      <div>
        <h3 className="mb-3 text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("sheet.stats")}</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2" data-testid="stats">
          {STAT_KEYS.map((key) => {
            const bonus = s.stats[key] - s.baseStats[key];
            return (
              <div key={key} className="flex items-baseline justify-between gap-2 border-b border-line/60 pb-1" title={l(STAT_INFO[key].description)}>
                <dt className="text-xs text-bone-300">{l(STAT_INFO[key].name)}</dt>
                <dd className="font-display text-lg tabular-nums text-bone-100" data-stat={key}>
                  {s.stats[key]}
                  {bonus > 0 && <span className="ml-1 font-sans text-[10px] text-gold-400">+{bonus}</span>}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>

      <div>
        <h3 className="mb-2 text-[11px] uppercase tracking-[0.22em]" style={{ color: universe.theme.accent }}>
          {l(universe.track.name)}
        </h3>
        <p className="font-display text-xl text-bone-100">{l(s.rankName)}</p>
        {s.trackOpen ? (
          s.nextRankThreshold === null ? (
            <p className="mt-1 text-xs text-gold-300">{t("sheet.trackMax")}</p>
          ) : (
            <div className="mt-2">
              <Meter
                label={l(universe.track.pointsName)}
                value={c.track.points - currentThreshold}
                max={s.nextRankThreshold - currentThreshold}
                tone="gold"
                caption={`${c.track.points} / ${s.nextRankThreshold}`}
              />
            </div>
          )
        ) : (
          <p className="mt-1 text-xs text-bone-500">{t("sheet.trackClosed")}</p>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("sheet.standing")}</h3>
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md border border-line bg-ink-950/50 p-2">
            <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("sheet.reputation")}</dt>
            <dd className="font-display text-lg">
              <Signed value={c.reputation} />
            </dd>
          </div>
          <div className="rounded-md border border-line bg-ink-950/50 p-2">
            <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("sheet.karma")}</dt>
            <dd className="font-display text-lg">
              <Signed value={c.karma} />
            </dd>
          </div>
          <div className="rounded-md border border-line bg-ink-950/50 p-2">
            <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("sheet.wealth")}</dt>
            <dd className="font-display text-lg tabular-nums text-gold-200" data-testid="wealth">
              {c.wealth}
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 className="mb-2 text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("sheet.abilities")}</h3>
        {c.abilities.length === 0 ? (
          <p className="text-xs text-bone-500">{t("sheet.noAbilities")}</p>
        ) : (
          <ul className="space-y-2">
            {c.abilities.map((id) => {
              const ability = universe.abilities.find((a) => a.id === id);
              if (!ability) return null;
              return (
                <li key={id} className="rounded-md border border-gold-500/30 bg-gold-500/5 px-3 py-2">
                  <p className="text-sm text-gold-200">{l(ability.name)}</p>
                  <p className="text-xs text-bone-300">{l(ability.description)}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Panel>
  );
}
