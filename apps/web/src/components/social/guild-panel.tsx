"use client";

import { Button, Panel } from "@endemion/ui";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ClientError } from "@/lib/api";
import { useI18n } from "../locale-provider";
import { GuildHeraldry } from "./guild-heraldry";

interface Member {
  playerId: string;
  name: string;
  role: "leader" | "officer" | "member";
  contributed: number;
}
interface Project {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  status: "active" | "completed";
}
interface GuildRequest {
  id: string;
  playerId: string;
  name: string;
}
interface Guild {
  id: string;
  universeId: string;
  name: string;
  description: string;
  visibility: "public" | "request";
  reputation: number;
  leaderId: string;
  memberCount: number;
  myRole: "leader" | "officer" | "member" | null;
  members: Member[];
  projects: Project[];
  requests: GuildRequest[];
}

/** Stage 06.1: account-only guilds. The server owns roles, caps and project progress. */
export function GuildPanel() {
  const { t } = useI18n();
  const [guilds, setGuilds] = useState<Guild[] | null>(null);
  const [selected, setSelected] = useState<Guild | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "request">("public");
  const [projectTitle, setProjectTitle] = useState("");
  const [target, setTarget] = useState("500");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [guest, setGuest] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ guilds: Guild[] }>("/api/guilds");
      setGuilds(res.guilds);
      setGuest(false);
    } catch (error) {
      if (error instanceof ClientError && (error.code === "ACCOUNT_REQUIRED" || error.status === 401)) {
        setGuest(true);
        setGuilds([]);
      } else {
        setNotice(error instanceof ClientError ? error.message : t("guild.error"));
      }
    }
  }, [t]);

  useEffect(() => {
    const handle = setTimeout(() => void load(), 0);
    return () => clearTimeout(handle);
  }, [load]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      await load();
    } catch (error) {
      setNotice(error instanceof ClientError ? error.message : t("guild.error"));
    } finally {
      setBusy(false);
    }
  }

  async function open(id: string) {
    await run(async () => setSelected(await apiFetch<Guild>(`/api/guilds/${id}`)));
  }

  async function create() {
    await run(async () => {
      const guild = await apiFetch<Guild>("/api/guilds", {
        method: "POST",
        body: JSON.stringify({ universeId: "dark-fantasy", name, description, visibility })
      });
      setName("");
      setDescription("");
      setSelected(guild);
    });
  }

  async function act(path: string, body: unknown = {}) {
    await run(async () => setSelected(await apiFetch<Guild>(path, { method: "POST", body: JSON.stringify(body) })));
  }

  async function contribute(guild: Guild, project: Project) {
    const value = Number(amounts[project.id] ?? "10");
    await act(`/api/guilds/${guild.id}/projects/${project.id}/contribute`, {
      actionId: crypto.randomUUID(),
      amount: Number.isFinite(value) ? Math.max(1, Math.min(100, Math.floor(value))) : 10
    });
  }

  if (guest) {
    return (
      <Panel className="space-y-3" data-testid="guild-panel">
        <h2 className="font-display text-2xl text-gilded">{t("guild.title")}</h2>
        <p className="text-sm text-bone-300">{t("guild.guest")}</p>
      </Panel>
    );
  }

  return (
    <Panel className="space-y-5" data-testid="guild-panel">
      <div>
        <p className="eyebrow text-gold-300">{t("social.houses")}</p>
        <h2 className="mt-1 font-display text-3xl text-bone-100">{t("guild.title")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-bone-400">{t("guild.lead")}</p>
      </div>

      {notice && <p className="rounded-md border border-blood-500/40 bg-blood-600/10 px-3 py-2 text-sm text-blood-300" role="alert">{notice}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <input className="min-h-11 rounded-sm border border-line bg-ink-950 px-3 text-sm" placeholder={t("guild.name")} value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
        <input className="min-h-11 rounded-sm border border-line bg-ink-950 px-3 text-sm" placeholder={t("guild.description")} value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} />
        <select className="min-h-11 rounded-sm border border-line bg-ink-950 px-3 text-sm" value={visibility} onChange={(event) => setVisibility(event.target.value as "public" | "request")}>
          <option value="public">{t("guild.public")}</option>
          <option value="request">{t("guild.request")}</option>
        </select>
        <Button type="button" disabled={busy || name.trim().length < 3} onClick={() => void create()}>{t("guild.create")}</Button>
      </div>

      {guilds && guilds.length === 0 && <p className="text-sm text-bone-500">{t("guild.empty")}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {guilds?.map((guild) => (
          <button key={guild.id} type="button" className="flex min-h-16 items-center gap-3 rounded-sm border border-line px-3 py-2 text-left text-sm transition-colors hover:border-gold-500/60" onClick={() => void open(guild.id)} data-testid="guild-card">
            <GuildHeraldry guildId={guild.id} name={guild.name} size={36} />
            <span className="min-w-0">
              <span className="block truncate font-medium text-bone-100">{guild.name}</span>
              <span className="block truncate text-xs text-bone-500">{guild.universeId} · {guild.memberCount} · {guild.myRole ?? t("guild.join")}</span>
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="space-y-4 border-t border-line pt-4" data-testid="guild-detail">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-4">
              <GuildHeraldry guildId={selected.id} name={selected.name} size={64} />
              <div className="min-w-0">
                <h3 className="font-display text-3xl text-bone-100">{selected.name}</h3>
                <p className="mt-1 text-sm text-bone-400">{selected.description || selected.universeId}</p>
                <p className="mt-1 text-xs text-bone-500">{t("guild.reputation", { n: selected.reputation })}</p>
              </div>
            </div>
            {!selected.myRole && selected.visibility === "public" && (
              <Button type="button" disabled={busy} onClick={() => void act(`/api/guilds/${selected.id}/join`)}>{t("guild.join")}</Button>
            )}
            {selected.myRole && (
              <Button type="button" disabled={busy} onClick={() => void act(`/api/guilds/${selected.id}/leave`)}>{t("guild.leave")}</Button>
            )}
          </div>

          {selected.requests.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-bone-200">{t("guild.requests")}</h4>
              {selected.requests.map((request) => (
                <div key={request.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{request.name}</span>
                  <span className="flex gap-2">
                    <Button type="button" disabled={busy} onClick={() => void act(`/api/guilds/${selected.id}/requests/${request.id}/accept`)}>{t("guild.accept")}</Button>
                    <Button type="button" disabled={busy} onClick={() => void act(`/api/guilds/${selected.id}/requests/${request.id}/reject`)}>{t("guild.reject")}</Button>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-bone-200">{t("guild.members")}</h4>
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {selected.members.map((member) => (
                <li key={member.playerId} className="flex justify-between gap-3"><span>{member.name}</span><span className="text-xs text-bone-500">{t(`guild.${member.role}`)}</span></li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-bone-200">{t("guild.projects")}</h4>
            {selected.projects.map((project) => (
              <div key={project.id} className="rounded-sm border border-line p-3 text-sm">
                <div className="flex justify-between gap-2"><span>{project.title}</span><span>{project.progress}/{project.target}</span></div>
                <p className="text-xs text-bone-500">{project.status === "completed" ? t("guild.done") : project.description}</p>
                {project.status === "active" && selected.myRole && (
                  <div className="mt-2 flex gap-2">
                    <input className="min-h-11 w-24 rounded-sm border border-line bg-ink-950 px-2 text-sm" inputMode="numeric" value={amounts[project.id] ?? "10"} onChange={(event) => setAmounts({ ...amounts, [project.id]: event.target.value })} />
                    <Button type="button" disabled={busy} onClick={() => void contribute(selected, project)}>{t("guild.contribute")}</Button>
                  </div>
                )}
              </div>
            ))}
            {(selected.myRole === "leader" || selected.myRole === "officer") && (
              <div className="grid gap-2 sm:grid-cols-3">
                <input className="min-h-11 rounded-sm border border-line bg-ink-950 px-3 text-sm" placeholder={t("guild.project")} value={projectTitle} maxLength={80} onChange={(event) => setProjectTitle(event.target.value)} />
                <input className="min-h-11 rounded-sm border border-line bg-ink-950 px-3 text-sm" inputMode="numeric" value={target} onChange={(event) => setTarget(event.target.value)} />
                <Button type="button" disabled={busy || projectTitle.trim().length < 3} onClick={() => void run(async () => {
                  await apiFetch(`/api/guilds/${selected.id}/projects`, { method: "POST", body: JSON.stringify({ title: projectTitle, target: Math.max(100, Math.min(10000, Number(target) || 500)) }) });
                  setProjectTitle("");
                })}>{t("guild.create")}</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
