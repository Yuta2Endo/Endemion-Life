"use client";

import { useState } from "react";
import { useI18n } from "./locale-provider";

/** Один ход без аккаунта: шанс виден до выбора, закрытый вариант объяснён текстом */
export function YearDemo() {
  const { t } = useI18n();
  const [chosen, setChosen] = useState(false);
  return (
    <section className="rounded-xl border border-line bg-ink-900/80 p-6" data-testid="year-demo">
      <p className="text-[11px] uppercase tracking-[0.3em] text-gold-400">{t("home.demoTitle")}</p>
      <p className="mt-3 text-base leading-relaxed text-bone-100">{t("home.demoText")}</p>
      {chosen ? (
        <p className="mt-5 text-sm text-jade-300" role="status">{t("home.demoResult")}</p>
      ) : (
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={() => setChosen(true)}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-ink-950/60 px-4 py-3 text-left text-sm text-bone-100 transition hover:border-gold-400/70"
            data-testid="demo-choice"
          >
            <span>{t("home.demoChoose")}</span>
            <span className="shrink-0 rounded border border-jade-500/40 px-2 py-0.5 text-[11px] text-jade-300">{t("play.chance", { n: 72 })}</span>
          </button>
          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center justify-between gap-3 rounded-lg border border-line/80 bg-ink-950/40 px-4 py-3 text-left text-sm text-bone-300"
          >
            <span>
              {t("home.demoLocked")}
              <span className="mt-1 block text-xs text-blood-300">{t("home.demoNeed")}</span>
            </span>
            <span className="shrink-0 text-[11px]">{t("play.locked")}</span>
          </button>
        </div>
      )}
      <a href="#worlds" className="mt-5 inline-flex text-sm text-gold-200 underline decoration-gold-500/40">
        {t("home.demoCta")}
      </a>
    </section>
  );
}
