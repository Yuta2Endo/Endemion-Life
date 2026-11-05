import { universeCatalog } from "@endemion/game-core";
import { Ornament } from "@endemion/ui";
import type { Metadata } from "next";
import { WorldCard } from "@/components/world-card";
import { getServerI18n } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t("worlds.title") };
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
      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {universeCatalog().map((universe) => (
          <WorldCard key={universe.id} universe={universe} locale={locale} detailed />
        ))}
      </div>
    </main>
  );
}
