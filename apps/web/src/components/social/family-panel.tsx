"use client";

import { getUniverse, isUniverseId, UNIVERSE_IDS, type UniverseId } from "@endemion/game-core";
import { Button, Panel, Tag } from "@endemion/ui";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch, ClientError } from "@/lib/api";
import { useI18n } from "../locale-provider";

interface FamilySummary {
  id: string;
  universeId: string;
  name: string;
  motto: string;
  description: string;
  visibility: "public" | "invite";
  leaderId: string;
  leaderName: string;
  memberCount: number;
  reputation: number;
  myRole: "leader" | "elder" | "member" | null;
  createdAt: string;
}
interface FamilyMember {
  playerId: string;
  name: string;
  role: "leader" | "elder" | "member";
  contribution: number;
  joinedAt: string;
}
interface FamilyInvite {
  id: string;
  playerId: string;
  name: string;
  status: string;
  createdAt: string;
}
interface FamilyDetail extends FamilySummary {
  members: FamilyMember[];
  invites: FamilyInvite[];
}
interface IncomingInvite {
  id: string;
  familyId: string;
  familyName: string;
  universeId: string;
  inviterName: string;
  createdAt: string;
}
interface SocialPlayer {
  id: string;
  name: string;
}

const INPUT =
  "min-h-11 w-full rounded-sm border border-line bg-ink-950 px-3 text-sm text-bone-100 placeholder:text-bone-500 focus:border-gold-400/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300";

const copy = {
  ru: {
    eyebrow: "Кровь и дом",
    title: "Семьи игроков",
    lead: "Дом, который вы создаёте вместе. Одна семья на каждый мир, роли, приглашения и общая память.",
    guest: "Семьи доступны после входа в аккаунт. Гостевая жизнь остаётся соло.",
    signIn: "Войти",
    create: "Основать семью",
    cancel: "Отмена",
    name: "Название семьи",
    motto: "Девиз",
    description: "Описание",
    universe: "Мир",
    visibility: "Видимость",
    public: "Публичная",
    visibilityInvite: "По приглашению",
    save: "Сохранить",
    createSubmit: "Основать",
    edit: "Изменить",
    empty: "Пока нет семей. Станьте первым домом этого мира.",
    members: "Участники",
    invites: "Приглашения",
    noInvites: "Приглашений нет.",
    incoming: "Вас приглашают",
    accept: "Принять",
    decline: "Отклонить",
    invitePlayer: "Пригласить игрока",
    search: "Имя игрока",
    find: "Найти",
    invite: "Пригласить",
    leave: "Покинуть",
    kick: "Исключить",
    transfer: "Передать главенство",
    disband: "Распустить",
    audit: "Последние события",
    noAudit: "Событий пока нет.",
    leader: "глава",
    elder: "старейшина",
    member: "участник",
    founded: "Основана",
    reputation: "Репутация",
    error: "Не удалось выполнить действие.",
    confirmDisband: "Распустить семью? Это необратимо.",
    confirmKick: "Исключить участника?",
    confirmTransfer: "Передать главенство этому участнику?",
    created: "Семья основана.",
    updated: "Семья обновлена.",
    invited: "Приглашение отправлено.",
    joined: "Вы вступили в семью.",
    left: "Вы покинули семью.",
    searchHint: "Введите минимум 3 символа."
  },
  en: {
    eyebrow: "Blood and house",
    title: "Player families",
    lead: "A house you build together. One family per world, roles, invitations and shared memory.",
    guest: "Families unlock after signing in. Guest lives remain solo.",
    signIn: "Sign in",
    create: "Found a family",
    cancel: "Cancel",
    name: "Family name",
    motto: "Motto",
    description: "Description",
    universe: "World",
    visibility: "Visibility",
    public: "Public",
    visibilityInvite: "By invitation",
    save: "Save",
    createSubmit: "Found",
    edit: "Edit",
    empty: "No families yet. Become the first house of this world.",
    members: "Members",
    invites: "Invitations",
    noInvites: "No invitations.",
    incoming: "You are invited",
    accept: "Accept",
    decline: "Decline",
    invitePlayer: "Invite a player",
    search: "Player name",
    find: "Find",
    invite: "Invite",
    leave: "Leave",
    kick: "Remove",
    transfer: "Transfer leadership",
    disband: "Disband",
    audit: "Recent events",
    noAudit: "No events yet.",
    leader: "leader",
    elder: "elder",
    member: "member",
    founded: "Founded",
    reputation: "Reputation",
    error: "The action could not be completed.",
    confirmDisband: "Disband this family? This cannot be undone.",
    confirmKick: "Remove this member?",
    confirmTransfer: "Transfer leadership to this member?",
    created: "Family founded.",
    updated: "Family updated.",
    invited: "Invitation sent.",
    joined: "You joined the family.",
    left: "You left the family.",
    searchHint: "Type at least 3 characters."
  }
} as const;

type Copy = Record<keyof (typeof copy)["ru"], string>;

const roleLabel = (role: string, c: Copy): string =>
  role === "leader" ? c.leader : role === "elder" ? c.elder : c.member;

const worldName = (id: string, locale: "ru" | "en"): string =>
  isUniverseId(id) ? getUniverse(id).name[locale] : id;

function errorText(error: unknown, c: Copy): string {
  return error instanceof ClientError && error.code !== "INTERNAL" && error.code !== "NETWORK" ? error.message : c.error;
}

export function FamilyPanel() {
  const { locale } = useI18n();
  const c = copy[locale as "ru" | "en"];
  const [families, setFamilies] = useState<FamilySummary[] | null>(null);
  const [incoming, setIncoming] = useState<IncomingInvite[]>([]);
  const [selected, setSelected] = useState<FamilyDetail | null>(null);
  const [guest, setGuest] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", motto: "", description: "", universeId: "dark-fantasy" as UniverseId, visibility: "public" as "public" | "invite" });
  const [searchName, setSearchName] = useState("");
  const [found, setFound] = useState<SocialPlayer[]>([]);
  const [audit, setAudit] = useState<Array<{ id: string; action: string; actor: string; createdAt: string }>>([]);

  const load = useCallback(async () => {
    try {
      const [list, invites] = await Promise.all([
        apiFetch<{ families: FamilySummary[] }>("/api/families"),
        apiFetch<{ invites: IncomingInvite[] }>("/api/families/invites")
      ]);
      setFamilies(list.families);
      setIncoming(invites.invites);
      setGuest(false);
    } catch (error) {
      if (error instanceof ClientError && (error.code === "ACCOUNT_REQUIRED" || error.status === 401)) {
        setGuest(true);
        setFamilies([]);
      } else {
        setNotice(errorText(error, c));
      }
    }
  }, [c]);

  useEffect(() => {
    const handle = setTimeout(() => void load(), 0);
    return () => clearTimeout(handle);
  }, [load]);

  async function run(action: () => Promise<void>, success?: string) {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      if (success) setNotice(success);
      await load();
    } catch (error) {
      setNotice(errorText(error, c));
    } finally {
      setBusy(false);
    }
  }

  async function open(id: string) {
    setBusy(true);
    setNotice(null);
    try {
      const [detail, log] = await Promise.all([
        apiFetch<FamilyDetail>(`/api/families/${id}`),
        apiFetch<{ entries: Array<{ id: string; action: string; actor: string; createdAt: string }> }>(`/api/families/${id}/audit`).catch(() => ({ entries: [] }))
      ]);
      setSelected(detail);
      setAudit(log.entries);
      setEditing(false);
      setSearchName("");
      setFound([]);
    } catch (error) {
      setNotice(errorText(error, c));
    } finally {
      setBusy(false);
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const detail = await apiFetch<FamilyDetail>("/api/families", {
        method: "POST",
        body: JSON.stringify({
          universeId: form.universeId,
          name: form.name,
          motto: form.motto,
          description: form.description,
          visibility: form.visibility
        })
      });
      setSelected(detail);
      setCreating(false);
    }, c.created);
  }

  async function save() {
    if (!selected) return;
    await run(async () => {
      const detail = await apiFetch<FamilyDetail>(`/api/families/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: selected.name,
          motto: selected.motto,
          description: selected.description,
          visibility: selected.visibility
        })
      });
      setSelected(detail);
      setEditing(false);
    }, c.updated);
  }

  async function search() {
    if (searchName.trim().length < 3) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await apiFetch<{ players: SocialPlayer[] }>(`/api/social/players?name=${encodeURIComponent(searchName.trim())}`);
      setFound(res.players);
      if (res.players.length === 0) setNotice(c.empty);
    } catch (error) {
      setNotice(errorText(error, c));
    } finally {
      setBusy(false);
    }
  }

  async function invite(playerId: string) {
    if (!selected) return;
    await run(async () => {
      const detail = await apiFetch<FamilyDetail>(`/api/families/${selected.id}/invites`, {
        method: "POST",
        body: JSON.stringify({ playerId })
      });
      setSelected(detail);
      setFound([]);
      setSearchName("");
    }, c.invited);
  }

  async function accept(inviteId: string) {
    await run(async () => {
      const detail = await apiFetch<FamilyDetail>(`/api/families/invites/${inviteId}/accept`, { method: "POST", body: "{}" });
      setSelected(detail);
    }, c.joined);
  }

  async function decline(inviteId: string) {
    await run(() => apiFetch(`/api/families/invites/${inviteId}/decline`, { method: "POST", body: "{}" }));
  }

  async function leave() {
    if (!selected) return;
    await run(async () => {
      await apiFetch(`/api/families/${selected.id}/leave`, { method: "POST", body: "{}" });
      setSelected(null);
    }, c.left);
  }

  async function kick(playerId: string) {
    if (!selected || !window.confirm(c.confirmKick)) return;
    await run(async () => {
      setSelected(await apiFetch<FamilyDetail>(`/api/families/${selected.id}/kick`, { method: "POST", body: JSON.stringify({ playerId }) }));
    });
  }

  async function transfer(playerId: string) {
    if (!selected || !window.confirm(c.confirmTransfer)) return;
    await run(async () => {
      setSelected(await apiFetch<FamilyDetail>(`/api/families/${selected.id}/transfer`, { method: "POST", body: JSON.stringify({ playerId }) }));
    });
  }

  async function disband() {
    if (!selected || !window.confirm(c.confirmDisband)) return;
    await run(async () => {
      await apiFetch(`/api/families/${selected.id}/disband`, { method: "POST", body: "{}" });
      setSelected(null);
    });
  }

  if (guest) {
    return (
      <Panel data-testid="family-guest">
        <p className="eyebrow text-gold-300">{c.eyebrow}</p>
        <h2 className="mt-2 font-display text-3xl text-bone-100">{c.title}</h2>
        <p className="mt-2 text-sm text-bone-300">{c.guest}</p>
        <Link href="/account" className="mt-4 inline-flex min-h-11 items-center text-sm text-gold-300 hover:text-gold-200">{c.signIn}</Link>
      </Panel>
    );
  }

  return (
    <div className="space-y-5" data-testid="family-panel">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-gold-300">{c.eyebrow}</p>
            <h2 className="mt-2 font-display text-3xl text-bone-100">{c.title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-bone-300">{c.lead}</p>
          </div>
          <Button variant={creating ? "ghost" : "primary"} onClick={() => { setCreating((v) => !v); setSelected(null); }} data-testid="family-create-open">
            {creating ? c.cancel : c.create}
          </Button>
        </div>
        {notice && <p className="mt-3 text-sm text-gold-200" role="status">{notice}</p>}
        {creating && (
          <form onSubmit={create} className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs text-bone-400">{c.name}</span>
              <input className={INPUT} value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="family-name" />
            </label>
            <label>
              <span className="mb-1 block text-xs text-bone-400">{c.universe}</span>
              <select className={INPUT} value={form.universeId} onChange={(e) => setForm({ ...form, universeId: e.target.value as UniverseId })}>
                {UNIVERSE_IDS.map((id) => <option key={id} value={id}>{getUniverse(id).name[locale as "ru" | "en"]}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs text-bone-400">{c.visibility}</span>
              <select className={INPUT} value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as "public" | "invite" })}>
                <option value="public">{c.public}</option>
                <option value="invite">{c.visibilityInvite}</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs text-bone-400">{c.motto}</span>
              <input className={INPUT} value={form.motto} maxLength={80} onChange={(e) => setForm({ ...form, motto: e.target.value })} />
            </label>
            <label>
              <span className="mb-1 block text-xs text-bone-400">{c.description}</span>
              <input className={INPUT} value={form.description} maxLength={500} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" variant="primary" disabled={busy || form.name.trim().length < 3} data-testid="family-create">{c.createSubmit}</Button>
            </div>
          </form>
        )}
      </Panel>

      {incoming.length > 0 && (
        <Panel>
          <h3 className="font-display text-2xl text-bone-100">{c.incoming}</h3>
          <ul className="mt-3 space-y-2">
            {incoming.map((invite) => (
              <li key={invite.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2 text-sm">
                <span><strong className="text-bone-100">{invite.familyName}</strong> · {worldName(invite.universeId, locale as "ru" | "en")} · {invite.inviterName}</span>
                <span className="flex gap-2">
                  <Button onClick={() => void accept(invite.id)} disabled={busy}>{c.accept}</Button>
                  <Button variant="ghost" onClick={() => void decline(invite.id)} disabled={busy}>{c.decline}</Button>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {families === null ? (
        <div className="h-32 animate-pulse rounded-sm border border-line bg-ink-900/60" aria-busy="true" />
      ) : families.length === 0 ? (
        <Panel><p className="text-sm text-bone-400">{c.empty}</p></Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {families.map((family) => (
            <button key={family.id} type="button" onClick={() => void open(family.id)} className="rounded-sm border border-line bg-ink-900 p-4 text-left transition-colors hover:border-gold-500/60" data-testid="family-card">
              <span className="flex items-center justify-between gap-2">
                <span className="font-display text-xl text-bone-100">{family.name}</span>
                {family.myRole && <Tag tone="gold">{roleLabel(family.myRole, c)}</Tag>}
              </span>
              <span className="mt-1 block text-xs text-bone-500">{worldName(family.universeId, locale as "ru" | "en")} · {family.memberCount} · {c.reputation} {family.reputation}</span>
              {family.motto && <span className="mt-2 block text-sm italic text-bone-300">{family.motto}</span>}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <Panel data-testid="family-detail">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-3xl text-bone-100">{selected.name}</h3>
                <Tag tone={selected.visibility === "public" ? "good" : "gold"}>{selected.visibility === "public" ? c.public : c.visibilityInvite}</Tag>
              </div>
              <p className="mt-1 text-xs text-bone-500">{worldName(selected.universeId, locale as "ru" | "en")} · {c.leader}: {selected.leaderName} · {c.reputation} {selected.reputation}</p>
              {selected.motto && <p className="mt-2 text-sm italic text-gold-200">{selected.motto}</p>}
              {selected.description && <p className="mt-2 max-w-2xl text-sm text-bone-300">{selected.description}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.myRole === "leader" || selected.myRole === "elder" ? <Button variant="ghost" onClick={() => setEditing((v) => !v)}>{editing ? c.cancel : c.edit}</Button> : null}
              {selected.myRole && <Button variant="ghost" onClick={() => void leave()} disabled={busy}>{c.leave}</Button>}
              {selected.myRole === "leader" && <Button variant="ghost" onClick={() => void disband()} disabled={busy}>{c.disband}</Button>}
            </div>
          </div>

          {editing && (
            <div className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
              <input className={INPUT} value={selected.name} maxLength={40} onChange={(e) => setSelected({ ...selected, name: e.target.value })} />
              <select className={INPUT} value={selected.visibility} onChange={(e) => setSelected({ ...selected, visibility: e.target.value as "public" | "invite" })}>
                <option value="public">{c.public}</option>
                <option value="invite">{c.visibilityInvite}</option>
              </select>
              <input className={INPUT} value={selected.motto} maxLength={80} onChange={(e) => setSelected({ ...selected, motto: e.target.value })} placeholder={c.motto} />
              <input className={INPUT} value={selected.description} maxLength={500} onChange={(e) => setSelected({ ...selected, description: e.target.value })} placeholder={c.description} />
              <div className="sm:col-span-2"><Button onClick={() => void save()} disabled={busy}>{c.save}</Button></div>
            </div>
          )}

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium text-bone-200">{c.members}</h4>
              <ul className="mt-2 divide-y divide-line">
                {selected.members.map((member) => (
                  <li key={member.playerId} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span className="min-w-0">
                      <Link href={`/players/${member.playerId}`} className="block truncate text-bone-100 hover:text-gold-200">{member.name}</Link>
                      <span className="text-xs text-bone-500">{roleLabel(member.role, c)}</span>
                    </span>
                    {selected.myRole === "leader" && member.playerId !== selected.leaderId && (
                      <span className="flex gap-1">
                        <Button variant="quiet" onClick={() => void transfer(member.playerId)} disabled={busy}>{c.transfer}</Button>
                        <Button variant="quiet" onClick={() => void kick(member.playerId)} disabled={busy}>{c.kick}</Button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {(selected.myRole === "leader" || selected.myRole === "elder") && (
                <div className="mt-4 border-t border-line pt-3">
                  <h5 className="text-xs text-bone-400">{c.invitePlayer}</h5>
                  <div className="mt-2 flex gap-2">
                    <input className={INPUT} value={searchName} maxLength={40} placeholder={c.search} onChange={(e) => setSearchName(e.target.value)} />
                    <Button variant="ghost" onClick={() => void search()} disabled={busy || searchName.trim().length < 3}>{c.find}</Button>
                  </div>
                  {searchName.trim().length > 0 && searchName.trim().length < 3 && <p className="mt-1 text-xs text-bone-500">{c.searchHint}</p>}
                  <ul className="mt-2 space-y-1">
                    {found.map((player) => (
                      <li key={player.id} className="flex items-center justify-between gap-2 text-sm">
                        <span>{player.name}</span>
                        <Button variant="quiet" onClick={() => void invite(player.id)} disabled={busy}>{c.invite}</Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium text-bone-200">{c.invites}</h4>
              {selected.invites.length === 0 ? <p className="mt-2 text-sm text-bone-500">{c.noInvites}</p> : (
                <ul className="mt-2 space-y-1 text-sm">
                  {selected.invites.map((invite) => <li key={invite.id} className="flex justify-between gap-2 py-1"><span>{invite.name}</span><span className="text-xs text-bone-500">{c.invite}</span></li>)}
                </ul>
              )}
              <h4 className="mt-5 text-sm font-medium text-bone-200">{c.audit}</h4>
              {audit.length === 0 ? <p className="mt-2 text-sm text-bone-500">{c.noAudit}</p> : (
                <ul className="mt-2 space-y-1 text-xs text-bone-500">
                  {audit.slice(0, 8).map((entry) => <li key={entry.id}>{entry.action} · {entry.actor}</li>)}
                </ul>
              )}
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
