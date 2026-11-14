import type { Metadata } from "next";
import { AccountPanel } from "@/components/account/account-panel";
import { getServerI18n } from "@/lib/locale-server";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default async function AccountPage() {
  const { t } = await getServerI18n();
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
      <header className="border-b border-line pb-8">
        <p className="eyebrow text-gold-300">{t("auth.eyebrow")}</p>
        <h1 className="mt-3 font-display text-4xl leading-none text-bone-100 sm:text-5xl">{t("auth.title")}</h1>
        <p className="mt-4 max-w-xl text-bone-300">{t("auth.lead")}</p>
      </header>
      <div className="mt-8">
        <AccountPanel />
      </div>
    </main>
  );
}
