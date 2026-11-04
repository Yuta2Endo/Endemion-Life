"use client";

import type { LifeView } from "@endemion/shared";
import { Ornament } from "@endemion/ui";
import { ageLabel } from "@/lib/format";
import { useI18n } from "../locale-provider";

function Amount({ value }: { value: number }) {
  const tone = value > 0 ? "text-jade-300" : value < 0 ? "text-blood-300" : "text-bone-300";
  return <span className={`tabular-nums ${tone}`}>{value > 0 ? `+${value}` : value}</span>;
}

const CYCLE_TONE = { slump: "border-blood-500/40 bg-blood-600/10 text-blood-200", normal: "border-line bg-ink-950/60 text-bone-200", boom: "border-jade-500/40 bg-jade-600/10 text-jade-200" } as const;

/**
 * Stage 04: хозяйство персонажа — золото, состояние экономики мира, доходы и расходы последнего прожитого года,
 * налог и стоимость жизни, нехватка денег. Все суммы считает сервер; здесь только показ
 */
export function EconomyPanel({ life }: { life: LifeView }) {
  const { locale, l, t } = useI18n();
  const e = life.economy;
  const last = e.last;
  return (
    <div className="space-y-5" data-testid="dossier-economy">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-bone-500">{t("economy.wealth")}</p>
          <p className="font-display text-3xl text-gold-200 tabular-nums" data-testid="economy-wealth">
            {life.character.wealth}
          </p>
        </div>
        <div className={`rounded-md border px-3 py-2 text-right ${CYCLE_TONE[e.cycle]}`} data-testid="economy-cycle" data-cycle={e.cycle}>
          <p className="text-[10px] uppercase tracking-wider opacity-80">{t("economy.cycle")}</p>
          <p className="text-sm font-medium">{l(e.cycleName)}</p>
          <p className="text-[11px] opacity-80">{e.cycleYears > 0 ? t("economy.cycleYears", { n: e.cycleYears }) : t("economy.cycleNew")}</p>
        </div>
      </div>
      <p className="text-xs text-bone-400">{l(e.cycleDescription)}</p>

      {e.hardship > 0 && (
        <p className="rounded-md border border-blood-500/40 bg-blood-600/10 px-3 py-2 text-sm text-blood-200" role="status" data-testid="economy-hardship" data-years={e.hardship}>
          {e.hardshipPenalty ? t("economy.hardshipPenalty", { n: e.hardship }) : t("economy.hardship", { n: e.hardship })}
        </p>
      )}

      <Ornament />
      <div>
        <h3 className="mb-2 text-[11px] uppercase tracking-[0.22em] text-gold-400">{last ? t("economy.lastYear", { age: ageLabel(last.age, locale) }) : t("economy.lastYearTitle")}</h3>
        {last ? (
          <>
            <table className="w-full text-sm" data-testid="economy-lines">
              <caption className="sr-only">{t("economy.lastYearTitle")}</caption>
              <tbody>
                {last.lines.map((line) => (
                  <tr key={line.id} className="border-b border-line/40 last:border-0" data-line={line.id} data-amount={line.amount}>
                    <th scope="row" className="py-1.5 pr-3 text-left font-normal text-bone-300">
                      {l(line.name)}
                    </th>
                    <td className="py-1.5 text-right">
                      <Amount value={line.amount} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line">
                  <th scope="row" className="pt-2 pr-3 text-left font-medium text-bone-100">
                    {t("economy.net")}
                  </th>
                  <td className="pt-2 text-right font-medium" data-testid="economy-net" data-value={last.net}>
                    <Amount value={last.net} />
                  </td>
                </tr>
              </tfoot>
            </table>
            {last.shortfall > 0 && <p className="mt-2 text-xs text-blood-300">{t("economy.shortfall", { n: last.shortfall })}</p>}
          </>
        ) : (
          <p className="text-xs text-bone-500" data-testid="economy-empty">
            {life.life.age < e.adultAge ? t("economy.emptyChild", { age: e.adultAge }) : t("economy.empty")}
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-md border border-line bg-ink-950/50 p-2">
          <dt className="text-[10px] uppercase tracking-wider text-bone-500">{l(e.taxName)}</dt>
          <dd className="font-display text-lg text-bone-100">{e.taxPercent}%</dd>
        </div>
        <div className="rounded-md border border-line bg-ink-950/50 p-2">
          <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("economy.living")}</dt>
          <dd className="font-display text-lg text-bone-100" data-testid="economy-living">
            {life.life.age < e.adultAge ? t("economy.livingFrom", { age: e.adultAge }) : t("economy.perYear", { n: e.livingCost })}
          </dd>
        </div>
      </dl>

      {e.years.length > 1 && (
        <div>
          <h3 className="mb-2 text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("economy.history")}</h3>
          <ul className="space-y-1 text-xs" data-testid="economy-years">
            {[...e.years].reverse().map((y) => (
              <li key={y.age} className="flex justify-between gap-3 text-bone-300">
                <span>{ageLabel(y.age, locale)}</span>
                <span className="tabular-nums">
                  <span className="text-jade-300">+{y.income}</span> / <span className="text-blood-300">−{y.expenses}</span>
                  {y.shortfall > 0 && <span className="ml-2 text-blood-400">{t("economy.short", { n: y.shortfall })}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
