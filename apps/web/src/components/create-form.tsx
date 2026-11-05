"use client";

import { NAME_MAX_LENGTH, SEED_MAX_LENGTH, STAT_INFO, entriesOf, type OptionView, type StatMods, type UniverseSummary } from "@endemion/game-core";
import type { CreateLifeRequest } from "@endemion/shared";
import { Button, Ornament, Panel } from "@endemion/ui";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ClientError } from "@/lib/api";
import { storeForNewLife } from "@/lib/store";
import { useI18n } from "./locale-provider";
import { WorldEmblem } from "./world-emblem";

type Choice = string | null;

function ModsLine({ mods }: { mods: StatMods }) {
  const { locale } = useI18n();
  const entries = entriesOf(mods).filter(([, delta]) => delta !== 0);
  if (entries.length === 0) return null;
  return (
    <span className="mt-1 block text-[11px] tabular-nums text-bone-500">
      {entries.map(([key, delta]) => `${STAT_INFO[key].short[locale]} ${delta > 0 ? "+" : ""}${delta}`).join(" · ")}
    </span>
  );
}

function OptionGrid({
  legend,
  name,
  options,
  value,
  onChange,
  extra
}: {
  legend: string;
  name: string;
  options: (OptionView & { wealth?: number })[];
  value: Choice;
  onChange: (value: Choice) => void;
  extra?: (option: OptionView & { wealth?: number }) => string | null;
}) {
  const { l, t } = useI18n();
  const items: { id: string | null; title: string; description: string; mods?: StatMods; note?: string | null }[] = [
    { id: null, title: t("create.random"), description: "" },
    ...options.map((o) => ({ id: o.id, title: l(o.name), description: l(o.description), mods: o.statMods, note: extra?.(o) ?? null }))
  ];
  return (
    <fieldset>
      <legend className="mb-3 text-[11px] uppercase tracking-[0.22em] text-gold-400">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const checked = value === item.id;
          return (
            <label
              key={item.id ?? "random"}
              className={`relative cursor-pointer rounded-lg border p-3 transition focus-within:outline-2 focus-within:outline-gold-300 ${
                checked ? "border-gold-400/70 bg-gold-500/10" : "border-line bg-ink-900/60 hover:border-gold-500/40"
              }`}
            >
              <input type="radio" name={name} className="sr-only" checked={checked} onChange={() => onChange(item.id)} />
              <span className={`block text-sm font-medium ${checked ? "text-gold-100" : "text-bone-100"}`}>{item.id === null ? `✦ ${item.title}` : item.title}</span>
              {item.description && <span className="mt-1 block text-xs leading-relaxed text-bone-300">{item.description}</span>}
              {item.mods && <ModsLine mods={item.mods} />}
              {item.note && <span className="mt-1 block text-[11px] text-gold-500">{item.note}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function CreateForm({ universe, temperaments }: { universe: UniverseSummary; temperaments: OptionView[] }) {
  const { l, t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Choice>(null);
  const [raceId, setRaceId] = useState<Choice>(universe.races.length === 1 ? universe.races[0]!.id : null);
  const [originId, setOriginId] = useState<Choice>(null);
  const [temperamentId, setTemperamentId] = useState<Choice>(null);
  const [seed, setSeed] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const origin = universe.origins.find((item) => item.id === originId) ?? null;
  const stationId = originId ? universe.originClasses[originId] : undefined;
  const station = universe.socialClasses.find((item) => item.id === stationId) ?? null;
  const fork = universe.mechanics[0];

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const input: CreateLifeRequest = { universeId: universe.id };
    if (name.trim()) input.name = name.trim();
    if (gender === "female" || gender === "male") input.gender = gender;
    if (raceId) input.raceId = raceId;
    if (originId) input.originId = originId;
    if (temperamentId) input.temperamentId = temperamentId;
    if (seed.trim()) input.seed = seed.trim();
    try {
      const life = await (await storeForNewLife()).create(input);
      router.push(`/play/${life.id}`);
    } catch (e) {
      setError(e instanceof ClientError && e.code !== "INTERNAL" ? e.message : t("error.generic"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8" data-testid="create-form">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <WorldEmblem id={universe.id} accent={universe.theme.accent} size={88} />
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em]" style={{ color: universe.theme.accent }}>
            {l(universe.name)}
          </p>
          <h1 className="mt-1 font-display text-4xl text-gilded">{t("create.title")}</h1>
          <p className="mt-2 text-sm text-bone-300">{t("create.lead")}</p>
          <p className="mt-2 text-xs text-bone-400" data-testid="create-world">
            {t("worlds.path")}: {l(universe.track.name)} · {t("worlds.lifespan", { years: universe.lifespan })}
          </p>
          {universe.rules[0] && <p className="mt-1 max-w-xl text-xs text-bone-300">{l(universe.rules[0])}</p>}
        </div>
      </header>

      <aside className="rounded-xl border border-line bg-ink-900/70 px-5 py-4 text-sm" data-testid="birth-preview">
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("create.preview")}</p>
        <p className="mt-2 text-bone-100">{name.trim() || t("create.namePlaceholder")}</p>
        <p className="mt-1 text-bone-300">
          {station ? l(station.name) : t("create.previewRandom")} · {t("worlds.lifespan", { years: universe.lifespan })}
        </p>
        {origin && <p className="mt-1 text-xs text-bone-400">{l(origin.description)}</p>}
        {fork && (
          <p className="mt-3 text-bone-300">
            {t("create.previewFork")}: {l(fork.name)}. {l(fork.description)}
          </p>
        )}
        <Button type="submit" variant="primary" className="mt-4" disabled={busy}>
          {busy ? t("create.submitting") : t("create.quick")}
        </Button>
        <p className="mt-2 text-xs text-bone-500">{t("create.quickHint")}</p>
        <label className="mt-4 block">
          <span className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("create.name")}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX_LENGTH}
            placeholder={t("create.namePlaceholder")}
            autoComplete="off"
            className="w-full rounded-md border border-line bg-ink-950/70 px-4 py-2.5 text-bone-100 placeholder:text-bone-500 focus:border-gold-400/70 focus:outline-none"
            data-testid="name-input"
          />
        </label>
      </aside>

      <details className="rounded-xl border border-line bg-ink-900/40 px-4 py-3">
        <summary className="cursor-pointer text-sm text-gold-200">{t("create.choose")}</summary>
      <Panel className="mt-4 space-y-8">
          <fieldset>
            <legend className="mb-2 text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("create.gender")}</legend>
            <div className="flex rounded-md border border-line bg-ink-950/70 p-1">
              {([null, "female", "male"] as const).map((value) => (
                <label key={value ?? "random"} className={`cursor-pointer rounded px-3 py-1.5 text-sm transition ${gender === value ? "bg-gold-500/20 text-gold-100" : "text-bone-300 hover:text-bone-100"}`}>
                  <input type="radio" name="gender" className="sr-only" checked={gender === value} onChange={() => setGender(value)} />
                  {value === null ? t("create.random") : value === "female" ? t("create.female") : t("create.male")}
                </label>
              ))}
            </div>
          </fieldset>

        {universe.races.length > 1 && <OptionGrid legend={t("create.race")} name="race" options={universe.races} value={raceId} onChange={setRaceId} />}
        <OptionGrid
          legend={t("create.origin")}
          name="origin"
          options={universe.origins}
          value={originId}
          onChange={setOriginId}
          extra={(o) => (o.wealth ? t("create.gold", { n: o.wealth }) : null)}
        />
        <OptionGrid legend={t("create.temperament")} name="temperament" options={temperaments} value={temperamentId} onChange={setTemperamentId} />

        <details className="group">
          <summary className="cursor-pointer text-sm text-bone-300 transition hover:text-gold-200">{t("create.advanced")}</summary>
          <label className="mt-4 block max-w-md">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("create.seed")}</span>
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              maxLength={SEED_MAX_LENGTH}
              autoComplete="off"
              className="w-full rounded-md border border-line bg-ink-950/70 px-4 py-2.5 font-mono text-sm text-bone-100 focus:border-gold-400/70 focus:outline-none"
              data-testid="seed-input"
            />
            <span className="mt-1 block text-xs text-bone-500">{t("create.seedHint")}</span>
          </label>
        </details>
      </Panel>
      </details>

      <Ornament />
      <div className="flex flex-col items-center gap-3">
        {error && (
          <p className="text-sm text-blood-300" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" disabled={busy} data-testid="create-submit">
          {busy ? t("create.submitting") : t("create.submit")}
        </Button>
      </div>
    </form>
  );
}
