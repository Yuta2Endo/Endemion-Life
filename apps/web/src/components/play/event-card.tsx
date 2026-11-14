"use client";

import type { EventView, HistoryEntry, UniverseId } from "@endemion/game-core";
import { Panel } from "@endemion/ui";
import { ageLabel, type PeopleNames } from "@/lib/format";
import { ChangeChips } from "../change-chips";
import { useI18n } from "../locale-provider";

/** Событие как сцена: возраст, сцена, затем выбор. */
export function EventCard({ event, busy, onChoose }: { event: EventView; busy: boolean; onChoose: (choiceId: string) => void }) {
  const { locale, l, t } = useI18n();
  return (
    <Panel accent className="animate-rise" data-testid="event-card">
      <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="eyebrow text-gold-300" data-testid="event-kind">
            {event.isMilestone ? t("play.milestone") : t("play.tabEvent")}
          </p>
          <p className="mt-1 text-sm text-bone-400">{event.scheduled ? t("play.scheduled") : t("play.thisYear")}</p>
        </div>
        <div className="text-right">
          <span className="font-display text-3xl leading-none tabular-nums text-gold-200">{event.age}</span>
          <span className="mt-1 block text-[10px] text-bone-600">{t("play.yearShort")}</span>
        </div>
      </div>

      <h2 className="mt-5 font-display text-3xl leading-tight text-bone-100 sm:text-4xl" data-testid="event-title">
        {l(event.title)}
      </h2>
      <p className="mt-3 max-w-[62ch] text-base leading-relaxed text-bone-100">{l(event.text)}</p>
      <p className="mt-3 text-xs text-bone-500">{ageLabel(event.age, locale)}</p>

      <h3 className="mt-6 border-t border-line pt-4 text-sm text-bone-300">{t("play.choose")}</h3>
      <ul className="mt-2.5 space-y-2">
        {event.choices.map((choice, index) => (
          <li key={choice.id}>
            <button
              type="button"
              disabled={!choice.available || busy}
              onClick={() => onChoose(choice.id)}
              className={`group flex w-full items-start justify-between gap-4 border px-3 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-gold-300 disabled:cursor-not-allowed sm:px-4 ${
                choice.available
                  ? "border-line bg-ink-950/50 enabled:hover:border-gold-500/60 enabled:hover:bg-gold-500/[0.04]"
                  : "border-line/70 bg-ink-950/30"
              }`}
              data-testid="choice"
              data-choice={choice.id}
              data-available={choice.available}
            >
              <span className="flex min-w-0 gap-3">
                <span className={`mt-0.5 font-display text-sm tabular-nums ${choice.available ? "text-gold-400" : "text-bone-600"}`} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className={`block text-sm transition ${choice.available ? "text-bone-100 group-enabled:group-hover:text-gold-100" : "text-bone-300"}`}>{l(choice.text)}</span>
                  {choice.available && choice.touches.length > 0 && (
                    <span className="mt-1 block text-xs text-bone-400">{choice.touches.map((touch) => t(`play.touch.${touch}`)).join(" · ")}</span>
                  )}
                  {!choice.available && <span className="mt-1 block text-xs font-medium text-blood-300">{choice.locked.map(l).join(" · ")}</span>}
                </span>
              </span>
              {choice.chance !== null && (
                <span
                  className={`shrink-0 border px-2 py-0.5 text-[11px] tabular-nums ${
                    choice.chance >= 0.65 ? "border-jade-500/40 text-jade-300" : choice.chance >= 0.35 ? "border-gold-500/40 text-gold-200" : "border-blood-500/40 text-blood-300"
                  }`}
                >
                  {t("play.chance", { n: Math.round(choice.chance * 100) })}
                </span>
              )}
              {!choice.available && choice.chance === null && <span className="shrink-0 text-[11px] text-bone-500">{t("play.locked")}</span>}
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** Итог после действия: что изменилось. */
export function OutcomeCard({ entry, universeId, people }: { entry: HistoryEntry; universeId: UniverseId; people?: PeopleNames }) {
  const { l, t } = useI18n();
  return (
    <Panel className="animate-rise" data-testid="outcome" aria-live="polite">
      <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
        <h3 className="text-sm text-gold-300">{t("play.outcome")}</h3>
        {entry.check && (
          <span className={`text-xs ${entry.check.success ? "text-jade-300" : "text-blood-300"}`}>
            {entry.check.success ? t("play.success") : t("play.failure")} · {Math.round(entry.check.chance * 100)}%
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-2xl text-bone-100">{l(entry.title)}</p>
      {entry.choice && <p className="mt-1 text-sm text-bone-500">→ {l(entry.choice)}</p>}
      {(entry.outcome ?? entry.text) && <p className="mt-3 leading-relaxed text-bone-100">{l(entry.outcome ?? entry.text)}</p>}
      <div className="mt-4 border-t border-line pt-3">
        <ChangeChips changes={entry.changes} universeId={universeId} people={people} />
      </div>
    </Panel>
  );
}
