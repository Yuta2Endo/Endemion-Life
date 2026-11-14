import type { Metadata } from "next";
import { LiveBoard } from "@/components/social/live-board";
import { SocialPanel } from "@/components/social/social-panel";
import { GuildPanel } from "@/components/social/guild-panel";
import { getServerI18n } from "@/lib/locale-server";

export const metadata: Metadata = { title: "People", robots: { index: false } };

export default async function SocialPage() {
  const { t } = await getServerI18n();
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-3xl border-b border-line pb-8">
        <p className="eyebrow text-gold-300">{t("social.eyebrow")}</p>
        <h1 className="mt-3 font-display text-4xl leading-none text-bone-100 sm:text-5xl">{t("social.title")}</h1>
        <p className="mt-4 max-w-2xl text-bone-300">{t("social.lead")}</p>
        <p className="mt-2 max-w-2xl text-sm text-bone-500">{t("social.closed")}</p>
      </header>
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-8">
          <LiveBoard />
          <GuildPanel />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24" aria-labelledby="social-ties">
          <p className="eyebrow text-gold-300" id="social-ties">{t("social.ties")}</p>
          <SocialPanel />
        </aside>
      </div>
    </main>
  );
}
