import type { Metadata } from "next";
import { PlayScreen } from "@/components/play/play-screen";
import { getServerI18n } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t("play.pageTitle"), robots: { index: false } };
}

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlayScreen lifeId={id} />;
}
