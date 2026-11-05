"use client";

import { Button } from "@endemion/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClientError } from "@/lib/api";
import { moveToCloud } from "@/lib/store";
import { useI18n } from "../locale-provider";

/**
 * Stage 04: предупреждение на экране локальной жизни и перенос на сервер.
 * Запись в браузере помечается перенесённой только после ответа сервера: при ошибке жизнь остаётся, где была
 */
export function LocalLifeBanner({ lifeId, disabled }: { lifeId: string; disabled: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [moving, setMoving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function move() {
    setMoving(true);
    setMessage(null);
    try {
      const { id, adjusted } = await moveToCloud(lifeId);
      setMessage({ text: adjusted > 0 ? t("store.moveAdjusted", { n: adjusted }) : t("store.moveDone"), error: false });
      router.replace(`/play/${id}`);
    } catch (error) {
      const offline = error instanceof ClientError && (error.code === "NETWORK" || error.status === 503);
      // Точка в конце причины убирается: шаблон сообщения продолжает фразу
      const reason = (error instanceof ClientError && error.status > 0 && error.status < 500 ? error.message : t("error.generic")).replace(/[.!\s]+$/, "");
      setMessage({ text: offline ? t("store.moveOffline") : t("store.moveFailed", { reason }), error: true });
      setMoving(false);
    }
  }

  return (
    <div className="relative mb-4 rounded-md border border-gold-500/40 bg-gold-500/5 px-3 py-3 text-sm text-gold-100" data-testid="local-banner">
      <p>{t("store.localLife")}</p>
      <p className="mt-1 hidden text-xs text-bone-400 sm:block">{t("store.moveHint")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={() => void move()} disabled={moving || disabled} data-testid="move-to-cloud">
          {moving ? t("store.moving") : t("store.move")}
        </Button>
        {message && (
          <p className={`text-xs ${message.error ? "text-blood-300" : "text-jade-300"}`} role={message.error ? "alert" : "status"} data-testid="move-message">
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
