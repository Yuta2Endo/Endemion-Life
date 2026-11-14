"use client";

import {
  NAME_MAX_LENGTH,
  SEED_MAX_LENGTH,
  STAT_INFO,
  entriesOf,
  pointBuyTotal,
  type OptionView,
  type StatKey,
  type StatMods,
  type StatPointAllocation,
  type UniverseSummary
} from "@endemion/game-core";
import type { CreateLifeRequest } from "@endemion/shared";
import { Button, Panel } from "@endemion/ui";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ClientError } from "@/lib/api";
import { storeForNewLife } from "@/lib/store";
import { CreationChoices } from "./creation-choices";
import { useI18n } from "./locale-provider";
import { WorldEmblem } from "./world-emblem";

type Choice = string | null;
type Step = 1 | 2 | 3;

function ModsLine({ mods }: { mods: StatMods }) {
  const { locale } = useI18n();
  const entries = entriesOf(mods).filter(([, delta]) => delta !== 0);
  if (entries.length === 0) return null;
  return (
    <span className="mt-2 block text-xs tabular-nums text-bone-500">
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
    { id: null, title: t("create.random"), description: t("create.randomHint") },
    ...options.map((o) => ({ id: o.id, title: l(o.name), description: l(o.description), mods: o.statMods, note: extra?.(o) ?? null }))
  ];
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-medium text-bone-200">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => {
          const checked = value === item.id;
          return (
            <label
              key={item.id ?? "random"}
              className={`relative flex cursor-pointer flex-col border p-4 transition focus-within:outline-2 focus-within:outline-gold-300 ${
                checked ? "border-gold-400 bg-gold-500/10" : "border-line bg-ink-900 hover:border-bone-500"
              }`}
            >
              <input type="radio" name={name} className="sr-only" checked={checked} onChange={() => onChange(item.id)} />
              <span className={`block text-sm font-medium ${checked ? "text-gold-100" : "text-bone-100"}`}>{item.title}</span>
              {item.description && <span className="mt-1.5 block text-xs leading-relaxed text-bone-400">{item.description}</span>}
              {item.mods && <ModsLine mods={item.mods} />}
              {item.note && <span className="mt-2 block text-xs text-gold-300">{item.note}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const STEPS: { n: Step; key: "create.stepOne" | "create.stepTwo" | "create.stepThree" }[] = [
  { n: 1, key: "create.stepOne" },
  { n: 2, key: "create.stepTwo" },
  { n: 3, key: "create.stepThree" }
];

export function CreateForm({ universe, temperaments }: { universe: UniverseSummary; temperaments: OptionView[] }) {
  const { locale, l, t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Choice>(null);
  const [raceId, setRaceId] = useState<Choice>(universe.races.length === 1 ? universe.races[0]!.id : null);
  const [originId, setOriginId] = useState<Choice>(null);
  const [temperamentId, setTemperamentId] = useState<Choice>(null);
  const [upbringingId, setUpbringingId] = useState<Choice>(null);
  const [points, setPoints] = useState<StatPointAllocation>({});
  const [seed, setSeed] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const origin = universe.origins.find((item) => item.id === originId) ?? null;
  const race = universe.races.find((item) => item.id === raceId) ?? null;
  const temperament = temperaments.find((item) => item.id === temperamentId) ?? null;
  const upbringing = universe.upbringings.find((item) => item.id === upbringingId) ?? null;
  const stationId = originId ? universe.originClasses[originId] : undefined;
  const station = universe.socialClasses.find((item) => item.id === stationId) ?? null;
  const fork = universe.mechanics[0];
  const spentPoints = pointBuyTotal(points);
  const previewMods: StatMods = { ...(upbringing?.statMods ?? {}) };
  for (const [key, value] of entriesOf(points)) previewMods[key] = (previewMods[key] ?? 0) + value;

  function changePoint(key: StatKey, delta: 1 | -1): void {
    setPoints((current) => {
      const value = (current[key] ?? 0) + delta;
      if (value < 0 || value > universe.pointBuy.perStat) return current;
      const next: StatPointAllocation = { ...current };
      if (value === 0) delete next[key];
      else next[key] = value;
      // Бюджет проверяется и здесь, и на сервере: кнопка «+» не должна обходить лимит
      return pointBuyTotal(next) > universe.pointBuy.total ? current : next;
    });
  }

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
    if (upbringingId) input.upbringingId = upbringingId;
    if (spentPoints > 0) input.statPoints = points;
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
      <header className="border-b border-line pb-8">
        <div className="flex items-start gap-4 sm:gap-6">
          <div className="shrink-0 pt-1">
            <WorldEmblem id={universe.id} accent={universe.theme.accent} size={64} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: universe.theme.accent }}>
              {l(universe.name)}
            </p>
            <h1 className="mt-2 font-display text-4xl leading-tight text-bone-50 sm:text-5xl">{t("create.title")}</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-bone-300">{t("create.lead")}</p>
            <p className="mt-3 text-sm text-bone-400" data-testid="create-world">
              {t("worlds.path")}: {l(universe.track.name)} · {t("worlds.lifespan", { years: universe.lifespan })}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-8 pb-24 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:pb-0">
        <div className="min-w-0">
          <ol className="flex border-y border-line" aria-label={t("create.steps")}>
            {STEPS.map((item) => {
              const current = step === item.n;
              return (
                <li key={item.n} className="min-w-0 flex-1 border-r border-line last:border-r-0">
                  <button
                    type="button"
                    onClick={() => setStep(item.n)}
                    aria-current={current ? "step" : undefined}
                    data-testid={`create-step-${item.n}`}
                    className={`flex min-h-16 w-full items-center gap-2 px-2 py-3 text-left transition sm:px-4 ${
                      current ? "bg-ink-800 text-bone-50" : "text-bone-400 hover:bg-ink-800/50 hover:text-bone-200"
                    }`}
                  >
                    <span
                      className={`hidden h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums min-[360px]:flex ${
                        current ? "border-gold-400 text-gold-300" : "border-line text-bone-500"
                      }`}
                    >
                      {item.n}
                    </span>
                    <span className="truncate text-xs sm:text-sm">{t(item.key)}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="pt-8">
            <section hidden={step !== 1} aria-labelledby="create-step-one">
              <p className="text-xs tabular-nums text-bone-500">{t("create.stepCount", { n: 1 })}</p>
              <h2 id="create-step-one" className="mt-1 font-display text-2xl text-bone-50">{t("create.stepOneTitle")}</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-bone-400">{t("create.stepOneLead")}</p>

              <label className="mt-6 block max-w-xl">
                <span className="mb-2 block text-sm font-medium text-bone-200">{t("create.name")}</span>
                <input
                  name="characterName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={NAME_MAX_LENGTH}
                  placeholder={t("create.namePlaceholder")}
                  autoComplete="off"
                  className="min-h-12 w-full border border-line bg-ink-900 px-4 py-3 text-lg text-bone-50 placeholder:text-bone-500 focus:border-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
                  aria-describedby="create-name-hint"
                  data-testid="name-input"
                />
                <span id="create-name-hint" className="mt-2 block text-xs text-bone-500">
                  {t("create.nameHint", { n: NAME_MAX_LENGTH })}
                </span>
              </label>

              <fieldset className="mt-6">
                <legend className="mb-2 text-sm font-medium text-bone-200">{t("create.gender")}</legend>
                <div className="inline-flex border border-line bg-ink-900 p-1">
                  {([null, "female", "male"] as const).map((value) => (
                    <label
                      key={value ?? "random"}
                      className={`flex min-h-11 cursor-pointer items-center px-4 text-sm transition ${
                        gender === value ? "bg-gold-500/15 text-gold-100" : "text-bone-300 hover:text-bone-100"
                      }`}
                    >
                      <input type="radio" name="gender" className="sr-only" checked={gender === value} onChange={() => setGender(value)} />
                      {value === null ? t("create.random") : value === "female" ? t("create.female") : t("create.male")}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                <Button type="button" variant="ghost" onClick={() => setStep(2)} data-testid="create-choose">
                  {t("create.chooseRoots")} →
                </Button>
                <p className="text-xs text-bone-500">{t("create.optionalHint")}</p>
              </div>
            </section>

            <section hidden={step !== 2} aria-labelledby="create-step-two" className="space-y-7">
              <div>
                <p className="text-xs tabular-nums text-bone-500">{t("create.stepCount", { n: 2 })}</p>
                <h2 id="create-step-two" className="mt-1 font-display text-2xl text-bone-50">{t("create.stepTwoTitle")}</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-bone-400">{t("create.stepTwoLead")}</p>
              </div>

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

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                <Button type="button" variant="quiet" onClick={() => setStep(1)}>
                  ← {t("create.back")}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setStep(3)}>
                  {t("create.next")} →
                </Button>
              </div>
            </section>

            <section hidden={step !== 3} aria-labelledby="create-step-three" className="space-y-7">
              <div>
                <p className="text-xs tabular-nums text-bone-500">{t("create.stepCount", { n: 3 })}</p>
                <h2 id="create-step-three" className="mt-1 font-display text-2xl text-bone-50">{t("create.stepThreeTitle")}</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-bone-400">{t("create.stepThreeLead")}</p>
              </div>

              <CreationChoices
                upbringings={universe.upbringings}
                upbringingId={upbringingId}
                onUpbringing={setUpbringingId}
                points={points}
                onPoint={changePoint}
                total={universe.pointBuy.total}
                perStat={universe.pointBuy.perStat}
              />

              <details className="border-t border-line pt-5">
                <summary className="flex min-h-11 cursor-pointer items-center text-sm text-bone-300 transition hover:text-gold-200" data-testid="create-advanced">
                  {t("create.advanced")}
                </summary>
                <label className="mt-4 block max-w-md">
                  <span className="mb-2 block text-sm font-medium text-bone-200">{t("create.seed")}</span>
                  <input
                    name="seed"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    maxLength={SEED_MAX_LENGTH}
                    autoComplete="off"
                    className="min-h-11 w-full border border-line bg-ink-900 px-4 py-2.5 font-mono text-sm text-bone-100 focus:border-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
                    data-testid="seed-input"
                  />
                  <span className="mt-2 block text-xs text-bone-500">{t("create.seedHint")}</span>
                </label>
              </details>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                <Button type="button" variant="quiet" onClick={() => setStep(2)}>
                  ← {t("create.back")}
                </Button>
                <p className="text-xs text-bone-500">{t("create.finishHint")}</p>
              </div>
            </section>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24" aria-label={t("create.preview")}>
          <Panel tone="quiet" className="space-y-5" data-testid="birth-preview">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-bone-200">{t("create.preview")}</p>
              <span className="text-xs tabular-nums text-bone-500">{t("create.stepCount", { n: step })}</span>
            </div>

            <div className="border-b border-line pb-5">
              <p className="font-display text-2xl leading-tight text-bone-50">{name.trim() || t("create.namePlaceholder")}</p>
              <p className="mt-2 text-sm text-bone-300">
                {station ? l(station.name) : t("create.previewRandom")} · {t("worlds.lifespan", { years: universe.lifespan })}
              </p>
              <dl className="mt-4 space-y-2 text-xs">
                {race && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-bone-500">{t("create.race")}</dt>
                    <dd className="text-right text-bone-200">{l(race.name)}</dd>
                  </div>
                )}
                {origin && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-bone-500">{t("create.origin")}</dt>
                    <dd className="text-right text-bone-200">{l(origin.name)}</dd>
                  </div>
                )}
                {temperament && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-bone-500">{t("create.temperament")}</dt>
                    <dd className="text-right text-bone-200">{l(temperament.name)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-bone-500">{t("create.gender")}</dt>
                  <dd className="text-right text-bone-200">
                    {gender === "female" ? t("create.female") : gender === "male" ? t("create.male") : t("create.random")}
                  </dd>
                </div>
              </dl>
            </div>

            {origin && <p className="text-xs leading-relaxed text-bone-400">{l(origin.description)}</p>}

            {upbringing && (
              <div className="border-t border-line pt-4" data-testid="create-upbringing-preview">
                <p className="text-xs text-bone-500">{t("create.upbringing")}</p>
                <p className="mt-1 text-sm text-gold-200">{l(upbringing.name)}</p>
                {entriesOf(previewMods).filter(([, delta]) => delta !== 0).length > 0 && (
                  <p className="mt-1 text-xs tabular-nums text-bone-400">
                    {entriesOf(previewMods)
                      .filter(([, delta]) => delta !== 0)
                      .map(([key, delta]) => `${STAT_INFO[key].short[locale]} ${delta > 0 ? "+" : ""}${delta}`)
                      .join(" · ")}
                  </p>
                )}
              </div>
            )}

            {spentPoints > 0 && (
              <p className="text-xs tabular-nums text-bone-400" data-testid="create-points-preview">
                {t("create.pointsPreview", { n: spentPoints, total: universe.pointBuy.total })}
              </p>
            )}

            {fork && (
              <div className="border-t border-line pt-4">
                <p className="text-xs text-bone-500">{t("create.previewFork")}</p>
                <p className="mt-1 text-sm text-bone-100">{l(fork.name)}</p>
                <p className="mt-1 text-xs leading-relaxed text-bone-400">{l(fork.description)}</p>
              </div>
            )}

            {error && (
              <p className="border border-blood-400/60 bg-blood-500/10 px-3 py-2 text-sm text-blood-200" role="alert">
                {error}
              </p>
            )}

            <div className="border-t border-line pt-4">
              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy} data-testid="create-submit">
                {busy ? t("create.submitting") : t("create.submit")}
              </Button>
              <p className="mt-2 text-xs leading-relaxed text-bone-500">{t("create.quickHint")}</p>
            </div>
          </Panel>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink-950/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden">
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy} data-testid="create-submit-mobile">
          {busy ? t("create.submitting") : t("create.submit")}
        </Button>
      </div>
    </form>
  );
}
