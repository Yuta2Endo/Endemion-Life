import { t } from "../i18n.js";
import { check, fx, when } from "../narrative/dsl.js";
import type { UniverseBase } from "./types.js";

export const ACADEMY: UniverseBase = {
  id: "academy",
  name: t("Империя Лиреваль", "The Lireval Empire"),
  tagline: t("Балы, дуэли и интриги Королевской академии магии", "Balls, duels and intrigue at the Royal Academy of Magic"),
  description: t(
    "В Империи Лиреваль магия принадлежит знати, а Королевская академия Астрейн решает, кто станет архимагом, а кто — забытым младшим сыном. Здесь фамилия открывает двери, а слухи убивают вернее яда.",
    "In the Lireval Empire magic belongs to the nobility, and the Royal Academy of Astrein decides who becomes an archmage and who becomes a forgotten younger son. Here a surname opens doors, and rumours kill more surely than poison."
  ),
  rules: [
    t("Круги маны: путь открыт с поступления в академию", "Mana circles: the path opens upon entering the academy"),
    t("Репутация и харизма важнее силы: многие проблемы решаются словом", "Reputation and charisma matter more than strength: many problems are solved with words"),
    t("Сословия: происхождение определяет, какие двери открыты", "Estates: origin determines which doors are open")
  ],
  theme: { accent: "#c9a96e", glow: "rgba(201, 169, 110, 0.35)" },
  lifespan: 78,
  milestoneAges: [1, 5, 12, 16, 18, 25, 35, 45, 60, 75],
  manaName: t("Мана", "Mana"),
  races: [
    { id: "human", name: t("Человек", "Human"), description: t("Подданный Империи.", "A subject of the Empire."), statMods: { charisma: 1, intelligence: 1 } },
    { id: "half-elf", name: t("Полуэльф", "Half-elf"), description: t("Изящество эльфов и сомнительное положение при дворе.", "Elven grace and an uncertain position at court."), statMods: { agility: 1, wisdom: 2, vitality: -1 }, lifespanBonus: 40 }
  ],
  origins: [
    { id: "duke-heir", name: t("Наследник герцога", "Duke's heir"), description: t("Золото, власть и сотни завистников.", "Gold, power and hundreds of envious rivals."), statMods: { charisma: 2, intelligence: 1 }, wealth: 200, reputation: 20, flags: ["noble"], weight: 1 },
    { id: "minor-noble", name: t("Младший сын барона", "Baron's younger child"), description: t("Титул есть, наследства нет.", "A title, but no inheritance."), statMods: { charisma: 1, willpower: 1 }, wealth: 40, reputation: 5, flags: ["noble"], weight: 2 },
    { id: "scholarship", name: t("Стипендиат из простолюдинов", "Commoner scholar"), description: t("Талант, который заметила академия.", "A talent the academy noticed."), statMods: { intelligence: 2, willpower: 1 }, wealth: 5, reputation: -5, weight: 2 },
    { id: "bastard", name: t("Незаконнорождённый", "Noble bastard"), description: t("Кровь знати, но без права на фамилию.", "Noble blood without the right to the name."), statMods: { agility: 1, charisma: 1, luck: 1 }, wealth: 15, reputation: -10, flags: ["noble-blood"], weight: 1 }
  ],
  track: {
    name: t("Круги маны", "Mana circles"),
    description: t("Учёба в академии и практика расширяют круги маны в сердце мага.", "Study and practice at the academy widen the mana circles in a mage's heart."),
    pointsName: t("Сила кругов", "Circle power"),
    stats: ["intelligence", "wisdom"],
    minAge: 12,
    yearlyFactor: 0.6,
    requiresFlag: "academy-student",
    ranks: [
      { name: t("Без круга", "No circle"), threshold: 0, statBonus: {} },
      { name: t("Первый круг", "First Circle"), threshold: 15, statBonus: { intelligence: 2 } },
      { name: t("Третий круг", "Third Circle"), threshold: 50, statBonus: { intelligence: 3, wisdom: 2, charisma: 1 }, abilities: ["arcane-shield"] },
      { name: t("Пятый круг", "Fifth Circle"), threshold: 110, statBonus: { intelligence: 6, wisdom: 4, charisma: 2, willpower: 2 }, lifespanBonus: 10, abilities: ["starfall"] },
      { name: t("Архимаг", "Archmage"), threshold: 220, statBonus: { intelligence: 10, wisdom: 7, charisma: 4, willpower: 4 }, lifespanBonus: 30 }
    ]
  },
  abilities: [
    { id: "arcane-shield", name: t("Арканный щит", "Arcane Shield"), description: t("Мерцающий барьер от заклинаний и клинков.", "A shimmering barrier against spells and blades.") },
    { id: "starfall", name: t("Звездопад", "Starfall"), description: t("Заклинание, которое изучают только лучшие.", "A spell only the best ever learn.") },
    { id: "etiquette", name: t("Придворный этикет", "Court etiquette"), description: t("Знать, кому и как поклониться.", "Knowing whom to bow to, and how.") }
  ],
  events: [
    {
      id: "ac.entrance",
      title: t("Вступительный экзамен", "Entrance exam"),
      text: t("Ворота академии Астрейн открыты раз в год. Экзаменаторы смотрят на фамилии внимательнее, чем на заклинания.", "Astrein's gates open once a year. The examiners look at surnames more closely than at spells."),
      minAge: 12,
      maxAge: 18,
      maxOccurrences: 3,
      cooldown: 1,
      weight: 6,
      conditions: [when.noFlag("academy-student")],
      choices: [
        {
          id: "magic",
          text: t("Показать заклинание", "Demonstrate a spell"),
          check: check(["intelligence", "wisdom"], 11),
          success: { text: t("Зал замолкает. {name} зачислен.", "The hall falls silent. {name} is admitted."), effects: [fx.flag("academy-student"), fx.track(5), fx.rep(5), fx.education("ac-astrein"), fx.faction("magic-tower", 5)] },
          failure: { text: t("Искры гаснут. Попробовать можно в следующем году.", "The sparks fade. One may try again next year."), effects: [fx.stat("intelligence", 1)] }
        },
        {
          id: "name",
          text: t("Положиться на фамилию", "Rely on the family name"),
          requires: [when.flag("noble")],
          success: { text: t("Экзаменатор кланяется. Формальности улажены.", "The examiner bows. Formalities are settled."), effects: [fx.flag("academy-student"), fx.rep(2), fx.education("ac-astrein")] }
        },
        {
          id: "bribe",
          text: t("Дать взятку (50 золота)", "Pay a bribe (50 gold)"),
          requires: [when.wealth(50)],
          success: { text: t("Документы находятся. Совесть — нет.", "The documents turn up. The conscience doesn't."), effects: [fx.flag("academy-student"), fx.wealth(-50), fx.karma(-10), fx.education("ac-astrein"), fx.later("ac.c-bribe-exposed", 4)] }
        }
      ]
    },
    {
      id: "ac.duel",
      title: t("Перчатка в лицо", "A glove to the face"),
      text: t("Надменный аристократ бросает {name} перчатку при всём курсе: «Ваше место — на кухне».", "An arrogant aristocrat throws a glove at {name} before the whole class: \"Your place is in the kitchen.\""),
      minAge: 13,
      cooldown: 3,
      weight: 3,
      conditions: [when.flag("academy-student")],
      choices: [
        {
          id: "duel",
          text: t("Принять дуэль на заклинаниях", "Accept a spell duel"),
          check: check(["intelligence", "agility"], 13, 3),
          success: { text: t("Противник в фонтане. Курс аплодирует.", "The opponent lands in the fountain. The class applauds."), effects: [fx.rep(12), fx.xp(40), fx.track(5), fx.skill("duelling", 3), fx.later("ac.c-duel-grudge", 3)] },
          failure: { text: t("Унижение на глазах у всех.", "Humiliation in front of everyone."), effects: [fx.rep(-10), fx.health(-15)] }
        },
        {
          id: "words",
          text: t("Ответить остроумием", "Answer with wit"),
          check: check(["charisma", "intelligence"], 12),
          success: { text: t("Смеются уже над аристократом.", "Now they laugh at the aristocrat."), effects: [fx.rep(8), fx.stat("charisma", 1)] },
          failure: { text: t("Ответ звучит жалко.", "The retort sounds pathetic."), effects: [fx.rep(-5)] }
        },
        {
          id: "ignore",
          text: t("Молча уйти", "Walk away silently"),
          success: { text: t("Слухи разносятся быстро, но выдержка — тоже сила.", "Rumours spread fast, but restraint is strength too."), effects: [fx.rep(-3), fx.stat("willpower", 2)] }
        }
      ]
    },
    {
      id: "ac.circle",
      title: t("Расширение круга", "Expanding the circle"),
      text: t("Мана переполняет сердце. Профессор предлагает провести ритуал расширения круга.", "Mana overflows the heart. A professor offers to perform the circle-expansion ritual."),
      minAge: 12,
      cooldown: 1,
      weight: 5,
      conditions: [when.flag("academy-student"), when.trackReady()],
      choices: [
        {
          id: "ritual",
          text: t("Провести ритуал", "Perform the ritual"),
          check: check(["intelligence", "willpower"], 11, 4),
          success: { text: t("Новый круг сияет в сердце мага.", "A new circle shines in the mage's heart."), effects: [fx.breakthrough(), fx.xp(60)] },
          failure: { text: t("Мана вырывается наружу. Лазарет на неделю.", "Mana bursts out. A week in the infirmary."), effects: [fx.health(-30), fx.track(-8)] }
        },
        {
          id: "wait",
          text: t("Подготовиться ещё", "Prepare further"),
          success: { text: t("Лишний год учёбы не повредит.", "An extra year of study won't hurt."), effects: [fx.stat("intelligence", 1)] }
        }
      ]
    },
    {
      id: "ac.ball",
      title: t("Императорский бал", "The Imperial ball"),
      text: t("Приглашение на бал во дворце. Здесь заключаются союзы, помолвки и заговоры.", "An invitation to the palace ball. Alliances, engagements and conspiracies are made here."),
      minAge: 16,
      cooldown: 4,
      weight: 2,
      choices: [
        {
          id: "dance",
          text: t("Блистать в танце", "Shine on the dance floor"),
          check: check(["charisma", "agility"], 13),
          success: { text: t("Принцесса запоминает имя {name}.", "The princess remembers {name}'s name."), effects: [fx.rep(15), fx.ability("etiquette"), fx.meter("court-favor", 10), fx.later("ac.c-ball-acquaintance", 1)] },
          failure: { text: t("Наступить на ногу графине — плохая примета.", "Stepping on a countess's foot is a bad omen."), effects: [fx.rep(-8)] }
        },
        {
          id: "listen",
          text: t("Слушать разговоры у колонн", "Listen to talk by the columns"),
          check: check(["wisdom", "agility"], 12),
          success: { text: t("Тайна о заговоре против канцлера теперь у {name}.", "{name} now holds a secret about a plot against the chancellor."), effects: [fx.flag("court-secret"), fx.stat("wisdom", 1)] },
          failure: { text: t("Стража замечает подслушивание.", "The guards notice the eavesdropping."), effects: [fx.rep(-5)] }
        }
      ]
    },
    {
      id: "ac.secret",
      title: t("Цена тайны", "The price of a secret"),
      text: t("Канцлер узнал, что {name} слышал о заговоре. Ему предлагают молчать за деньги — или рассказать императору.", "The chancellor learns {name} knows of the plot. He offers money for silence — or {name} could tell the Emperor."),
      minAge: 16,
      maxOccurrences: 1,
      conditions: [when.flag("court-secret")],
      choices: [
        {
          id: "emperor",
          text: t("Рассказать императору", "Tell the Emperor"),
          check: check(["charisma", "willpower"], 14),
          success: { text: t("Заговор раскрыт. Император дарует {name} титул.", "The plot is exposed. The Emperor grants {name} a title."), effects: [fx.rep(25), fx.karma(10), fx.wealth(100), fx.flag("noble"), fx.meter("court-favor", 25), fx.socialClass("lesser-noble")] },
          failure: { text: t("Император не верит. Канцлер мстит.", "The Emperor does not believe it. The chancellor takes revenge."), effects: [fx.rep(-20), fx.health(-25)] }
        },
        {
          id: "silence",
          text: t("Взять деньги", "Take the money"),
          success: { text: t("Тяжёлый кошель и тяжёлая совесть.", "A heavy purse and a heavy conscience."), effects: [fx.wealth(150), fx.karma(-15), fx.later("ac.c-silence-price", 4)] }
        }
      ]
    },
    {
      id: "ac.location.rose-salon",
      title: t("Приглашение в Розовый салон", "An invitation to the Rose Salon"),
      text: t("В Розовом салоне сегодня говорят о налогах, дуэлях и чьей-то помолвке. {name} получает приглашение — без объяснения, зачем.", "Tonight the Rose Salon talks of taxes, duels and someone's engagement. {name} receives an invitation — with no explanation why."),
      minAge: 14,
      cooldown: 6,
      maxOccurrences: 2,
      locationTags: ["social"],
      conditions: [when.location("social")],
      choices: [
        {
          id: "charm",
          text: t("Блеснуть в разговоре", "Shine in the conversation"),
          check: check(["charisma", "intelligence"], 12),
          success: { text: t("Хозяйка салона смеётся над шуткой {name} и представляет гостям.", "The hostess laughs at {name}'s joke and introduces the guest around."), effects: [fx.rep(5), fx.meter("court-favor", 8), fx.xp(20)] },
          failure: { text: t("Шутка падает в тишину. Салон вежливо переводит разговор.", "The joke lands in silence. The salon politely changes the subject."), effects: [fx.rep(-3)] }
        },
        {
          id: "listen",
          text: t("Слушать и запоминать", "Listen and remember"),
          success: { text: t("Сплетни стоят дешевле золота, но сегодня одна из них — про должника короны.", "Gossip is cheaper than gold, but tonight one rumour concerns a debtor of the crown."), effects: [fx.wealth(8), fx.stat("wisdom", 1), fx.xp(10)] }
        }
      ]
    }
  ]
};
