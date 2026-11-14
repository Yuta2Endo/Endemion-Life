import type { Metadata } from "next";
import { PublicProfile } from "@/components/profile/profile-dashboard";

export const metadata: Metadata = {
  title: "Player profile",
  robots: { index: false }
};

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <PublicProfile playerId={id} />
    </main>
  );
}
