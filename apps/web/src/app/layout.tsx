import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/locale-provider";
import { SiteHeader } from "@/components/site-header";
import { getLocale } from "@/lib/locale-server";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  display: "swap"
});

const sans = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap"
});

export const metadata: Metadata = {
  title: { default: "Endemion Life", template: "%s · Endemion Life" },
  description: "Браузерный симулятор жизни, RPG и интерактивная история в шести мирах. A browser life simulator, RPG and interactive story across six worlds."
};

export const viewport: Viewport = {
  themeColor: "#060608",
  colorScheme: "dark"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${display.variable} ${sans.variable}`}>
      <body className="relative">
        <LocaleProvider locale={locale}>
          <SiteHeader />
          {/* Выше подвала: фиксированная панель вкладок на телефоне не должна уходить под него */}
          <div className="relative z-20">{children}</div>
          <footer className="relative z-10 mt-20 border-t border-line/60 py-8 pb-24 text-center text-xs text-bone-500 lg:pb-8">
            Endemion Life · {new Date().getFullYear()}
          </footer>
        </LocaleProvider>
      </body>
    </html>
  );
}
