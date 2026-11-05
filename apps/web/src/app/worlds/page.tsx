import { universeCatalog } from "@endemion/game-core";
import { Ornament } from "@endemion/ui";
import type { Metadata } from "next";
import { BornNow } from "@/components/born-now";
import { WorldCard } from "@/components/world-card";
import { getServerI18n } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: t("worlds.title"),
    description: t("worlds.lead"),
    alternates: { canonical: "https://life.endemion.online/worlds" },
    openGraph: { url: "https://life.endemion.online/worlds" }
  };
}

export default async function WorldsPage() {
  const { locale, t } = await getServerI18n();
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="text-center">
        <h1 className="font-display text-4xl text-gilded sm:text-5xl">{t("worlds.title")}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-bone-300">{t("worlds.lead")}</p>
        <Ornament className="mx-auto mt-8 max-w-sm" />
      </header>
      <ul id="compare" className="mt-10 scroll-mt-20 divide-y divide-line rounded-xl border border-line">
        {universeCatalog().map((universe) => (
          <li key={universe.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-display text-xl text-bone-100">{universe.name[locale]}</p>
              <p className="mt-1 text-sm text-bone-300">
                {universe.track.name[locale]} · {universe.mechanics[0]?.name[locale]} · {t("worlds.lifespan", { years: universe.lifespan })}
              </p>
            </div>
            <BornNow universeId={universe.id} />
          </li>
        ))}
      </ul>
      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {universeCatalog().map((universe) => (
          <WorldCard key={universe.id} universe={universe} locale={locale} detailed />
        ))}
      </div>
    </main>
  );
}
