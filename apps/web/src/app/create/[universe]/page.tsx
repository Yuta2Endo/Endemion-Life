import { getUniverse, isUniverseId, summarizeUniverse, temperamentCatalog } from "@endemion/game-core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CreateForm } from "@/components/create-form";
import { getServerI18n } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t("create.title"), robots: { index: false } };
}

export default async function CreatePage({ params }: { params: Promise<{ universe: string }> }) {
  const { universe: id } = await params;
  if (!isUniverseId(id)) notFound();
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <CreateForm universe={summarizeUniverse(getUniverse(id))} temperaments={temperamentCatalog()} />
    </main>
  );
}
