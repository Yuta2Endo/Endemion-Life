"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { authApi } from "@/lib/auth";
import { useI18n } from "./locale-provider";

/** Ссылка на аккаунт в шапке: «Войти» для гостя, «Аккаунт» после входа. Без сервера ссылки нет */
export function AccountLink() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [state, setState] = useState<"unknown" | "guest" | "account" | "offline">("unknown");

  useEffect(() => {
    let active = true;
    authApi
      .me()
      // Вход через Endemion ID не создаёт аккаунт по почте: вошедший — тот, у кого есть аккаунт или Endemion ID
      .then((me) => active && setState(me.account || me.endemionId ? "account" : "guest"))
      .catch(() => active && setState("offline"));
    return () => {
      active = false;
    };
  }, [pathname]);

  if (state === "offline") return null;
  return (
    <Link href="/account" className="text-sm text-bone-300 transition hover:text-gold-200" data-testid="account-link" data-state={state}>
      {state === "account" ? t("nav.account") : t("nav.signIn")}
    </Link>
  );
}
