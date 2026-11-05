"use client";

import { useState } from "react";
import { useI18n } from "./locale-provider";

const KEY = "el_guide_hidden";

function storedHidden(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

/** Короткая справка. Закрытие помнится в браузере и не трогает сохранения */
export function PlayGuide({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const [hidden, setHidden] = useState(storedHidden);

  function hide() {
    window.localStorage.setItem(KEY, "1");
    setHidden(true);
  }

  function show() {
    window.localStorage.removeItem(KEY);
    setHidden(false);
  }

  if (hidden) {
    return (
      <button type="button" onClick={show} className="text-sm text-gold-300 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300" data-testid="guide-show">
        {t("guide.show")}
      </button>
    );
  }

  const items = [t("guide.year"), t("guide.event"), t("guide.dossier"), t("guide.saves")];
  if (compact) {
    return (
      <details className="rounded-xl border border-line bg-ink-900/60 px-4 py-3" data-testid="play-guide">
        <summary className="cursor-pointer text-sm text-gold-200">{t("guide.title")}</summary>
        <ul className="mt-3 space-y-1.5">
          {items.map((item) => (
            <li key={item} className="text-sm text-bone-100">{item}</li>
          ))}
        </ul>
      </details>
    );
  }
  return (
    <section className="rounded-xl border border-line bg-ink-900/60 p-5" data-testid="play-guide">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl text-bone-100">{t("guide.title")}</h2>
        <button type="button" onClick={hide} className="text-xs text-bone-300 hover:text-gold-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300" data-testid="guide-hide">
          {t("guide.hide")}
        </button>
      </div>
      <p className="mt-1 text-sm text-bone-300">{t("guide.lead")}</p>
      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-sm text-bone-100">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
