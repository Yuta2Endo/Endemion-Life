"use client";

import type { LifeView } from "@endemion/shared";
import { useI18n } from "../locale-provider";

/** Stage 10: цели освоения и отметки навыков. Клиент ничего не отправляет — зачёт считает сервер в конце года */
export function MasteryPanel({ life }: { life: LifeView }) {
  const { l, t } = useI18n();
  const board = life.mastery;
  return (
    <div className="space-y-3" data-testid="mastery">
      <h3 className="text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("mastery.title")}</h3>
      <p className="text-xs text-bone-500" data-testid="mastery-roads">
        {t("mastery.roads", { found: board.places, total: board.placesTotal })}
      </p>
      <p className="text-xs text-bone-400" data-testid="mastery-deed">
        {board.deed ? t("mastery.deed") : t("mastery.deedNo")}
      </p>
      <ul className="space-y-1.5">
        {board.objectives.map((item) => (
          <li key={item.id} className={`rounded-md border px-3 py-2 ${item.done ? "border-gold-500/40 bg-gold-500/5" : "border-line bg-ink-950/50"}`} data-testid="mastery-objective" data-objective={item.id} data-done={item.done}>
            <p className="text-sm text-bone-100">
              {item.done ? `${t("mastery.mastered")} · ` : ""}
              {l(item.name)}
              {item.rare ? <span className="ml-2 text-[10px] uppercase tracking-wider text-gold-300">{t("mastery.rare")}</span> : null}
            </p>
            <p className="text-xs text-bone-400">{l(item.text)}</p>
          </li>
        ))}
      </ul>
      {board.skills.length > 0 && (
        <ul className="space-y-1">
          {board.skills.map((skill) => (
            <li key={skill.id} className="text-xs text-bone-300" data-testid="mastery-skill" data-skill={skill.id} data-mastered={skill.mastered}>
              {t("mastery.skill", { name: l(skill.name), level: skill.level })}
              {skill.mastered ? ` · ${t("mastery.mastered")}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
