import type { Locale, UniverseSummary } from "@endemion/game-core";
import Link from "next/link";
import { msg } from "@/lib/messages";
import { BornNow } from "./born-now";
import { WorldEmblem } from "./world-emblem";

/** Карточка мира. detailed — законы и механики спрятаны в раскрытие */
export function WorldCard({ universe, locale, detailed = false }: { universe: UniverseSummary; locale: Locale; detailed?: boolean }) {
  const accent = universe.theme.accent;
  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-sm border border-line bg-ink-900 p-5 transition-colors duration-200 hover:border-[var(--world-accent)] sm:p-6"
      style={{ "--world-accent": `${accent}99` } as React.CSSProperties}
      data-testid={`world-${universe.id}`}
    >
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: accent }} aria-hidden="true" />
      <div className="relative flex items-start gap-4">
        <WorldEmblem id={universe.id} accent={accent} size={detailed ? 84 : 64} />
        <div className="min-w-0">
          <h3 className="font-display text-2xl font-semibold leading-tight text-bone-100">{universe.name[locale]}</h3>
          <p className="mt-1 text-sm leading-relaxed text-bone-300">{universe.tagline[locale]}</p>
          {!detailed && (
            <ul className="mt-2 space-y-1 text-xs text-bone-400">
              <li>{msg(locale, "worlds.path")}: {universe.track.name[locale]}</li>
              <li>{universe.mechanics[0]?.name[locale]}</li>
              <li>{msg(locale, "worlds.lifespan", { years: universe.lifespan })}</li>
            </ul>
          )}
        </div>
      </div>

      {detailed && (
        <details className="relative mt-5 text-sm">
          <summary className="cursor-pointer text-xs font-medium text-gold-300">{msg(locale, "worlds.more")}</summary>
          <div className="mt-4 space-y-4">
          <p className="leading-relaxed text-bone-300">{universe.description[locale]}</p>
          <div>
            <h4 className="mb-2 text-xs font-medium" style={{ color: accent }}>
              {msg(locale, "worlds.rules")}
            </h4>
            <ul className="space-y-1.5 text-bone-300">
              {universe.rules.map((rule) => (
                <li key={rule.en} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rotate-45" style={{ background: accent }} aria-hidden="true" />
                  <span>{rule[locale]}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-medium" style={{ color: accent }}>
              {msg(locale, "worlds.path")}: {universe.track.name[locale]}
            </h4>
            <p className="text-bone-300">{universe.track.ranks.map((rank) => rank.name[locale]).join(" → ")}</p>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-medium" style={{ color: accent }}>
              {msg(locale, "worlds.mechanics")}
            </h4>
            <ul className="space-y-2 text-bone-300" data-testid="world-mechanics">
              {universe.mechanics.map((mechanic) => (
                <li key={mechanic.name.en}>
                  <span className="text-bone-100">{mechanic.name[locale]}.</span> {mechanic.description[locale]}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-bone-500">{msg(locale, "worlds.society")}: {universe.socialClasses.map((c) => c.name[locale]).join(" · ")}</p>
          <p className="text-xs text-bone-500">{msg(locale, "worlds.lifespan", { years: universe.lifespan })}</p>
          </div>
        </details>
      )}

      <div className="relative mt-auto flex flex-wrap items-center gap-4 pt-6">
        <BornNow universeId={universe.id} />
        <Link href={`/create/${universe.id}`} className="text-sm text-bone-400 underline decoration-line hover:text-gold-200">
          {msg(locale, "create.choose")}
        </Link>
      </div>
    </article>
  );
}
