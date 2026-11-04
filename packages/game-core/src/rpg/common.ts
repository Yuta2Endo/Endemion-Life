// Общие для всех вселенных навыки, ремёсла и черты характера NPC. Своё у каждого мира лежит в universes/*.ts
import { t, type LocalizedText } from "../i18n.js";
import type { ProfessionDefinition, SkillDefinition, TalentDefinition, WeaknessDefinition } from "../universes/types.js";

export const COMMON_SKILLS: readonly SkillDefinition[] = [
  { id: "melee", name: t("Ближний бой", "Melee"), description: t("Меч, кулак, посох — всё, что бьёт вблизи.", "Sword, fist, staff — anything that strikes up close."), category: "combat", stats: ["strength", "agility"] },
  { id: "athletics", name: t("Атлетика", "Athletics"), description: t("Бег, плавание, лазание и выносливость.", "Running, swimming, climbing and endurance."), category: "survival", stats: ["strength", "vitality"] },
  { id: "lore", name: t("Знания", "Lore"), description: t("История, языки, науки и книги.", "History, languages, sciences and books."), category: "knowledge", stats: ["intelligence", "wisdom"] },
  { id: "persuasion", name: t("Убеждение", "Persuasion"), description: t("Добиться своего словом.", "Getting your way with words."), category: "social", stats: ["charisma", "wisdom"] },
  { id: "survival", name: t("Выживание", "Survival"), description: t("Огонь, следы, укрытие и еда в глуши.", "Fire, tracks, shelter and food in the wild."), category: "survival", stats: ["vitality", "wisdom"] },
  { id: "craft", name: t("Ремесло", "Craft"), description: t("Руки, которые умеют делать вещи.", "Hands that know how to make things."), category: "craft", stats: ["intelligence", "agility"] },
  { id: "medicine", name: t("Врачевание", "Medicine"), description: t("Травы, повязки и знание тела.", "Herbs, bandages and knowledge of the body."), category: "knowledge", stats: ["intelligence", "wisdom"] },
  { id: "stealth", name: t("Скрытность", "Stealth"), description: t("Пройти незамеченным и не оставить следа.", "Passing unseen and leaving no trace."), category: "survival", stats: ["agility", "luck"] },
  { id: "trade", name: t("Торговля", "Trade"), description: t("Цена, торг и выгода.", "Price, haggling and profit."), category: "social", stats: ["charisma", "intelligence"] }
];

/** Ремёсла из события «Дело всей жизни»: есть в любом мире */
export const COMMON_PROFESSIONS: readonly ProfessionDefinition[] = [
  { id: "guard", name: t("Стражник", "Guard"), description: t("Служба с оружием в руках.", "Service with a weapon in hand."), skill: "melee", stats: ["strength", "vitality"], base: 3 },
  { id: "scholar", name: t("Учёный", "Scholar"), description: t("Архивы, переводы и письма.", "Archives, translations and letters."), skill: "lore", stats: ["intelligence", "wisdom"], base: 3 },
  { id: "merchant", name: t("Торговец", "Merchant"), description: t("Своя лавка и свои караваны.", "One's own shop and caravans."), skill: "trade", stats: ["charisma", "intelligence"], base: 4 },
  { id: "wanderer", name: t("Странник", "Wanderer"), description: t("Дорога кормит того, кто не боится её.", "The road feeds those who do not fear it."), skill: "survival", stats: ["luck", "agility"], base: 1 },
  { id: "laborer", name: t("Подёнщик", "Day labourer"), description: t("Любая работа, за которую платят.", "Any work that pays."), skill: "craft", stats: ["strength", "vitality"], base: 2 }
];

export interface NpcTraitDefinition {
  id: string;
  name: LocalizedText;
  /** Как черта звучит в биографии */
  bio: LocalizedText;
  /** Прибавка к отношению при знакомстве */
  affinity: number;
}

export const NPC_TRAITS: readonly NpcTraitDefinition[] = [
  { id: "caring", name: t("Заботливый", "Caring"), bio: t("Всегда замечает, когда другим плохо.", "Always notices when others are hurting."), affinity: 12 },
  { id: "stern", name: t("Строгий", "Stern"), bio: t("Хвалит редко, требует много.", "Praises rarely and demands much."), affinity: -6 },
  { id: "cheerful", name: t("Весёлый", "Cheerful"), bio: t("Смех слышно издалека.", "Their laughter carries far."), affinity: 8 },
  { id: "ambitious", name: t("Честолюбивый", "Ambitious"), bio: t("Мечтает о большем и ждёт того же от близких.", "Dreams of more and expects the same of those close to them."), affinity: -2 },
  { id: "secretive", name: t("Скрытный", "Secretive"), bio: t("О прошлом молчит, даже когда спрашивают.", "Stays silent about the past even when asked."), affinity: 0 },
  { id: "wise", name: t("Мудрый", "Wise"), bio: t("Говорит мало, но к словам прислушиваются.", "Says little, but people listen."), affinity: 6 },
  { id: "hot-tempered", name: t("Вспыльчивый", "Hot-tempered"), bio: t("Гнев вспыхивает быстро и быстро гаснет.", "Anger flares fast and fades fast."), affinity: -8 },
  { id: "dreamer", name: t("Мечтатель", "Dreamer"), bio: t("Живёт наполовину в выдуманных мирах.", "Lives half in imagined worlds."), affinity: 4 },
  { id: "proud", name: t("Гордый", "Proud"), bio: t("Не прощает обид и не просит помощи.", "Never forgives a slight and never asks for help."), affinity: -4 },
  { id: "drinker", name: t("Пьющий", "Drinker"), bio: t("Кружка за кружкой топит какую-то старую беду.", "Drowns some old sorrow mug after mug."), affinity: -10 }
];

/** Кем бывают NPC, если мир не задал своих званий */
export const DEFAULT_NPC_TITLES: Readonly<Record<"friend" | "rival" | "mentor" | "teacher" | "partner", readonly LocalizedText[]>> = {
  friend: [t("Друг детства", "Childhood friend"), t("Соседский ребёнок", "Neighbour's child"), t("Товарищ по играм", "Playmate")],
  rival: [t("Соперник с соседней улицы", "Rival from the next street"), t("Завистливый сверстник", "Envious peer")],
  mentor: [t("Странствующий мастер", "Wandering master"), t("Отставной воин", "Retired warrior")],
  teacher: [t("Деревенский учитель", "Village teacher"), t("Учёный переписчик", "Learned scribe")],
  partner: [t("Человек с праздника", "Someone from the festival"), t("Знакомый по работе", "A colleague")]
};

/** Таланты, которые встречаются в любом мире. У каждого мира есть и свои */
export const COMMON_TALENTS: readonly TalentDefinition[] = [
  { id: "quick-learner", name: t("Быстрый ум", "Quick mind"), description: t("Схватывает новое с первого раза.", "Picks up new things at first try."), growth: ["intelligence"], skills: ["lore"], checks: ["intelligence"] },
  { id: "iron-body", name: t("Железное тело", "Iron body"), description: t("Болеет редко, раны заживают быстро.", "Rarely ill; wounds heal fast."), growth: ["vitality", "strength"], skills: ["athletics"], checks: ["vitality"] },
  { id: "silver-tongue", name: t("Серебряный язык", "Silver tongue"), description: t("Слова сами складываются в нужные.", "Words arrange themselves just right."), growth: ["charisma"], skills: ["persuasion"], checks: ["charisma"] },
  { id: "lucky-star", name: t("Счастливая звезда", "Lucky star"), description: t("Случай слишком часто оказывается на стороне.", "Chance is suspiciously often on their side."), growth: ["luck"], checks: ["luck"], weight: 0.6 },
  { id: "keen-eye", name: t("Зоркий глаз", "Keen eye"), description: t("Замечает то, мимо чего проходят другие.", "Notices what others walk past."), growth: ["agility", "wisdom"], skills: ["stealth"], checks: ["agility"] },
  { id: "steady-heart", name: t("Твёрдое сердце", "Steady heart"), description: t("Страх и боль отступают перед упрямством.", "Fear and pain give way to stubbornness."), growth: ["willpower"], checks: ["willpower"] },
  { id: "golden-hands", name: t("Золотые руки", "Golden hands"), description: t("Любая вещь в руках оживает.", "Anything comes alive in their hands."), skills: ["craft", "medicine"], checks: ["agility"] }
];

export const COMMON_WEAKNESSES: readonly WeaknessDefinition[] = [
  { id: "frail", name: t("Слабое здоровье", "Frail health"), description: t("Простуда валит с ног на неделю.", "A cold knocks them down for a week."), checks: ["vitality"], healing: 0.7, conflicts: ["iron-body"] },
  { id: "stutter", name: t("Заикание", "Stutter"), description: t("Слова застревают, когда важнее всего.", "Words stick when they matter most."), checks: ["charisma"], conflicts: ["silver-tongue"] },
  { id: "reckless", name: t("Безрассудство", "Recklessness"), description: t("Сначала делает, потом думает.", "Acts first, thinks later."), checks: ["wisdom"] },
  { id: "spendthrift", name: t("Мотовство", "Spendthrift"), description: t("Деньги утекают сквозь пальцы.", "Money slips through their fingers."), income: 0.7 },
  { id: "night-terrors", name: t("Ночные кошмары", "Night terrors"), description: t("Сны приходят из прошлого, которого не было.", "Dreams come from a past that never was."), checks: ["willpower"], conflicts: ["steady-heart"] },
  { id: "clumsy", name: t("Неуклюжесть", "Clumsiness"), description: t("Ноги цепляются за ровное место.", "Trips over flat ground."), checks: ["agility"], conflicts: ["keen-eye"] }
];
