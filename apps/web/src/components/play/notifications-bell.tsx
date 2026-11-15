"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ClientError, postJson } from "@/lib/api";
import { BellIcon } from "../icons";
import { useI18n } from "../locale-provider";

interface NotificationItem {
  id: string;
  kind: "auction_outbid" | "auction_won" | "auction_sold" | "auction_ended";
  contractId: string | null;
  data: {
    goodId?: string;
    goodName?: { ru: string; en: string };
    qty?: number;
    amount?: number;
    previousBid?: number;
    returned?: boolean;
  };
  readAt: string | null;
  createdAt: string;
}

interface NotificationList {
  notifications: NotificationItem[];
  unread: number;
}

/** Bell with durable auction notifications. Hidden for guests. */
export function NotificationsBell() {
  const { locale, l, t } = useI18n();
  const [status, setStatus] = useState<"loading" | "ready" | "hidden">("loading");
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const fetchList = useCallback(() => apiFetch<NotificationList>("/api/notifications"), []);

  const apply = useCallback((next: NotificationList) => {
    setItems(next.notifications);
    setUnread(next.unread);
    setLoaded(true);
    setStatus("ready");
  }, []);

  const fail = useCallback((error: unknown) => {
    if (error instanceof ClientError && (error.status === 401 || error.status === 403 || error.code === "ACCOUNT_REQUIRED")) {
      setStatus("hidden");
      return;
    }
    setLoaded(true);
    setStatus((current) => (current === "hidden" ? current : "ready"));
  }, []);

  const load = useCallback(async () => {
    try {
      apply(await fetchList());
    } catch (error) {
      fail(error);
    }
  }, [apply, fail, fetchList]);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      fetchList()
        .then((next) => {
          if (active) apply(next);
        })
        .catch((error: unknown) => {
          if (active) fail(error);
        });
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [apply, fail, fetchList]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    fetchList()
      .then((next) => {
        if (active) apply(next);
      })
      .catch((error: unknown) => {
        if (active) fail(error);
      });
    return () => {
      active = false;
    };
  }, [open, apply, fail, fetchList]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  if (status === "hidden") return null;
  if (status === "loading") return <div className="h-10 w-10" aria-hidden="true" />;

  const text = (item: NotificationItem): string => {
    const good = item.data.goodName ? l(item.data.goodName) : (item.data.goodId ?? "");
    const qty = item.data.qty ?? 0;
    switch (item.kind) {
      case "auction_outbid":
        return t("notifications.outbid", { good, qty, amount: item.data.amount ?? 0 });
      case "auction_won":
        return t("notifications.won", { good, qty, amount: item.data.amount ?? 0 });
      case "auction_sold":
        return t("notifications.sold", { good, qty, amount: item.data.amount ?? 0 });
      case "auction_ended":
        return item.data.returned ? t("notifications.endedReturned", { good, qty }) : t("notifications.endedLost", { good, qty });
    }
  };

  const date = (iso: string): string =>
    new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(iso));

  const markRead = async (item: NotificationItem) => {
    if (item.readAt) return;
    const readAt = new Date().toISOString();
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, readAt } : entry)));
    setUnread((current) => Math.max(0, current - 1));
    try {
      await postJson(`/api/notifications/${item.id}/read`, {});
    } catch {
      void load();
    }
  };

  const markAll = async () => {
    if (unread === 0) return;
    const readAt = new Date().toISOString();
    setItems((current) => current.map((entry) => (entry.readAt ? entry : { ...entry, readAt })));
    setUnread(0);
    try {
      await postJson("/api/notifications/read-all", {});
    } catch {
      void load();
    }
  };

  return (
    <div ref={wrapRef} className="relative self-end">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t("notifications.open")}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center border border-line text-bone-300 transition-colors hover:border-bone-500 hover:text-bone-100"
        data-testid="notifications-bell"
      >
        <BellIcon className="h-5 w-5" />
        {unread > 0 ? (
          <span
            className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-gold-500 px-1 text-center text-[10px] font-semibold leading-5 text-ink-950"
            data-testid="notifications-unread"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t("notifications.title")}
          className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] border border-line bg-ink-900 shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
            <p className="text-sm font-medium text-bone-100">{t("notifications.title")}</p>
            <button
              type="button"
              onClick={() => void markAll()}
              disabled={unread === 0}
              className="text-xs text-bone-400 transition-colors hover:text-bone-100 disabled:opacity-40"
            >
              {t("notifications.markAll")}
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {!loaded ? (
              <li className="px-3 py-4 text-sm text-bone-500">{t("notifications.loading")}</li>
            ) : items.length === 0 ? (
              <li className="px-3 py-4 text-sm text-bone-500">{t("notifications.empty")}</li>
            ) : (
              items.map((item) => (
                <li key={item.id} className="border-b border-line/60 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => void markRead(item)}
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-ink-800/60"
                  >
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.readAt ? "bg-transparent" : "bg-gold-400"}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className={`block text-sm ${item.readAt ? "text-bone-400" : "text-bone-100"}`}>{text(item)}</span>
                      <span className="mt-0.5 block text-[11px] text-bone-500">{date(item.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
