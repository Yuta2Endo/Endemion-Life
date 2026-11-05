"use client";

import type { SaveView } from "@endemion/shared";
import { Button } from "@endemion/ui";
import { useEffect, useRef, useState } from "react";
import { ageLabel } from "@/lib/format";
import type { MessageKey } from "@/lib/messages";
import { useI18n } from "../locale-provider";

/** Версии сохранения с возможностью вернуться к любой из них */
export function SavesDialog({
  open,
  saves,
  currentVersion,
  busy,
  onRestore,
  onClose
}: {
  open: boolean;
  saves: SaveView[] | null;
  currentVersion: number;
  busy: boolean;
  onRestore: (version: number, age: number) => void;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<{ version: number; age: number } | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
      opener.current?.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={() => {
        setPending(null);
        onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        setPending(null);
        onClose();
      }}
      aria-labelledby="saves-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-xl border border-gold-500/40 bg-ink-900 p-0 text-bone-100 backdrop:bg-ink-950/80 backdrop:backdrop-blur-sm"
      data-testid="saves-dialog"
    >
      <div className="p-6">
        <h2 id="saves-title" className="font-display text-2xl text-gilded">{t("play.savesTitle")}</h2>
        <p className="mt-2 text-sm text-bone-300">{t("play.savesHint")}</p>
        <ul className="scroll-thin mt-5 max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {saves === null && <li className="h-12 animate-pulse rounded-md bg-ink-800" />}
          {saves?.map((save) => {
            const current = save.version === currentVersion;
            return (
              <li key={save.version} className="flex items-center justify-between gap-3 rounded-md border border-line bg-ink-950/60 px-3 py-2">
                <span className="text-sm">
                  <span className="text-bone-100">{ageLabel(save.age, locale)}</span>
                  <span className="ml-2 text-xs text-bone-500">
                    v{save.version} · {t(`reason.${save.reason}` as MessageKey)} · {new Date(save.createdAt).toLocaleString(locale)}
                  </span>
                </span>
                {current ? (
                  <span className="text-xs text-gold-300">{t("play.current")}</span>
                ) : (
                  <Button onClick={() => setPending({ version: save.version, age: save.age })} disabled={busy} data-testid="restore-button">
                    {t("play.restore")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {pending && (
          <p className="mt-4 rounded-md border border-blood-500/40 bg-blood-600/10 px-3 py-2 text-sm text-blood-200" data-testid="restore-confirm">
            {t("play.restoreConfirm", { age: ageLabel(pending.age, locale) })}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          {pending && (
            <Button
              variant="primary"
              disabled={busy}
              data-testid="restore-confirm-button"
              onClick={() => {
                const chosen = pending;
                setPending(null);
                onRestore(chosen.version, chosen.age);
              }}
            >
              {t("play.restore")}
            </Button>
          )}
          <Button variant="quiet" onClick={() => { setPending(null); onClose(); }}>
            {t("play.close")}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
