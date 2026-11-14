"use client";

import { STAGE_INFO, type LocalizedText } from "@endemion/game-core";
import type { LifeView } from "@endemion/shared";
import { Button, Panel } from "@endemion/ui";
import { useEffect, useState } from "react";
import { trackGuide } from "@/lib/guide-analytics";
import { useI18n } from "../locale-provider";

const GOAL_LABELS: Readonly<Record<string, LocalizedText>> = {
  wealth: { ru: "Построить состояние", en: "Build wealth" },
  mastery: { ru: "Достичь мастерства", en: "Master the path" },
  rise: { ru: "Подняться в обществе", en: "Rise in station" },
  knowledge: { ru: "Освоить ремесло", en: "Master a craft" },
  family: { ru: "Создать семью", en: "Establish a family" }
};

interface GuideMemory {
  eventSeen: boolean;
  dossierOpened: boolean;
  dismissed: boolean;
}

const EMPTY: GuideMemory = { eventSeen: false, dossierOpened: false, dismissed: false };

function memoryKey(lifeId: string): string {
  return `endemion-life-guide:${lifeId}`;
}

function readMemory(lifeId: string): GuideMemory {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(memoryKey(lifeId));
    if (!raw) return EMPTY;
    const value = JSON.parse(raw) as Partial<GuideMemory>;
    return {
      eventSeen: value.eventSeen === true,
      dossierOpened: value.dossierOpened === true,
      dismissed: value.dismissed === true
    };
  } catch {
    return EMPTY;
  }
}

const sown = (text: LocalizedText, locale: "ru" | "en"): string => text[locale];

export function LifeGuide({
  life,
  busy,
  onAdvance,
  onEvent,
  onDossier
}: {
  life: LifeView;
  busy: boolean;
  onAdvance: () => void;
  onEvent: () => void;
  onDossier: () => void;
}) {
  const { locale, l } = useI18n();
  const copy = locale === "en"
    ? {
        eyebrow: life.legacy.generation > 1 ? "A new chapter" : "First life",
        deadTitle: "The life is complete",
        deadLead: "Read the life and choose what the family carries forward.",
        eventTitle: "A decision is waiting",
        eventLead: "Your answer will change the life and may echo into the next generation.",
        childTitle: "The early years",
        childLead: "Grow through childhood. The first choices shape health, family and character.",
        teenTitle: "The years of becoming",
        teenLead: "Education, first work and first bonds decide which doors open.",
        adultTitle: "The life you build",
        adultLead: "Career, home, love and a place in the world. The middle years carry the most weight.",
        elderTitle: "The last chapter",
        elderLead: "Prepare an heir and decide what remains after you.",
        goal: "Life goal",
        noGoal: "Your life goal will take shape in adulthood.",
        checklist: "First steps",
        event: "Open the event",
        eventDone: "First decision",
        dossier: "Open the dossier",
        dossierDone: "Open the dossier",
        grown: "Reach adulthood",
        grownDone: "Adulthood reached",
        advance: "Live a year",
        dead: "Read the life",
        skip: "Hide the guide",
        progress: "{n}%"
      }
    : {
        eyebrow: life.legacy.generation > 1 ? "Новая глава" : "Первая жизнь",
        deadTitle: "Жизнь завершена",
        deadLead: "Прочитайте итоги и решите, что род понесёт дальше.",
        eventTitle: "Сейчас решается судьба",
        eventLead: "Ответ изменит жизнь и может отозваться в следующем поколении.",
        childTitle: "Ранние годы",
        childLead: "Проживите детство. Первые выборы формируют здоровье, семью и характер.",
        teenTitle: "Годы становления",
        teenLead: "Образование, первая работа и первые связи решают, какие двери откроются.",
        adultTitle: "Жизнь, которую вы строите",
        adultLead: "Карьера, дом, любовь и место в мире. Средние годы несут самый большой вес.",
        elderTitle: "Последняя глава",
        elderLead: "Подготовьте наследника и решите, что останется после вас.",
        goal: "Цель жизни",
        noGoal: "Цель определится, когда вы войдёте во взрослую жизнь.",
        checklist: "Первые шаги",
        event: "Открыть событие",
        eventDone: "Первое решение",
        dossier: "Открыть досье",
        dossierDone: "Открыть досье",
        grown: "Дожить до взрослой жизни",
        grownDone: "Взрослая жизнь",
        advance: "Прожить год",
        dead: "Прочитать жизнь",
        skip: "Скрыть подсказку",
        progress: "{n}%"
      };

  const [memory, setMemory] = useState<GuideMemory>(EMPTY);

  useEffect(() => {
    // Read local guide memory after hydration, not during the server render.
    const timer = window.setTimeout(() => setMemory(readMemory(life.id)), 0);
    return () => window.clearTimeout(timer);
  }, [life.id]);

  useEffect(() => {
    trackGuide(life.id, "view");
  }, [life.id]);

  function remember(patch: Partial<GuideMemory>) {
    setMemory((previous) => {
      const next = { ...previous, ...patch };
      try {
        window.localStorage.setItem(memoryKey(life.id), JSON.stringify(next));
      } catch {
        // Local guide state is optional; a blocked storage must not break play.
      }
      return next;
    });
  }

  const dead = life.status === "dead";
  const event = life.pendingEvent;
  const stage = life.life.stage;
  const grown = stage === "adult" || stage === "middle" || stage === "elder";
  const goal = life.character.goal ? GOAL_LABELS[life.character.goal] : null;
  const progress = Math.max(0, Math.min(100, Math.round(life.character.goalProgress)));
  const firstLife = life.legacy.generation <= 1;
  const done = memory.eventSeen && memory.dossierOpened && grown;
  const showChecklist = firstLife && !memory.dismissed && !done;

  const chapter = dead
    ? { title: copy.deadTitle, lead: copy.deadLead }
    : event
      ? { title: copy.eventTitle, lead: copy.eventLead }
      : stage === "infant" || stage === "child"
        ? { title: copy.childTitle, lead: copy.childLead }
        : stage === "teen"
          ? { title: copy.teenTitle, lead: copy.teenLead }
          : stage === "elder"
            ? { title: copy.elderTitle, lead: copy.elderLead }
            : { title: copy.adultTitle, lead: copy.adultLead };

  const stageName = l(STAGE_INFO[stage].name);

  return (
    <Panel className="mb-4 border-gold-500/30" data-testid="life-guide">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="eyebrow text-gold-300">
            {copy.eyebrow} · {stageName} · {life.life.age}
          </p>
          <h2 className="mt-2 font-display text-2xl text-bone-100">{chapter.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-bone-300">{chapter.lead}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {event ? (
            <Button
              variant="primary"
              onClick={() => {
                trackGuide(life.id, "event");
                remember({ eventSeen: true });
                onEvent();
              }}
              data-testid="guide-event"
            >
              {copy.event}
            </Button>
          ) : dead ? (
            <Button variant="ghost" onClick={() => { trackGuide(life.id, "dossier"); onDossier(); }} data-testid="guide-dossier">
              {copy.dead}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => {
                trackGuide(life.id, "advance");
                onAdvance();
              }}
              disabled={busy || life.autoMode !== "manual"}
              data-testid="guide-next"
            >
              {copy.advance}
            </Button>
          )}
          {!dead && (
            <Button
              variant="ghost"
              onClick={() => {
                trackGuide(life.id, "dossier");
                remember({ dossierOpened: true });
                onDossier();
              }}
              data-testid="guide-dossier"
            >
              {copy.dossier}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div data-testid="guide-goal">
          <p className="text-xs font-medium text-bone-400">{copy.goal}</p>
          <p className="mt-1 text-sm text-bone-100">{goal ? sown(goal, locale as "ru" | "en") : copy.noGoal}</p>
          {goal && (
            <div className="mt-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-950" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={copy.goal}>
                <div className="h-full bg-gold-400" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-bone-500">{copy.progress.replace("{n}", String(progress))}</p>
            </div>
          )}
        </div>

        {showChecklist && (
          <div data-testid="guide-checklist">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-bone-400">{copy.checklist}</p>
              <button type="button" className="text-[11px] text-bone-500 underline decoration-line underline-offset-2 hover:text-bone-300" onClick={() => { trackGuide(life.id, "dismiss"); remember({ dismissed: true }); }}>
                {copy.skip}
              </button>
            </div>
            <ul className="mt-2 space-y-1.5 text-xs">
              <li className={memory.eventSeen ? "text-jade-300" : "text-bone-300"}>
                {memory.eventSeen ? "✓" : "○"} {copy.eventDone}
              </li>
              <li className={grown ? "text-jade-300" : "text-bone-300"}>
                {grown ? "✓" : "○"} {copy.grownDone}
              </li>
              <li className={memory.dossierOpened ? "text-jade-300" : "text-bone-300"}>
                {memory.dossierOpened ? "✓" : "○"} {copy.dossierDone}
              </li>
            </ul>
          </div>
        )}
      </div>
    </Panel>
  );
}
