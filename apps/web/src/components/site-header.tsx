import { buttonClass } from "@endemion/ui";
import Link from "next/link";
import { getServerI18n } from "@/lib/locale-server";
import { AccountLink } from "./account-link";
import { LanguageSwitch } from "./language-switch";
import { NavLink } from "./nav-link";
import { StoreBadge } from "./store-badge";

export async function SiteHeader() {
  const { t } = await getServerI18n();
  const link = "inline-flex min-h-11 shrink-0 items-center rounded-sm text-xs text-bone-300 transition hover:text-gold-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 sm:text-sm";
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-ink-950/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        <Link href="/" className="group flex min-w-0 items-baseline gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300" aria-label="Endemion Life">
          <span className="truncate font-display text-sm font-semibold tracking-normal text-gilded sm:text-xl sm:tracking-[0.2em]">ENDEMION</span>
          <span className="hidden text-[10px] uppercase tracking-[0.4em] text-bone-500 transition group-hover:text-gold-300 sm:inline">Life</span>
        </Link>
        <nav className="flex min-w-0 items-center gap-0.5 sm:gap-5" aria-label={t("nav.primary")}>
          <span className="hidden sm:inline-flex">
            <NavLink href="/" className={link}>
              {t("nav.home")}
            </NavLink>
          </span>
          <span className="hidden min-[480px]:inline-flex">
            <NavLink href="/worlds" className={link}>
              {t("nav.worlds")}
            </NavLink>
          </span>
          <Link href="/worlds" className={buttonClass({ variant: "primary", size: "md", className: "px-3 text-xs sm:px-4 sm:text-sm" })} data-testid="header-begin">
            {t("home.start")}
          </Link>
          <span className="hidden min-[360px]:inline-flex"><AccountLink /></span>
          <span className="hidden min-[480px]:inline-flex"><StoreBadge /></span>
          <span className="hidden min-[480px]:inline-flex"><LanguageSwitch /></span>
        </nav>
      </div>
    </header>
  );
}
