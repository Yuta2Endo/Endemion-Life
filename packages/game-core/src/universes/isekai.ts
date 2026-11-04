import { t } from "../i18n.js";
import { check, fx, when } from "../narrative/dsl.js";
import type { UniverseBase } from "./types.js";

export const ISEKAI: UniverseBase = {
  id: "isekai",
  name: t("Арденвейл", "Ardenvale"),
  tagline: t("Вторая жизнь в мире, где у судьбы есть интерфейс", "A second life in a world where fate has an interface"),
  description: t(
    "Вы помните прошлую жизнь в мире без магии. Теперь вы родились в Арденвейле, где Гильдия выдаёт лицензии, Хор Системы шепчет подсказки, а память о прошлом — ваше главное преимущество.",
    "You remember a past life in a world without magic. Now you are reborn in Ardenvale, where the Guild issues licences, the System Choir whispers hints, and memories of the past are your greatest edge."
  ),
  rules: [
    t("Память прошлой жизни: интеллект растёт быстрее, а знания открывают особые варианты", "Past-life memory: intelligence grows faster and knowledge unlocks special choices"),
    t("Ранги Гильдии: путь силы открыт с детства и растёт от опыта", "Guild ranks: the path of power is open from childhood and grows with experience"),
    t("Странный чужак: слишком необычные решения пугают местных", "Odd outsider: unusual decisions unsettle the locals")
  ],
  theme: { accent: "#6fa8c9", glow: "rgba(111, 168, 201, 0.35)" },
  lifespan: 75,
  manaName: t("Мана", "Mana"),
  races: [
    { id: "human", name: t("Человек", "Human"), description: t("Самый многочисленный народ Арденвейла.", "The most numerous folk of Ardenvale."), statMods: { luck: 1, charisma: 1 } },
    { id: "elf", name: t("Лесной эльф", "Wood elf"), description: t("Долгоживущие и гордые хранители рощ.", "Long-lived, proud guardians of the groves."), statMods: { agility: 2, wisdom: 1, strength: -1 }, lifespanBonus: 120 },
    { id: "beastkin", name: t("Зверолюд", "Beastkin"), description: t("Острый слух, быстрые ноги и прямой нрав.", "Sharp ears, quick feet and a straightforward nature."), statMods: { agility: 2, strength: 1, intelligence: -1 } },
    { id: "dwarf", name: t("Гном", "Dwarf"), description: t("Мастера кузни и горных туннелей.", "Masters of the forge and mountain tunnels."), statMods: { vitality: 2, strength: 1, agility: -1 }, lifespanBonus: 60 }
  ],
  origins: [
    { id: "villager", name: t("Сельский ребёнок", "Village child"), description: t("Тихая деревня у края леса.", "A quiet village at the forest's edge."), statMods: { vitality: 1, luck: 1 }, wealth: 10, flags: ["reincarnated"], weight: 4 },
    { id: "merchant-child", name: t("Сын торговца", "Merchant's child"), description: t("Лавка, счёты и вечный торг.", "A shop, an abacus and endless haggling."), statMods: { charisma: 1, intelligence: 1 }, wealth: 40, flags: ["reincarnated"], weight: 2 },
    { id: "baron-child", name: t("Дитя барона", "Baron's child"), description: t("Маленький замок, большие ожидания.", "A small castle and great expectations."), statMods: { charisma: 2 }, wealth: 80, reputation: 10, flags: ["reincarnated"], weight: 1 },
    { id: "orphan", name: t("Сирота из приюта", "Orphanage child"), description: t("Ничего своего, кроме памяти о прошлой жизни.", "Nothing of your own but memories of a past life."), statMods: { willpower: 2, agility: 1 }, wealth: 0, karma: 5, flags: ["reincarnated"], weight: 2 }
  ],
  track: {
    name: t("Ранг Гильдии", "Guild rank"),
    description: t("Очки Гильдии растут от опыта и подвигов. Экзамен на ранг — раз в год.", "Guild points grow with experience and deeds. Rank exams are held yearly."),
    pointsName: t("Очки Гильдии", "Guild points"),
    stats: ["intelligence", "agility"],
    minAge: 8,
    yearlyFactor: 0.5,
    ranks: [
      { name: t("Без ранга", "Unranked"), threshold: 0, statBonus: {} },
      { name: t("Ранг F", "Rank F"), threshold: 15, statBonus: { agility: 1, intelligence: 1 } },
      { name: t("Ранг D", "Rank D"), threshold: 45, statBonus: { agility: 2, intelligence: 2, vitality: 1 }, abilities: ["appraisal"] },
      { name: t("Ранг B", "Rank B"), threshold: 100, statBonus: { agility: 4, intelligence: 4, vitality: 3 }, lifespanBonus: 5, abilities: ["spell-weave"] },
      { name: t("Ранг S", "Rank S"), threshold: 200, statBonus: { agility: 7, intelligence: 7, vitality: 5, luck: 3 }, lifespanBonus: 15 }
    ]
  },
  abilities: [
    { id: "appraisal", name: t("Оценка", "Appraisal"), description: t("Видеть цену и свойства вещей.", "See the value and properties of things.") },
    { id: "spell-weave", name: t("Плетение заклинаний", "Spell Weaving"), description: t("Сплетать несколько заклинаний в одно.", "Weave several spells into one.") },
    { id: "modern-knowledge", name: t("Знания прошлого мира", "Otherworld knowledge"), description: t("Наука и изобретения, которых здесь не знают.", "Science and inventions unknown here.") }
  ],
  events: [
    {
      id: "is.memories",
      title: t("Воспоминания прошлой жизни", "Memories of a past life"),
      text: t(
        "Ночью {name} снится город из стекла и стали. Утром в голове — формулы, рецепты и слова незнакомого языка.",
        "At night {name} dreams of a city of glass and steel. In the morning their head is full of formulas, recipes and words of a strange tongue."
      ),
      minAge: 3,
      maxAge: 8,
      maxOccurrences: 1,
      weight: 6,
      choices: [
        {
          id: "embrace",
          text: t("Записать всё, что помнится", "Write down everything you remember"),
          success: { text: t("Записи складываются в бесценный дневник.", "The notes form a priceless journal."), effects: [fx.stat("intelligence", 3), fx.ability("modern-knowledge"), fx.flag("remembers"), fx.later("is.c-rival-reincarnator", 10)] }
        },
        {
          id: "hide",
          text: t("Забыть и жить этой жизнью", "Forget and live this life"),
          success: { text: t("Прошлое тускнеет. Новый мир становится единственным.", "The past fades. The new world becomes the only one."), effects: [fx.stat("charisma", 2), fx.stat("wisdom", 1), fx.karma(5)] }
        }
      ]
    },
    {
      id: "is.invention",
      title: t("Изобретение", "An invention"),
      text: t("{name} вспоминает, как устроено мыло, водяное колесо и счёты с нулём. Местные о таком не слышали.", "{name} recalls how soap, the waterwheel and zero-based arithmetic work. The locals have never heard of them."),
      minAge: 10,
      cooldown: 5,
      maxOccurrences: 3,
      conditions: [when.ability("modern-knowledge")],
      choices: [
        {
          id: "sell",
          text: t("Продать идею торговой гильдии", "Sell the idea to the trade guild"),
          check: check(["intelligence", "charisma"], 12),
          success: { text: t("Контракт подписан. Монеты текут рекой.", "The contract is signed. Coins flow like a river."), effects: [fx.wealth(70), fx.rep(5), fx.later("is.c-patent", 4)] },
          failure: { text: t("Гильдия присваивает идею, оставив {name} ни с чем.", "The guild steals the idea, leaving {name} with nothing."), effects: [fx.stat("wisdom", 2)] }
        },
        {
          id: "share",
          text: t("Научить деревню бесплатно", "Teach the village for free"),
          success: { text: t("Деревня процветает. Имя {name} звучит с благодарностью.", "The village prospers. {name}'s name is spoken with gratitude."), effects: [fx.karma(10), fx.rep(10), fx.later("is.c-shared-knowledge", 3)] }
        }
      ]
    },
    {
      id: "is.slime",
      title: t("Задание Гильдии", "A Guild quest"),
      text: t("На доске Гильдии висит задание: очистить погреба от слизней. Награда скромная, опыт — настоящий.", "A Guild board notice: clear the cellars of slimes. The reward is modest, the experience real."),
      minAge: 10,
      cooldown: 2,
      weight: 3,
      choices: [
        {
          id: "sword",
          text: t("Рубить мечом", "Hack with a sword"),
          check: check(["strength", "agility"], 11, 3),
          success: { text: t("Слизни разлетаются брызгами. Задание выполнено.", "Slimes splatter everywhere. Quest complete."), effects: [fx.xp(40), fx.track(8), fx.wealth(10)] },
          failure: { text: t("Кислота разъедает сапоги и кожу.", "Acid eats through boots and skin."), effects: [fx.health(-20), fx.xp(10)] }
        },
        {
          id: "magic",
          text: t("Попробовать огненное заклинание", "Try a fire spell"),
          check: check(["intelligence", "wisdom"], 12, 3),
          success: { text: t("Огонь вспыхивает с первого раза. Наставник Гильдии удивлён.", "The fire flares on the first try. The Guild mentor is impressed."), effects: [fx.xp(45), fx.track(10), fx.res("mana", -10)] },
          failure: { text: t("Искра поджигает рукав.", "A spark sets the sleeve alight."), effects: [fx.health(-10), fx.res("mana", -10), fx.stat("intelligence", 1)] }
        },
        {
          id: "trap",
          text: t("Построить ловушку по памяти", "Build a trap from memory"),
          requires: [when.flag("remembers")],
          success: { text: t("Механизм из прошлой жизни работает безупречно.", "A mechanism from the past life works flawlessly."), effects: [fx.xp(35), fx.track(8), fx.stat("intelligence", 1)] }
        }
      ]
    },
    {
      id: "is.exam",
      title: t("Экзамен Гильдии", "Guild exam"),
      text: t("Очков хватает для экзамена на следующий ранг. Экзаменатор — ветеран с тяжёлым взглядом.", "There are enough points for the next rank exam. The examiner is a veteran with a heavy gaze."),
      minAge: 8,
      cooldown: 1,
      weight: 5,
      conditions: [when.trackReady()],
      choices: [
        {
          id: "duel",
          text: t("Показательный бой", "An exhibition duel"),
          check: check(["strength", "agility"], 11, 4),
          success: { text: t("Ветеран опускает меч и кивает. Новый ранг!", "The veteran lowers his sword and nods. A new rank!"), effects: [fx.breakthrough(), fx.rep(5)] },
          failure: { text: t("Поражение. Через год можно попробовать снова.", "Defeat. One can try again next year."), effects: [fx.health(-10), fx.track(-5)] }
        },
        {
          id: "theory",
          text: t("Письменный экзамен по магии", "A written magic exam"),
          check: check(["intelligence", "wisdom"], 11, 4),
          success: { text: t("Ответы безупречны. Новый ранг!", "Flawless answers. A new rank!"), effects: [fx.breakthrough(), fx.stat("intelligence", 1)] },
          failure: { text: t("Две ошибки в последней задаче.", "Two mistakes in the last question."), effects: [fx.track(-5)] }
        }
      ]
    },
    {
      id: "is.demon-lord",
      title: t("Слухи о Владыке Демонов", "Rumours of the Demon Lord"),
      text: t("Королевство набирает добровольцев против армии Владыки Демонов. Платят хорошо — если вернёшься.", "The kingdom is recruiting volunteers against the Demon Lord's army. The pay is good — if you come back."),
      minAge: 18,
      maxAge: 50,
      maxOccurrences: 1,
      conditions: [when.rank(2)],
      choices: [
        {
          id: "enlist",
          text: t("Записаться в отряд", "Enlist"),
          check: check(["strength", "vitality", "willpower"], 16),
          success: { text: t("Бой у Чёрного перевала войдёт в хроники. И имя {name} — тоже.", "The battle at Black Pass will enter the chronicles. So will {name}'s name."), effects: [fx.xp(150), fx.track(25), fx.rep(20), fx.wealth(60), fx.socialClass("hero"), fx.later("is.c-demon-scar", 8)] },
          failure: { text: t("Отряд разбит. {name} возвращается со шрамами и без иллюзий.", "The squad is routed. {name} returns scarred and disillusioned."), effects: [fx.health(-45), fx.xp(60), fx.stat("willpower", 2)] }
        },
        {
          id: "refuse",
          text: t("Остаться дома", "Stay home"),
          success: { text: t("Пусть героями будут другие.", "Let others be heroes."), effects: [fx.rep(-3)] }
        }
      ]
    }
  ]
};
