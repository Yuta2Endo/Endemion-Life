import Link from "next/link";
import { getServerI18n } from "@/lib/locale-server";

export default async function NotFound() {
  const { t } = await getServerI18n();
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-7xl text-gilded">404</p>
      <h1 className="mt-4 font-display text-3xl text-bone-100">{t("error.notFoundTitle")}</h1>
      <Link href="/" className="mt-8 rounded-md border border-line px-5 py-2 text-bone-100 transition hover:border-gold-500/60 hover:text-gold-200">
        {t("error.toHome")}
      </Link>
    </main>
  );
}
