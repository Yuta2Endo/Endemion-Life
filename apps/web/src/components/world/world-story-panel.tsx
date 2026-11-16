"use client";

import type { SeasonStoryView, UniverseId } from "@endemion/game-core";
import { Panel, Tag } from "@endemion/ui";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useI18n } from "../locale-provider";

/** R5.12: четыре главы общего сезона, выведенные из целей мира */
export function WorldStoryPanel({ universeId }: { universeId: UniverseId }) {
  const { l, t } = useI18n();
  const [story, setStory] = useState<SeasonStoryView | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<SeasonStoryView>(`/api/world/${universeId}/story`).then(
      (view) => {
        if (!active) return;
        setStory(view);
        setFailed(false);
      },
      () => {
        if (active) setFailed(true);
      }
    );
    return () => {
      active = false;
    };
  }, [universeId]);

  if (failed) return <p className="text-xs text-bone-500" data-testid="world-story-error">{t("world.story.error")}</p>;
  if (!story) return <div className="h-24 animate-pulse rounded-md border border-line bg-ink-950/40" aria-busy="true" aria-label={t("world.story.eyebrow")} />;

  return (
    <Panel className="space-y-4" data-testid="world-story">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="eyebrow text-gold-300">{t("world.story.eyebrow")}</p>
          <h3 className="mt-1 break-words font-display text-xl text-bone-100">{l(story.title)}</h3>
          <p className="mt-1 max-w-2xl text-sm text-bone-300">{l(story.lead)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Tag tone="gold">{t("world.story.season", { n: story.season })}</Tag>
          <Tag tone={story.completed ? "good" : "neutral"}>{t("world.story.progress", { n: story.progress })}</Tag>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-950 ring-1 ring-line" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={story.progress} aria-label={t("world.story.progress", { n: story.progress })}>
        <div className="h-full rounded-full bg-gold-500/70" style={{ width: `${Math.max(0, Math.min(100, story.progress))}%` }} />
      </div>
      <ol className="space-y-3">
        {story.chapters.map((chapter, index) => (
          <li key={chapter.id} className={`border-l-2 pl-3 ${chapter.status === "done" ? "border-jade-400/70" : chapter.status === "active" ? "border-gold-400/80" : "border-line"}`} data-testid="world-story-chapter" data-status={chapter.status}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-bone-100">
                <span className="mr-2 text-[10px] tabular-nums text-bone-500">{index + 1}.</span>
                {l(chapter.title)}
              </p>
              <Tag tone={chapter.status === "done" ? "good" : chapter.status === "active" ? "gold" : "neutral"}>
                {chapter.status === "done" ? t("world.story.done") : chapter.status === "active" ? t("world.story.active") : t("world.story.locked")}
              </Tag>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-bone-400">{l(chapter.text)}</p>
            <p className="mt-1 text-[11px] text-bone-500">{l(chapter.goalTitle)} · {chapter.progress}%</p>
            {chapter.status === "done" && <p className="mt-1 text-xs text-jade-300">{l(chapter.epilogue)}</p>}
          </li>
        ))}
      </ol>
      {story.completed && <p className="text-sm text-gold-200" data-testid="world-story-complete">{t("world.story.completed")}</p>}
    </Panel>
  );
}
