import type { Metadata, Viewport } from "next";
import { Alegreya, Golos_Text } from "next/font/google";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/locale-provider";
import { LanguageSwitch } from "@/components/language-switch";
import { SiteHeader } from "@/components/site-header";
import { getServerI18n } from "@/lib/locale-server";
import "./globals.css";

const display = Alegreya({
  variable: "--font-alegreya",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  display: "swap",
  preload: true,
  adjustFontFallback: true
});

const sans = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: true,
  adjustFontFallback: true
});

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getServerI18n();
  const description = t("meta.description");
  return {
    metadataBase: new URL("https://life.endemion.online"),
    title: { default: "Endemion Life", template: "%s · Endemion Life" },
    description,
    openGraph: {
      title: "Endemion Life",
      description,
      type: "website",
      locale: locale === "ru" ? "ru_RU" : "en_US",
      images: [{ url: "/shot-event.png", alt: "Endemion Life" }]
    },
    twitter: { card: "summary_large_image", title: "Endemion Life", description, images: ["/shot-event.png"] }
  };
}

export const viewport: Viewport = {
  themeColor: "#060608",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale, t } = await getServerI18n();
  return (
    <html lang={locale} className={`${display.variable} ${sans.variable}`}>
      <body className="relative overflow-x-clip">
        <LocaleProvider locale={locale}>
          <SiteHeader />
          {/* Выше подвала: фиксированная панель вкладок на телефоне не должна уходить под него */}
          <div className="relative z-20">{children}</div>
          <footer className="relative z-10 mt-20 overflow-x-clip border-t border-line/60 py-8 pb-24 text-center text-xs text-bone-500 lg:pb-8">
            <p>Endemion Life · {new Date().getFullYear()}</p>
            <nav className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2" aria-label="Endemion">
              <a href="https://endemion.online" className="hover:text-gold-200">{t("footer.studio")}</a>
              <a href="https://endemion.online/privacy" className="hover:text-gold-200">{t("footer.privacy")}</a>
              <a href="https://endemion.online/terms" className="hover:text-gold-200">{t("footer.terms")}</a>
              <a href="https://endemion.online/community" className="hover:text-gold-200">{t("nav.people")}</a>
              <a href="mailto:endemion@internet.ru" className="hover:text-gold-200">endemion@internet.ru</a>
              <span className="inline-flex min-[480px]:hidden"><LanguageSwitch /></span>
            </nav>
          </footer>
        </LocaleProvider>
      </body>
    </html>
  );
}
