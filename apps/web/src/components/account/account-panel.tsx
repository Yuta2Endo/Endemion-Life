"use client";

import type { AccountView, MeResponse, SessionView } from "@endemion/shared";
import { PASSWORD_MIN_LENGTH, VERIFY_CODE_LENGTH } from "@endemion/shared";
import { Button, Ornament, Panel } from "@endemion/ui";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ClientError } from "@/lib/api";
import { authApi } from "@/lib/auth";
import { useI18n } from "../locale-provider";

const INPUT =
  "w-full rounded-md border border-line bg-ink-950/70 px-4 py-2.5 text-bone-100 placeholder:text-bone-500 focus:border-gold-400/70 focus:outline-none";

function errorText(error: unknown, fallback: string): string {
  return error instanceof ClientError && error.code !== "INTERNAL" && error.code !== "NETWORK" ? error.message : fallback;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] uppercase tracking-[0.22em] text-gold-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-bone-500">{hint}</span>}
    </label>
  );
}

function Notice({ tone, children, testId }: { tone: "error" | "info" | "good"; children: ReactNode; testId?: string }) {
  const color = tone === "error" ? "text-blood-300" : tone === "good" ? "text-jade-300" : "text-bone-300";
  return (
    <p className={`text-sm ${color}`} role={tone === "error" ? "alert" : "status"} data-testid={testId}>
      {children}
    </p>
  );
}

type Mode = "login" | "register" | "forgot";

/** Вход, регистрация и восстановление для гостя или нового посетителя */
function SignIn({ onDone }: { onDone: (me: MeResponse, info: string | null, verificationSent?: boolean) => void }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        const res = await authApi.login(email, password);
        onDone(res, res.transferredLives > 0 ? t("auth.transferred", { n: res.transferredLives }) : null);
      } else if (mode === "register") {
        const res = await authApi.register(email, password);
        onDone(res, null, res.verificationSent);
      } else {
        await authApi.forgotPassword(email);
        setSent(true);
      }
    } catch (e) {
      setError(errorText(e, t("error.generic")));
    } finally {
      setBusy(false);
    }
  }

  const tab = (value: Mode, label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(value);
        setError(null);
        setSent(false);
      }}
      className={`flex-1 rounded px-3 py-2 text-sm transition ${mode === value ? "bg-gold-500/15 text-gold-100" : "text-bone-300 hover:text-gold-200"}`}
      aria-pressed={mode === value}
      data-testid={`auth-tab-${value}`}
    >
      {label}
    </button>
  );

  return (
    <Panel accent className="mx-auto max-w-md">
      {mode === "forgot" ? (
        <div className="mb-5">
          <h2 className="font-display text-2xl text-bone-100">{t("auth.forgotTitle")}</h2>
          <p className="mt-1 text-sm text-bone-300">{t("auth.forgotLead")}</p>
        </div>
      ) : (
        <div className="mb-5 flex rounded-md border border-line bg-ink-950/70 p-1">
          {tab("login", t("auth.tabLogin"))}
          {tab("register", t("auth.tabRegister"))}
        </div>
      )}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t("auth.email")}>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT}
            data-testid="auth-email"
          />
        </Field>
        {mode !== "forgot" && (
          <Field label={t("auth.password")} hint={mode === "register" ? t("auth.passwordHint") : undefined}>
            <input
              type="password"
              required
              minLength={mode === "register" ? PASSWORD_MIN_LENGTH : undefined}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT}
              data-testid="auth-password"
            />
          </Field>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        {sent && <Notice tone="good" testId="auth-forgot-sent">{t("auth.forgotSent")}</Notice>}
        <Button type="submit" variant="primary" className="w-full" disabled={busy} data-testid="auth-submit">
          {mode === "login" ? t("auth.login") : mode === "register" ? t("auth.register") : t("auth.forgotSend")}
        </Button>
      </form>
      <div className="mt-4 text-center">
        {mode === "forgot" ? (
          <Button variant="quiet" onClick={() => setMode("login")}>
            {t("auth.back")}
          </Button>
        ) : (
          mode === "login" && (
            <Button variant="quiet" onClick={() => setMode("forgot")} data-testid="auth-forgot">
              {t("auth.forgot")}
            </Button>
          )
        )}
      </div>
    </Panel>
  );
}

function VerifyEmail({ account, sentInitially, onVerified }: { account: AccountView; sentInitially: boolean | undefined; onVerified: (account: AccountView) => void }) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(sentInitially === false ? t("auth.verifyNotSent") : null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onVerified((await authApi.verifyEmail(code.trim())).account);
    } catch (e) {
      setError(errorText(e, t("error.generic")));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      const res = await authApi.resendVerification();
      setInfo(res.verificationSent ? t("auth.resent") : t("auth.verifyNotSent"));
    } catch (e) {
      setError(errorText(e, t("error.generic")));
    }
  }

  return (
    <Panel accent data-testid="verify-panel">
      <h2 className="font-display text-2xl text-bone-100">{t("auth.verifyTitle")}</h2>
      <p className="mt-1 text-sm text-bone-300">{t("auth.verifyLead", { email: account.email })}</p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label={t("auth.code")}>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d*"
              maxLength={VERIFY_CODE_LENGTH}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={`${INPUT} font-mono tracking-[0.4em]`}
              data-testid="verify-code"
            />
          </Field>
        </div>
        <Button type="submit" variant="primary" disabled={busy || code.length !== VERIFY_CODE_LENGTH} data-testid="verify-submit">
          {t("auth.verify")}
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button variant="quiet" onClick={resend}>
          {t("auth.resend")}
        </Button>
        {error && <Notice tone="error">{error}</Notice>}
        {info && <Notice tone="info">{info}</Notice>}
      </div>
    </Panel>
  );
}

function deviceName(userAgent: string | null, fallback: string): string {
  if (!userAgent) return fallback;
  const browser = /Firefox\//.test(userAgent) ? "Firefox" : /Edg\//.test(userAgent) ? "Edge" : /Chrome\//.test(userAgent) ? "Chrome" : /Safari\//.test(userAgent) ? "Safari" : null;
  const os = /Android/.test(userAgent) ? "Android" : /iPhone|iPad/.test(userAgent) ? "iOS" : /Windows/.test(userAgent) ? "Windows" : /Mac OS X/.test(userAgent) ? "macOS" : /Linux/.test(userAgent) ? "Linux" : null;
  return [browser, os].filter(Boolean).join(" · ") || userAgent.slice(0, 60);
}

function Devices({ onSignedOut }: { onSignedOut: () => void }) {
  const { locale, t } = useI18n();
  const [sessions, setSessions] = useState<SessionView[] | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  const load = useCallback(async () => {
    try {
      setSessions(await authApi.sessions());
    } catch (e) {
      setError(errorText(e, t("error.generic")));
    }
  }, [t]);

  useEffect(() => {
    let active = true;
    authApi
      .sessions()
      .then((list) => active && setSessions(list))
      .catch((e: unknown) => active && setError(errorText(e, t("error.generic"))));
    return () => {
      active = false;
    };
  }, [t]);

  async function revoke(session: SessionView) {
    setError(null);
    try {
      await authApi.revokeSession(session.id);
      if (session.current) onSignedOut();
      else await load();
    } catch (e) {
      setError(errorText(e, t("error.generic")));
    }
  }

  async function revokeOthers() {
    setError(null);
    try {
      const res = await authApi.revokeOthers();
      setInfo(t("auth.revokedOthers", { n: res.revoked }));
      await load();
    } catch (e) {
      setError(errorText(e, t("error.generic")));
    }
  }

  return (
    <Panel>
      <h2 className="font-display text-2xl text-bone-100">{t("auth.devices")}</h2>
      <p className="mt-1 text-sm text-bone-300">{t("auth.devicesLead")}</p>
      {sessions === null ? (
        <div className="mt-4 h-16 animate-pulse rounded-lg border border-line bg-ink-900/60" aria-busy="true" />
      ) : (
        <ul className="mt-4 space-y-2" data-testid="session-list">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-ink-900/70 px-4 py-3" data-testid="session-item">
              <span className="min-w-0">
                <span className="block truncate text-sm text-bone-100">
                  {deviceName(session.userAgent, t("auth.unknownDevice"))}
                  {session.current && <span className="ml-2 text-xs text-gold-400">· {t("auth.thisDevice")}</span>}
                </span>
                <span className="block text-xs text-bone-500">{t("auth.lastSeen", { date: date.format(new Date(session.lastSeenAt)) })}</span>
              </span>
              <Button variant="ghost" onClick={() => revoke(session)}>
                {t("auth.revoke")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={revokeOthers} disabled={!sessions || sessions.length < 2} data-testid="revoke-others">
          {t("auth.revokeOthers")}
        </Button>
        {info && <Notice tone="good">{info}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    </Panel>
  );
}

/** Страница аккаунта: вход/регистрация для гостя, состояние и устройства для владельца аккаунта */
export function AccountPanel() {
  const { locale, t } = useI18n();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState<boolean | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      setMe(await authApi.me());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then((value) => active && setMe(value))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      setInfo(null);
      await load();
    }
  }

  if (failed) return <Notice tone="error">{t("error.offline")}</Notice>;
  if (me === null) return <div className="mx-auto h-40 max-w-md animate-pulse rounded-xl border border-line bg-ink-900/60" aria-busy="true" />;

  if (!me.account) {
    return (
      <div className="space-y-6">
        {me.player && (
          <p className="mx-auto max-w-md text-center text-sm text-bone-300" data-testid="guest-note">
            {t("auth.guestNote")}
          </p>
        )}
        <SignIn
          onDone={(next, message, sent) => {
            setMe(next);
            setInfo(message);
            setVerificationSent(sent);
          }}
        />
      </div>
    );
  }

  const account = me.account;
  const since = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(account.createdAt));
  return (
    <div className="space-y-6" data-testid="account-view">
      {info && (
        <Notice tone="good" testId="auth-info">
          {info}
        </Notice>
      )}
      <Panel accent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-display text-2xl text-bone-100" data-testid="account-email">
              {account.email}
            </p>
            <p className="mt-1 text-sm text-bone-500">
              <span className={account.emailVerified ? "text-jade-300" : "text-gold-400"} data-testid="account-verified" data-verified={account.emailVerified}>
                {account.emailVerified ? t("auth.verified") : t("auth.notVerified")}
              </span>
              {" · "}
              {t("auth.since", { date: since })}
            </p>
          </div>
          <Button variant="ghost" onClick={logout} data-testid="logout">
            {t("auth.logout")}
          </Button>
        </div>
      </Panel>
      {!account.emailVerified && (
        <VerifyEmail account={account} sentInitially={verificationSent} onVerified={(updated) => setMe({ ...me, account: updated })} />
      )}
      <Ornament />
      <Devices onSignedOut={() => void load()} />
    </div>
  );
}
