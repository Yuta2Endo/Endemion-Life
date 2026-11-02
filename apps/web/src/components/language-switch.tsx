"use client";

import { LOCALES, type Locale } from "@endemion/game-core";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { saveLocale } from "@/lib/messages";
import { useI18n } from "./locale-provider";

export function LanguageSwitch() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    saveLocale(next);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center rounded-md border border-line bg-ink-900/70 p-0.5 text-xs" role="group" aria-label={t("nav.language")}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => choose(code)}
          disabled={pending}
          aria-pressed={code === locale}
          className={`rounded px-2 py-1 uppercase tracking-widest transition ${code === locale ? "bg-gold-500/20 text-gold-200" : "text-bone-500 hover:text-bone-100"}`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
