"use client";

// Stage 02.5: выбор уклада детства и распределение очков развития.
// Ограничения проверяем здесь для понятной подсказки, сервер проверяет их повторно.
import {
  POINT_BUY_PER_STAT,
  POINT_BUY_TOTAL,
  STAT_INFO,
  STAT_KEYS,
  entriesOf,
  pointBuyTotal,
  type StatKey,
  type StatMods,
  type StatPointAllocation,
  type UpbringingView
} from "@endemion/game-core";
import { useI18n } from "./locale-provider";

function ModsLine({ mods }: { mods: StatMods }) {
  const { locale } = useI18n();
  const entries = entriesOf(mods).filter(([, delta]) => delta !== 0);
  if (entries.length === 0) return null;
  return (
    <span className="mt-2 block text-xs tabular-nums text-bone-500">
      {entries.map(([key, delta]) => `${STAT_INFO[key].short[locale]} ${delta > 0 ? "+" : ""}${delta}`).join(" · ")}
    </span>
  );
}

/** Карточка уклада: выбор через radio, вся карточка кликабельна */
function UpbringingCard({ item, checked, onSelect }: { item: UpbringingView; checked: boolean; onSelect: () => void }) {
  const { l, t } = useI18n();
  return (
    <label
      className={`relative flex cursor-pointer flex-col border p-4 transition focus-within:outline-2 focus-within:outline-gold-300 ${
        checked ? "border-gold-400 bg-gold-500/10" : "border-line bg-ink-900 hover:border-bone-500"
      }`}
      data-upbringing={item.id}
    >
      <input type="radio" name="upbringing" className="sr-only" checked={checked} onChange={onSelect} />
      <span className={`block text-sm font-medium ${checked ? "text-gold-100" : "text-bone-100"}`}>{l(item.name)}</span>
      <span className="mt-1.5 block text-xs leading-relaxed text-bone-400">{l(item.description)}</span>
      <ModsLine mods={item.statMods} />
      {item.skills.length > 0 && (
        <span className="mt-2 block text-xs text-bone-400">
          <span className="text-bone-500">{t("create.skills")}:</span>{" "}
          {item.skills.map((skill) => `${l(skill.name)} +${skill.amount}`).join(" · ")}
        </span>
      )}
      {item.talent && (
        <span className="mt-1 block text-xs text-gold-300" data-testid="upbringing-talent">
          <span className="text-bone-500">{t("create.talent")}:</span> {l(item.talent.name)}
        </span>
      )}
    </label>
  );
}

export interface CreationChoicesProps {
  upbringings: readonly UpbringingView[];
  upbringingId: string | null;
  onUpbringing: (id: string | null) => void;
  points: StatPointAllocation;
  onPoint: (key: StatKey, delta: 1 | -1) => void;
  total?: number;
  perStat?: number;
}

/** Уклад и очки развития. Числа остаются текстом: подписи и значения не зависят от картинок. */
export function CreationChoices({ upbringings, upbringingId, onUpbringing, points, onPoint, total = POINT_BUY_TOTAL, perStat = POINT_BUY_PER_STAT }: CreationChoicesProps) {
  const { l, t } = useI18n();
  const spent = pointBuyTotal(points);
  const left = Math.max(0, total - spent);

  return (
    <div className="space-y-8" data-testid="creation-choices">
      <fieldset data-testid="upbringing-picker">
        <legend className="mb-1 text-sm font-medium text-bone-200">{t("create.upbringing")}</legend>
        <p className="mb-4 max-w-xl text-xs leading-relaxed text-bone-500">{t("create.upbringingHint")}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label
            className={`relative flex cursor-pointer flex-col border p-4 transition focus-within:outline-2 focus-within:outline-gold-300 ${
              upbringingId === null ? "border-gold-400 bg-gold-500/10" : "border-line bg-ink-900 hover:border-bone-500"
            }`}
            data-upbringing="random"
          >
            <input type="radio" name="upbringing" className="sr-only" checked={upbringingId === null} onChange={() => onUpbringing(null)} />
            <span className={`block text-sm font-medium ${upbringingId === null ? "text-gold-100" : "text-bone-100"}`}>✦ {t("create.random")}</span>
            <span className="mt-1.5 block text-xs leading-relaxed text-bone-400">{t("create.upbringingRandom")}</span>
          </label>
          {upbringings.map((item) => (
            <UpbringingCard key={item.id} item={item} checked={upbringingId === item.id} onSelect={() => onUpbringing(item.id)} />
          ))}
        </div>
      </fieldset>

      <fieldset data-testid="stat-focus">
        <legend className="mb-1 text-sm font-medium text-bone-200">{t("create.focus")}</legend>
        <p className="mb-2 max-w-xl text-xs leading-relaxed text-bone-500">{t("create.focusHint", { n: total, per: perStat })}</p>
        <p className="mb-4 text-sm tabular-nums text-gold-300" aria-live="polite" data-testid="points-left" data-points-left={left}>
          {t("create.pointsLeft", { n: left, total })}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {STAT_KEYS.map((key) => {
            const value = points[key] ?? 0;
            const name = l(STAT_INFO[key].name);
            return (
              <div key={key} className="flex min-h-14 items-center justify-between gap-3 border border-line bg-ink-900 px-3 py-2" data-stat-focus={key}>
                <span className="min-w-0 text-sm text-bone-200">{name}</span>
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center border border-line text-base text-bone-200 transition enabled:hover:border-gold-400 enabled:hover:text-gold-100 focus-visible:outline-2 focus-visible:outline-gold-300 disabled:opacity-35"
                    aria-label={t("create.removePoint", { name })}
                    disabled={value === 0}
                    onClick={() => onPoint(key, -1)}
                    data-testid={`point-minus-${key}`}
                  >
                    <span aria-hidden="true">−</span>
                  </button>
                  <span className="w-7 text-center text-sm tabular-nums text-gold-200" data-point-value={value}>
                    {value}
                  </span>
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center border border-line text-base text-bone-200 transition enabled:hover:border-gold-400 enabled:hover:text-gold-100 focus-visible:outline-2 focus-visible:outline-gold-300 disabled:opacity-35"
                    aria-label={t("create.addPoint", { name })}
                    disabled={left === 0 || value >= perStat}
                    onClick={() => onPoint(key, 1)}
                    data-testid={`point-plus-${key}`}
                  >
                    <span aria-hidden="true">+</span>
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
