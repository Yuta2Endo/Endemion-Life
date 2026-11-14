import { universeCatalog } from "@endemion/game-core";
import { buttonClass } from "@endemion/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { LifeFolio } from "@/components/life-folio";
import { LivesList } from "@/components/lives-list";
import { WorldCard } from "@/components/world-card";
import { YearDemo } from "@/components/year-demo";
import { getServerI18n } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    description: t("meta.description"),
    alternates: { canonical: "https://life.endemion.online" },
    openGraph: { url: "https://life.endemion.online" }
  };
}

export default async function HomePage() {
  const { locale, t } = await getServerI18n();
  const universes = universeCatalog();

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6">
      <section className="animate-rise grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
        <div>
          <p className="eyebrow text-gold-400">{t("home.kicker")}</p>
          <h1 className="mt-5 max-w-2xl font-display text-5xl font-semibold leading-[1.02] text-bone-50 sm:text-6xl lg:text-7xl">
            {t("home.title")}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-bone-300 sm:text-lg">{t("home.lead")}</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-bone-400">{t("home.loop")}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/worlds" className={buttonClass({ variant: "primary", size: "lg" })} data-testid="start-life">
              {t("home.start")}
            </Link>
            <a href="/worlds#compare" className={buttonClass({ variant: "ghost", size: "lg" })}>
              {t("home.explore")}
            </a>
          </div>
          <p className="mt-5 max-w-md text-xs leading-relaxed text-bone-500">{t("home.heir")}</p>
        </div>
        <LifeFolio locale={locale} />
      </section>

      <LivesList />

      <section id="worlds" className="mt-20 scroll-mt-24 sm:mt-28">
        <div className="max-w-2xl">
          <p className="eyebrow text-bone-500">{locale === "ru" ? "Атлас" : "Atlas"}</p>
          <h2 className="mt-2 font-display text-4xl text-bone-100 sm:text-5xl">{t("home.worldsTitle")}</h2>
          <p className="mt-3 text-bone-400">{locale === "ru" ? "Шесть миров, одна книга. Выберите, где начнётся ваша хроника." : "Six worlds, one binding. Choose where your chronicle begins."}</p>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {universes.map((universe) => (
            <WorldCard key={universe.id} universe={universe} locale={locale} />
          ))}
        </div>
      </section>

      <section className="mt-20 grid items-start gap-8 border-t border-line pt-12 sm:mt-28 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow text-gold-400">{locale === "ru" ? "Один год" : "One year"}</p>
          <h2 className="mt-2 font-display text-4xl text-bone-100">{locale === "ru" ? "Решение меняет всё" : "A choice changes everything"}</h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-bone-400">
            {locale === "ru"
              ? "Каждый год — событие, выбор и последствие. Не спешите: хроника запомнит и то, что вы выбрали, и то, что отложили."
              : "Every year is an event, a choice, a consequence. Take your time: the chronicle remembers what you chose and what you left undone."}
          </p>
        </div>
        <YearDemo />
      </section>
    </main>
  );
}
