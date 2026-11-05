"use client";

import type { HeirView, LifeSummaryView } from "@endemion/game-core";
import type { LifeView } from "@endemion/shared";
import { Button, Meter, Ornament, Panel } from "@endemion/ui";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ageLabel } from "@/lib/format";
import { useI18n } from "../locale-provider";
import { AchievementList } from "./lineage";

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-[11px] uppercase tracking-[0.22em] text-gold-400">{children}</h3>;
}

function Signed({ value }: { value: number }) {
  const tone = value > 0 ? "text-jade-300" : value < 0 ? "text-blood-300" : "text-bone-300";
  return <span className={`tabular-nums ${tone}`}>{value > 0 ? `+${value}` : value}</span>;
}

/** Карточка наследника: всё, что игрок знает до выбора. Скрытое (потенциал, судьба, спящие дары) не показывается */
function HeirCard({ heir, controlAge, busy, onChoose }: { heir: HeirView; controlAge: number; busy: boolean; onChoose: (heir: HeirView) => void }) {
  const { l, t } = useI18n();
  return (
    <li className={`rounded-lg border p-3 ${heir.available ? "border-line bg-ink-950/60" : "border-line/50 bg-ink-950/30 opacity-60"}`} data-testid="heir" data-heir={heir.id} data-name={heir.name} data-available={heir.available}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-base text-bone-100">
          {heir.name}
          <span className="ml-2 text-[10px] uppercase tracking-wider text-bone-500">{l(heir.relationName)}</span>
        </p>
        {heir.primary && <span className="rounded border border-gold-500/50 px-1.5 py-0.5 text-[10px] text-gold-200">{t("heir.primary")}</span>}
      </div>
      <p className="mt-1 text-xs text-bone-300">
        {[t("heir.age", { n: heir.age }), l(heir.race), l(heir.socialClass), heir.profession && l(heir.profession), heir.adopted && t("lineage.adopted")].filter(Boolean).join(" · ")}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {heir.education && (
          <div>
            <dt className="inline text-bone-500">{t("heir.education")}: </dt>
            <dd className="inline text-bone-100">{l(heir.education)}</dd>
          </div>
        )}
        {heir.talent && (
          <div>
            <dt className="inline text-bone-500">{t("heir.talent")}: </dt>
            <dd className="inline text-gold-200">{l(heir.talent)}</dd>
          </div>
        )}
        {heir.weakness && (
          <div>
            <dt className="inline text-bone-500">{t("heir.weakness")}: </dt>
            <dd className="inline text-blood-300">{l(heir.weakness)}</dd>
          </div>
        )}
        <div>
          <dt className="inline text-bone-500">{t("heir.affinity")}: </dt>
          <dd className="inline">
            {l(heir.affinityLabel)} <Signed value={heir.affinity} />
          </dd>
        </div>
        <div>
          <dd className="text-bone-300">{t("heir.power", { n: heir.power })}</dd>
        </div>
      </dl>
      {heir.available ? (
        <>
          <p className="mt-2 text-xs text-gold-200">
            {t("heir.gold", { n: heir.wealth })}
            {heir.regency && ` · ${t("heir.regency", { age: controlAge })}`}
            {heir.classInherited && ` · ${t("heir.classInherited")}`}
          </p>
          <Button variant="primary" className="mt-3 w-full sm:w-auto" disabled={busy} onClick={() => onChoose(heir)} data-testid="choose-heir">
            {t("heir.choose", { name: heir.name.split(" ")[0] ?? heir.name })}
          </Button>
        </>
      ) : (
        heir.locked && <p className="mt-2 text-xs text-blood-300">{l(heir.locked)}</p>
      )}
    </li>
  );
}

/** Подтверждение: выбор необратим. Фокус — на кнопке «Отмена» (autoFocus в модальном окне), Escape закрывает */
function ConfirmDialog({ heir, busy, onConfirm, onCancel }: { heir: HeirView | null; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (heir && !dialog.open) dialog.showModal();
    if (!heir && dialog.open) dialog.close();
  }, [heir]);
  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      aria-labelledby="heir-confirm-title"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-gold-500/40 bg-ink-900 p-0 text-bone-100 backdrop:bg-ink-950/80 backdrop:backdrop-blur-sm"
      data-testid="heir-confirm"
    >
      <div className="p-6">
        <h2 id="heir-confirm-title" className="font-display text-2xl text-gilded">
          {t("heir.confirmTitle")}
        </h2>
        <p className="mt-3 text-sm text-bone-300">{heir ? t("heir.confirmText", { name: heir.name }) : ""}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button autoFocus variant="ghost" onClick={onCancel} disabled={busy} data-testid="heir-confirm-no">
            {t("heir.cancel")}
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={busy} data-testid="heir-confirm-yes">
            {busy ? t("heir.working") : t("heir.confirm")}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

function Summary({ summary }: { summary: LifeSummaryView }) {
  const { locale, l, t } = useI18n();
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="mx-auto flex h-28 w-28 flex-col items-center justify-center rounded-full border border-gold-500/50 bg-gold-500/5" data-testid="life-score" data-score={summary.score}>
          <span className="font-display text-4xl text-gilded tabular-nums">{summary.score}</span>
          <span className="text-[10px] uppercase tracking-wider text-bone-500">/ 100</span>
        </div>
        <div className="text-center sm:text-left">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("summary.score")}</p>
          <p className="font-display text-2xl text-bone-100" data-testid="life-title">
            {l(summary.title)}
          </p>
          <p className="text-sm text-bone-300">{l(summary.titleText)}</p>
          <p className="mt-1 text-xs text-bone-500">{t("summary.scoreHint")}</p>
        </div>
      </div>
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {summary.parts.map((part) => (
          <Meter key={part.id} label={l(part.name)} value={part.value} max={part.max} tone="gold" caption={`${part.value} / ${part.max}`} />
        ))}
      </div>

      <Ornament />
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("summary.world")}</dt>
          <dd className="text-bone-100">{l(summary.world)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("summary.age")}</dt>
          <dd className="text-bone-100">
            {ageLabel(summary.age, locale)} <span className="text-xs text-bone-500">{t("summary.lifespan", { n: summary.lifespan })}</span>
          </dd>
          {summary.cause && <dd className="text-xs text-bone-300">{l(summary.cause)}</dd>}
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("summary.profession")}</dt>
          <dd className="text-bone-100">{summary.profession ? l(summary.profession) : t("dossier.none")}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-bone-500">{t("summary.station")}</dt>
          <dd className="text-bone-100">{l(summary.socialClass)}</dd>
          <dd className="text-xs text-bone-500">{t("summary.born", { name: l(summary.bornClass) })}</dd>
        </div>
      </dl>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Heading>{t("summary.family")}</Heading>
          <p className="text-sm text-bone-100">{summary.family.spouses.length > 0 ? t("summary.spouses", { names: summary.family.spouses.join(", ") }) : t("summary.noSpouse")}</p>
          <p className="text-xs text-bone-300">{t("summary.children", { n: summary.family.children, g: summary.family.grandchildren, d: summary.family.livingDescendants })}</p>
        </div>
        <div>
          <Heading>{t("summary.impact")}</Heading>
          <p className="text-xs text-bone-300">
            {t("summary.renownDelta", { n: summary.impact.renownDelta > 0 ? `+${summary.impact.renownDelta}` : summary.impact.renownDelta })}
          </p>
          <p className="text-xs text-bone-300">
            {t("sheet.reputation")}: <Signed value={summary.impact.reputation} /> · {t("sheet.karma")}: <Signed value={summary.impact.karma} />
          </p>
          {summary.impact.factions.map((f, i) => (
            <p key={i} className="text-xs text-bone-300">
              {l(f.name)}: <Signed value={f.value} />
            </p>
          ))}
        </div>
      </div>

      {summary.relations.length > 0 && (
        <div>
          <Heading>{t("summary.relations")}</Heading>
          <ul className="grid gap-1 text-xs sm:grid-cols-2">
            {summary.relations.map((r, i) => (
              <li key={i} className={r.alive ? "text-bone-100" : "text-bone-500"}>
                {!r.alive && <span aria-hidden="true">✝ </span>}
                {r.name} <span className="text-bone-500">({l(r.roleName)})</span> — {l(r.affinityLabel)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <Heading>{t("summary.decisions")}</Heading>
        {summary.decisions.length === 0 ? (
          <p className="text-xs text-bone-500">{t("summary.noDecisions")}</p>
        ) : (
          <>
          <ol className="space-y-1.5 text-sm" data-testid="key-decisions">
            {summary.decisions.slice(0, 4).map((d, i) => (
              <li key={i} className="border-l border-line pl-3">
                <span className="text-[10px] uppercase tracking-wider text-bone-500">{ageLabel(d.age, locale)}</span>
                <p className="text-bone-100">{l(d.title)}</p>
                <p className="text-xs text-gold-300">
                  → {l(d.choice)}
                  {d.success !== null && <span className={d.success ? "text-jade-300" : "text-blood-300"}> · {d.success ? t("play.success") : t("play.failure")}</span>}
                </p>
              </li>
            ))}
          </ol>
          {summary.decisions.length > 4 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-gold-300">{t("summary.moreDecisions")}</summary>
              <ol className="mt-2 space-y-1.5 text-sm">
                {summary.decisions.slice(4).map((d, i) => (
                  <li key={i} className="border-l border-line pl-3">
                    <span className="text-[10px] uppercase tracking-wider text-bone-500">{ageLabel(d.age, locale)}</span>
                    <p className="text-bone-100">{l(d.title)}</p>
                    <p className="text-xs text-gold-300">→ {l(d.choice)}</p>
                  </li>
                ))}
              </ol>
            </details>
          )}
          </>
        )}
      </div>

      <div>
        <Heading>{t("summary.achievements")}</Heading>
        {summary.achievements.filter((item) => item.unlocked).length === 0 ? (
          <p className="text-xs text-bone-500">{t("summary.noAchievements")}</p>
        ) : (
          <AchievementList achievements={summary.achievements.filter((item) => item.unlocked)} compact />
        )}
      </div>

      {summary.threads.length > 0 && (
        <div>
          <Heading>{t("summary.threads")}</Heading>
          <p className="text-xs text-bone-300">{summary.threads.map(l).join(" · ")}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Экран после смерти: итоги жизни, достижения, наследство по закону мира и выбор наследника.
 * Нет наследников — предложение начать новую жизнь; эта жизнь остаётся в списке
 */
export function LifeSummary({ life, busy, onSucceed }: { life: LifeView; busy: boolean; onSucceed: (heirId: string) => void }) {
  const { locale, l, t } = useI18n();
  const [confirm, setConfirm] = useState<HeirView | null>(null);
  const summary = life.legacy.summary;
  if (!summary) return null;
  const heirs = summary.heirs;
  const available = heirs.filter((h) => h.available);
  return (
    <Panel accent className="animate-rise space-y-6" data-testid="death-card">
      <div data-testid="death-choice" className="space-y-6">
      <div className="text-center">
        <p className="text-4xl text-blood-400" aria-hidden="true">
          ✝
        </p>
        <h2 className="mt-2 font-display text-4xl text-gilded">{t("summary.title")}</h2>
        <p className="mt-2 text-bone-300">{t("play.deathLived", { name: summary.name, age: ageLabel(summary.age, locale) })}</p>
        <p className="mt-3 text-sm text-gold-200">{l(summary.title)} · {summary.score}/100</p>
      </div>
      <section aria-labelledby="heirs-title" data-testid="legacy-selection">
        <h3 id="heirs-title" className="font-display text-2xl text-bone-100">
          {t("summary.heirs")}
        </h3>
        {life.legacy.continuedBy ? (
          <p className="mt-2 text-sm text-jade-300" data-testid="continued">
            {t("summary.continued", { name: summary.continuedName ?? "" })}
          </p>
        ) : available.length > 0 ? (
          <>
            <p className="mt-1 text-sm text-bone-300">{t("summary.heirsHint")}</p>
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-gold-300">{t("summary.lawMore")}: {l(summary.law.name)}</summary>
              <p className="mt-1 text-xs text-bone-500">{l(summary.law.description)}</p>
            </details>
            <ul className="mt-4 grid gap-3 lg:grid-cols-2">
              {heirs.map((heir) => (
                <HeirCard key={heir.id} heir={heir} controlAge={summary.law.controlAge} busy={busy} onChoose={setConfirm} />
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-bone-300" data-testid="no-heirs">
              {t("summary.noHeirs")}
            </p>
            {heirs.length > 0 && (
              <ul className="mt-4 grid gap-3 lg:grid-cols-2">
                {heirs.map((heir) => (
                  <HeirCard key={heir.id} heir={heir} controlAge={summary.law.controlAge} busy={busy} onChoose={setConfirm} />
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-bone-500">{t("summary.newLifeHint")}</p>
          </>
        )}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={`/create/${life.universeId}`} className="rounded-md border border-gold-400/70 bg-gold-500/15 px-5 py-2.5 text-center text-gold-100 transition hover:border-gold-300" data-testid="new-life">
            {t("play.newLifeSame")}
          </Link>
          <Link href="/worlds" className="rounded-md border border-line px-5 py-2.5 text-center text-bone-100 transition hover:border-gold-500/60">
            {t("play.otherWorld")}
          </Link>
        </div>
      </section>
      </div>
      <Summary summary={summary} />
      <ConfirmDialog
        heir={confirm}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) onSucceed(confirm.id);
        }}
      />
    </Panel>
  );
}
