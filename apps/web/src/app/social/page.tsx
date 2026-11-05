import { Ornament } from "@endemion/ui";
import type { Metadata } from "next";
import { LiveBoard } from "@/components/social/live-board";
import { SocialPanel } from "@/components/social/social-panel";
import { getServerI18n } from "@/lib/locale-server";

export const metadata: Metadata = { title: "People", robots: { index: false } };

export default async function SocialPage() {
  const { t } = await getServerI18n();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="text-center">
        <h1 className="font-display text-4xl text-gilded sm:text-5xl">{t("social.title")}</h1>
        <p className="mx-auto mt-4 max-w-xl text-bone-300">{t("social.lead")}</p>
        <Ornament className="mx-auto mt-8 max-w-sm" />
      </header>
      <div className="mt-10 space-y-8">
        <LiveBoard />
        <SocialPanel />
      </div>
    </main>
  );
}
