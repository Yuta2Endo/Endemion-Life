"use client";

import type { LifeView } from "@endemion/shared";
import { Meter } from "@endemion/ui";
import { useI18n } from "../locale-provider";

function Money({ value }: { value: number }) {
  const tone = value > 0 ? "text-jade-300" : value < 0 ? "text-blood-300" : "text-bone-300";
  return <span className={`tabular-nums ${tone}`}>{value > 0 ? `+${value}` : value}</span>;
}

/** Stage 02.3: компактная панель жилья, дома и своего дела внутри досье */
export function EstatePanel({ life }: { life: LifeView }) {
  const { l, t } = useI18n();
  const household = life.household;
  const business = life.business;
  return (
    <div className="space-y-3" data-testid="estate">
      <h3 className="text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("estate.title")}</h3>

      <div className="rounded-md border border-line bg-ink-950/50 p-2.5" data-testid="household" data-residence={household.residence}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[10px] uppercase tracking-wider text-bone-500">{t("estate.household")}</p>
          <p className="text-sm text-bone-100" data-testid="household-residence">
            {l(household.residenceName)}
          </p>
        </div>
        {household.home ? (
          <>
            <p className="mt-1 text-xs text-bone-300" data-testid="household-home">
              {l(household.home.name)}
            </p>
            <p className="text-[11px] text-bone-500">
              {t("estate.quality", { n: household.home.quality })} · {t("estate.capacity", { n: household.home.capacity })}
              {household.crowded && ` · ${t("estate.crowded")}`}
            </p>
            {household.residence === "own" && (
              <div className="mt-1.5">
                <Meter label={t("estate.condition")} value={household.condition} max={100} tone={household.condition <= 25 ? "blood" : household.condition <= 50 ? "gold" : "jade"} caption={String(household.condition)} />
              </div>
            )}
            <p className="mt-1 text-[11px] text-bone-400" data-testid="household-costs">
              {household.residence === "rent"
                ? t("estate.rentCost", { n: household.rent })
                : `${t("estate.upkeepCost", { n: household.upkeep })} · ${t("estate.taxCost", { n: household.tax })}`}
            </p>
            {household.arrears > 0 && (
              <p className="mt-1 text-[11px] text-blood-300" data-testid="household-arrears">
                {t("estate.arrears", { n: household.arrears })}
              </p>
            )}
          </>
        ) : (
          <p className="mt-1 text-xs text-bone-500">{t("estate.noHome")}</p>
        )}
        <p className="mt-1 text-[11px] text-bone-500" data-testid="household-members">
          {household.members.length === 0
            ? t("estate.liveAlone")
            : `${t("estate.members")}: ${household.members.map((member) => `${member.name}${member.dependent ? ` (${t("estate.dependent")})` : ""}`).join(", ")}`}
        </p>
        {household.dependents > 0 && <p className="text-[11px] text-bone-500">{t("estate.dependents", { n: household.dependents })}</p>}
      </div>

      <div className="rounded-md border border-line bg-ink-950/50 p-2.5" data-testid="business" data-count={business.ventures.length}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[10px] uppercase tracking-wider text-bone-500">{t("estate.business")}</p>
          <p className="text-[11px] text-bone-500">{t("estate.businessSlots", { n: business.ventures.length, max: business.max })}</p>
        </div>
        {business.ventures.length === 0 ? (
          <p className="mt-1 text-xs text-bone-500" data-testid="business-empty">
            {t("estate.noBusiness")}
          </p>
        ) : (
          <ul className="mt-1 space-y-2">
            {business.ventures.map((venture) => (
              <li key={venture.id} className="border-t border-line/50 pt-1.5 first:border-0 first:pt-0" data-testid="business-venture" data-business={venture.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-xs text-bone-100">{l(venture.name)}</p>
                  <p className="text-[10px] text-bone-500">{t("estate.level", { n: venture.level, max: venture.maxLevel })}</p>
                </div>
                <p className="text-[11px] text-bone-400">
                  {t("estate.capital", { n: venture.capital })} · {t("estate.years", { n: venture.years })}
                </p>
                <p className="text-[11px] text-bone-400">
                  {t("estate.revenue", { n: venture.revenue })} · {t("estate.costs", { n: venture.costs })}
                </p>
                <p className="text-[11px]">
                  {t("estate.forecast")} <Money value={venture.net} />
                  {venture.lastNet !== null && (
                    <span className="ml-2 text-bone-500">
                      {t("estate.lastYear")} <Money value={venture.lastNet} />
                    </span>
                  )}
                </p>
                {venture.losses > 0 && <p className="text-[11px] text-blood-300">{t("estate.losses", { n: venture.losses })}</p>}
                <p className="text-[11px] text-bone-500">{t("estate.saleValue", { n: venture.saleValue })}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
