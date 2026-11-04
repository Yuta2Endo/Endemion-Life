// Обстоятельства рождения: семья, место, знамение, таланты, слабости, скрытые характеристики и биография.
// Броски идут из отдельного потока Rng ("birth"): характеристики Stage 01 при том же seed не меняются
import { t, type LocalizedText } from "../i18n.js";
import type { Rng } from "../rng.js";
import { allTalents, allWeaknesses } from "../rpg/talents.js";
import type { BackgroundState, GameState, HiddenState, NpcState } from "../types.js";
import type { FamilyKind, TalentDefinition, UniverseDefinition } from "../universes/types.js";
import { NAME_POOLS } from "./names.js";
import { MIN_PARENT_AGE } from "../family/kin.js";
import { createNpc, roleName, type NpcContext } from "./npcs.js";

export interface BirthContext {
  state: GameState;
  rng: Rng;
  universe: UniverseDefinition;
}

/** Сумма двух костей 1–5: потенциал и судьба чаще средние, крайние значения редки */
function roll10(rng: Rng): number {
  return rng.int(1, 5) + rng.int(0, 5);
}

/** Фамилия семьи: из случайного имени, если его выбрал случай, иначе — из имён мира */
export function familyNameOf(universe: UniverseDefinition, name: string, generatedName: boolean, rng: Rng): string {
  const pool = NAME_POOLS[universe.id].family.filter((family) => family !== "");
  const roll = pool.length > 0 ? rng.pick(pool) : "";
  if (generatedName) {
    const fromName = pool.find((family) => name.endsWith(` ${family}`));
    if (fromName) return fromName;
  }
  return roll;
}

function pickTalent(ctx: BirthContext, exclude: readonly string[]): TalentDefinition | undefined {
  const favoured = ctx.universe.raceTalents[ctx.state.character.raceId] ?? [];
  const pool = allTalents(ctx.universe).filter((talent) => !exclude.includes(talent.id));
  return ctx.rng.weighted(pool, (talent) => (talent.weight ?? 1) * (favoured.includes(talent.id) ? 3 : 1));
}

/** Таланты: один-два при рождении, больше при высоком потенциале. Часть проявится только позже */
function rollTalents(ctx: BirthContext, potential: number): { known: string[]; dormant: string[] } {
  const count = 1 + (ctx.rng.chance(0.25 + potential * 0.05) ? 1 : 0) + (potential >= 9 ? 1 : 0);
  const known: string[] = [];
  const dormant: string[] = [];
  for (let i = 0; i < count; i++) {
    const talent = pickTalent(ctx, [...known, ...dormant]);
    if (!talent) break;
    // Первый талант виден сразу в половине жизней, остальные спят до своего часа
    if (i === 0 && ctx.rng.chance(0.5)) known.push(talent.id);
    else dormant.push(talent.id);
  }
  return { known, dormant };
}

function rollWeaknesses(ctx: BirthContext, talents: readonly string[]): string[] {
  if (!ctx.rng.chance(0.6)) return [];
  const pool = allWeaknesses(ctx.universe).filter((weakness) => !(weakness.conflicts ?? []).some((id) => talents.includes(id)));
  const weakness = ctx.rng.weighted(pool, (w) => w.weight ?? 1);
  return weakness ? [weakness.id] : [];
}

function rollSecret(ctx: BirthContext): string | null {
  const originId = ctx.state.character.originId;
  const pool = ctx.universe.familySecrets.filter((secret) => !secret.origins || secret.origins.includes(originId));
  if (pool.length === 0 || !ctx.rng.chance(0.4)) return null;
  return ctx.rng.pick(pool).id;
}

/**
 * Связи родства семьи при рождении: родители — родители персонажа, братья и сёстры — их дети,
 * бабушка или дед — родитель одного из родителей. Связь ставится, только если по возрасту она возможна.
 * Возвращает родителей персонажа (id)
 */
export function linkFamily(family: readonly NpcState[], married: boolean): string[] {
  const parents = family.filter((npc) => npc.role === "father" || npc.role === "mother").sort((a, b) => (a.role === "mother" ? -1 : 1) - (b.role === "mother" ? -1 : 1));
  const fits = (parent: NpcState, child: NpcState) => child.bornAt - parent.bornAt >= MIN_PARENT_AGE;
  const [mother, father] = parents;
  // Родители полной семьи и сироты — супруги. Незаконный отец в браке с матерью не состоит
  if (married && mother && father) {
    mother.spouseId = father.id;
    father.spouseId = mother.id;
  }
  for (const npc of family) {
    if (npc.role === "sibling") npc.parents = parents.filter((parent) => fits(parent, npc)).map((parent) => parent.id);
    if (npc.role === "grandparent") {
      const child = parents.find((parent) => parent.parents.length === 0 && fits(npc, parent));
      if (child) child.parents = [npc.id];
    }
  }
  return parents.filter((parent) => parent.bornAt <= -MIN_PARENT_AGE).map((parent) => parent.id);
}

/** Родители, братья и сёстры, бабушка или дедушка — по виду семьи */
function createFamily(ctx: NpcContext, kind: FamilyKind): NpcState[] {
  const rng = ctx.rng;
  const family: NpcState[] = [];
  const topClass = [...ctx.universe.socialClasses].sort((a, b) => b.standing - a.standing)[0];
  if (kind === "full" || kind === "orphan" || kind === "bastard") {
    const father =
      kind === "bastard"
        ? createNpc(ctx, "father", { affinity: rng.int(-35, -10), power: rng.int(40, 70), ...(topClass?.occupations[0] ? { occupation: topClass.occupations[0] } : {}), familyName: rng.pick(NAME_POOLS[ctx.universe.id].family) })
        : createNpc(ctx, "father");
    family.push(father);
  }
  if (kind !== "foundling") family.push(createNpc(ctx, "mother"));
  if (kind === "orphan") {
    // Родители погибли в первые годы: они есть в семейном древе, но не в жизни
    for (const parent of family) {
      parent.alive = false;
      parent.diedAt = 0;
      parent.status = "deceased";
      parent.cause = "unknown";
    }
  }
  if (kind !== "foundling" && kind !== "orphan") {
    const siblings = rng.weighted([0, 1, 2, 3], (n) => [3, 4, 2, 1][n] ?? 0) ?? 0;
    for (let i = 0; i < siblings; i++) family.push(createNpc(ctx, "sibling"));
    if (rng.chance(0.45)) family.push(createNpc(ctx, "grandparent"));
  }
  return family;
}

function verb(state: GameState, male: string, female: string): string {
  return state.character.gender === "female" ? female : male;
}

function familyParagraph(state: GameState, family: readonly NpcState[], kind: FamilyKind): LocalizedText {
  const parents = family.filter((npc) => npc.role === "father" || npc.role === "mother");
  const siblings = family.filter((npc) => npc.role === "sibling");
  const parts: LocalizedText[] = parents.map((npc) =>
    t(`${roleName(npc.role, npc.gender).ru} — ${npc.name}, ${npc.occupation.ru.toLowerCase()}.`, `${roleName(npc.role, npc.gender).en}: ${npc.name}, ${npc.occupation.en.toLowerCase()}.`)
  );
  if (kind === "foundling") parts.push(t("Родителей никто не знает: ребёнка нашли у чужого порога.", "No one knows the parents: the child was found on a stranger's doorstep."));
  if (kind === "orphan") parts.push(t("Оба родителя погибли, когда ребёнку не было и года.", "Both parents died before the child's first year."));
  if (kind === "single") parts.push(t("Об отце мать не говорит никогда.", "Mother never speaks of the father."));
  if (kind === "bastard") parts.push(t("Отец не признаёт ребёнка, но и не забывает о нём совсем.", "The father does not acknowledge the child, yet never forgets them entirely."));
  if (siblings.length > 0) {
    const n = siblings.map((s) => s.name.split(" ")[0]).join(", ");
    parts.push(t(`Братья и сёстры: ${n}.`, `Siblings: ${n}.`));
  }
  return t(parts.map((p) => p.ru).join(" "), parts.map((p) => p.en).join(" "));
}

/**
 * Рождение: заполняет background, hidden, семью, шкалы мира и таланты. Вызывается один раз из newGame,
 * когда персонаж уже создан generateCharacter. Возвращает родителей персонажа (id) для рода
 */
export function bornInto(ctx: BirthContext, generatedName: boolean): string[] {
  const { state, rng, universe } = ctx;
  const c = state.character;
  const profile = universe.originProfiles[c.originId];
  const kind: FamilyKind = profile?.family ?? "full";

  const potential = roll10(rng);
  const destiny = roll10(rng);
  const familyName = familyNameOf(universe, c.name, generatedName, rng);
  const birthplace = universe.birthplaces.length > 0 ? rng.pick(universe.birthplaces) : t("Неизвестное место", "An unknown place");
  const omens = universe.omens.filter((omen) => (omen.minDestiny ?? 0) <= destiny);
  const omen = omens.length > 0 ? rng.pick(omens).text : t("Ночь была тихой.", "The night was quiet.");
  const talents = rollTalents(ctx, potential);
  const weaknesses = rollWeaknesses(ctx, [...talents.known, ...talents.dormant]);
  const secretId = rollSecret(ctx);

  const hidden: HiddenState = { potential, destiny, dormantTalents: talents.dormant, familySecret: secretId, revealed: [] };
  state.hidden = hidden;
  c.talents = talents.known;
  c.weaknesses = weaknesses;
  state.meters = Object.fromEntries(universe.meters.map((meter) => [meter.id, profile?.meters?.[meter.id] ?? meter.initial]));

  const background: BackgroundState = { familyName, birthplace, omen, familyHistory: profile?.history ?? t("", ""), biography: [] };
  state.background = background;
  const family = createFamily(ctx, kind);

  const born = t(`${c.name} ${verb(state, "родился", "родилась")}: ${birthplace.ru}.`, `${c.name} was born: ${birthplace.en}.`);
  const paragraphs: LocalizedText[] = [t(`${born.ru} ${omen.ru}`, `${born.en} ${omen.en}`)];
  if (profile?.history) paragraphs.push(profile.history);
  paragraphs.push(familyParagraph(state, family, kind));
  const secret = universe.familySecrets.find((s) => s.id === secretId);
  if (secret) paragraphs.push(secret.hint);
  if (talents.known.length > 0) {
    const talent = allTalents(universe).find((x) => x.id === talents.known[0]);
    if (talent) paragraphs.push(t(`С первых дней заметно: ${talent.description.ru.charAt(0).toLowerCase()}${talent.description.ru.slice(1)}`, `It shows from the first days: ${talent.description.en.charAt(0).toLowerCase()}${talent.description.en.slice(1)}`));
  }
  if (talents.dormant.length > 0 && potential >= 7) paragraphs.push(t("Старая повитуха долго смотрит на ребёнка и говорит, что в нём спит что-то большее.", "The old midwife studies the child for a long time and says something greater sleeps within."));
  background.biography = paragraphs;
  return linkFamily(family, kind === "full" || kind === "orphan");
}
