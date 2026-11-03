import { Ornament } from "@endemion/ui";
import type { Metadata } from "next";
import { AccountPanel } from "@/components/account/account-panel";
import { getServerI18n } from "@/lib/locale-server";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default async function AccountPage() {
  const { t } = await getServerI18n();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="text-center">
        <h1 className="font-display text-4xl text-gilded sm:text-5xl">{t("auth.title")}</h1>
        <p className="mx-auto mt-4 max-w-xl text-bone-300">{t("auth.lead")}</p>
        <Ornament className="mx-auto mt-8 max-w-sm" />
      </header>
      <div className="mt-10">
        <AccountPanel />
      </div>
    </main>
  );
}
