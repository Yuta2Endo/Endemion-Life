"use client";

import type { LifeView } from "@endemion/shared";
import { ageLabel } from "@/lib/format";
import { useI18n } from "../locale-provider";

/** Сводка из живого состояния: задание, дорога, ранг, край и один следующий шаг */
export function NowPanel({ life }: { life: LifeView }) {
  const { locale, l, t } = useI18n();
  const dead = life.status === "dead";
  const event = life.pendingEvent;
  const quest = life.profile.quest;
  const board = life.adventure;
  const open = board.adventures.find((item) => item.blocked === null);
  const summary = life.summary;
  const lines: string[] = [];

  if (event) lines.push(t("now.event", { name: l(event.title) }));
  if (board.current) lines.push(t("now.roadActive", { name: l(board.current.name) }));
  else if (open) lines.push(t("now.road", { name: l(open.name) }));
  if (quest) lines.push(`${t("now.quest", { name: l(quest.title) })} · ${t("now.questDeadline", { age: ageLabel(quest.deadline, locale) })}`);
  else if (life.profile.questsDone > 0) lines.push(t("now.questsDone", { n: life.profile.questsDone }));

  if (!dead && summary.trackOpen && summary.nextRankThreshold !== null) {
    const left = Math.max(0, summary.nextRankThreshold - life.character.track.points);
    lines.push(t("now.rank", { name: l(summary.rankName), n: left }));
  } else if (!dead && summary.trackOpen && summary.nextRankThreshold === null) {
    lines.push(t("now.rankMax", { name: l(summary.rankName) }));
  }
  if (life.region.strained) lines.push(t("now.strain"));
  else if (life.region.prospering) lines.push(t("now.prosper"));

  const next = dead ? t("now.nextDead") : event ? t("now.nextEvent") : board.current ? t("now.nextRoad") : t("now.nextYear");
  if (lines.length === 0 && !next) return null;

  return (
    <section className="rounded-lg border border-line bg-ink-900/70 px-4 py-3" data-testid="now-panel" aria-label={t("now.title")}>
      <h2 className="text-[11px] uppercase tracking-[0.22em] text-gold-300">{t("now.title")}</h2>
      {lines.length > 0 && (
        <ul className="mt-2 space-y-1">
          {lines.map((line) => (
            <li key={line} className="text-sm text-bone-100">
              {line}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-bone-300">{next}</p>
    </section>
  );
}
