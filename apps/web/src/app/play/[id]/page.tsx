import type { Metadata } from "next";
import { PlayScreen } from "@/components/play/play-screen";

export const metadata: Metadata = { title: "Life" };

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlayScreen lifeId={id} />;
}
