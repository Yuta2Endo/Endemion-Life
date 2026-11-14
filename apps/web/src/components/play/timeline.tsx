"use client";

import { toLifeChronicle, type HistoryEntry, type UniverseId } from "@endemion/game-core";
import { Button, Panel } from "@endemion/ui";
import { ageLabel, visibleChanges, type PeopleNames } from "@/lib/format";
import { ChangeChips } from "../change-chips";
import { useI18n } from "../locale-provider";

const KIND_MARK: Readonly<Record<HistoryEntry["kind"], string>> = {
  birth: "◇",
  year: "·",
  event: "◆",
  death: "†",
  restore: "↺",
  consequence: "↳",
  quest: "◇",
  people: "·",
  legacy: "◆",
  import: "↺",
  market: "·",
  adventure: "◇",
  travel: "→"
};

/** Хроника-позвоночник: год слева, решение и следствие справа. */
export function Timeline({
  entries,
  universeId,
  people,
  canLoadMore,
  loadingMore,
  onLoadMore,
  onSelect,
  selectedSeq
}: {
  entries: HistoryEntry[];
  universeId: UniverseId;
  people?: PeopleNames;
  canLoadMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onSelect?: (seq: number) => void;
  selectedSeq?: number | null;
}) {
  const { locale, l, t } = useI18n();
  const chronicle = toLifeChronicle(entries, universeId, "self");

  return (
    <Panel tone="quiet" className="flex max-h-[calc(100dvh-8rem)] flex-col" data-testid="timeline">
      <header className="mb-4 border-b border-line pb-3">
        <p className="eyebrow text-gold-300">{t("play.timeline")}</p>
        <h2 className="mt-1 font-display text-2xl leading-tight text-bone-100">{t("play.timeline")}</h2>
      </header>

      <ol className="scroll-thin -mr-2 flex-1 overflow-y-auto pr-2">
        {chronicle.length === 0 && <li className="py-8 text-center text-sm text-bone-500">{t("play.timelineEmpty")}</li>}
        {[...chronicle].reverse().map((item) => {
          const entry = item.source;
          const quiet = entry.kind === "year";
          const changes = visibleChanges(entry.changes, quiet ? "year" : "other");
          const selected = selectedSeq === entry.seq;
          return (
            <li key={entry.seq} className="grid grid-cols-[40px_minmax(0,1fr)] gap-3" data-testid="timeline-entry" data-kind={entry.kind}>
              <div className="pt-0.5 text-right">
                <span className={`font-display text-xl leading-none tabular-nums transition-colors ${selected ? "text-gold-200" : "text-bone-300"}`}>{entry.age}</span>
                <span className="mt-1 block text-[10px] text-bone-600">{t("play.yearShort")}</span>
              </div>
              <button
                type="button"
                className={`relative border-l pb-5 pl-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 ${
                  selected ? "border-gold-500/70 bg-gold-500/[0.04]" : "border-line hover:border-bone-500"
                }`}
                onClick={() => onSelect?.(entry.seq)}
                aria-current={selected ? "true" : undefined}
                aria-label={`${t("play.inspect")}: ${l(entry.title)}`}
              >
                <span
                  className={`absolute -left-[4px] top-1 flex h-2 w-2 items-center justify-center rounded-full transition-transform duration-200 ${
                    selected ? "scale-125 " : ""
                  }${
                    entry.kind === "event" || entry.kind === "quest" || entry.kind === "legacy"
                      ? "bg-gold-400"
                      : entry.kind === "consequence"
                        ? "bg-azure-400"
                        : entry.kind === "death"
                          ? "bg-blood-400"
                          : "bg-ink-600"
                  }`}
                  aria-hidden="true"
                >
                  <span className="sr-only">{KIND_MARK[entry.kind]}</span>
                </span>
                <p className="text-[11px] text-bone-500">
                  {ageLabel(entry.age, locale)}
                  <span className="text-bone-600"> · </span>
                  {t(`chronicle.category.${item.category}` as never)}
                </p>
                {!quiet && <p className="mt-0.5 font-display text-lg leading-snug text-bone-100">{l(entry.title)}</p>}
                <p className={`mt-0.5 text-sm leading-relaxed ${quiet ? "text-bone-500" : "text-bone-300"}`}>
                  {l((entry.kind === "event" || entry.kind === "people" || entry.kind === "legacy") && entry.outcome ? entry.outcome : entry.text)}
                </p>
                {entry.choice && (
                  <p className="mt-1 text-xs text-gold-300" data-testid="decision">
                    {t("play.decision")}: {l(entry.choice)}
                    {entry.check && <span className={entry.check.success ? "text-jade-300" : "text-blood-300"}> · {entry.check.success ? t("play.success") : t("play.failure")}</span>}
                  </p>
                )}
                {entry.kind === "consequence" && item.consequenceOf && (
                  <p className="mt-1 text-xs text-azure-300" data-testid="consequence-provenance">
                    {t("play.consequenceFrom")}: {item.consequenceOf}
                  </p>
                )}
                {changes.length > 0 && (
                  <div className="mt-2">
                    <ChangeChips changes={changes} universeId={universeId} people={people} />
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      {canLoadMore && (
        <Button variant="quiet" className="mt-3" onClick={onLoadMore} disabled={loadingMore}>
          {t("play.loadEarlier")}
        </Button>
      )}
    </Panel>
  );
}
