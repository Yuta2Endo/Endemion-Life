"use client";

import type { EventView, HistoryEntry, UniverseId } from "@endemion/game-core";
import { Ornament, Panel } from "@endemion/ui";
import { ageLabel, type PeopleNames } from "@/lib/format";
import { ChangeChips } from "../change-chips";
import { useI18n } from "../locale-provider";

/** Событие, на которое нужно ответить: текст и варианты с шансом успеха или причиной блокировки */
export function EventCard({ event, busy, onChoose }: { event: EventView; busy: boolean; onChoose: (choiceId: string) => void }) {
  const { locale, l, t } = useI18n();
  return (
    <Panel accent className="animate-rise" data-testid="event-card">
      <p className="text-[11px] uppercase tracking-[0.3em] text-gold-400">{ageLabel(event.age, locale)}</p>
      <h2 className="mt-1 font-display text-2xl leading-tight text-gilded sm:mt-2 sm:text-3xl" data-testid="event-title">
        {l(event.title)}
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2 sm:hidden">
        {event.choices.map((choice) => (
          <li key={choice.id} className={`text-[11px] ${choice.available ? "text-jade-300" : "text-blood-300"}`}>
            {choice.chance !== null ? t("play.chance", { n: Math.round(choice.chance * 100) }) : choice.locked.map(l).join(" · ") || t("play.locked")}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-base leading-relaxed text-bone-100">{l(event.text)}</p>
      <p className="mt-2 text-xs text-bone-400">{event.scheduled ? t("play.scheduled") : t("play.thisYear")}</p>
      <Ornament className="my-4 sm:my-6" />
      <h3 className="mb-3 text-[11px] uppercase tracking-[0.22em] text-bone-500">{t("play.choose")}</h3>
      <ul className="space-y-2.5">
        {event.choices.map((choice) => (
          <li key={choice.id}>
            <button
              type="button"
              disabled={!choice.available || busy}
              onClick={() => onChoose(choice.id)}
              className={`group flex w-full items-start justify-between gap-4 rounded-lg border px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-gold-300 disabled:cursor-not-allowed ${
                choice.available
                  ? "border-line bg-ink-950/60 enabled:hover:border-gold-400/70 enabled:hover:bg-gold-500/5"
                  : "border-line/80 bg-ink-950/40"
              }`}
              data-testid="choice"
              data-choice={choice.id}
              data-available={choice.available}
            >
              <span>
                <span className={`block text-sm transition ${choice.available ? "text-bone-100 group-enabled:group-hover:text-gold-100" : "text-bone-300"}`}>{l(choice.text)}</span>
                {choice.available && choice.touches.length > 0 && (
                  <span className="mt-1 block text-xs text-bone-400">{choice.touches.map((touch) => t(`play.touch.${touch}`)).join(" · ")}</span>
                )}
                {!choice.available && <span className="mt-1 block text-xs font-medium text-blood-300">{choice.locked.map(l).join(" · ")}</span>}
              </span>
              {choice.chance !== null && (
                <span
                  className={`shrink-0 rounded border px-2 py-0.5 text-[11px] tabular-nums ${
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

/** Итог последнего решения: что выбрано, прошла ли проверка и что изменилось */
export function OutcomeCard({ entry, universeId, people }: { entry: HistoryEntry; universeId: UniverseId; people?: PeopleNames }) {
  const { l, t } = useI18n();
  return (
    <Panel className="animate-rise" data-testid="outcome" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("play.outcome")}</h3>
        {entry.check && (
          <span className={`text-xs ${entry.check.success ? "text-jade-300" : "text-blood-300"}`}>
            {entry.check.success ? t("play.success") : t("play.failure")} · {Math.round(entry.check.chance * 100)}%
            <span aria-hidden="true">{entry.check.success ? " +" : " −"}</span>
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-xl text-bone-100">{l(entry.title)}</p>
      {entry.choice && <p className="mt-1 text-sm text-bone-500">→ {l(entry.choice)}</p>}
      {entry.outcome && <p className="mt-3 leading-relaxed text-bone-100">{l(entry.outcome)}</p>}
      <div className="mt-3">
        <ChangeChips changes={entry.changes} universeId={universeId} people={people} />
      </div>
    </Panel>
  );
}
