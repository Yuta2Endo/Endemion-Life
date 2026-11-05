import Link from "next/link";
import { getServerI18n } from "@/lib/locale-server";
import { AccountLink } from "./account-link";
import { LanguageSwitch } from "./language-switch";
import { NavLink } from "./nav-link";
import { StoreBadge } from "./store-badge";

export async function SiteHeader() {
  const { t } = await getServerI18n();
  const link = "rounded-sm text-sm text-bone-300 transition hover:text-gold-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300";
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300" aria-label="Endemion Life">
          <span className="font-display text-xl font-semibold tracking-[0.2em] text-gilded">ENDEMION</span>
          <span className="text-[10px] uppercase tracking-[0.4em] text-bone-500 transition group-hover:text-gold-300">Life</span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-5" aria-label={t("nav.primary")}>
          <NavLink href="/" className={`${link} hidden sm:inline`}>
            {t("nav.home")}
          </NavLink>
          <NavLink href="/worlds" className={link}>
            {t("nav.worlds")}
          </NavLink>
          <NavLink href="/social" className={link}>
            {t("nav.people")}
          </NavLink>
          <a href="https://endemion.online" className={`hidden sm:inline ${link}`}>
            Endemion
          </a>
          <AccountLink />
          <StoreBadge />
          <LanguageSwitch />
        </nav>
      </div>
    </header>
  );
}
