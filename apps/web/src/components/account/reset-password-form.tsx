"use client";

import { PASSWORD_MIN_LENGTH } from "@endemion/shared";
import { Button, Panel } from "@endemion/ui";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ClientError } from "@/lib/api";
import { authApi } from "@/lib/auth";
import { useI18n } from "../locale-provider";

/** Новый пароль по ссылке из письма. Токен приходит в адресе страницы и уходит на сервер один раз */
export function ResetPasswordForm({ token }: { token: string | null }) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (e) {
      setError(e instanceof ClientError && e.code !== "INTERNAL" && e.code !== "NETWORK" ? e.message : t("error.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel accent className="mx-auto max-w-md">
      <h1 className="font-display text-2xl text-bone-100">{t("auth.resetTitle")}</h1>
      {!token ? (
        <p className="mt-3 text-sm text-blood-300" role="alert">
          {t("auth.resetMissing")}
        </p>
      ) : done ? (
        <div className="mt-3 space-y-4">
          <p className="text-sm text-jade-300" role="status" data-testid="reset-done">
            {t("auth.resetDone")}
          </p>
          <Link href="/account" className="text-sm text-gold-300 hover:text-gold-100">
            {t("auth.toSignIn")}
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("auth.newPassword")}</span>
            <input
              name="newPassword"
              type="password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-line bg-ink-950/70 px-4 py-2.5 text-bone-100 focus:border-gold-400/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
              data-testid="reset-password"
            />
            <span className="mt-1 block text-xs text-bone-500">{t("auth.passwordHint")}</span>
          </label>
          {error && (
            <p className="text-sm text-blood-300" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" className="w-full" disabled={busy || password.length < PASSWORD_MIN_LENGTH} data-testid="reset-submit">
            {t("auth.resetSave")}
          </Button>
        </form>
      )}
    </Panel>
  );
}
