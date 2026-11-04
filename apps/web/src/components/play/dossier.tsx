"use client";

import {
  allSkills,
  findEducation,
  findProfession,
  findTalent,
  findWeakness,
  getUniverse,
  TEMPERAMENTS,
  type InteractionId,
  type NpcView
} from "@endemion/game-core";
import type { LifeView } from "@endemion/shared";
import { Meter, Ornament, Panel } from "@endemion/ui";
import { useState } from "react";
import { ageLabel } from "@/lib/format";
import type { MessageKey } from "@/lib/messages";
import type { GameStore } from "@/lib/store";
import { useI18n } from "../locale-provider";
import { EconomyPanel } from "./economy-panel";
import { LineagePanel } from "./lineage";

type Section = "bio" | "family" | "lineage" | "economy" | "skills" | "people";

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
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("create.temperament")}</dt>
          <dd className="text-bone-100">{temperament ? l(temperament.name) : "—"}</dd>
        </div>
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

function SkillsAndTalents({ life }: { life: LifeView }) {
  const { l, t } = useI18n();
  const universe = getUniverse(life.universeId);
  const c = life.character;
  const skills = allSkills(universe).filter((skill) => (c.skills[skill.id] ?? 0) > 0);
  const education = findEducation(universe, c.educationId);
  const profession = c.professionId ? findProfession(universe, c.professionId) : undefined;
  const specialization = universe.specializations.find((s) => s.id === c.specializationId);
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
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-md border border-line bg-ink-950/50 p-2">
          <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("dossier.education")}</dt>
          <dd className="text-bone-100" data-testid="education">
            {education ? l(education.name) : t("dossier.none")}
          </dd>
        </div>
        <div className="rounded-md border border-line bg-ink-950/50 p-2">
          <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("dossier.profession")}</dt>
          <dd className="text-bone-100">{profession ? l(profession.name) : t("dossier.none")}</dd>
        </div>
        <div className="rounded-md border border-line bg-ink-950/50 p-2">
          <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("dossier.specialization")}</dt>
          <dd className="text-bone-100">{specialization ? l(specialization.name) : t("dossier.none")}</dd>
        </div>
      </dl>
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
export function Dossier({ life, busy, store, onInteract }: { life: LifeView; busy: boolean; store: GameStore; onInteract: (npcId: string, interaction: InteractionId) => void }) {
  const { locale, l, t } = useI18n();
  const [section, setSection] = useState<Section>("bio");
  const universe = getUniverse(life.universeId);
  const sections: { id: Section; label: string }[] = [
    { id: "bio", label: t("dossier.bio") },
    { id: "family", label: t("dossier.family") },
    { id: "lineage", label: t("dossier.lineage") },
    { id: "economy", label: t("dossier.economy") },
    { id: "skills", label: t("dossier.skills") },
    { id: "people", label: t("dossier.people") }
  ];
  const quest = life.profile.quest;
  return (
    <Panel className="space-y-4" data-testid="dossier">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-2xl text-bone-100">{t("dossier.title")}</h2>
        <div className="flex flex-wrap rounded-md border border-line bg-ink-950/70 p-0.5" role="tablist" aria-label={t("dossier.title")}>
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={section === item.id}
              onClick={() => setSection(item.id)}
              className={`rounded px-2.5 py-1 text-xs transition ${section === item.id ? "bg-gold-500/20 text-gold-100" : "text-bone-300 hover:text-bone-100"}`}
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
      {section === "economy" && <EconomyPanel life={life} />}
      {section === "skills" && <SkillsAndTalents life={life} />}
      {section === "people" && <People life={life} busy={busy} onInteract={onInteract} />}
    </Panel>
  );
}
