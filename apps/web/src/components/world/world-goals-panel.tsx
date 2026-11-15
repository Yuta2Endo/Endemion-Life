"use client";

import { Panel } from "@endemion/ui";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useI18n } from "../locale-provider";

interface Goal {
  id: string;
  title: { ru: string; en: string };
  description: { ru: string; en: string };
  current: number;
  target: number;
  progress: number;
  met: boolean;
}

interface Goals {
  season: number;
  generatedAt: string;
  goals: Goal[];
}

const copy = {
  ru: { title: "Цели сезона", lead: "Мир помнит вклад каждого. Эти цели общие для всех игроков.", met: "Выполнено", active: "В работе" },
  en: { title: "Season goals", lead: "The world remembers every contribution. These goals are shared by all players.", met: "Met", active: "In progress" }
} as const;

export function WorldGoalsPanel({ universeId }: { universeId: string }) {
  const { locale } = useI18n();
  const c = copy[locale as "ru" | "en"];
  const [goals, setGoals] = useState<Goals | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<Goals>(`/api/world/${encodeURIComponent(universeId)}/goals`)
      .then((data) => active && setGoals(data))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [universeId]);

  if (!goals) return null;
  return (
    <Panel className="mt-5" data-testid="world-goals">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-xl text-bone-100">{c.title}</h3>
        <span className="text-xs text-bone-500">{c.lead}</span>
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {goals.goals.map((goal) => (
          <li key={goal.id} className={`rounded-sm border p-3 ${goal.met ? "border-jade-500/50 bg-jade-500/5" : "border-line"}`}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm text-bone-100">{goal.title[locale as "ru" | "en"]}</p>
              <span className={`text-[11px] ${goal.met ? "text-jade-300" : "text-gold-300"}`}>{goal.met ? c.met : c.active}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-bone-500">{goal.description[locale as "ru" | "en"]}</p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-bone-400">
              <span>{goal.current} / {goal.target}</span>
              <span>{goal.progress}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-700">
              <div className={goal.met ? "h-full bg-jade-400" : "h-full bg-gold-400"} style={{ width: `${goal.progress}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
