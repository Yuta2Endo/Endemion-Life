import { universeCatalog } from "@endemion/game-core";
import { Ornament } from "@endemion/ui";
import Link from "next/link";
import { LivesList } from "@/components/lives-list";
import { PlayGuide } from "@/components/play-guide";
import { WorldCard } from "@/components/world-card";
import { getServerI18n } from "@/lib/locale-server";

const PILLARS = [
  { title: "home.pillar1.title", text: "home.pillar1.text", mark: "I" },
  { title: "home.pillar2.title", text: "home.pillar2.text", mark: "II" },
  { title: "home.pillar3.title", text: "home.pillar3.text", mark: "III" }
] as const;

export default async function HomePage() {
  const { locale, t } = await getServerI18n();
  const universes = universeCatalog();

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6">
      <section className="relative flex min-h-[72vh] flex-col items-center justify-center py-20 text-center">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-500/10 blur-[120px] animate-glow"
          aria-hidden="true"
        />
        <p className="relative animate-rise text-[11px] uppercase tracking-[0.35em] text-gold-400">{t("home.kicker")}</p>
        <h1 className="relative mt-6 max-w-4xl animate-rise font-display text-5xl font-semibold leading-[1.05] text-gilded sm:text-7xl">
          {t("home.title")}
        </h1>
        <p className="relative mt-6 max-w-2xl animate-rise text-base leading-relaxed text-bone-300 sm:text-lg">{t("home.lead")}</p>
        <div className="relative mt-10 flex animate-rise flex-col gap-3 sm:flex-row">
          <Link
            href="/worlds"
            className="rounded-md border border-gold-400/70 bg-linear-to-b from-gold-400/25 to-gold-600/10 px-7 py-3 font-medium tracking-wide text-gold-100 shadow-[0_0_32px_-8px_var(--color-gold-400)] transition hover:border-gold-300 hover:from-gold-400/35"
            data-testid="start-life"
          >
            {t("home.start")}
          </Link>
          <a href="#worlds" className="rounded-md border border-line bg-ink-900/60 px-7 py-3 text-bone-100 transition hover:border-gold-500/60 hover:text-gold-200">
            {t("home.explore")}
          </a>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {PILLARS.map((pillar) => (
          <div key={pillar.mark} className="rounded-xl border border-line bg-ink-900/60 p-6">
            <span className="font-display text-sm tracking-[0.3em] text-gold-500">{pillar.mark}</span>
            <h2 className="mt-2 font-display text-2xl text-bone-100">{t(pillar.title)}</h2>
            <p className="mt-2 text-sm leading-relaxed text-bone-300">{t(pillar.text)}</p>
          </div>
        ))}
      </section>

      <section className="mt-20">
        <h2 className="font-display text-3xl text-bone-100">{t("home.continue")}</h2>
        <Ornament className="my-5 max-w-xs" />
        <LivesList />
        <div className="mt-6">
          <PlayGuide />
        </div>
      </section>

      <section id="worlds" className="mt-20 scroll-mt-20">
        <h2 className="text-center font-display text-4xl text-gilded">{t("home.worldsTitle")}</h2>
        <Ornament className="mx-auto my-6 max-w-sm" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {universes.map((universe) => (
            <WorldCard key={universe.id} universe={universe} locale={locale} />
          ))}
        </div>
      </section>
    </main>
  );
}
