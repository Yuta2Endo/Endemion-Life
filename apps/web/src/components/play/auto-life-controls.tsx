"use client";

import type { AutoMode } from "@endemion/game-core";
import { Button, Panel } from "@endemion/ui";
import { useI18n } from "../locale-provider";

export function AutoLifeControls({ mode, busy, onMode }: { mode: AutoMode; busy: boolean; onMode: (mode: AutoMode) => void }) {
  const { t } = useI18n();
  const modes: AutoMode[] = ["manual", "auto", "milestones"];
  const hint = mode === "manual" ? t("play.mode.manualHint") : mode === "auto" ? t("play.mode.autoHint") : t("play.mode.milestonesHint");
  return (
    <Panel className="space-y-3" data-testid="auto-life-controls">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-gold-400">{t("play.autoMode")}</h2>
        {mode !== "manual" && <span className="text-xs text-jade-300" aria-live="polite">{busy ? t("play.autoRunning") : t("play.autoStop")}</span>}
      </div>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={t("play.autoMode")}>
        {modes.map((item) => (
          <Button key={item} variant={mode === item ? "primary" : "quiet"} onClick={() => onMode(item)} disabled={busy && mode === item} aria-pressed={mode === item} data-testid={`mode-${item}`}>
            {t(`play.mode.${item}` as "play.mode.manual")}
          </Button>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-bone-400">{hint}</p>
    </Panel>
  );
}
