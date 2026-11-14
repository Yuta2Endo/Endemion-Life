"use client";

import {
  PROFILE_BIO_MAX,
  PROFILE_HEADLINE_MAX,
  PROFILE_VISIBILITIES,
  type MeResponse,
  type ProfileBadgeView,
  type ProfileView,
  type ProfileVisibility
} from "@endemion/shared";
import { getUniverse, UNIVERSE_IDS } from "@endemion/game-core";
import { Button, Panel } from "@endemion/ui";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { apiFetch, ClientError } from "@/lib/api";
import { authApi } from "@/lib/auth";
import { useI18n } from "../locale-provider";

const INPUT =
  "w-full rounded-sm border border-line bg-ink-950/70 px-4 py-2.5 text-bone-100 placeholder:text-bone-500 focus:border-gold-400/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300";

const copy = {
  ru: {
    eyebrow: "Профиль",
    title: "Ваш след в мире",
    lead: "Лицо игрока, род, союзы и знаки пути. Имя и аватар приходят из Endemion ID.",
    edit: "Редактировать профиль",
    close: "Свернуть",
    headline: "Строка о себе",
    headlineHint: "До 48 символов. Показывается в шапке профиля.",
    bio: "О себе",
    bioHint: "До 280 символов. Без ссылок и личных данных.",
    favorite: "Любимый мир",
    noFavorite: "Не выбран",
    visibility: "Кто видит профиль",
    visibilityHint: "Публичный профиль не показывает email и историю аккаунта.",
    save: "Сохранить профиль",
    cancel: "Отмена",
    saved: "Профиль сохранён.",
    error: "Не удалось сохранить профиль.",
    retry: "Повторить",
    manage: "Управлять Endemion ID",
    publicLink: "Публичный профиль",
    since: "В Life с {date}",
    lastSeen: "Был(а) в сети {date}",
    stats: "Статистика",
    lives: "Жизни",
    alive: "Живые",
    dead: "Завершённые",
    generations: "Поколения",
    bestAge: "Лучший возраст",
    worlds: "Миры",
    guilds: "Союзы",
    friends: "Друзья",
    trades: "Сделки",
    contributions: "Вклад в мир",
    history: "Записи хроник",
    badges: "Знаки пути",
    earned: "Получено",
    next: "До знака: {n}",
    recent: "Последние жизни",
    noLives: "Пока нет жизней. Начните с выбора мира.",
    open: "Открыть",
    houses: "Дома и союзы",
    noGuilds: "Вы пока не состоите в союзе.",
    privateTitle: "Профиль закрыт",
    privateLead: "Игрок ограничил видимость профиля. Доступен только круг друзей.",
    notFound: "Профиль не найден.",
    back: "К людям",
    publicEyebrow: "Игрок",
    viewPublic: "Открыть публичную страницу",
    visibilityPublic: "Публичный",
    visibilityFriends: "Только друзья",
    visibilityPrivate: "Только я",
    dataTitle: "Данные и аккаунт",
    dataLead: "Скачайте копию своих данных или безвозвратно удалите аккаунт.",
    export: "Скачать данные",
    exported: "Копия данных скачана.",
    exportError: "Не удалось скачать данные.",
    deleteTitle: "Удаление аккаунта",
    deleteHint: "Будут удалены профиль, жизни, сделки, союзы и сессии. Действие необратимо.",
    deleteConfirm: "Введите DELETE для подтверждения",
    deleteButton: "Удалить аккаунт",
    deleteError: "Не удалось удалить аккаунт.",
    deleting: "Удаляем…",
    emailConfirmed: "Email подтверждён",
    emailNotConfirmed: "Email не подтверждён"
  },
  en: {
    eyebrow: "Profile",
    title: "Your mark on the world",
    lead: "Player identity, lineage, houses and marks of the road. Name and avatar come from Endemion ID.",
    edit: "Edit profile",
    close: "Collapse",
    headline: "Headline",
    headlineHint: "Up to 48 characters. Shown in the profile header.",
    bio: "About",
    bioHint: "Up to 280 characters. No links or personal data.",
    favorite: "Favourite world",
    noFavorite: "Not chosen",
    visibility: "Who can see the profile",
    visibilityHint: "A public profile never shows email or account history.",
    save: "Save profile",
    cancel: "Cancel",
    saved: "Profile saved.",
    error: "Could not save the profile.",
    retry: "Try again",
    manage: "Manage Endemion ID",
    publicLink: "Public profile",
    since: "In Life since {date}",
    lastSeen: "Last seen {date}",
    stats: "Statistics",
    lives: "Lives",
    alive: "Alive",
    dead: "Completed",
    generations: "Generations",
    bestAge: "Best age",
    worlds: "Worlds",
    guilds: "Houses",
    friends: "Friends",
    trades: "Trades",
    contributions: "World contribution",
    history: "Chronicle entries",
    badges: "Marks of the road",
    earned: "Earned",
    next: "To the mark: {n}",
    recent: "Recent lives",
    noLives: "No lives yet. Begin by choosing a world.",
    open: "Open",
    houses: "Houses and guilds",
    noGuilds: "You are not in a guild yet.",
    privateTitle: "Profile is private",
    privateLead: "This player limited profile visibility to friends.",
    notFound: "Profile not found.",
    back: "To the people",
    publicEyebrow: "Player",
    viewPublic: "Open the public page",
    visibilityPublic: "Public",
    visibilityFriends: "Friends only",
    visibilityPrivate: "Only me",
    dataTitle: "Data and account",
    dataLead: "Download a copy of your data or permanently delete the account.",
    export: "Download data",
    exported: "A copy of your data has been downloaded.",
    exportError: "Could not download the data.",
    deleteTitle: "Delete account",
    deleteHint: "The profile, lives, trades, guilds and sessions will be removed. This cannot be undone.",
    deleteConfirm: "Type DELETE to confirm",
    deleteButton: "Delete account",
    deleteError: "Could not delete the account.",
    deleting: "Deleting…",
    emailConfirmed: "Email confirmed",
    emailNotConfirmed: "Email not confirmed"
  }
} as const;

type Copy = Record<keyof (typeof copy)["ru"], string>;

function errorText(error: unknown, fallback: string): string {
  return error instanceof ClientError && error.code !== "INTERNAL" && error.code !== "NETWORK" ? error.message : fallback;
}

function worldName(id: string | null, locale: "ru" | "en"): string | null {
  if (!id) return null;
  return UNIVERSE_IDS.includes(id as (typeof UNIVERSE_IDS)[number]) ? getUniverse(id as (typeof UNIVERSE_IDS)[number]).name[locale] : id;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-bone-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-bone-500">{hint}</span>}
    </label>
  );
}

function IdentityHeader({ profile, me, c, locale, accountUrl, publicView = false }: { profile: ProfileView; me: MeResponse; c: Copy; locale: "ru" | "en"; accountUrl?: string; publicView?: boolean }) {
  const { identity } = profile;
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
  const name = identity.name;
  const owner = profile.isOwner && !publicView;
  const isEndemion = Boolean(me.endemionId);
  const showEmail = owner && !isEndemion && Boolean(profile.account);
  return (
    <Panel accent>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {identity.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar is hosted by Endemion ID
            <img src={identity.avatarUrl} alt="" width={72} height={72} className="h-[72px] w-[72px] shrink-0 rounded-sm border border-gold-400/50 object-cover" />
          ) : (
            <span className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-sm border border-gold-400/50 font-display text-3xl text-gilded" aria-hidden="true">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-3xl text-bone-100" data-testid={showEmail ? "account-email" : owner && isEndemion ? "id-name" : undefined}>
              {showEmail ? profile.account?.email : name}
            </p>
            {identity.username && (
              <p className="truncate text-sm text-bone-300" data-testid={owner && isEndemion ? "id-username" : undefined}>
                @{identity.username}
              </p>
            )}
            {owner && isEndemion && (
              <p className="mt-1 truncate text-xs text-bone-500" data-testid="id-number">
                Endemion ID: {me.endemionId?.id}
              </p>
            )}
            {showEmail && (
              <p className="mt-1 text-xs text-bone-500">
                <span className={profile.account?.emailVerified ? "text-jade-300" : "text-gold-400"} data-testid="account-verified" data-verified={profile.account?.emailVerified}>
                  {profile.account?.emailVerified ? c.emailConfirmed : c.emailNotConfirmed}
                </span>
              </p>
            )}
            {identity.headline && <p className="mt-3 max-w-xl text-sm text-gold-200">{identity.headline}</p>}
            {identity.bio && <p className="mt-2 max-w-xl text-sm leading-relaxed text-bone-300">{identity.bio}</p>}
            <p className="mt-3 text-xs text-bone-500">
              {c.since.replace("{date}", date.format(new Date(identity.createdAt)))} · {c.lastSeen.replace("{date}", date.format(new Date(identity.lastSeenAt)))}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {owner && isEndemion && (
            <Link href={accountUrl ?? "https://endemion.online/account"} className="inline-flex min-h-11 items-center justify-center rounded-sm border border-line px-4 text-sm text-bone-200 hover:border-gold-500/60" data-testid="id-manage">
              {c.manage}
            </Link>
          )}
          {owner && identity.visibility === "public" && (
            <Link href={`/players/${identity.playerId}`} className="inline-flex min-h-11 items-center justify-center rounded-sm border border-line px-4 text-sm text-bone-200 hover:border-gold-500/60" data-testid="profile-public-link">
              {c.publicLink}
            </Link>
          )}
        </div>
      </div>
    </Panel>
  );
}

function Stats({ profile, c }: { profile: ProfileView; c: Copy }) {
  const stats = profile.stats;
  if (!stats) return null;
  const items: Array<[string, number]> = [
    [c.lives, stats.lives],
    [c.alive, stats.alive],
    [c.dead, stats.dead],
    [c.generations, stats.generations],
    [c.bestAge, stats.bestAge],
    [c.worlds, stats.universes],
    [c.guilds, stats.guilds],
    [c.friends, stats.friends],
    [c.trades, stats.trades],
    [c.contributions, stats.contributions]
  ];
  return (
    <Panel>
      <h2 className="font-display text-2xl text-bone-100">{c.stats}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-5">
        {items.map(([label, value]) => (
          <div key={label} className="bg-ink-900 px-3 py-3">
            <dt className="text-[11px] leading-tight text-bone-500">{label}</dt>
            <dd className="mt-1 font-display text-2xl text-bone-100">{value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function Badges({ badges, c, locale }: { badges: ProfileBadgeView[]; c: Copy; locale: "ru" | "en" }) {
  const earned = badges.filter((badge) => badge.earned);
  const next = badges.filter((badge) => !badge.earned).slice(0, 3);
  const shown = [...earned, ...next];
  if (shown.length === 0) return null;
  return (
    <Panel>
      <h2 className="font-display text-2xl text-bone-100">{c.badges}</h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {shown.map((badge) => (
          <li key={badge.id} className={`rounded-sm border px-3 py-2 ${badge.earned ? "border-gold-500/50 bg-gold-500/5" : "border-line"}`} data-testid={badge.earned ? "profile-badge" : undefined}>
            <div className="flex items-baseline justify-between gap-3">
              <span className={badge.earned ? "text-sm text-gold-100" : "text-sm text-bone-300"}>{badge.name[locale]}</span>
              <span className="shrink-0 text-[11px] text-bone-500">
                {badge.earned ? c.earned : c.next.replace("{n}", String(Math.max(0, badge.target - badge.progress)))}
              </span>
            </div>
            <p className="mt-1 text-xs leading-snug text-bone-500">{badge.description[locale]}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Lives({ profile, c, locale }: { profile: ProfileView; c: Copy; locale: "ru" | "en" }) {
  return (
    <Panel>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl text-bone-100">{c.recent}</h2>
        <span className="text-xs text-bone-500">{profile.stats?.lives ?? profile.lives.length}</span>
      </div>
      {profile.lives.length === 0 ? (
        <p className="mt-4 text-sm text-bone-400">{c.noLives}</p>
      ) : (
        <ul className="mt-4 divide-y divide-line" data-testid="profile-lives">
          {profile.lives.map((life) => (
            <li key={life.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-bone-100">
                  {life.name}
                  {life.generation > 1 && <span className="ml-2 text-xs text-bone-500">· {life.generation}</span>}
                </p>
                <p className="truncate text-xs text-bone-500">
                  {worldName(life.universeId, locale)} · {life.status === "alive" ? c.alive : c.dead} · {life.age}
                </p>
              </div>
              <Link href={`/play/${life.id}`} className="shrink-0 text-xs text-gold-300 hover:text-gold-200">
                {c.open}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Guilds({ profile, c, locale }: { profile: ProfileView; c: Copy; locale: "ru" | "en" }) {
  return (
    <Panel>
      <h2 className="font-display text-2xl text-bone-100">{c.houses}</h2>
      {profile.guilds.length === 0 ? (
        <p className="mt-3 text-sm text-bone-400">{c.noGuilds}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {profile.guilds.map((guild) => (
            <li key={guild.id} className="flex items-center justify-between gap-3 rounded-sm border border-line px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-bone-100">{guild.name}</p>
                <p className="text-xs text-bone-500">
                  {worldName(guild.universeId, locale)} · {guild.role} · {guild.reputation}
                </p>
              </div>
              <Link href="/social" className="shrink-0 text-xs text-gold-300 hover:text-gold-200">
                {c.open}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Editor({ profile, onSaved, c }: { profile: ProfileView; onSaved: (next: ProfileView) => void; c: Copy }) {
  const { locale } = useI18n();
  const [headline, setHeadline] = useState(profile.identity.headline);
  const [bio, setBio] = useState(profile.identity.bio);
  const [favorite, setFavorite] = useState(profile.identity.favoriteUniverseId ?? "");
  const [visibility, setVisibility] = useState<ProfileVisibility>(profile.identity.visibility);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const res = await apiFetch<{ profile: ProfileView }>("/api/profile/me", {
        method: "PATCH",
        body: JSON.stringify({
          headline: headline.trim(),
          bio: bio.trim(),
          favoriteUniverseId: favorite || null,
          visibility
        })
      });
      onSaved(res.profile);
      setNotice(c.saved);
    } catch (error) {
      setNotice(errorText(error, c.error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={c.headline} hint={c.headlineHint}>
            <input className={INPUT} value={headline} maxLength={PROFILE_HEADLINE_MAX} onChange={(event) => setHeadline(event.target.value)} data-testid="profile-headline" />
          </Field>
          <Field label={c.favorite}>
            <select className={INPUT} value={favorite} onChange={(event) => setFavorite(event.target.value)} data-testid="profile-favorite">
              <option value="">{c.noFavorite}</option>
              {UNIVERSE_IDS.map((id) => (
                <option key={id} value={id}>
                  {getUniverse(id).name[locale as "ru" | "en"]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={c.bio} hint={c.bioHint}>
          <textarea className={`${INPUT} min-h-28 resize-y`} value={bio} maxLength={PROFILE_BIO_MAX} onChange={(event) => setBio(event.target.value)} data-testid="profile-bio" />
        </Field>
        <Field label={c.visibility} hint={c.visibilityHint}>
          <select className={INPUT} value={visibility} onChange={(event) => setVisibility(event.target.value as ProfileVisibility)} data-testid="profile-visibility">
            {PROFILE_VISIBILITIES.map((value) => (
              <option key={value} value={value}>
                {value === "public" ? c.visibilityPublic : value === "friends" ? c.visibilityFriends : c.visibilityPrivate}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" disabled={busy} data-testid="profile-save">
            {c.save}
          </Button>
          {notice && (
            <span className={notice === c.saved ? "text-sm text-jade-300" : "text-sm text-blood-300"} role={notice === c.saved ? "status" : "alert"}>
              {notice}
            </span>
          )}
        </div>
      </form>
    </Panel>
  );
}

function DataControls({ profile, onSignedOut, c }: { profile: ProfileView; onSignedOut: () => void; c: Copy }) {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function download() {
    setNotice(null);
    try {
      const data = await authApi.exportAccount();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `endemion-life-${profile.identity.playerId}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice(c.exported);
    } catch {
      setNotice(c.exportError);
    }
  }

  async function remove() {
    if (confirm !== "DELETE") return;
    setBusy(true);
    setNotice(null);
    try {
      await authApi.deleteAccount();
      onSignedOut();
    } catch {
      setNotice(c.deleteError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="border-blood-500/30">
      <h2 className="font-display text-2xl text-bone-100">{c.dataTitle}</h2>
      <p className="mt-1 text-sm text-bone-300">{c.dataLead}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="ghost" onClick={() => void download()} data-testid="profile-export">
          {c.export}
        </Button>
      </div>
      <div className="mt-6 border-t border-line pt-4">
        <h3 className="text-sm font-medium text-blood-300">{c.deleteTitle}</h3>
        <p className="mt-1 text-xs text-bone-500">{c.deleteHint}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className={INPUT}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder={c.deleteConfirm}
            aria-label={c.deleteConfirm}
            data-testid="profile-delete-confirm"
          />
          <Button variant="ghost" onClick={() => void remove()} disabled={busy || confirm !== "DELETE"} className="border-blood-500/50 text-blood-300" data-testid="profile-delete">
            {busy ? c.deleting : c.deleteButton}
          </Button>
        </div>
        {notice && <p className={notice === c.exported ? "mt-3 text-sm text-jade-300" : "mt-3 text-sm text-blood-300"}>{notice}</p>}
      </div>
    </Panel>
  );
}

function ProfileBody({ profile, c, locale }: { profile: ProfileView; c: Copy; locale: "ru" | "en" }) {
  return (
    <>
      <Stats profile={profile} c={c} />
      <Badges badges={profile.badges} c={c} locale={locale} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Lives profile={profile} c={c} locale={locale} />
        <Guilds profile={profile} c={c} locale={locale} />
      </div>
    </>
  );
}

export function ProfileDashboard({ me, onSignedOut, accountUrl }: { me: MeResponse; onSignedOut: () => void; accountUrl?: string }) {
  const { locale, t } = useI18n();
  const c = copy[locale as "ru" | "en"];
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [editing, setEditing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ profile: ProfileView }>("/api/profile/me");
      setProfile(res.profile);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    apiFetch<{ profile: ProfileView }>("/api/profile/me")
      .then((res) => active && setProfile(res.profile))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    setBusy(true);
    try {
      const res = await authApi.logout();
      const allowedOrigin = accountUrl ? new URL(accountUrl).origin : "https://endemion.online";
      if (res.redirect && new URL(res.redirect).origin === allowedOrigin) {
        window.location.assign(res.redirect);
        return;
      }
    } finally {
      setBusy(false);
    }
    onSignedOut();
  }

  if (failed) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-blood-300" role="alert">{c.error}</p>
        <Button onClick={() => void load()}>{c.retry}</Button>
      </div>
    );
  }
  if (!profile) {
    return <div className="h-56 animate-pulse rounded-sm border border-line bg-ink-900/60" aria-busy="true" />;
  }

  return (
    <div className="space-y-5" data-testid="account-view">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-gold-300">{c.eyebrow}</p>
          <h2 className="mt-2 font-display text-3xl text-bone-100">{c.title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-bone-300">{c.lead}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.canEdit && (
            <Button variant={editing ? "ghost" : "primary"} onClick={() => setEditing((value) => !value)} data-testid="profile-edit">
              {editing ? c.close : c.edit}
            </Button>
          )}
          <Button variant="ghost" onClick={() => void logout()} disabled={busy} data-testid="logout">
            {t("auth.logout")}
          </Button>
        </div>
      </div>
      <IdentityHeader profile={profile} me={me} c={c} locale={locale as "ru" | "en"} accountUrl={accountUrl} />
      {editing && <Editor profile={profile} c={c} onSaved={(next) => { setProfile(next); setEditing(false); }} />}
      {profile.stats ? (
        <ProfileBody profile={profile} c={c} locale={locale as "ru" | "en"} />
      ) : (
        <Panel>
          <h2 className="font-display text-2xl text-bone-100">{c.privateTitle}</h2>
          <p className="mt-2 text-sm text-bone-300">{c.privateLead}</p>
        </Panel>
      )}
      {profile.isOwner && <DataControls profile={profile} onSignedOut={onSignedOut} c={c} />}
    </div>
  );
}

export function PublicProfile({ playerId }: { playerId: string }) {
  const { locale } = useI18n();
  const c = copy[locale as "ru" | "en"];
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<{ profile: ProfileView }>(`/api/profile/${encodeURIComponent(playerId)}`)
      .then((res) => active && setProfile(res.profile))
      .catch(() => active && setMissing(true));
    return () => {
      active = false;
    };
  }, [playerId]);

  if (missing) {
    return (
      <Panel>
        <h1 className="font-display text-3xl text-bone-100">{c.notFound}</h1>
        <Link href="/social" className="mt-4 inline-flex text-sm text-gold-300 hover:text-gold-200">
          {c.back}
        </Link>
      </Panel>
    );
  }
  if (!profile) return <div className="h-56 animate-pulse rounded-sm border border-line bg-ink-900/60" aria-busy="true" />;

  const privateProfile = profile.access === "private";
  return (
    <div className="space-y-5" data-testid="public-profile">
      <div>
        <p className="eyebrow text-gold-300">{c.publicEyebrow}</p>
        <h1 className="mt-2 font-display text-4xl text-bone-100">{profile.identity.name}</h1>
      </div>
      <IdentityHeader profile={profile} me={{ player: null, account: null }} c={c} locale={locale as "ru" | "en"} publicView />
      {privateProfile ? (
        <Panel>
          <h2 className="font-display text-2xl text-bone-100">{c.privateTitle}</h2>
          <p className="mt-2 text-sm text-bone-300">{c.privateLead}</p>
        </Panel>
      ) : (
        <ProfileBody profile={profile} c={c} locale={locale as "ru" | "en"} />
      )}
    </div>
  );
}
