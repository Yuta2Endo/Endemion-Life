"use client";

import { getUniverse } from "@endemion/game-core";
import type { LifeView } from "@endemion/shared";
import { ageLabel } from "@/lib/format";
import { useI18n } from "../locale-provider";

/** Сводка из живого состояния: задание, дорога, ранг, край и один следующий шаг */
export function NowPanel({ life, onJump }: { life: LifeView; onJump?: (where: "event" | "adventure") => void }) {
  const { locale, l, t } = useI18n();
  const dead = life.status === "dead";
  const event = life.pendingEvent;
  const quest = life.profile.quest;
  const board = life.adventure;
  const open = board.adventures.find((item) => item.blocked === null);
  const summary = life.summary;
  const lines: { text: string; jump?: "event" | "adventure" }[] = [];

  if (event) lines.push({ text: t("now.event", { name: l(event.title) }), jump: "event" });
  if (board.current) lines.push({ text: t("now.roadActive", { name: l(board.current.name) }), jump: "adventure" });
  else if (open) lines.push({ text: t("now.road", { name: l(open.name) }), jump: "adventure" });
  if (quest) lines.push({ text: `${t("now.quest", { name: l(quest.title) })} · ${t("now.questDeadline", { age: ageLabel(quest.deadline, locale) })}` });
  else if (life.profile.questsDone > 0) lines.push({ text: t("now.questsDone", { n: life.profile.questsDone }) });

  if (!dead && summary.trackOpen && summary.nextRankThreshold !== null) {
    const left = Math.max(0, summary.nextRankThreshold - life.character.track.points);
    lines.push({ text: t("now.rank", { name: l(summary.rankName), n: left }) });
  } else if (!dead && summary.trackOpen && summary.nextRankThreshold === null) {
    lines.push({ text: t("now.rankMax", { name: l(summary.rankName) }) });
  }
  if (life.region.strained) lines.push({ text: t("now.strain") });
  else if (life.region.prospering) lines.push({ text: t("now.prosper") });

  const next = dead ? t("now.nextDead") : event ? t("now.nextEvent") : board.current ? t("now.nextRoad") : t("now.nextYear");
  if (lines.length === 0 && !next) return null;

  return (
    <section className="rounded-lg border border-line bg-ink-900/70 px-4 py-3" data-testid="now-panel" aria-label={t("now.title")}>
      <h2 className="text-[11px] uppercase tracking-[0.22em] text-gold-300">
        {l(getUniverse(life.universeId).name)} · {ageLabel(life.life.age, locale)}
      </h2>
      {lines.length > 0 && (
        <ul className="mt-2 space-y-1">
          {lines.map((line) => (
            <li key={line.text} className="text-sm text-bone-100">
              {line.jump && onJump ? (
                <button type="button" className="text-left underline decoration-gold-500/40 underline-offset-2 hover:text-gold-100" onClick={() => onJump(line.jump!)}>
                  {line.text}
                </button>
              ) : (
                line.text
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-bone-300">{next}</p>
    </section>
  );
}
