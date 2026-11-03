import Link from "next/link";
import { getServerI18n } from "@/lib/locale-server";
import { AccountLink } from "./account-link";
import { LanguageSwitch } from "./language-switch";
import { StoreBadge } from "./store-badge";

export async function SiteHeader() {
  const { t } = await getServerI18n();
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-2" aria-label="Endemion Life">
          <span className="font-display text-xl font-semibold tracking-[0.2em] text-gilded">ENDEMION</span>
          <span className="text-[10px] uppercase tracking-[0.4em] text-bone-500 transition group-hover:text-gold-300">Life</span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-5">
          <Link href="/worlds" className="text-sm text-bone-300 transition hover:text-gold-200">
            {t("nav.worlds")}
          </Link>
          <AccountLink />
          <StoreBadge />
          <LanguageSwitch />
        </nav>
      </div>
    </header>
  );
}
