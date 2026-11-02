"use client";

import { useStoreKind } from "@/lib/store";
import { useI18n } from "./locale-provider";

/** Где хранятся новые жизни: в облаке или в этом браузере */
export function StoreBadge() {
  const kind = useStoreKind();
  const { t } = useI18n();
  const label = kind === "checking" ? t("store.checking") : kind === "cloud" ? t("store.cloud") : t("store.local");
  const dot = kind === "cloud" ? "bg-jade-400" : kind === "local" ? "bg-gold-400" : "bg-bone-500 animate-pulse";
  return (
    <span className="hidden items-center gap-2 text-xs text-bone-300 sm:inline-flex" title={kind === "local" ? t("store.localHint") : undefined} data-testid="store-badge" data-kind={kind}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}
