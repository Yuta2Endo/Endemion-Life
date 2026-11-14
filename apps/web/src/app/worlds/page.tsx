import { universeCatalog } from "@endemion/game-core";
import type { Metadata } from "next";
import { SharedWorldPanel } from "@/components/world/shared-world-panel";
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
      <header className="max-w-2xl">
        <p className="eyebrow">{t("worlds.atlas")}</p>
        <h1 className="mt-3 font-display text-4xl text-bone-100 sm:text-6xl">{t("worlds.title")}</h1>
        <p className="mt-4 max-w-xl text-bone-300">{t("worlds.lead")}</p>
      </header>

      <section id="compare" className="mt-10 scroll-mt-24">
        <div className="grid gap-5 lg:grid-cols-2">
          {universeCatalog().map((universe) => (
            <WorldCard key={universe.id} universe={universe} locale={locale} detailed />
          ))}
        </div>
      </section>

      <section className="mt-16 border-t border-line pt-10">
        <p className="eyebrow">{t("worlds.living")}</p>
        <h2 className="mt-3 font-display text-3xl text-bone-100">{t("worlds.sharedTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-bone-400">{t("worlds.sharedLead")}</p>
        <div className="mt-6">
          <SharedWorldPanel />
        </div>
      </section>
    </main>
  );
}
