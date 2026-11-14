"use client";

import {
  allSkills,
  findTalent,
  findWeakness,
  getUniverse,
  TEMPERAMENTS,
  type InteractionId,
  type NpcView,
  type TradeSide
} from "@endemion/game-core";
import type { LifeView } from "@endemion/shared";
import { Meter, Ornament, Panel } from "@endemion/ui";
import { useRef, useState } from "react";
import { ageLabel } from "@/lib/format";
import type { MessageKey } from "@/lib/messages";
import type { GameStore } from "@/lib/store";
import { useI18n } from "../locale-provider";
import { AdventurePanel } from "./adventure-panel";
import { MasteryPanel } from "./mastery-panel";
import { EconomyPanel } from "./economy-panel";
import { LineagePanel } from "./lineage";
import { WorldPanel } from "./world-panel";

type Section = "bio" | "family" | "lineage" | "world" | "economy" | "adventure" | "skills" | "people";

function Signed({ value }: { value: number }) {
  const tone = value > 0 ? "text-jade-300" : value < 0 ? "text-blood-300" : "text-bone-300";
  return <span className={`tabular-nums ${tone}`}>{value > 0 ? `+${value}` : value}</span>;
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-[11px] uppercase tracking-[0.22em] text-gold-400">{children}</h3>;
}

/** Человек в семейном древе: имя, роль, возраст или дата смерти */
function TreeNode({ npc, you }: { npc?: NpcView; you?: string }) {
  const { l, t } = useI18n();
  if (you) {
    return (
      <li className="rounded-md border border-gold-400/70 bg-gold-500/10 px-3 py-2 text-center" data-testid="tree-you">
        <p className="text-[10px] uppercase tracking-wider text-gold-300">{t("dossier.you")}</p>
        <p className="text-sm text-gold-100">{you}</p>
      </li>
    );
  }
  if (!npc) return null;
  return (
    <li className={`rounded-md border px-3 py-2 text-center ${npc.alive ? "border-line bg-ink-950/60" : "border-line/50 bg-ink-950/30 opacity-60"}`} data-testid="tree-node" data-role={npc.role}>
      <p className="text-[10px] uppercase tracking-wider text-bone-500">{l(npc.roleName)}</p>
      <p className="text-sm text-bone-100">{npc.name}</p>
      <p className="text-[11px] text-bone-500">{npc.alive ? t("dossier.age", { n: npc.age }) : t("dossier.dead", { age: npc.diedAt ?? 0 })}</p>
    </li>
  );
}

function TreeRow({ label, people, you }: { label: string; people: NpcView[]; you?: string }) {
  if (people.length === 0 && !you) return null;
  return (
    <div>
      <p className="mb-1.5 text-center text-[10px] uppercase tracking-[0.2em] text-bone-500">{label}</p>
      <ul className="flex flex-wrap justify-center gap-2">
        {people.map((npc) => (
          <TreeNode key={npc.id} npc={npc} />
        ))}
        {you && <TreeNode you={you} />}
      </ul>
    </div>
  );
}

/** Семейное древо по поколениям: старшие, родители, персонаж с братьями и сёстрами, супруг, дети */
function FamilyTree({ life }: { life: LifeView }) {
  const { t } = useI18n();
  const family = life.profile.npcs.filter((npc) => npc.family);
  const of = (...roles: string[]) => family.filter((npc) => roles.includes(npc.role));
  const connector = <div className="mx-auto h-4 w-px bg-line" aria-hidden="true" />;
  return (
    <div className="space-y-1" data-testid="family-tree">
      <p className="mb-3 text-center font-display text-lg text-bone-100">{life.profile.familyName || life.character.name}</p>
      {of("grandparent").length > 0 && (
        <>
          <TreeRow label={t("dossier.grandparents")} people={of("grandparent")} />
          {connector}
        </>
      )}
      {of("father", "mother").length > 0 && (
        <>
          <TreeRow label={t("dossier.parents")} people={of("father", "mother")} />
          {connector}
        </>
      )}
      <TreeRow label={t("dossier.siblings")} people={of("sibling")} you={life.character.name} />
      {of("spouse").length > 0 && (
        <>
          {connector}
          <TreeRow label={t("dossier.spouse")} people={of("spouse")} />
        </>
      )}
      {of("child").length > 0 && (
        <>
          {connector}
          <TreeRow label={t("dossier.children")} people={of("child")} />
        </>
      )}
      {family.length === 0 && <p className="text-center text-xs text-bone-500">{t("dossier.noFamily")}</p>}
    </div>
  );
}

function Biography({ life }: { life: LifeView }) {
  const { l, t } = useI18n();
  const universe = getUniverse(life.universeId);
  const c = life.character;
  const p = life.profile;
  const race = universe.races.find((r) => r.id === c.raceId);
  const origin = universe.origins.find((o) => o.id === c.originId);
  const temperament = TEMPERAMENTS.find((x) => x.id === c.temperamentId);
  const socialClass = universe.socialClasses.find((s) => s.id === c.socialClassId);
  const upbringing = life.profile.upbringing;
  return (
    <div className="space-y-5" data-testid="dossier-bio">
      <div className="space-y-3 text-sm leading-relaxed text-bone-300">
        {p.biography.map((paragraph, i) => (
          <p key={i}>{l(paragraph)}</p>
        ))}
      </div>
      <Ornament />
      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("dossier.origin")}</dt>
          <dd className="text-bone-100">{[race && l(race.name), origin && l(origin.name)].filter(Boolean).join(" · ")}</dd>
          {origin && <dd className="text-xs text-bone-500">{l(origin.description)}</dd>}
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("sheet.class")}</dt>
          <dd className="text-bone-100" data-testid="social-class">
            {socialClass ? l(socialClass.name) : "—"}
          </dd>
          {socialClass && <dd className="text-xs text-bone-500">{l(socialClass.description)}</dd>}
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("dossier.birthplace")}</dt>
          <dd className="text-bone-100">{l(p.birthplace)}</dd>
        </div>
        {p.omen.ru.trim() && (
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("dossier.omen")}</dt>
            <dd className="text-bone-100" data-testid="omen">
              {l(p.omen)}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("create.temperament")}</dt>
          <dd className="text-bone-100">{temperament ? l(temperament.name) : "—"}</dd>
        </div>
        {upbringing && (
          <div data-testid="dossier-upbringing">
            <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("dossier.upbringing")}</dt>
            <dd className="text-bone-100">{l(upbringing.name)}</dd>
            <dd className="text-xs text-bone-500">{l(upbringing.description)}</dd>
            {upbringing.skills.length > 0 && (
              <dd className="mt-1 text-[11px] text-bone-400">
                {t("create.skills")}: {upbringing.skills.map((skill) => `${l(skill.name)} +${skill.amount}`).join(" · ")}
              </dd>
            )}
            {upbringing.talent && (
              <dd className="text-[11px] text-gold-300">
                {t("create.talent")}: {l(upbringing.talent.name)}
              </dd>
            )}
          </div>
        )}
      </dl>
      {p.familyHistory.ru && (
        <div>
          <Heading>{t("dossier.familyHistory")}</Heading>
          <p className="text-sm leading-relaxed text-bone-300">{l(p.familyHistory)}</p>
        </div>
      )}
      <div>
        <Heading>{t("dossier.hidden")}</Heading>
        <dl className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-md border border-line bg-ink-950/50 p-2">
            <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("dossier.potential")}</dt>
            <dd className="font-display text-lg text-bone-100">{p.potential === null ? t("dossier.unknown") : `${p.potential}/10`}</dd>
          </div>
          <div className="rounded-md border border-line bg-ink-950/50 p-2">
            <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("dossier.destiny")}</dt>
            <dd className="font-display text-lg text-bone-100">{p.destiny === null ? t("dossier.unknown") : `${p.destiny}/10`}</dd>
          </div>
        </dl>
        <div className="mt-3 space-y-1 text-xs text-bone-500">
          {p.secret ? (
            <p className="rounded-md border border-gold-500/30 bg-gold-500/5 px-3 py-2 text-gold-200">
              <span className="block font-medium">{l(p.secret.name)}</span>
              {l(p.secret.reveal)}
            </p>
          ) : (
            <p>{p.unknownSecret ? t("dossier.secretUnknown") : t("dossier.noSecret")}</p>
          )}
          {p.dormantTalents > 0 && <p>{t("dossier.dormant", { n: p.dormantTalents })}</p>}
          {p.pendingConsequences > 0 && <p data-testid="pending-consequences">{t("dossier.consequences", { n: p.pendingConsequences })}</p>}
        </div>
      </div>
    </div>
  );
}

function EducationAndCareer({ life }: { life: LifeView }) {
  const { l, t } = useI18n();
  const universe = getUniverse(life.universeId);
  const education = life.education;
  const career = life.career;
  const specialization = universe.specializations.find((s) => s.id === life.character.specializationId);
  return (
    <div className="space-y-3" data-testid="education-career">
      <Heading>{t("dossier.educationCareer")}</Heading>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-line bg-ink-950/50 p-2.5" data-testid="education-panel">
          <p className="text-[10px] uppercase tracking-wider text-bone-500">{t("dossier.education")}</p>
          {education.current ? (
            <>
              <p className="text-sm text-bone-100" data-testid="education-current">
                {l(education.current.name)}
              </p>
              <p className="text-[11px] text-bone-400">
                {t("education.progress", { done: education.current.progress, total: education.current.duration })}
                {education.current.tuition > 0 && ` · ${t("education.tuition", { n: education.current.tuition })}`}
              </p>
            </>
          ) : education.completed ? (
            <p className="text-sm text-bone-100" data-testid="education-current">
              {l(education.completed.name)}
            </p>
          ) : (
            <p className="text-xs text-bone-500">{t("dossier.none")}</p>
          )}
          {education.next && !education.current && (
            <p className="mt-1 text-[11px] text-bone-500">
              {t("education.next", { name: l(education.next.stepName), age: education.next.minAge })}
            </p>
          )}
        </div>
        <div className="rounded-md border border-line bg-ink-950/50 p-2.5" data-testid="career-panel">
          <p className="text-[10px] uppercase tracking-wider text-bone-500">{t("career.title")}</p>
          <p className="text-sm text-bone-100" data-testid="career-profession">
            {career.profession ? l(career.profession) : t("career.noJob")}
          </p>
          <p className="text-[11px] text-bone-400" data-testid="career-status">
            {l(career.statusName)}
            {career.rankName && ` · ${l(career.rankName)}`}
            {career.tenure > 0 && ` · ${t("career.tenure", { n: career.tenure })}`}
          </p>
          {career.status === "employed" && <p className="text-[11px] text-gold-300">{t("career.wage", { n: career.wage })}</p>}
          {career.status === "employed" && career.nextRankName && (
            <p className="text-[11px] text-bone-500">
              {career.promotionReady ? t("career.promotionReady", { name: l(career.nextRankName) }) : t("career.nextRank", { name: l(career.nextRankName) })}
            </p>
          )}
          {career.retirementAge !== null && <p className="text-[11px] text-bone-500">{t("career.retirementAt", { n: career.retirementAge })}</p>}
          {specialization && <p className="mt-1 text-[11px] text-gold-300">{t("dossier.specialization")}: {l(specialization.name)}</p>}
        </div>
      </div>
    </div>
  );
}

function SkillsAndTalents({ life }: { life: LifeView }) {
  const { l, t } = useI18n();
  const universe = getUniverse(life.universeId);
  const c = life.character;
  const skills = allSkills(universe).filter((skill) => (c.skills[skill.id] ?? 0) > 0);
  const factions = universe.factions.filter((f) => (c.factions[f.id] ?? 0) !== 0);
  const categories = ["combat", "magic", "cultivation", "social", "utility"] as const;
  return (
    <div className="space-y-5" data-testid="dossier-skills">
      <div>
        <Heading>{t("dossier.talents")}</Heading>
        {c.talents.length === 0 ? (
          <p className="text-xs text-bone-500">{t("dossier.noTalents")}</p>
        ) : (
          <ul className="space-y-2" data-testid="talents">
            {c.talents.map((id) => {
              const talent = findTalent(universe, id);
              return talent ? (
                <li key={id} className="rounded-md border border-gold-500/30 bg-gold-500/5 px-3 py-2">
                  <p className="text-sm text-gold-200">{l(talent.name)}</p>
                  <p className="text-xs text-bone-300">{l(talent.description)}</p>
                </li>
              ) : null;
            })}
          </ul>
        )}
      </div>
      <div>
        <Heading>{t("dossier.weaknesses")}</Heading>
        {c.weaknesses.length === 0 ? (
          <p className="text-xs text-bone-500">{t("dossier.noWeaknesses")}</p>
        ) : (
          <ul className="space-y-2">
            {c.weaknesses.map((id) => {
              const weakness = findWeakness(universe, id);
              return weakness ? (
                <li key={id} className="rounded-md border border-blood-500/30 bg-blood-600/5 px-3 py-2">
                  <p className="text-sm text-blood-300">{l(weakness.name)}</p>
                  <p className="text-xs text-bone-300">{l(weakness.description)}</p>
                </li>
              ) : null;
            })}
          </ul>
        )}
      </div>
      <div>
        <Heading>{t("dossier.skillsTitle")}</Heading>
        {skills.length === 0 ? (
          <p className="text-xs text-bone-500">{t("dossier.noSkills")}</p>
        ) : (
          <div className="space-y-2.5" data-testid="skills">
            {skills.map((skill) => (
              <div key={skill.id} title={l(skill.description)}>
                <Meter label={l(skill.name)} value={c.skills[skill.id] ?? 0} max={100} tone="gold" caption={String(c.skills[skill.id] ?? 0)} />
              </div>
            ))}
          </div>
        )}
      </div>
      <EducationAndCareer life={life} />
      {c.abilities.length > 0 && (
        <div>
          <Heading>{t("dossier.abilities")}</Heading>
          <div className="space-y-2">
            {categories.map((category) => {
              const list = universe.abilities.filter((a) => (a.category ?? "utility") === category && c.abilities.includes(a.id));
              if (list.length === 0) return null;
              return (
                <p key={category} className="text-xs text-bone-300">
                  <span className="mr-2 uppercase tracking-wider text-bone-500">{t(`ability.${category}` as MessageKey)}</span>
                  {list.map((a) => l(a.name)).join(" · ")}
                </p>
              );
            })}
          </div>
        </div>
      )}
      {factions.length > 0 && (
        <div>
          <Heading>{t("dossier.factions")}</Heading>
          <dl className="space-y-1 text-sm">
            {factions.map((faction) => (
              <div key={faction.id} className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-1" title={l(faction.description)}>
                <dt className="text-bone-300">{l(faction.name)}</dt>
                <dd>
                  <Signed value={c.factions[faction.id] ?? 0} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function Connections({ life }: { life: LifeView }) {
  const { l, t } = useI18n();
  const connections = life.profile.connections;
  return (
    <div className="rounded-md border border-line bg-ink-950/50 p-3" data-testid="connections">
      <Heading>{t("dossier.connections")}</Heading>
      {connections.length === 0 ? (
        <p className="text-xs text-bone-500">{t("dossier.connectionsEmpty")}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {connections.map((connection) => (
            <li key={connection.id} className="rounded border border-line bg-ink-900/60 px-2 py-1 text-[11px] text-bone-300" data-connection={connection.npcId} title={t("dossier.trust", { n: connection.trust })}>
              <span className="text-bone-100">{connection.name}</span>
              <span className="ml-2 text-bone-500">{l(connection.type)}</span>
              <span className="ml-2">
                <Signed value={connection.strength} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {life.profile.recentChanges.length > 0 && (
        <div className="mt-2 space-y-0.5" data-testid="recent-changes">
          <p className="text-[10px] uppercase tracking-wider text-bone-500">{t("dossier.recentChanges")}</p>
          {life.profile.recentChanges.map((change, index) => (
            <p key={`${change.npcId}-${index}`} className="text-[11px] text-bone-500">
              <span className="text-bone-400">{change.npc}</span> · {l(change.text)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function StoryList({ npc }: { npc: NpcView }) {
  const { l, t } = useI18n();
  if (npc.stories.length === 0) return null;
  return (
    <div className="mt-2 space-y-1" data-testid="npc-story">
      {npc.stories.map((story) => {
        const statusKey: MessageKey = story.status === "done" ? "dossier.storyDone" : story.status === "failed" ? "dossier.storyFailed" : "dossier.storyAbandoned";
        return (
          <div key={story.id} className="rounded border border-gold-500/25 bg-gold-500/5 px-2 py-1.5">
            <p className="text-[10px] uppercase tracking-wider text-gold-300">
              {l(story.title)} · {t("dossier.storyStage", { n: story.stage, max: story.stages })}
              {story.status !== "active" && ` · ${t(statusKey)}`}
            </p>
            {story.text.ru.trim() && <p className="text-[11px] text-bone-300">{l(story.text)}</p>}
          </div>
        );
      })}
    </div>
  );
}

function NpcRelationships({ npc }: { npc: NpcView }) {
  const { l, t } = useI18n();
  return (
    <div className="mt-2" data-testid="npc-relationships">
      <p className="text-[10px] uppercase tracking-wider text-bone-500">{t("dossier.relationships")}</p>
      {npc.relationships.length === 0 ? (
        <p className="text-[11px] text-bone-500">{t("dossier.noRelationships")}</p>
      ) : (
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {npc.relationships.slice(0, 6).map((relationship) => (
            <li key={relationship.id} className="rounded border border-line px-2 py-0.5 text-[11px] text-bone-300" title={t("dossier.trust", { n: relationship.trust })}>
              {relationship.name} <span className="text-bone-500">{l(relationship.type)}</span> <Signed value={relationship.strength} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NpcEvents({ npc }: { npc: NpcView }) {
  const { l, t } = useI18n();
  return (
    <div className="mt-2" data-testid="npc-events">
      <p className="text-[10px] uppercase tracking-wider text-bone-500">{t("dossier.events")}</p>
      {npc.events.length === 0 ? (
        <p className="text-[11px] text-bone-500">{t("dossier.noEvents")}</p>
      ) : (
        <ul className="mt-0.5 space-y-0.5">
          {npc.events.slice(0, 5).map((event, index) => (
            <li key={`${event.age}-${index}`} className="text-[11px] text-bone-500">
              <span className="tabular-nums text-bone-400">{event.age}</span> · {l(event.text)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function People({ life, busy, onInteract }: { life: LifeView; busy: boolean; onInteract: (npcId: string, interaction: InteractionId) => void }) {
  const { l, t } = useI18n();
  const people = [...life.profile.npcs].sort((a, b) => Number(b.alive) - Number(a.alive) || b.affinity - a.affinity);
  if (people.length === 0)
    return (
      <p className="text-xs text-bone-500" data-testid="dossier-people">
        {t("dossier.noPeople")}
      </p>
    );
  const dead = life.status === "dead";
  return (
    <div className="space-y-3" data-testid="dossier-people">
      <Connections life={life} />
      {!dead && <p className="text-xs text-bone-500">{t("dossier.interactHint")}</p>}
      <ul className="space-y-3">
        {people.map((npc) => {
          const percent = (npc.affinity + 100) / 2;
          return (
            <li key={npc.id} className={`rounded-lg border p-3 ${npc.alive ? "border-line bg-ink-950/60" : "border-line/50 bg-ink-950/30 opacity-60"}`} data-testid="npc" data-npc={npc.id} data-role={npc.role}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-bone-100">
                  {npc.name}
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-bone-500">{l(npc.roleName)}</span>
                </p>
                <p className="text-[11px] text-bone-500">
                  {npc.alive ? t("dossier.age", { n: npc.age }) : t("dossier.dead", { age: npc.diedAt ?? 0 })} · {t("dossier.power", { n: npc.power })}
                </p>
              </div>
              <p className="mt-1 text-xs text-bone-300">{l(npc.bio)}</p>
              {npc.occupation.ru.trim() && <p className="mt-1 text-xs text-bone-400">{l(npc.occupation)}</p>}
              <p className="mt-1 text-[11px] text-bone-500" data-testid="npc-stage">
                {[
                  `${t("dossier.stage")}: ${l(npc.stage)}`,
                  `${t("dossier.socialClass")}: ${l(npc.socialClass)}`,
                  npc.settlement ? `${t("dossier.settlement")}: ${l(npc.settlement)}` : null,
                  npc.goal ? `${t("dossier.goal")}: ${l(npc.goal)}` : null
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="mt-1 text-[11px] text-bone-500">{t("dossier.met", { age: npc.metAt })}</p>
              <StoryList npc={npc} />
              <NpcRelationships npc={npc} />
              <NpcEvents npc={npc} />
              <div className="mt-2 flex items-center gap-2">
                <div
                  className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-ink-950/80 ring-1 ring-line"
                  role="meter"
                  aria-label={l(npc.affinityLabel)}
                  aria-valuemin={-100}
                  aria-valuemax={100}
                  aria-valuenow={npc.affinity}
                >
                  <div className="absolute inset-y-0 left-1/2 w-px bg-line" aria-hidden="true" />
                  <div className={`h-full rounded-full ${npc.affinity >= 0 ? "bg-jade-400" : "bg-blood-400"}`} style={{ width: `${percent}%` }} />
                </div>
                <span className="w-32 shrink-0 text-right text-[11px] text-bone-300" data-testid="affinity" data-value={npc.affinity}>
                  {npc.bond ? `${t("dossier.bond")} · ` : ""}
                  {l(npc.affinityLabel)} <Signed value={npc.affinity} />
                </span>
              </div>
              {npc.alive && !dead && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {npc.interactions
                    .filter((interaction) => interaction.available)
                    .map((interaction) => (
                      <button
                        key={interaction.id}
                        type="button"
                        disabled={busy}
                        onClick={() => onInteract(npc.id, interaction.id)}
                        className="rounded border border-line bg-ink-900/70 px-2 py-1 text-[11px] text-bone-100 transition enabled:hover:border-gold-400/70 enabled:hover:text-gold-100 focus-visible:outline-2 focus-visible:outline-gold-300 disabled:opacity-50"
                        data-testid="interact"
                        data-interaction={interaction.id}
                      >
                        {l(interaction.name)}
                        {interaction.chance !== null && <span className="ml-1 tabular-nums text-bone-500">{Math.round(interaction.chance * 100)}%</span>}
                      </button>
                    ))}
                  {(() => {
                    const locked = npc.interactions.find((interaction) => !interaction.available && interaction.locked);
                    if (!locked) return null;
                    const label =
                      locked.locked === "year"
                        ? t("dossier.lockedYear")
                        : locked.locked === "rule"
                          ? t("dossier.lockedRule")
                          : locked.locked === "dead"
                            ? t("dossier.lockedDead")
                            : locked.locked === "missing"
                              ? t("dossier.lockedMissing")
                              : null;
                    if (!label || (locked.locked !== "year" && npc.interactions.some((interaction) => interaction.available))) return null;
                    return (
                      <span className="px-2 py-1 text-[11px] text-bone-500" data-testid="interact-locked" data-lock={locked.locked}>
                        {label}
                      </span>
                    );
                  })()}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Досье персонажа: биография и происхождение, семья, род (древо, хроника рода, достижения, наследство), навыки и таланты, люди вокруг */
export function Dossier({
  life,
  busy,
  store,
  section: requested,
  jump,
  onInteract,
  onTrade,
  onVenture,
  onRefresh
}: {
  life: LifeView;
  busy: boolean;
  store: GameStore;
  section?: Section;
  jump?: number;
  onInteract: (npcId: string, interaction: InteractionId) => void;
  onTrade: (goodId: string, side: TradeSide, qty: number) => void;
  onVenture: (action: { adventureId?: string; choiceId?: string; abandon?: boolean }) => void;
  onRefresh: () => void | Promise<void>;
}) {
  const { locale, l, t } = useI18n();
  const [section, setSection] = useState<Section>(requested ?? "bio");
  const [seenJump, setSeenJump] = useState(jump);
  if (jump !== seenJump) {
    setSeenJump(jump);
    if (requested) setSection(requested);
  }
  const tabsRef = useRef<HTMLDivElement>(null);
  const universe = getUniverse(life.universeId);
  const sections: { id: Section; label: string }[] = [
    { id: "bio", label: t("dossier.bio") },
    { id: "family", label: t("dossier.family") },
    { id: "lineage", label: t("dossier.lineage") },
    { id: "world", label: t("dossier.world") },
    { id: "economy", label: t("dossier.economy") },
    { id: "adventure", label: t("dossier.adventure") },
    { id: "skills", label: t("dossier.skills") },
    { id: "people", label: t("dossier.people") }
  ];
  const quest = life.profile.quest;
  const openChance = life.pendingEvent?.choices.find((choice) => choice.available && choice.chance !== null)?.chance ?? null;
  return (
    <Panel className="space-y-4" data-testid="dossier">
      <p className="text-sm text-bone-100 lg:hidden" data-testid="dossier-now">
        {[ageLabel(life.life.age, locale), life.pendingEvent && l(life.pendingEvent.title), openChance != null && t("play.chance", { n: Math.round(openChance * 100) })].filter(Boolean).join(" · ")}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-2xl text-bone-100">{t("dossier.title")}</h2>
          <div
            ref={tabsRef}
            className="flex max-w-full gap-0.5 overflow-x-auto rounded-md border border-line bg-ink-950/70 p-0.5"
            role="tablist"
            aria-label={t("dossier.title")}
            onKeyDown={(event) => {
              const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
              if (!keys.includes(event.key)) return;
              event.preventDefault();
              const index = sections.findIndex((item) => item.id === section);
              const next =
                event.key === "Home" ? 0 : event.key === "End" ? sections.length - 1 : event.key === "ArrowRight" ? (index + 1) % sections.length : (index - 1 + sections.length) % sections.length;
              const id = sections[next]?.id;
              if (!id) return;
              setSection(id);
              tabsRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${id}"]`)?.focus();
            }}
          >
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              data-tab={item.id}
              aria-selected={section === item.id}
              tabIndex={section === item.id ? 0 : -1}
              onClick={() => setSection(item.id)}
              className={`shrink-0 whitespace-nowrap rounded px-2.5 py-1 text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 ${section === item.id ? "bg-gold-500/20 text-gold-100" : "text-bone-300 hover:text-bone-100"}`}
              data-testid={`dossier-tab-${item.id}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {life.profile.meters.length > 0 && (
        <div className="space-y-2" data-testid="world-meters">
          <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: universe.theme.accent }}>
            {t("sheet.world")}
          </p>
          {life.profile.meters.map((meter) => (
            <div key={meter.id} title={l(meter.description)} data-meter={meter.id} data-value={meter.value}>
              <Meter label={l(meter.name)} value={meter.value - meter.min} max={meter.max - meter.min} tone={meter.danger ? "blood" : "azure"} caption={String(meter.value)} />
            </div>
          ))}
        </div>
      )}

      {quest && (
        <div className="rounded-md border border-azure-500/40 bg-azure-600/10 px-3 py-2" data-testid="quest">
          <p className="text-[10px] uppercase tracking-[0.2em] text-azure-300">
            {t("dossier.quest")} · {t("dossier.questDeadline", { age: ageLabel(quest.deadline, locale) })}
          </p>
          <p className="text-sm text-bone-100">{l(quest.title)}</p>
          <p className="text-xs text-bone-300">{l(quest.text)}</p>
        </div>
      )}
      {life.profile.questsDone > 0 && <p className="text-xs text-bone-500">{t("dossier.questsDone", { n: life.profile.questsDone })}</p>}

      <Ornament />
      {section === "bio" && <Biography life={life} />}
      {section === "family" && <FamilyTree life={life} />}
      {section === "lineage" && <LineagePanel life={life} store={store} />}
      {section === "world" && <WorldPanel life={life} />}
      {section === "economy" && <EconomyPanel life={life} busy={busy} onTrade={onTrade} onRefresh={onRefresh} />}
      {section === "adventure" && (
        <>
        <MasteryPanel life={life} />
        <AdventurePanel
          life={life}
          busy={busy}
          onBegin={(adventureId) => onVenture({ adventureId })}
          onChoose={(choiceId) => onVenture({ choiceId })}
          onAbandon={() => onVenture({ abandon: true })}
        />
        </>
      )}
      {section === "skills" && <SkillsAndTalents life={life} />}
      {section === "people" && <People life={life} busy={busy} onInteract={onInteract} />}
    </Panel>
  );
}
