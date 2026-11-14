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
    <div className="flex shrink-0 items-center rounded-md border border-line bg-ink-900/70 p-0.5 text-[10px] sm:text-xs" role="group" aria-label={t("nav.language")}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => choose(code)}
          disabled={pending}
          aria-pressed={code === locale}
          aria-current={code === locale ? "true" : undefined}
          className={`inline-flex min-h-6 min-w-6 items-center justify-center rounded px-1 py-1 uppercase tracking-widest transition sm:px-2 ${code === locale ? "bg-gold-500/20 text-gold-100 ring-1 ring-gold-400/70" : "text-bone-500 hover:text-bone-100"}`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
