import type { Locale, UniverseSummary } from "@endemion/game-core";
import Link from "next/link";
import { msg } from "@/lib/messages";
import { WorldEmblem } from "./world-emblem";

/** Карточка мира. detailed — с законами мира и путём силы (страница выбора мира) */
export function WorldCard({ universe, locale, detailed = false }: { universe: UniverseSummary; locale: Locale; detailed?: boolean }) {
  const accent = universe.theme.accent;
  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-ink-900/80 p-6 transition duration-300 hover:-translate-y-0.5 hover:border-[var(--world-accent)]"
      style={{ "--world-accent": `${accent}99` } as React.CSSProperties}
      data-testid={`world-${universe.id}`}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-60 blur-3xl transition duration-500 group-hover:opacity-100"
        style={{ background: universe.theme.glow }}
        aria-hidden="true"
      />
      <div className="relative flex items-start gap-4">
        <WorldEmblem id={universe.id} accent={accent} size={detailed ? 84 : 64} />
        <div className="min-w-0">
          <h3 className="font-display text-2xl font-semibold leading-tight text-bone-100">{universe.name[locale]}</h3>
          <p className="mt-1 text-sm leading-relaxed text-bone-300">{universe.tagline[locale]}</p>
        </div>
      </div>

      {detailed && (
        <div className="relative mt-5 space-y-4 text-sm">
          <p className="leading-relaxed text-bone-300">{universe.description[locale]}</p>
          <div>
            <h4 className="mb-2 text-[11px] uppercase tracking-[0.2em]" style={{ color: accent }}>
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
            <h4 className="mb-2 text-[11px] uppercase tracking-[0.2em]" style={{ color: accent }}>
              {msg(locale, "worlds.path")}: {universe.track.name[locale]}
            </h4>
            <p className="text-bone-300">{universe.track.ranks.map((rank) => rank.name[locale]).join(" → ")}</p>
          </div>
          <div>
            <h4 className="mb-2 text-[11px] uppercase tracking-[0.2em]" style={{ color: accent }}>
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
      )}

      <div className="relative mt-auto pt-6">
        <Link
          href={`/create/${universe.id}`}
          className="inline-flex items-center gap-2 rounded-md border border-line bg-ink-800/70 px-4 py-2 text-sm text-bone-100 transition hover:border-[var(--world-accent)] hover:text-gold-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
        >
          {msg(locale, "worlds.born")}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
