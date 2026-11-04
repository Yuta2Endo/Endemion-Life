"use client";

import { ACHIEVEMENT_CATEGORIES, NPC_STATUS_NAMES, type AchievementView, type InheritanceView, type LineageView, type TreeNodeView } from "@endemion/game-core";
import type { LifeView } from "@endemion/shared";
import { Button, Meter } from "@endemion/ui";
import { useEffect, useMemo, useState } from "react";
import type { GameStore } from "@/lib/store";
import type { MessageKey } from "@/lib/messages";
import { useI18n } from "../locale-provider";

type Section = "tree" | "chronicle" | "achievements" | "inheritance";

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-[11px] uppercase tracking-[0.22em] text-gold-400">{children}</h3>;
}

const ZOOM = [
  { node: "w-28 px-2 py-1.5", name: "text-xs", meta: "text-[10px]" },
  { node: "w-36 px-3 py-2", name: "text-sm", meta: "text-[11px]" },
  { node: "w-44 px-3 py-2.5", name: "text-base", meta: "text-xs" }
] as const;

/** Человек в древе: умершие приглушены и отмечены крестом, текущий персонаж — золотой рамкой, наследники — меткой */
function TreeNode({ node, zoom, selected, related, onSelect }: { node: TreeNodeView; zoom: number; selected: boolean; related: boolean; onSelect: (id: string) => void }) {
  const { l, t } = useI18n();
  const size = ZOOM[zoom]!;
  const tone = node.isSelf ? "border-gold-400/80 bg-gold-500/10" : node.alive ? "border-line bg-ink-950/70" : "border-line/50 bg-ink-950/30";
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        aria-pressed={selected}
        aria-label={`${node.name}, ${l(node.relation ?? node.roleName)}, ${node.alive ? t("dossier.age", { n: node.age }) : l(NPC_STATUS_NAMES.deceased)}`}
        className={`${size.node} relative rounded-md border text-center transition focus-visible:outline-2 focus-visible:outline-gold-300 ${tone} ${selected ? "ring-2 ring-gold-300" : related ? "ring-1 ring-gold-500/50" : ""} ${node.alive || node.isSelf ? "" : "opacity-60"}`}
        data-testid={node.isSelf ? "tree-you" : "tree-node"}
        data-node={node.id}
        data-alive={node.alive}
        data-heir={node.heir}
      >
        <span className={`block truncate uppercase tracking-wider text-bone-500 ${size.meta}`}>{node.isSelf ? t("lineage.you") : l(node.relation ?? node.roleName)}</span>
        <span className={`block truncate ${size.name} ${node.isSelf ? "text-gold-100" : "text-bone-100"}`}>
          {!node.alive && <span aria-hidden="true">✝ </span>}
          {node.name}
        </span>
        <span className={`block text-bone-500 ${size.meta}`}>
          {node.died === null ? t("lineage.bornYear", { year: node.born }) : t("lineage.years", { born: node.born, died: node.died })}
          {node.status === "missing" && ` · ${l(NPC_STATUS_NAMES.missing)}`}
        </span>
        {(node.heir || node.lifeGen !== null || node.adopted) && (
          <span className={`mt-0.5 block truncate ${size.meta} ${node.heir ? "text-jade-300" : "text-gold-300"}`}>
            {[node.heir && t("lineage.heir"), node.lifeGen !== null && !node.isSelf && t("lineage.played", { n: node.lifeGen }), node.adopted && t("lineage.adopted")].filter(Boolean).join(" · ")}
          </span>
        )}
      </button>
    </li>
  );
}

/** Группа в ряду: дети одних родителей под общей скобкой, супруг рядом через ⚭ */
interface Group {
  key: string;
  parents: string[];
  nodes: TreeNodeView[];
}

function groupRow(row: TreeNodeView[], byId: Map<string, TreeNodeView>): Group[] {
  const groups = new Map<string, Group>();
  const placed = new Set<string>();
  const sorted = [...row].sort((a, b) => a.born - b.born || a.id.localeCompare(b.id));
  for (const node of sorted) {
    if (placed.has(node.id)) continue;
    const key = node.parents.length > 0 ? [...node.parents].sort().join("+") : `solo:${node.id}`;
    const group = groups.get(key) ?? { key, parents: node.parents, nodes: [] };
    group.nodes.push(node);
    placed.add(node.id);
    // Супруг без родителей в древе встаёт рядом
    const spouse = node.spouseId ? byId.get(node.spouseId) : undefined;
    if (spouse && !placed.has(spouse.id) && spouse.level === node.level && spouse.parents.length === 0) {
      group.nodes.push(spouse);
      placed.add(spouse.id);
    }
    groups.set(key, group);
  }
  return [...groups.values()];
}

function PersonCard({ node, byId, onClose }: { node: TreeNodeView; byId: Map<string, TreeNodeView>; onClose: () => void }) {
  const { l, t } = useI18n();
  const parents = node.parents.map((id) => byId.get(id)?.name).filter(Boolean);
  const spouse = node.spouseId ? byId.get(node.spouseId)?.name : undefined;
  return (
    <section className="rounded-lg border border-gold-500/40 bg-ink-950/80 p-4" aria-label={t("lineage.card")} data-testid="person-card" data-node={node.id}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-bone-500">{node.isSelf ? t("lineage.you") : l(node.relation ?? node.roleName)}</p>
          <p className="font-display text-xl text-bone-100">{node.name}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded px-2 py-1 text-bone-500 hover:text-gold-200 focus-visible:outline-2 focus-visible:outline-gold-300" aria-label={t("lineage.close")}>
          ✕
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("lineage.status")}</dt>
          <dd className={node.alive ? "text-jade-300" : "text-bone-300"}>
            {l(NPC_STATUS_NAMES[node.status])}, {t("dossier.age", { n: node.age })}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("lineage.occupation")}</dt>
          <dd className="text-bone-100">{l(node.occupation)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("sheet.class")}</dt>
          <dd className="text-bone-100">{l(node.socialClass)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("lineage.relation")}</dt>
          <dd className="text-bone-100">{parents.length > 0 ? parents.join(", ") : t("lineage.noParents")}</dd>
          {spouse && <dd className="text-xs text-bone-500">⚭ {spouse}</dd>}
        </div>
        {!node.alive && node.cause && (
          <div className="col-span-2">
            <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("lineage.cause")}</dt>
            <dd className="text-bone-300">{l(node.cause)}</dd>
          </div>
        )}
      </dl>
      {node.bio.ru && <p className="mt-3 text-xs leading-relaxed text-bone-300">{l(node.bio)}</p>}
      {!node.isSelf && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wider text-bone-500">{t("lineage.life")}</p>
          {node.log.length === 0 ? <p className="text-xs text-bone-500">{t("lineage.noLog")}</p> : <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-bone-300">{node.log.map((entry, i) => <li key={i}>{l(entry)}</li>)}</ul>}
        </div>
      )}
    </section>
  );
}

/** Интерактивное древо: ряды поколений, дети под родителями, выбор человека, масштаб. На телефоне ряд прокручивается вбок */
function FamilyTree({ lineage }: { lineage: LineageView }) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const byId = useMemo(() => new Map(lineage.tree.map((node) => [node.id, node])), [lineage.tree]);
  const levels = useMemo(() => [...new Set(lineage.tree.map((node) => node.level))].sort((a, b) => a - b), [lineage.tree]);
  const current = selected ? byId.get(selected) : undefined;
  const related = new Set<string>(current ? [...current.parents, ...(current.spouseId ? [current.spouseId] : []), ...lineage.tree.filter((n) => n.parents.includes(current.id)).map((n) => n.id)] : []);
  const levelLabel = (level: number) => (level === 0 ? t("lineage.level.0") : level < 0 ? t("lineage.levelUp", { n: -level }) : t("lineage.levelDown", { n: level }));
  return (
    <div className="space-y-3" data-testid="family-tree">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-bone-500">{t("lineage.treeHint")}</p>
        <div className="flex gap-1">
          <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => setZoom((z) => Math.max(0, z - 1))} disabled={zoom === 0} aria-label={t("lineage.zoomOut")} data-testid="tree-zoom-out">
            −
          </Button>
          <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => setZoom((z) => Math.min(ZOOM.length - 1, z + 1))} disabled={zoom === ZOOM.length - 1} aria-label={t("lineage.zoomIn")} data-testid="tree-zoom-in">
            +
          </Button>
        </div>
      </div>
      <div className="scroll-thin max-h-[60vh] overflow-auto rounded-lg border border-line/60 bg-ink-950/30 p-3" data-testid="tree-scroll" data-zoom={zoom}>
        <div className="min-w-max space-y-4">
          {levels.map((level) => {
            const groups = groupRow(lineage.tree.filter((node) => node.level === level), byId);
            return (
              <div key={level}>
                <p className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-bone-500">{levelLabel(level)}</p>
                <div className="flex gap-4">
                  {groups.map((group) => {
                    const parents = group.parents.map((id) => byId.get(id)?.name).filter(Boolean);
                    return (
                      <div key={group.key} className={parents.length > 0 ? "border-t border-gold-500/40 pt-1.5" : "pt-1.5"} data-testid="tree-group">
                        {parents.length > 0 && <p className="mb-1 truncate text-[10px] text-gold-400/80">{t("lineage.childrenOf", { names: parents.join(" ⚭ ") })}</p>}
                        <ul className="flex gap-2">
                          {group.nodes.map((node) => (
                            <TreeNode key={node.id} node={node} zoom={zoom} selected={selected === node.id} related={related.has(node.id)} onSelect={(id) => setSelected((s) => (s === id ? null : id))} />
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {current && <PersonCard node={current} byId={byId} onClose={() => setSelected(null)} />}
      {lineage.lives.length > 0 && (
        <div>
          <Heading>{t("lineage.lives")}</Heading>
          <ol className="space-y-1 text-sm" data-testid="lineage-lives">
            {lineage.lives.map((life) => (
              <li key={life.gen} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/60 pb-1">
                <span className="text-bone-100">
                  {life.gen}. {life.name}
                </span>
                <span className="text-xs text-bone-500">
                  {t("dossier.age", { n: life.age })} · {life.score}/100
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function Chronicle({ lineage }: { lineage: LineageView }) {
  const { l, t } = useI18n();
  const [gen, setGen] = useState<number | "all">("all");
  const byId = useMemo(() => new Map(lineage.chronicle.map((entry) => [entry.id, entry])), [lineage.chronicle]);
  const entries = lineage.chronicle.filter((entry) => gen === "all" || entry.gen === gen);
  const gens = Array.from({ length: lineage.generation }, (_, i) => i + 1);
  return (
    <div className="space-y-3" data-testid="family-chronicle">
      {lineage.generation > 1 && (
        <label className="flex items-center gap-2 text-xs text-bone-300">
          {t("lineage.generation", { n: "" }).trim()}
          <select value={gen} onChange={(e) => setGen(e.target.value === "all" ? "all" : Number(e.target.value))} className="rounded border border-line bg-ink-950 px-2 py-1 text-bone-100" data-testid="chronicle-gen">
            <option value="all">{t("lineage.allGens")}</option>
            {gens.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      )}
      {entries.length === 0 ? (
        <p className="text-xs text-bone-500">{t("lineage.empty")}</p>
      ) : (
        <ol className="scroll-thin max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {entries.map((entry) => {
            const linked = entry.link === null ? undefined : byId.get(entry.link);
            return (
              <li key={entry.id} className="border-l border-line pl-3" data-testid="chronicle-entry" data-kind={entry.kind}>
                <p className="text-[10px] uppercase tracking-[0.2em] text-bone-500">
                  {t("lineage.year", { n: entry.year })} · {t("lineage.generation", { n: entry.gen })}
                </p>
                <p className="text-sm leading-relaxed text-bone-100">{l(entry.text)}</p>
                {linked && <p className="mt-0.5 text-xs text-gold-300/80">{t("lineage.linked", { text: l(linked.text) })}</p>}
              </li>
            );
          })}
        </ol>
      )}
      {lineage.archived > 0 && <p className="text-xs text-bone-500">{t("lineage.archived", { n: lineage.archived })}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Heading>{t("lineage.traits")}</Heading>
          {lineage.traits.talents.length + lineage.traits.weaknesses.length === 0 ? (
            <p className="text-xs text-bone-500">—</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {lineage.traits.talents.map((trait, i) => (
                <li key={`t${i}`} className="text-gold-200">
                  {t("lineage.traitGens", { name: l(trait.name), n: trait.gens })}
                </li>
              ))}
              {lineage.traits.weaknesses.map((trait, i) => (
                <li key={`w${i}`} className="text-blood-300">
                  {t("lineage.traitGens", { name: l(trait.name), n: trait.gens })}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <Heading>{t("lineage.threads")}</Heading>
          {lineage.threads.length === 0 ? (
            <p className="text-xs text-bone-500">{t("lineage.noThreads")}</p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {lineage.threads.map((thread, i) => (
                <li key={i}>
                  <span className="text-bone-100">{l(thread.name)}</span> <span className="text-bone-500">· {t("lineage.generation", { n: thread.gen })}</span>
                  <p className="text-bone-300">{l(thread.description)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function AchievementList({ achievements, compact = false }: { achievements: AchievementView[]; compact?: boolean }) {
  const { l, t } = useI18n();
  return (
    <div className="space-y-4" data-testid="achievements">
      {ACHIEVEMENT_CATEGORIES.map((category) => {
        const list = achievements.filter((a) => a.category === category);
        if (list.length === 0) return null;
        return (
          <div key={category}>
            {!compact && <Heading>{t(`ach.${category}` as MessageKey)}</Heading>}
            <ul className="grid gap-2 sm:grid-cols-2">
              {list.map((a) => (
                <li key={a.id} className={`rounded-md border px-3 py-2 ${a.unlocked ? "border-gold-500/40 bg-gold-500/5" : "border-line/60 bg-ink-950/40 opacity-70"}`} data-testid="achievement" data-unlocked={a.unlocked}>
                  <p className={`text-sm ${a.unlocked ? "text-gold-200" : "text-bone-300"}`}>
                    <span aria-hidden="true">{a.unlocked ? "✦ " : "◇ "}</span>
                    {l(a.name)}
                  </p>
                  <p className="text-xs text-bone-500">{l(a.description)}</p>
                  {a.unlocked && a.gen !== null && <p className="text-[10px] text-gold-400/80">{t("lineage.achievementGot", { gen: a.gen, age: a.age ?? 0 })}</p>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function InheritanceDetails({ inheritance }: { inheritance: InheritanceView | null }) {
  const { l, t } = useI18n();
  if (!inheritance) return <p className="text-xs text-bone-500" data-testid="inheritance">{t("inherit.none")}</p>;
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/60 pb-1">
      <dt className="text-bone-300">{label}</dt>
      <dd className="text-right text-bone-100">{value}</dd>
    </div>
  );
  return (
    <div className="space-y-3" data-testid="inheritance">
      <p className="font-display text-lg text-bone-100">{t("inherit.from", { name: inheritance.fromName, gen: inheritance.fromGen })}</p>
      <dl className="space-y-1 text-sm">
        {row(t("inherit.relation"), l(inheritance.relation))}
        {row(t("inherit.law"), l(inheritance.law.name))}
        {row(l(inheritance.law.levyName), `${Math.round(inheritance.law.levy * 100)}%`)}
        {row(t("inherit.gold"), <span className="tabular-nums text-gold-200" data-testid="inherit-gold">{inheritance.wealth}</span>)}
        {row(t("inherit.own"), <span className="tabular-nums">{inheritance.ownWealth}</span>)}
        {row(t("inherit.class"), `${l(inheritance.socialClass)}${inheritance.classInherited ? ` · ${t("inherit.classInherited")}` : ""}`)}
        {row(t("inherit.reputation"), inheritance.reputation)}
      </dl>
      <p className="text-xs text-bone-500">{l(inheritance.law.description)}</p>
      {inheritance.held > 0 && <p className="rounded-md border border-azure-500/40 bg-azure-600/10 px-3 py-2 text-xs text-bone-100">{t("inherit.held", { age: inheritance.law.controlAge, n: inheritance.held })}</p>}
      {inheritance.guardianName && <p className="text-xs text-bone-300">{t("inherit.guardian", { name: inheritance.guardianName })}</p>}
      {inheritance.shares.length > 0 && (
        <div>
          <Heading>{t("inherit.shares")}</Heading>
          <ul className="space-y-0.5 text-xs text-bone-300">
            {inheritance.shares.map((share, i) => (
              <li key={i}>
                {share.name}: <span className="tabular-nums text-gold-200">{share.amount}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {inheritance.weaknesses.length > 0 && (
        <p className="text-xs text-blood-300">
          {t("inherit.weaknesses")}: {inheritance.weaknesses.map(l).join(", ")}
        </p>
      )}
      {inheritance.dormant > 0 && <p className="text-xs text-gold-300">{t("inherit.dormant", { n: inheritance.dormant })}</p>}
      {inheritance.threads.length > 0 && (
        <p className="text-xs text-bone-300">
          {t("inherit.threads")}: {inheritance.threads.map(l).join(", ")}
        </p>
      )}
    </div>
  );
}

/** Род: древо, хроника рода, достижения, наследство. Данные — отдельным запросом, заново после каждого хода */
export function LineagePanel({ life, store }: { life: LifeView; store: GameStore }) {
  const { t } = useI18n();
  const [section, setSection] = useState<Section>("tree");
  const [lineage, setLineage] = useState<LineageView | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    store.lineage(life.id).then(
      (view) => {
        if (!active) return;
        setLineage(view);
        setFailed(false);
      },
      () => {
        if (active) setFailed(true);
      }
    );
    return () => {
      active = false;
    };
  }, [store, life.id, life.version, attempt]);

  const sections: { id: Section; label: string }[] = [
    { id: "tree", label: t("lineage.tabTree") },
    { id: "chronicle", label: t("lineage.tabChronicle") },
    { id: "achievements", label: t("lineage.tabAchievements") },
    { id: "inheritance", label: t("lineage.tabInheritance") }
  ];
  const unlocked = lineage?.achievements.filter((a) => a.unlocked).length ?? 0;
  return (
    <div className="space-y-4" data-testid="lineage-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-lg text-bone-100">
          {life.legacy.lineageName} · <span className="text-gold-300">{t("lineage.generation", { n: life.legacy.generation })}</span>
        </p>
        <div className="w-40">
          <Meter label={t("lineage.renown")} value={life.legacy.renown + 100} max={200} tone={life.legacy.renown >= 0 ? "gold" : "blood"} caption={String(life.legacy.renown)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1" role="tablist" aria-label={t("dossier.lineage")}>
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={section === item.id}
            onClick={() => setSection(item.id)}
            className={`rounded px-2.5 py-1 text-xs transition focus-visible:outline-2 focus-visible:outline-gold-300 ${section === item.id ? "bg-gold-500/20 text-gold-100" : "text-bone-300 hover:text-bone-100"}`}
            data-testid={`lineage-tab-${item.id}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {section === "inheritance" ? (
        <InheritanceDetails inheritance={life.legacy.inheritance} />
      ) : lineage === null ? (
        failed ? (
          <div className="space-y-2" role="alert">
            <p className="text-sm text-blood-300">{t("lineage.error")}</p>
            <Button onClick={() => setAttempt((n) => n + 1)}>{t("play.retry")}</Button>
          </div>
        ) : (
          <div className="h-24 animate-pulse rounded-lg border border-line bg-ink-950/50" aria-busy="true" aria-label={t("lineage.loading")} />
        )
      ) : section === "tree" ? (
        <FamilyTree lineage={lineage} />
      ) : section === "chronicle" ? (
        <Chronicle lineage={lineage} />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-bone-500" data-testid="achievements-count">
            {t("lineage.achievementsCount", { n: unlocked, total: lineage.achievements.length })}
          </p>
          <AchievementList achievements={lineage.achievements} />
        </div>
      )}
    </div>
  );
}
