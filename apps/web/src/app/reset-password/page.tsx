import { RESET_TOKEN_PATTERN } from "@endemion/shared";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/account/reset-password-form";

// Ссылка из письма не должна попадать к другим сайтам через Referer и в поисковые системы
export const metadata: Metadata = { title: "Password", robots: { index: false }, referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  const value = typeof token === "string" && RESET_TOKEN_PATTERN.test(token) ? token : null;
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <ResetPasswordForm token={value} />
    </main>
  );
}
