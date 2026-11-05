import { Ornament } from "@endemion/ui";
import type { Metadata } from "next";
import { InsightsPanel } from "@/components/insights/insights-panel";
import { getServerI18n } from "@/lib/locale-server";

export const metadata: Metadata = { title: "Insights", robots: { index: false, follow: false } };

export default async function InsightsPage() {
  const { t } = await getServerI18n();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="text-center">
        <h1 className="font-display text-4xl text-gilded sm:text-5xl">{t("insights.title")}</h1>
        <p className="mx-auto mt-4 max-w-xl text-bone-300">{t("insights.lead")}</p>
        <Ornament className="mx-auto mt-8 max-w-sm" />
      </header>
      <div className="mt-10">
        <InsightsPanel />
      </div>
    </main>
  );
}
