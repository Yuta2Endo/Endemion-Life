import { t } from "../i18n.js";
import { check, fx, when } from "../narrative/dsl.js";
import type { UniverseDefinition } from "./types.js";

export const MURIM: UniverseDefinition = {
  id: "murim",
  name: t("Девять Рек", "The Nine Rivers"),
  tagline: t("Цзянху, где долг чести решается клинком", "A jianghu where debts of honour are settled with a blade"),
  description: t(
    "Девять Рек делят между собой праведные секты, тёмные школы и великие кланы. Внутренняя сила копится в даньтяне годами, а одна ошибка в технике может искалечить меридианы.",
    "The Nine Rivers are divided among righteous sects, dark schools and great clans. Inner energy gathers in the dantian over years, and one mistake in a technique can cripple the meridians."
  ),
  rules: [
    t("Внутренняя сила растёт каждый год, если есть школа или учитель", "Inner energy grows every year if you have a school or a teacher"),
    t("Праведный и тёмный путь: карма открывает разные техники", "Righteous and demonic paths: karma unlocks different techniques"),
    t("Лицо и честь: репутация в цзянху важнее золота", "Face and honour: reputation in the jianghu matters more than gold")
  ],
  theme: { accent: "#c0563f", glow: "rgba(192, 86, 63, 0.35)" },
  lifespan: 70,
  manaName: t("Внутренняя сила", "Inner qi"),
  races: [
    { id: "human", name: t("Человек", "Human"), description: t("В Девяти Реках живут только люди — и легенды о них.", "Only humans live in the Nine Rivers — and legends about them."), statMods: { willpower: 1, agility: 1 } }
  ],
  origins: [
    { id: "clan-heir", name: t("Наследник клана", "Clan heir"), description: t("Младший сын великого клана. От него многого ждут.", "A younger heir of a great clan. Much is expected."), statMods: { charisma: 1, strength: 1 }, wealth: 60, reputation: 10, flags: ["martial-school"], weight: 1 },
    { id: "sect-disciple", name: t("Ученик секты", "Sect disciple"), description: t("Подкидыш, выросший у ворот праведной секты.", "A foundling raised at a righteous sect's gates."), statMods: { wisdom: 1, willpower: 1 }, wealth: 5, karma: 5, flags: ["martial-school"], weight: 2 },
    { id: "street-rat", name: t("Уличный бродяга", "Street urchin"), description: t("Рынок, карманы и драки за рисовую лепёшку.", "Markets, pockets and fights over a rice cake."), statMods: { agility: 2, luck: 1 }, wealth: 0, weight: 3 },
    { id: "physician-child", name: t("Дитя лекаря", "Physician's child"), description: t("Знание трав и точек меридианов с малых лет.", "Knowledge of herbs and meridian points from a young age."), statMods: { intelligence: 1, wisdom: 2 }, wealth: 20, weight: 2 }
  ],
  track: {
    name: t("Внутренняя сила", "Inner energy"),
    description: t("Годы медитаций и тренировок наполняют даньтян. Каждый новый уровень — прорыв через узкое место.", "Years of meditation and training fill the dantian. Each new level is a breakthrough past a bottleneck."),
    pointsName: t("Годы силы", "Years of energy"),
    stats: ["willpower", "vitality", "agility"],
    minAge: 6,
    yearlyFactor: 0.55,
    requiresFlag: "martial-school",
    ranks: [
      { name: t("Третьесортный боец", "Third-rate fighter"), threshold: 0, statBonus: {} },
      { name: t("Второсортный боец", "Second-rate fighter"), threshold: 20, statBonus: { strength: 1, agility: 2 } },
      { name: t("Первоклассный мастер", "First-rate master"), threshold: 55, statBonus: { strength: 3, agility: 4, vitality: 2 }, lifespanBonus: 5, abilities: ["light-step"] },
      { name: t("Пиковый мастер", "Peak master"), threshold: 115, statBonus: { strength: 5, agility: 6, vitality: 4, willpower: 3 }, lifespanBonus: 12, abilities: ["sword-qi"] },
      { name: t("Абсолютный мастер", "Transcendent master"), threshold: 210, statBonus: { strength: 8, agility: 9, vitality: 6, willpower: 6 }, lifespanBonus: 30 }
    ]
  },
  abilities: [
    { id: "light-step", name: t("Шаг лёгкой тени", "Light Shadow Step"), description: t("Бег по черепице и воде.", "Running across rooftops and water.") },
    { id: "sword-qi", name: t("Ци меча", "Sword Qi"), description: t("Удар режет на расстоянии десяти шагов.", "A strike that cuts at ten paces.") },
    { id: "blood-art", name: t("Кровавое искусство", "Blood Art"), description: t("Запретная техника тёмной школы.", "A forbidden dark-school technique.") }
  ],
  events: [
    {
      id: "mu.school",
      title: t("Ворота школы", "The school gates"),
      text: t(
        "У ворот Школы Девяти Ветров отбирают учеников. Нужно простоять на коленях под дождём до заката.",
        "At the gates of the Nine Winds School disciples are chosen. One must kneel in the rain until sunset."
      ),
      minAge: 7,
      maxAge: 16,
      maxOccurrences: 2,
      cooldown: 3,
      weight: 4,
      conditions: [when.noFlag("martial-school")],
      choices: [
        {
          id: "kneel",
          text: t("Стоять на коленях до конца", "Kneel until the end"),
          check: check(["willpower", "vitality"], 10),
          success: { text: t("Старейшина лично поднимает {name} с колен.", "An elder personally lifts {name} to their feet."), effects: [fx.flag("martial-school"), fx.track(5), fx.stat("willpower", 1)] },
          failure: { text: t("Тело сдаётся раньше духа. Ворота закрываются.", "The body gives out before the spirit. The gates close."), effects: [fx.health(-10), fx.stat("willpower", 1)] }
        },
        {
          id: "dark",
          text: t("Принять приглашение незнакомца в чёрном", "Accept the invitation of a stranger in black"),
          success: { text: t("Тёмная школа берёт всех. Но платят здесь не золотом.", "The dark school takes anyone. But the price here is not gold."), effects: [fx.flag("martial-school"), fx.flag("demonic-path"), fx.track(8), fx.karma(-15)] }
        }
      ]
    },
    {
      id: "mu.duel",
      title: t("Вызов на поединок", "A duel challenge"),
      text: t("Заносчивый наследник соседнего клана бросает {name} вызов прямо на рынке. Толпа ждёт.", "An arrogant heir of a neighbouring clan challenges {name} right in the market. The crowd waits."),
      minAge: 14,
      cooldown: 3,
      weight: 3,
      choices: [
        {
          id: "accept",
          text: t("Принять вызов", "Accept"),
          check: check(["strength", "agility"], 13, 3),
          success: { text: t("Один приём — и наследник лежит в пыли. Лицо клана потеряно, лицо {name} обретено.", "One move and the heir lies in the dust. The clan loses face; {name} gains it."), effects: [fx.rep(10), fx.xp(45), fx.track(5)] },
          failure: { text: t("Удар ладонью ломает рёбра. Позор жжёт сильнее боли.", "A palm strike breaks ribs. The shame burns more than the pain."), effects: [fx.health(-30), fx.rep(-5), fx.xp(15)] }
        },
        {
          id: "humble",
          text: t("Поклониться и отказаться", "Bow and decline"),
          success: { text: t("Толпа освистывает. Мудрый старик в чайной одобрительно кивает.", "The crowd jeers. A wise old man in the teahouse nods approvingly."), effects: [fx.rep(-5), fx.stat("wisdom", 2)] }
        }
      ]
    },
    {
      id: "mu.bottleneck",
      title: t("Узкое место", "The bottleneck"),
      text: t("Внутренняя сила упирается в стену. Для прорыва нужна закрытая медитация — или запретная пилюля.", "Inner energy has hit a wall. A breakthrough requires secluded meditation — or a forbidden pill."),
      minAge: 10,
      cooldown: 1,
      weight: 5,
      conditions: [when.flag("martial-school"), when.trackReady()],
      choices: [
        {
          id: "seclusion",
          text: t("Уйти в закрытую медитацию", "Enter secluded meditation"),
          check: check(["willpower", "wisdom"], 11, 4),
          success: { text: t("Меридианы раскрываются. Новый уровень!", "The meridians open. A new level!"), effects: [fx.breakthrough(), fx.xp(60)] },
          failure: { text: t("Ци бьёт в обратную сторону. Кровь горлом.", "The qi recoils. Blood in the throat."), effects: [fx.health(-35), fx.track(-8)] }
        },
        {
          id: "pill",
          text: t("Принять пилюлю тёмной школы", "Swallow a dark-school pill"),
          requires: [when.flag("demonic-path")],
          check: check(["vitality"], 9, 3),
          success: { text: t("Сила приходит быстро и пахнет кровью.", "Power comes quickly and smells of blood."), effects: [fx.breakthrough(), fx.karma(-10), fx.ability("blood-art")] },
          failure: { text: t("Яд пилюли выжигает тело изнутри.", "The pill's poison burns the body from within."), effects: [fx.health(-50), fx.stat("vitality", -2)] }
        }
      ]
    },
    {
      id: "mu.bandits",
      title: t("Разбойники на перевале", "Bandits on the pass"),
      text: t("Караван с беженцами окружили разбойники Чёрного Утёса. Охрана разбежалась.", "Black Cliff bandits have surrounded a refugee caravan. The guards have fled."),
      minAge: 16,
      cooldown: 5,
      choices: [
        {
          id: "save",
          text: t("Вступиться за беженцев", "Defend the refugees"),
          check: check(["strength", "agility", "willpower"], 14, 3),
          success: { text: t("Разбойники бегут. О праведном герое заговорят в чайных.", "The bandits flee. Teahouses will speak of a righteous hero."), effects: [fx.karma(15), fx.rep(15), fx.xp(60)] },
          failure: { text: t("Разбойников слишком много. {name} уносят на носилках.", "There are too many bandits. {name} is carried away on a stretcher."), effects: [fx.health(-40), fx.karma(10)] }
        },
        {
          id: "join",
          text: t("Предложить разбойникам долю", "Offer the bandits a deal for a share"),
          check: check(["charisma"], 12),
          success: { text: t("Главарь смеётся и делится добычей.", "The chief laughs and shares the loot."), effects: [fx.wealth(50), fx.karma(-20), fx.rep(-10)] },
          failure: { text: t("Главарь решает, что лишний рот не нужен.", "The chief decides there's no need for an extra mouth."), effects: [fx.health(-25)] }
        },
        {
          id: "pass",
          text: t("Пройти мимо", "Pass by"),
          success: { text: t("Цзянху велико, всех не спасёшь.", "The jianghu is vast; you cannot save everyone."), effects: [fx.karma(-5)] }
        }
      ]
    },
    {
      id: "mu.manual",
      title: t("Утерянный манускрипт", "The lost manual"),
      text: t("В пещере под водопадом лежит скелет мастера и шёлковый свиток с техникой.", "In a cave behind a waterfall lie a master's skeleton and a silk scroll with a technique."),
      minAge: 12,
      maxOccurrences: 1,
      choices: [
        {
          id: "study",
          text: t("Изучить технику", "Study the technique"),
          check: check(["intelligence", "wisdom"], 13),
          success: { text: t("Движения мастера оживают в теле {name}.", "The master's movements come alive in {name}'s body."), effects: [fx.track(20), fx.stat("agility", 2), fx.flag("martial-school")] },
          failure: { text: t("Ошибка в дыхании — и меридианы горят огнём.", "A breathing error — and the meridians burn."), effects: [fx.health(-25), fx.track(5)] }
        },
        {
          id: "bury",
          text: t("Похоронить мастера со свитком", "Bury the master with the scroll"),
          success: { text: t("Ночью мастер является во сне и благодарит.", "That night the master appears in a dream with thanks."), effects: [fx.karma(10), fx.stat("wisdom", 2), fx.stat("luck", 1)] }
        }
      ]
    }
  ]
};
