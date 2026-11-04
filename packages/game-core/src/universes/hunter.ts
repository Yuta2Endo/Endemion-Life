import { t } from "../i18n.js";
import { check, fx, when } from "../narrative/dsl.js";
import type { UniverseBase } from "./types.js";

export const HUNTER: UniverseBase = {
  id: "hunter",
  name: t("Нео-Сеул: Эпоха Врат", "Neo-Seoul: Age of Gates"),
  tagline: t("Врата открылись над городом. Пробудившиеся идут внутрь", "Gates opened over the city. The Awakened go inside"),
  description: t(
    "Двадцать лет назад над мегаполисами начали открываться Врата в подземелья. Немногие люди пробуждаются и становятся охотниками: Ассоциация присваивает ранги, гильдии платят за зачистку, а прорыв Врат грозит гибелью кварталу.",
    "Twenty years ago Gates to dungeons began opening over megacities. A few people awaken as hunters: the Association assigns ranks, guilds pay for clears, and a Gate break threatens a whole district."
  ),
  rules: [
    t("Пробуждение: до него вы обычный человек, путь силы закрыт", "Awakening: until then you are an ordinary person and the path of power is closed"),
    t("Ранг охотника растёт от зачисток подземелий", "Hunter rank grows from dungeon clears"),
    t("Подземелья опасны: смерть внутри Врат — обычное дело", "Dungeons are dangerous: dying inside a Gate is common")
  ],
  theme: { accent: "#7d6fd1", glow: "rgba(125, 111, 209, 0.35)" },
  lifespan: 80,
  manaName: t("Мана", "Mana"),
  races: [
    { id: "human", name: t("Человек", "Human"), description: t("Житель мегаполиса под открытыми Вратами.", "A city dweller beneath open Gates."), statMods: { intelligence: 1, luck: 1 } }
  ],
  origins: [
    { id: "ordinary", name: t("Обычная семья", "Ordinary family"), description: t("Тесная квартира, кредиты и надежда.", "A cramped flat, loans and hope."), statMods: { willpower: 1, vitality: 1 }, wealth: 15, weight: 4 },
    { id: "hunter-family", name: t("Семья охотников", "Hunter family"), description: t("Отец — охотник ранга B. От детей ждут того же.", "Father is a B-rank hunter. The children are expected to follow."), statMods: { strength: 1, agility: 1 }, wealth: 50, reputation: 5, weight: 1 },
    { id: "gate-orphan", name: t("Сирота прорыва", "Gate-break orphan"), description: t("Семья погибла при прорыве Врат.", "Family died in a Gate break."), statMods: { willpower: 2, agility: 1 }, wealth: 0, karma: 5, weight: 2 },
    { id: "chaebol", name: t("Наследник корпорации", "Corporate heir"), description: t("Деньги решают всё, кроме пробуждения.", "Money solves everything except awakening."), statMods: { charisma: 2, intelligence: 1 }, wealth: 150, reputation: 10, weight: 1 }
  ],
  track: {
    name: t("Ранг охотника", "Hunter rank"),
    description: t("Очки Ассоциации растут от зачисток. Переоценка ранга — после каждого порога.", "Association points grow with clears. Re-evaluation happens after each threshold."),
    pointsName: t("Очки Ассоциации", "Association points"),
    stats: ["strength", "agility", "vitality"],
    minAge: 14,
    yearlyFactor: 0.4,
    requiresFlag: "awakened",
    ranks: [
      { name: t("Ранг E", "Rank E"), threshold: 0, statBonus: {} },
      { name: t("Ранг D", "Rank D"), threshold: 20, statBonus: { strength: 2, agility: 2 } },
      { name: t("Ранг C", "Rank C"), threshold: 55, statBonus: { strength: 3, agility: 3, vitality: 2 }, abilities: ["mana-blade"] },
      { name: t("Ранг A", "Rank A"), threshold: 120, statBonus: { strength: 6, agility: 6, vitality: 4, willpower: 3 }, lifespanBonus: 10, abilities: ["shadow-step"] },
      { name: t("Ранг S", "Rank S"), threshold: 230, statBonus: { strength: 10, agility: 9, vitality: 7, willpower: 5 }, lifespanBonus: 25 }
    ]
  },
  abilities: [
    { id: "mana-blade", name: t("Клинок маны", "Mana Blade"), description: t("Оружие окутано сиянием маны.", "A weapon wrapped in mana light.") },
    { id: "shadow-step", name: t("Шаг сквозь тень", "Shadow Step"), description: t("Мгновенный рывок через тень врага.", "An instant dash through the enemy's shadow.") },
    { id: "gate-sense", name: t("Чутьё Врат", "Gate Sense"), description: t("Чувствовать открытие Врат заранее.", "Sense a Gate opening in advance.") }
  ],
  events: [
    {
      id: "hu.awakening",
      title: t("Пробуждение", "Awakening"),
      text: t(
        "На улице открываются малые Врата. Пока все бегут, {name} чувствует, как что-то внутри откликается на зов.",
        "A minor Gate opens on the street. As everyone runs, {name} feels something inside answering the call."
      ),
      minAge: 14,
      maxAge: 30,
      maxOccurrences: 2,
      cooldown: 4,
      weight: 4,
      conditions: [when.noFlag("awakened")],
      choices: [
        {
          id: "step",
          text: t("Шагнуть навстречу Вратам", "Step toward the Gate"),
          check: check(["willpower", "luck"], 11),
          success: { text: t("Перед глазами вспыхивает: «Пробуждение завершено». Мир становится другим.", "Before the eyes flashes: \"Awakening complete.\" The world changes."), effects: [fx.flag("awakened"), fx.track(5), fx.ability("gate-sense")] },
          failure: { text: t("Мана бьёт в виски. Обморок — и больница.", "Mana slams into the temples. Fainting — and a hospital bed."), effects: [fx.health(-20)] }
        },
        {
          id: "help",
          text: t("Помогать людям выбираться", "Help people get away"),
          success: { text: t("Спасённая девочка рассказывает журналистам о {name}.", "A rescued girl tells reporters about {name}."), effects: [fx.karma(10), fx.rep(5)] }
        }
      ]
    },
    {
      id: "hu.dungeon",
      title: t("Зачистка подземелья", "Dungeon clear"),
      text: t("Гильдия набирает рейд в открывшиеся Врата. Платят за участие и за каждого убитого монстра.", "A guild assembles a raid for a newly opened Gate. They pay for joining and per kill."),
      minAge: 15,
      cooldown: 1,
      weight: 4,
      conditions: [when.flag("awakened")],
      choices: [
        {
          id: "front",
          text: t("Идти в первой линии", "Go in the front line"),
          check: check(["strength", "vitality"], 13, 3),
          success: { text: t("Босс падает от удара {name}. Гильдия впечатлена.", "The boss falls to {name}'s blow. The guild is impressed."), effects: [fx.xp(70), fx.track(12), fx.wealth(40), fx.rep(5), fx.meter("fame", 5), fx.meter("gate-threat", -10)] },
          failure: { text: t("Когти босса пробивают броню. Целители едва успевают.", "The boss's claws pierce the armour. Healers barely make it in time."), effects: [fx.health(-45), fx.xp(25), fx.wealth(10)] }
        },
        {
          id: "support",
          text: t("Прикрывать отряд сзади", "Cover the team from behind"),
          check: check(["agility", "intelligence"], 11, 2),
          success: { text: t("Ни одного погибшего. Надёжная работа.", "No casualties. Reliable work."), effects: [fx.xp(45), fx.track(7), fx.wealth(25)] },
          failure: { text: t("Засада из боковой галереи.", "An ambush from a side gallery."), effects: [fx.health(-25), fx.xp(15)] }
        },
        {
          id: "skip",
          text: t("Пропустить этот рейд", "Skip this raid"),
          success: { text: t("Отдых тоже часть работы.", "Rest is part of the job too."), effects: [fx.res("energy", 20)] }
        }
      ]
    },
    {
      id: "hu.reassessment",
      title: t("Переоценка ранга", "Rank re-evaluation"),
      text: t("Ассоциация вызывает {name} на переоценку: измерение маны и бой с големом.", "The Association summons {name} for re-evaluation: a mana measurement and a fight with a golem."),
      minAge: 15,
      cooldown: 1,
      weight: 5,
      conditions: [when.flag("awakened"), when.trackReady()],
      choices: [
        {
          id: "fight",
          text: t("Выложиться полностью", "Give it everything"),
          check: check(["strength", "agility", "willpower"], 12, 4),
          success: { text: t("Голем рассыпается. Новый ранг в лицензии!", "The golem crumbles. A new rank on the licence!"), effects: [fx.breakthrough(), fx.rep(10)] },
          failure: { text: t("Голем оказывается крепче. Попробовать можно через год.", "The golem proves tougher. Try again next year."), effects: [fx.health(-20), fx.track(-6)] }
        },
        {
          id: "hide",
          text: t("Скрыть настоящую силу", "Hide your true strength"),
          success: { text: t("Низкий ранг привлекает меньше внимания.", "A low rank draws less attention."), effects: [fx.stat("wisdom", 1), fx.flag("hidden-power"), fx.later("hu.c-hidden-power", 4)] }
        }
      ]
    },
    {
      id: "hu.guild-offer",
      title: t("Контракт гильдии", "A guild contract"),
      text: t("Крупная гильдия «Лазурный Дракон» предлагает {name} эксклюзивный контракт.", "The major guild Azure Dragon offers {name} an exclusive contract."),
      minAge: 18,
      maxOccurrences: 1,
      conditions: [when.flag("awakened"), when.rank(2)],
      choices: [
        {
          id: "sign",
          text: t("Подписать", "Sign"),
          success: { text: t("Зарплата, снаряжение и строгий график.", "A salary, equipment and a strict schedule."), effects: [fx.wealth(120), fx.rep(10), fx.flag("guild-member"), fx.faction("white-tiger", 25), fx.later("hu.c-guild-contract", 3)] }
        },
        {
          id: "solo",
          text: t("Остаться одиночкой", "Stay solo"),
          success: { text: t("Свобода выбирать Врата самому.", "Freedom to choose your own Gates."), effects: [fx.stat("willpower", 2), fx.stat("luck", 1)] }
        }
      ]
    },
    {
      id: "hu.gate-break",
      title: t("Прорыв Врат", "Gate break"),
      text: t("Врата не закрыли вовремя — монстры вырвались в жилой квартал.", "A Gate wasn't cleared in time — monsters have burst into a residential block."),
      minAge: 10,
      cooldown: 8,
      choices: [
        {
          id: "fight",
          text: t("Сражаться за квартал", "Fight for the block"),
          requires: [when.flag("awakened")],
          check: check(["strength", "agility", "willpower"], 15, 3),
          success: { text: t("Квартал спасён. Имя {name} в новостях.", "The block is saved. {name}'s name is in the news."), effects: [fx.xp(90), fx.track(15), fx.rep(20), fx.karma(10), fx.meter("fame", 15), fx.meter("gate-threat", -30), fx.later("hu.c-saved-civilians", 2)] },
          failure: { text: t("Слишком много монстров. Подмога приходит в последний миг.", "Too many monsters. Help arrives at the last moment."), effects: [fx.health(-50), fx.karma(10)] }
        },
        {
          id: "evacuate",
          text: t("Выводить людей", "Evacuate people"),
          check: check(["agility", "charisma"], 11),
          success: { text: t("Десятки жизней спасены.", "Dozens of lives are saved."), effects: [fx.karma(15), fx.rep(10)] },
          failure: { text: t("Обломок здания задевает {name}.", "A piece of the building hits {name}."), effects: [fx.health(-25), fx.karma(5)] }
        },
        {
          id: "run",
          text: t("Бежать", "Run"),
          success: { text: t("Выжить — тоже победа.", "Surviving is also a victory."), effects: [fx.karma(-5)] }
        }
      ]
    }
  ]
};
