"use client";

import type { HistoryChange, UniverseId } from "@endemion/game-core";
import { Tag } from "@endemion/ui";
import { formatChange } from "@/lib/format";
import { useI18n } from "./locale-provider";

export function ChangeChips({ changes, universeId }: { changes: HistoryChange[]; universeId: UniverseId }) {
  const { locale } = useI18n();
  const labels = changes.map((change) => formatChange(change, universeId, locale)).filter((label) => label !== null);
  if (labels.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5" data-testid="changes">
      {labels.map((label, i) => (
        <Tag key={`${label.text}-${i}`} tone={label.tone}>
          {label.text}
        </Tag>
      ))}
    </div>
  );
}
