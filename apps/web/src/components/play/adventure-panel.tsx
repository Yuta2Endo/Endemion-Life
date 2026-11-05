"use client";

import type { LifeView } from "@endemion/shared";
import { Button } from "@endemion/ui";
import { ageLabel } from "@/lib/format";
import type { MessageKey } from "@/lib/messages";
import { useI18n } from "../locale-provider";

const BLOCK = {
  pending: "adventure.blockPending",
  active: "adventure.blockActive",
  age: "adventure.blockAge",
  place: "adventure.blockPlace",
  requires: "adventure.blockRequires",
  done: "adventure.blockDone",
  failed: "adventure.blockFailed"
} as const satisfies Record<string, MessageKey>;

const LOG = {
  discover: "adventure.log.discover",
  begin: "adventure.log.begin",
  step: "adventure.log.step",
  complete: "adventure.log.complete",
  fail: "adventure.log.fail",
  abandon: "adventure.log.abandon"
} as const satisfies Record<string, MessageKey>;

/**
 * Stage 05: места и приключения. Клиент отправляет только намерение — начать, выбрать вариант, сдаться.
 * Исход и награду считает сервер
 */
export function AdventurePanel({
  life,
  busy,
  onBegin,
  onChoose,
  onAbandon
}: {
  life: LifeView;
  busy: boolean;
  onBegin: (adventureId: string) => void;
  onChoose: (choiceId: string) => void;
  onAbandon: () => void;
}) {
  const { locale, l, t } = useI18n();
  const board = life.adventure;
  const dead = life.status === "dead";
  const current = board.current;
  return (
    <div className="space-y-5" data-testid="adventure">
      <div>
        <h3 className="text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("adventure.places")}</h3>
        <p className="mt-1 text-xs text-bone-500" data-testid="adventure-progress">
          {t("adventure.progress", { found: board.discovered, total: board.placesTotal, done: board.completed })}
        </p>
        <ul className="mt-2 space-y-1.5">
          {board.places.map((place) => (
            <li key={place.id} className="rounded-md border border-line bg-ink-950/50 px-3 py-2" data-testid="place" data-place={place.id} data-discovered={place.discovered}>
              {place.discovered ? (
                <>
                  <p className="text-sm text-bone-100">{place.name ? l(place.name) : ""}</p>
                  <p className="text-xs text-bone-400">{place.text ? l(place.text) : ""}</p>
                </>
              ) : (
                <p className="text-xs text-bone-500">{t("adventure.unknown", { age: ageLabel(place.minAge, locale) })}</p>
              )}
            </li>
          ))}
        </ul>
      </div>

      {current ? (
        <div className="space-y-3" data-testid="adventure-current" data-adventure={current.id}>
          <h3 className="text-[11px] uppercase tracking-[0.22em] text-gold-400">{l(current.name)}</h3>
          <p className="text-sm text-bone-100">{l(current.step.text)}</p>
          <ul className="space-y-2">
            {current.step.choices.map((choice) => (
              <li key={choice.id}>
                <Button
                  onClick={() => onChoose(choice.id)}
                  disabled={busy || dead || !choice.available}
                  aria-label={l(choice.text)}
                  data-testid="adventure-choice"
                  data-choice={choice.id}
                >
                  {l(choice.text)}
                  {choice.chance !== null && <span className="ml-1 tabular-nums text-bone-400">{Math.round(choice.chance * 100)}%</span>}
                </Button>
                {choice.rewards.length > 0 && (
                  <p className="mt-1 text-xs text-jade-300" data-testid="adventure-reward">
                    {t("adventure.reward")} {choice.rewards.map((reward) => l(reward.text)).join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <Button variant="quiet" onClick={onAbandon} disabled={busy || dead} data-testid="adventure-abandon">
            {t("adventure.abandon")}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("adventure.available")}</h3>
          {board.adventures.length === 0 && <p className="text-xs text-bone-500">{t("adventure.none")}</p>}
          <ul className="space-y-2">
            {board.adventures.map((adventure) => {
              const open = adventure.blocked === null && !dead;
              const reason = adventure.blocked === "age" ? t("adventure.blockAge", { age: ageLabel(adventure.minAge, locale) }) : adventure.blocked ? t(BLOCK[adventure.blocked]) : null;
              return (
                <li key={adventure.id} className="rounded-md border border-line bg-ink-950/50 p-3" data-testid="adventure-card" data-adventure={adventure.id} data-open={open}>
                  <p className="text-sm text-bone-100">{l(adventure.name)}</p>
                  <p className="mt-1 text-xs text-bone-400">{l(adventure.text)}</p>
                  {adventure.rewards.length > 0 && (
                    <p className="mt-1 text-xs text-jade-300">
                      {t("adventure.reward")} {adventure.rewards.map((reward) => l(reward.text)).join(", ")}
                    </p>
                  )}
                  {open ? (
                    <Button className="mt-2" onClick={() => onBegin(adventure.id)} disabled={busy} data-testid="adventure-begin">
                      {t("adventure.begin")}
                    </Button>
                  ) : (
                    reason && (
                      <p className="mt-2 text-xs text-bone-500" data-testid="adventure-closed">
                        {reason}
                      </p>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {board.log.length > 0 && (
        <div>
          <h3 className="mb-1 text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("adventure.log")}</h3>
          <ul className="space-y-1" data-testid="adventure-log">
            {board.log.map((entry, index) => (
              <li key={`${entry.age}-${entry.kind}-${index}`} className="text-xs text-bone-400">
                <span className="text-bone-500">{ageLabel(entry.age, locale)}</span> · {t(LOG[entry.kind])} · {l(entry.name)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
