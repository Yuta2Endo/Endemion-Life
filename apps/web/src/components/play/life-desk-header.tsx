"use client";

import { getUniverse, STAGE_INFO } from "@endemion/game-core";
import type { LifeView } from "@endemion/shared";
import { ageLabel } from "@/lib/format";
import { useI18n } from "../locale-provider";

/** Верхняя строка жизни: кто, где и в каком состоянии — до чтения хроники. */
export function LifeDeskHeader({ life }: { life: LifeView }) {
  const { locale, l, t } = useI18n();
  const universe = getUniverse(life.universeId);
  const station = universe.socialClasses.find((item) => item.id === life.character.socialClassId);
  const dead = life.status === "dead";

  return (
    <header className="mb-5 border-y border-line py-4 sm:py-5" data-testid="life-desk-header">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <p className="eyebrow text-[var(--accent)]">
            {l(universe.name)}
            <span className="text-bone-500"> · </span>
            {ageLabel(life.life.age, locale)}
            <span className="text-bone-500"> · </span>
            {l(STAGE_INFO[life.life.stage].name)}
          </p>
          <h1 className="mt-1 truncate font-display text-3xl leading-none text-bone-100 sm:text-4xl" data-testid="desk-name">
            {life.character.name}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-bone-300">
            <span>{l(life.location.name)}</span>
            <span className="text-bone-600">·</span>
            <span>{station ? l(station.name) : l(universe.track.name)}</span>
            <span className="text-bone-600">·</span>
            <span className={dead ? "text-blood-300" : "text-jade-300"}>{dead ? t("play.deathTitle") : t("play.quiet")}</span>
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-x-5 gap-y-1 sm:gap-x-8">
          <div>
            <dt className="text-[11px] text-bone-500">{t("health.title")}</dt>
            <dd className="font-display text-2xl tabular-nums text-bone-100" data-testid="desk-health">
              {life.health.value}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-bone-500">{t("sheet.wealth")}</dt>
            <dd className="font-display text-2xl tabular-nums text-gold-200" data-testid="desk-wealth">
              {life.character.wealth}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-bone-500">{t("sheet.level", { n: life.character.level })}</dt>
            <dd className="font-display text-2xl tabular-nums text-bone-100" data-testid="desk-level">
              {life.character.level}
            </dd>
          </div>
        </dl>
      </div>
    </header>
  );
}
