// Достижения. Хранятся в роду (lineage.achievements): переходят к наследнику и остаются за родом навсегда.
// Каждое достижение — один раз на род. Проверяются после каждого действия и в момент смерти
import { lifespanOf } from "../character/derived.js";
import { isPresent, selfSpouse } from "../family/kin.js";
import { t, type LocalizedText } from "../i18n.js";
import { educationTier, findProfession } from "../rpg/skills.js";
import { SELF_ID, type GameState, type UniverseId } from "../types.js";
import { getUniverse } from "../universes/registry.js";

export const ACHIEVEMENT_CATEGORIES = ["personal", "family", "career", "combat", "social", "world", "legacy", "hidden"] as const;
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

export interface AchievementDefinition {
  id: string;
  category: AchievementCategory;
  name: LocalizedText;
  description: LocalizedText;
  /** Только в этом мире */
  world?: UniverseId;
  /** Проверяется только в момент смерти персонажа */
  atDeath?: boolean;
  check: (state: GameState) => boolean;
}

const children = (state: GameState) => state.npcs.filter((npc) => npc.parents.includes(SELF_ID));
const standing = (state: GameState) => getUniverse(state.character.universeId).socialClasses.find((c) => c.id === state.character.socialClassId)?.standing ?? 0;
const meter = (state: GameState, id: string) => state.meters[id] ?? 0;

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  // Личные
  { id: "long-life", category: "personal", name: t("Долгий век", "A long life"), description: t("Дожить до отпущенного миром срока.", "Live to the span the world allots."), atDeath: true, check: (s) => s.life.age >= lifespanOf(s.character) },
  { id: "many-gifts", category: "personal", name: t("Щедро одарён", "Richly gifted"), description: t("Проявить три таланта в одной жизни.", "Show three talents in one life."), check: (s) => s.character.talents.length >= 3 },
  { id: "know-thyself", category: "personal", name: t("Познай себя", "Know thyself"), description: t("Узнать свой потенциал и свою судьбу.", "Learn both your potential and your destiny."), check: (s) => s.hidden.revealed.includes("potential") && s.hidden.revealed.includes("destiny") },
  // Семья
  { id: "wedding", category: "family", name: t("Под одной крышей", "Under one roof"), description: t("Вступить в брак.", "Get married."), check: (s) => selfSpouse(s) !== undefined },
  { id: "full-house", category: "family", name: t("Полный дом", "A full house"), description: t("Вырастить троих детей.", "Raise three children."), check: (s) => children(s).length >= 3 },
  { id: "grandparent", category: "family", name: t("Дождаться внуков", "Living to see grandchildren"), description: t("Увидеть рождение внука.", "See a grandchild born."), check: (s) => s.npcs.some((npc) => npc.role === "grandchild") },
  { id: "kind-heart", category: "family", name: t("Добрый дом", "A kind home"), description: t("Взять на воспитание приёмного ребёнка.", "Take in an adopted child."), check: (s) => children(s).some((npc) => npc.adopted) },
  // Карьера
  { id: "craft-master", category: "career", name: t("Мастер своего дела", "Master of a craft"), description: t("Довести навык своего ремесла до 60.", "Bring your profession's skill to 60."), check: (s) => {
    const profession = s.character.professionId ? findProfession(getUniverse(s.character.universeId), s.character.professionId) : undefined;
    return profession !== undefined && (s.character.skills[profession.skill] ?? 0) >= 60;
  } },
  { id: "scholar", category: "career", name: t("Высшая ступень", "The highest tier"), description: t("Получить высшее образование мира.", "Complete the world's highest education."), check: (s) => educationTier(getUniverse(s.character.universeId), s.character) >= 3 },
  { id: "summit", category: "career", name: t("Вершина пути", "The summit of the path"), description: t("Достичь высшего ранга пути силы.", "Reach the highest rank of the path of power."), check: (s) => s.character.track.rank >= getUniverse(s.character.universeId).track.ranks.length - 1 },
  // Бой
  { id: "path-adept", category: "combat", name: t("На пути силы", "On the path of power"), description: t("Совершить два прорыва на пути силы.", "Break through twice on the path of power."), check: (s) => s.character.track.rank >= 2 },
  { id: "blade", category: "combat", name: t("Рука бойца", "A fighter's hand"), description: t("Довести ближний бой до 50.", "Bring melee to 50."), check: (s) => (s.character.skills.melee ?? 0) >= 50 },
  // Общество
  { id: "beloved", category: "social", name: t("Любимый многими", "Loved by many"), description: t("Пятеро живых людей очень близки вам.", "Five living people are very close to you."), check: (s) => s.npcs.filter((npc) => isPresent(npc) && npc.affinity >= 60).length >= 5 },
  { id: "famous", category: "social", name: t("Громкое имя", "A famous name"), description: t("Репутация 60 и выше.", "Reputation of 60 or more."), check: (s) => s.character.reputation >= 60 },
  { id: "high-station", category: "social", name: t("Среди высших", "Among the highest"), description: t("Подняться в сословие знатности 4 и выше.", "Rise to a station of standing 4 or higher."), check: (s) => standing(s) >= 4 },
  // Миры
  { id: "world.dark-fantasy", category: "world", world: "dark-fantasy", name: t("Хранитель Огня", "Keeper of the Flame"), description: t("Разжечь Последний Огонь до 60.", "Kindle the Last Flame to 60."), check: (s) => meter(s, "ember") >= 60 },
  { id: "world.isekai", category: "world", world: "isekai", name: t("Любимец Системы", "The System's favourite"), description: t("Выполнить четыре задания Системы.", "Complete four System quests."), check: (s) => s.questsDone.length >= 4 },
  { id: "world.murim", category: "world", world: "murim", name: t("Праведный герой", "A righteous hero"), description: t("Карма 50 и выше на пути боевой школы.", "Karma of 50 or more on the path of a martial school."), check: (s) => s.character.karma >= 50 && s.flags.includes("martial-school") },
  { id: "world.xianxia", category: "world", world: "xianxia", name: t("Сердце Дао", "Heart of the Dao"), description: t("Сердце Дао 70 и выше.", "Dao heart of 70 or more."), check: (s) => meter(s, "dao-heart") >= 70 },
  { id: "world.hunter", category: "world", world: "hunter", name: t("Лицо с экранов", "A face on every screen"), description: t("Слава 50 и выше.", "Fame of 50 or more."), check: (s) => meter(s, "fame") >= 50 },
  { id: "world.academy", category: "world", world: "academy", name: t("Любимец двора", "The court's darling"), description: t("Милость двора 75 и выше.", "Court favour of 75 or more."), check: (s) => meter(s, "court-favor") >= 75 },
  // Наследие
  { id: "heir", category: "legacy", name: t("Продолжатель рода", "Carrier of the line"), description: t("Продолжить род за наследника.", "Continue the family as an heir."), check: (s) => s.lineage.generation >= 2 },
  { id: "dynasty", category: "legacy", name: t("Династия", "A dynasty"), description: t("Довести род до четвёртого поколения.", "Bring the family to its fourth generation."), check: (s) => s.lineage.generation >= 4 },
  { id: "great-house", category: "legacy", name: t("Великий дом", "A great house"), description: t("Слава рода 50 и выше.", "Family renown of 50 or more."), check: (s) => s.lineage.renown >= 50 },
  { id: "family-gift", category: "legacy", name: t("Фамильный дар", "A family gift"), description: t("Талант проявился в двух поколениях рода.", "A talent has shown in two generations of the family."), check: (s) => Object.values(s.lineage.traits.talents).some((n) => n >= 2) },
  { id: "keepers", category: "legacy", name: t("Хранители знания", "Keepers of knowledge"), description: t("Передать древнее знание следующему поколению.", "Pass ancient knowledge to the next generation."), check: (s) => s.lineage.threads.some((thread) => thread.id === "ancient-knowledge" && thread.gen < s.lineage.generation) },
  // Скрытые
  { id: "rags-to-riches", category: "hidden", name: t("Из грязи в князи", "From rags to riches"), description: t("Родиться в низах и подняться к знати.", "Be born at the bottom and rise to nobility."), check: (s) => {
    const universe = getUniverse(s.character.universeId);
    const born = universe.socialClasses.find((c) => c.id === universe.originProfiles[s.character.originId]?.socialClassId)?.standing ?? 0;
    return born <= 1 && standing(s) >= 3;
  } },
  { id: "fallen-house", category: "hidden", name: t("Падший дом", "A fallen house"), description: t("Довести славу рода до -50.", "Bring the family's renown down to -50."), check: (s) => s.lineage.renown <= -50 },
  { id: "short-candle", category: "hidden", name: t("Короткая свеча", "A short candle"), description: t("Уйти, не дожив до восемнадцати.", "Pass away before turning eighteen."), atDeath: true, check: (s) => s.life.age < 18 },
  { id: "grief", category: "hidden", name: t("Пережить своих детей", "Outliving one's children"), description: t("Похоронить собственного ребёнка.", "Bury one's own child."), check: (s) => children(s).some((npc) => !npc.alive) }
];

export function findAchievement(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** Новые достижения рода. Заносит их в lineage.achievements и возвращает их определения */
export function unlockAchievements(state: GameState): AchievementDefinition[] {
  const have = new Set(state.lineage.achievements.map((a) => a.id));
  const dead = !state.life.alive;
  const unlocked: AchievementDefinition[] = [];
  for (const achievement of ACHIEVEMENTS) {
    if (have.has(achievement.id)) continue;
    if (achievement.world && achievement.world !== state.character.universeId) continue;
    if (achievement.atDeath && !dead) continue;
    if (!achievement.check(state)) continue;
    state.lineage.achievements.push({ id: achievement.id, gen: state.lineage.generation, age: state.life.age });
    unlocked.push(achievement);
  }
  return unlocked;
}
