import { t } from "../i18n.js";
import { check, fx, when } from "../narrative/dsl.js";
import type { UniverseBase } from "./types.js";

export const DARK_FANTASY: UniverseBase = {
  id: "dark-fantasy",
  name: t("Пепельные Королевства", "The Ashen Kingdoms"),
  tagline: t("Мир, где солнце погасло, а клятвы стоят дороже жизни", "A world where the sun went dark and oaths cost more than life"),
  description: t(
    "Триста лет назад Пепельное Затмение погасило солнце. Королевства держатся на огне соборов и клятвах Ордена Пепла, а из Мглы приходят те, кто когда-то был людьми.",
    "Three hundred years ago the Ashen Eclipse put out the sun. The kingdoms survive on cathedral fires and the oaths of the Order of Ash, while things that were once human crawl out of the Mist."
  ),
  rules: [
    t("Путь Клятвы: сила растёт только у давших клятву Ордену или Мгле", "Path of the Oath: power grows only for those sworn to the Order or the Mist"),
    t("Карма решает, чьей силой вы владеете: свет и пепел несовместимы", "Karma decides whose power you wield: light and ash do not mix"),
    t("Жизнь коротка: болезни Мглы и чудовища сокращают век", "Life is short: Mist plagues and monsters cut lives short")
  ],
  theme: { accent: "#b8873b", glow: "rgba(184, 135, 59, 0.35)" },
  lifespan: 62,
  manaName: t("Пепел", "Ash"),
  races: [
    { id: "human", name: t("Человек", "Human"), description: t("Упрямый народ, переживший Затмение.", "A stubborn folk who outlived the Eclipse."), statMods: { willpower: 1, luck: 1 } },
    { id: "ashborn", name: t("Пеплорождённый", "Ashborn"), description: t("Дети, рождённые во Мгле: серая кожа и холодная кровь.", "Children born in the Mist: grey skin and cold blood."), statMods: { wisdom: 2, vitality: 1, charisma: -2 }, lifespanBonus: 10 },
    { id: "graveborn", name: t("Курганник", "Barrowkin"), description: t("Потомки горных могильщиков, сильные и молчаливые.", "Descendants of mountain gravediggers, strong and silent."), statMods: { strength: 2, vitality: 2, agility: -1, charisma: -1 }, lifespanBonus: 5 }
  ],
  origins: [
    { id: "peasant", name: t("Дитя пахаря", "Ploughman's child"), description: t("Холодная земля и тяжёлый труд.", "Cold soil and hard toil."), statMods: { strength: 1, vitality: 1 }, wealth: 5, weight: 4 },
    { id: "chapel-orphan", name: t("Сирота часовни", "Chapel orphan"), description: t("Вырос при соборном огне.", "Raised beside the cathedral fire."), statMods: { wisdom: 2, willpower: 1 }, wealth: 0, karma: 10, weight: 2 },
    { id: "fallen-noble", name: t("Наследник павшего дома", "Heir of a fallen house"), description: t("Фамилия без земли и долги без конца.", "A name without land and debts without end."), statMods: { charisma: 2, intelligence: 1 }, wealth: 40, reputation: 5, weight: 1 },
    { id: "mist-touched", name: t("Отмеченный Мглой", "Mist-touched"), description: t("Мгла коснулась при рождении. Люди сторонятся.", "The Mist touched you at birth. People keep their distance."), statMods: { wisdom: 1, luck: 2 }, wealth: 2, reputation: -10, karma: -5, flags: ["mist-mark"], weight: 1 }
  ],
  track: {
    name: t("Путь Клятвы", "Path of the Oath"),
    description: t("Сила клятвы растёт через испытания и верность.", "The oath's strength grows through trials and loyalty."),
    pointsName: t("Сила клятвы", "Oath power"),
    stats: ["willpower", "vitality"],
    minAge: 16,
    yearlyFactor: 0.6,
    requiresFlag: "oath-sworn",
    ranks: [
      { name: t("Непосвящённый", "Unsworn"), threshold: 0, statBonus: {} },
      { name: t("Послушник Пепла", "Ash Novice"), threshold: 20, statBonus: { willpower: 2, vitality: 1 }, lifespanBonus: 4 },
      { name: t("Клятвенник", "Oathbound"), threshold: 60, statBonus: { willpower: 4, vitality: 3, strength: 2 }, lifespanBonus: 8, abilities: ["ember-ward"] },
      { name: t("Пеплоносец", "Ashbearer"), threshold: 130, statBonus: { willpower: 7, vitality: 5, strength: 4, wisdom: 2 }, lifespanBonus: 15, abilities: ["cinder-blade"] },
      { name: t("Хранитель Последнего Огня", "Keeper of the Last Flame"), threshold: 240, statBonus: { willpower: 11, vitality: 8, strength: 6, wisdom: 5 }, lifespanBonus: 30 }
    ]
  },
  abilities: [
    { id: "ember-ward", name: t("Тлеющий оберег", "Ember Ward"), description: t("Пепел клятвы гасит удары Мглы.", "Oath ash dampens the Mist's blows.") },
    { id: "cinder-blade", name: t("Клинок из золы", "Cinder Blade"), description: t("Клинок вспыхивает пеплом в руках клятвенника.", "A blade flares with ash in an oathbound's hands.") },
    { id: "mist-sight", name: t("Взор Мглы", "Mist Sight"), description: t("Видеть то, что прячется во мгле.", "See what hides in the Mist.") }
  ],
  events: [
    {
      id: "df.oath",
      title: t("Клятва у костра", "The oath by the fire"),
      text: t(
        "Рыцарь Ордена Пепла раскалывает рукоять меча о камень и протягивает {name} половину. «Клянись — и огонь не погаснет в тебе». Из тени за костром за этим молча наблюдает фигура в сером.",
        "A knight of the Order of Ash breaks a sword hilt on a stone and offers {name} half. \"Swear — and the fire will never die in you.\" From the shadows beyond the fire a grey figure silently watches."
      ),
      minAge: 15,
      maxAge: 30,
      maxOccurrences: 1,
      conditions: [when.noFlag("oath-sworn")],
      choices: [
        {
          id: "order",
          text: t("Принести клятву Ордену", "Swear to the Order"),
          requires: [when.karmaAtLeast(-20)],
          success: { text: t("Пепел оседает на коже. Клятва принята.", "Ash settles on the skin. The oath is accepted."), effects: [fx.flag("oath-sworn"), fx.flag("order-oath"), fx.track(10), fx.karma(5), fx.rep(5), fx.meter("ember", 10), fx.faction("order-of-ash", 20)] }
        },
        {
          id: "mist",
          text: t("Последовать за фигурой в сером", "Follow the grey figure"),
          check: check(["willpower", "wisdom"], 12),
          success: { text: t("Мгла говорит шёпотом и обещает силу без молитв.", "The Mist speaks in whispers and promises power without prayer."), effects: [fx.flag("oath-sworn"), fx.flag("mist-oath"), fx.track(15), fx.karma(-15), fx.ability("mist-sight"), fx.meter("corruption", 15), fx.faction("mist-cult", 20), fx.later("df.c-oath-price", 6)] },
          failure: { text: t("Фигура растворяется. На руке остаётся ледяной ожог.", "The figure dissolves. An icy burn remains on the hand."), effects: [fx.health(-15), fx.flag("mist-mark")] }
        },
        {
          id: "refuse",
          text: t("Отказаться от обеих клятв", "Refuse both oaths"),
          success: { text: t("{name} уходит, ни перед кем не склонив головы.", "{name} walks away, bowing to no one."), effects: [fx.stat("willpower", 2), fx.stat("luck", 1)] }
        }
      ]
    },
    {
      id: "df.hollow",
      title: t("Пустой на дороге", "A Hollow on the road"),
      text: t("Из Мглы выходит Пустой — бывший человек с выжженными глазами. Он ещё помнит, как просить о помощи.", "A Hollow steps out of the Mist — once a man, now with burnt-out eyes. It still remembers how to beg."),
      minAge: 14,
      cooldown: 4,
      weight: 2.5,
      choices: [
        {
          id: "fight",
          text: t("Сразиться", "Fight"),
          check: check(["strength", "agility"], 14, 3),
          success: { text: t("Пустой падает. Из пепла поднимается тусклая искра.", "The Hollow falls. A dim spark rises from the ash."), effects: [fx.xp(45), fx.track(6), fx.rep(3)] },
          failure: { text: t("Когти рвут плоть. {name} едва уносит ноги.", "Claws tear flesh. {name} barely escapes."), effects: [fx.health(-30), fx.xp(15)] }
        },
        {
          id: "mercy",
          text: t("Прочитать погребальную молитву", "Recite the funeral prayer"),
          check: check(["wisdom", "willpower"], 13),
          success: { text: t("Пустой опускается на колени и рассыпается тихим пеплом.", "The Hollow kneels and crumbles to quiet ash."), effects: [fx.karma(10), fx.stat("wisdom", 1), fx.track(4), fx.xp(25), fx.later("df.c-hollow-mercy", 4)] },
          failure: { text: t("Слова не помогают. Пустой бросается вперёд.", "The words fail. The Hollow lunges."), effects: [fx.health(-20)] }
        },
        {
          id: "flee",
          text: t("Бежать", "Run"),
          check: check(["agility"], 10),
          success: { text: t("Мгла скрывает следы.", "The Mist hides your tracks."), effects: [fx.stat("agility", 1)] },
          failure: { text: t("Пустой нагоняет у реки.", "The Hollow catches up at the river."), effects: [fx.health(-15)] }
        }
      ]
    },
    {
      id: "df.trial",
      title: t("Испытание пламенем", "Trial by flame"),
      text: t(
        "Сила клятвы переполняет {name}, но для следующего шага нужно пройти испытание: провести ночь в кругу чёрного пламени.",
        "Oath power overflows within {name}, but the next step requires a trial: a night inside a ring of black fire."
      ),
      minAge: 16,
      cooldown: 2,
      weight: 4,
      conditions: [when.flag("oath-sworn"), when.trackReady()],
      choices: [
        {
          id: "endure",
          text: t("Войти в круг", "Step into the ring"),
          check: check(["willpower", "vitality"], 12, 4),
          success: { text: t("Пламя гаснет к рассвету — а в груди {name} разгорается новое.", "The flame dies at dawn — and a new one kindles in {name}'s chest."), effects: [fx.breakthrough(), fx.xp(60), fx.rep(5)] },
          failure: { text: t("Ожоги затянутся, но клятва требует большего.", "The burns will heal, but the oath demands more."), effects: [fx.health(-35), fx.track(-10)] }
        },
        {
          id: "wait",
          text: t("Подождать и окрепнуть", "Wait and grow stronger"),
          success: { text: t("Испытание никуда не денется.", "The trial will not go anywhere."), effects: [fx.stat("vitality", 1)] }
        }
      ]
    },
    {
      id: "df.plague",
      title: t("Серая хворь", "The grey sickness"),
      text: t("В деревню пришла серая хворь Мглы. Соседи заколачивают двери.", "The Mist's grey sickness has come to the village. Neighbours are boarding up their doors."),
      minAge: 8,
      cooldown: 12,
      choices: [
        {
          id: "help",
          text: t("Ухаживать за больными", "Tend the sick"),
          check: check(["vitality", "wisdom"], 13),
          success: { text: t("Хворь отступает. Спасённые запомнят {name}.", "The sickness recedes. Those saved will remember {name}."), effects: [fx.karma(15), fx.rep(10), fx.xp(30), fx.later("df.c-village-gratitude", 3)] },
          failure: { text: t("Хворь цепляется к самому {name}.", "The sickness clings to {name}."), effects: [fx.karma(10), fx.health(-35), fx.stat("vitality", -1)] }
        },
        {
          id: "leave",
          text: t("Уйти, пока не поздно", "Leave while you can"),
          success: { text: t("Дорога безопасна. Вслед летят проклятия.", "The road is safe. Curses follow you."), effects: [fx.rep(-5), fx.karma(-5)] }
        }
      ]
    },
    {
      id: "df.relic",
      title: t("Реликвия в руинах", "A relic in the ruins"),
      text: t("В руинах собора лежит позолоченный реликварий. Говорят, его стережёт сам собор.", "A gilded reliquary lies in the cathedral ruins. They say the cathedral itself guards it."),
      minAge: 18,
      cooldown: 10,
      choices: [
        {
          id: "take",
          text: t("Забрать реликварий", "Take the reliquary"),
          check: check(["agility", "luck"], 13),
          success: { text: t("Святые кости тёплые на ощупь. Скупщики дадут за них целое состояние.", "The holy bones are warm to the touch. Fences will pay a fortune."), effects: [fx.wealth(80), fx.karma(-10), fx.later("df.c-relic-curse", 5)] },
          failure: { text: t("Своды рушатся. {name} выбирается из-под камней.", "The vaults collapse. {name} crawls out from under the stones."), effects: [fx.health(-25)] }
        },
        {
          id: "pray",
          text: t("Помолиться и оставить", "Pray and leave it"),
          success: { text: t("Тишина собора отвечает теплом.", "The cathedral's silence answers with warmth."), effects: [fx.karma(5), fx.stat("wisdom", 1), fx.track(3)] }
        }
      ]
    }
  ]
};
