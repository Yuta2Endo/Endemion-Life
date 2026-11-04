"use client";

import { useStoreKind } from "@/lib/store";
import { useI18n } from "./locale-provider";

/**
 * Где хранятся новые жизни: в облаке или в этом браузере. На телефоне — только цветная точка: подпись не помещается
 * в шапку и растягивала страницу шире экрана (вкладки внизу переставали нажиматься). Локальную жизнь на телефоне
 * видно по плашке на экране игры и по метке «в браузере» в списке жизней
 */
export function StoreBadge() {
  const kind = useStoreKind();
  const { t } = useI18n();
  const label = kind === "checking" ? t("store.checking") : kind === "cloud" ? t("store.cloud") : t("store.local");
  const dot = kind === "cloud" ? "bg-jade-400" : kind === "local" ? "bg-gold-400" : "bg-bone-500 animate-pulse";
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs ${kind === "local" ? "text-gold-200" : "text-bone-300"}`}
      title={kind === "local" ? t("store.localHint") : label}
      data-testid="store-badge"
      data-kind={kind}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <span className="sr-only whitespace-nowrap sm:not-sr-only">{label}</span>
    </span>
  );
}
