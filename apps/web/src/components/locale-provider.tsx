"use client";

import type { Locale, LocalizedText } from "@endemion/game-core";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { msg, type MessageKey, type MessageVars } from "@/lib/messages";

const LocaleContext = createContext<Locale>("ru");

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export interface I18n {
  locale: Locale;
  /** Текст интерфейса по ключу */
  t: (key: MessageKey, vars?: MessageVars) => string;
  /** Текст контента игры на текущем языке */
  l: (text: LocalizedText) => string;
}

export function useI18n(): I18n {
  const locale = useContext(LocaleContext);
  return useMemo(() => ({ locale, t: (key, vars) => msg(locale, key, vars), l: (text) => text[locale] }), [locale]);
}
