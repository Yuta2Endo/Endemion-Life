"use client";

import { toLifeChronicle, type HistoryEntry, type UniverseId } from "@endemion/game-core";
import { Button, Panel } from "@endemion/ui";
import { ageLabel, visibleChanges, type PeopleNames } from "@/lib/format";
import { ChangeChips } from "../change-chips";
import { useI18n } from "../locale-provider";

const KIND_MARK: Readonly<Record<HistoryEntry["kind"], string>> = {
  birth: "✦",
  year: "·",
  event: "◆",
  death: "✝",
  restore: "↺",
  consequence: "⧗",
  quest: "✧",
  people: "♦",
  legacy: "❖",
  import: "⇪",
  market: "⚖",
  adventure: "➤"
};

/** Хроника жизни: от новых записей к старым, с решениями и их последствиями */
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
    <Panel className="flex max-h-[calc(100dvh-8rem)] flex-col" data-testid="timeline">
      <h2 className="mb-4 font-display text-2xl text-bone-100">{t("play.timeline")}</h2>
      <ol className="scroll-thin -mr-2 flex-1 space-y-4 overflow-y-auto pr-2">
        {chronicle.length === 0 && <li className="text-sm text-bone-500">{t("play.timelineEmpty")}</li>}
        {[...chronicle].reverse().map((item) => {
          const entry = item.source;
          const quiet = entry.kind === "year";
          const changes = visibleChanges(entry.changes, quiet ? "year" : "other");
          return (
            <li key={entry.seq} className={`relative border-l border-line pl-4 ${selectedSeq === entry.seq ? "border-gold-400 bg-gold-500/5" : ""}`} data-testid="timeline-entry" data-kind={entry.kind}>
              <span
                className={`absolute -left-[5px] top-1 flex h-2.5 w-2.5 items-center justify-center text-[10px] leading-none ${
                  entry.kind === "event" || entry.kind === "quest" || entry.kind === "legacy" ? "text-gold-400" : entry.kind === "consequence" ? "text-azure-400" : entry.kind === "death" ? "text-blood-400" : "text-bone-500"
                }`}
                aria-hidden="true"
              >
                {KIND_MARK[entry.kind]}
              </span>
              <button type="button" className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300" onClick={() => onSelect?.(entry.seq)} aria-current={selectedSeq === entry.seq ? "true" : undefined} aria-label={`${t("play.inspect")}: ${l(entry.title)}`}>
              <p className="text-[10px] uppercase tracking-[0.2em] text-bone-500">{ageLabel(entry.age, locale)} · {t(`chronicle.category.${item.category}` as never)}</p>
              {!quiet && <p className="font-display text-lg leading-snug text-bone-100">{l(entry.title)}</p>}
              <p className={`text-sm leading-relaxed ${quiet ? "text-bone-500" : "text-bone-300"}`}>{l((entry.kind === "event" || entry.kind === "people" || entry.kind === "legacy") && entry.outcome ? entry.outcome : entry.text)}</p>
              {entry.choice && (
                <p className="mt-1 text-xs text-gold-300" data-testid="decision">
                  {t("play.decision")}: {l(entry.choice)}
                  {entry.check && <span className={entry.check.success ? "text-jade-300" : "text-blood-300"}> · {entry.check.success ? t("play.success") : t("play.failure")}</span>}
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
