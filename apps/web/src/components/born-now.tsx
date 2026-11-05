"use client";

import type { UniverseId } from "@endemion/game-core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { storeForNewLife } from "@/lib/store";
import { useI18n } from "./locale-provider";

let birthPending = false;

/** Рождение без формы: пустые поля решает сервер. Ошибка ведёт на выбор вручную */
export function BornNow({ universeId }: { universeId: UniverseId }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    if (birthPending) return;
    birthPending = true;
    setBusy(true);
    try {
      const life = await (await storeForNewLife()).create({ universeId });
      birthPending = false;
      router.push(`/play/${life.id}`);
    } catch {
      birthPending = false;
      setBusy(false);
      router.push(`/create/${universeId}`);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void go()}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-md border border-gold-400/70 bg-linear-to-b from-gold-400/25 to-gold-600/10 px-4 py-2 text-sm text-gold-100 transition hover:border-gold-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 disabled:opacity-60"
      data-testid="born-now"
    >
      {busy ? t("create.submitting") : t("worlds.born")}
      <span aria-hidden="true">→</span>
    </button>
  );
}
