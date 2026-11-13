// Stage 02.1: болезни и раны как события. Общий пул дополняет старые события о лихорадке и старых ранах,
// а у каждого мира есть свой недуг. Веса низкие, cooldown длинный: здоровье не должно вытеснять остальные события
import { t } from "../i18n.js";
import type { UniverseId } from "../types.js";
import { check, fx, when } from "./dsl.js";
import type { EventDefinition } from "./types.js";

/** Общие болезни и раны: работают во всех шести мирах */
export const COMMON_HEALTH_EVENTS: readonly EventDefinition[] = [
  {
    id: "common.wound",
    title: t("Кровь на повязке", "Blood on the bandage"),
    text: t(
      "Схватка на дороге закончилась, но рана не закрывается. Лекарь просит денег, время — больше.",
      "The fight on the road is over, but the wound will not close. The healer asks for money, time asks for more."
    ),
    minAge: 8,
    cooldown: 9,
    weight: 0.7,
    choices: [
      {
        id: "healer",
        text: t("Заплатить лекарю (20 золота)", "Pay the healer (20 gold)"),
        requires: [when.wealth(20)],
        success: {
          text: t("Лекарь промывает рану и накладывает чистую повязку.", "The healer cleans the wound and binds it cleanly."),
          effects: [fx.wealth(-20), fx.cure("common-wound")]
        }
      },
      {
        id: "rest",
        text: t("Перевязать самому и отдыхать", "Bind it yourself and rest"),
        success: {
          text: t("Несколько недель покоя — и рана наконец затягивается.", "A few weeks of rest, and the wound finally closes."),
          effects: [fx.cure("common-wound"), fx.stat("willpower", 1)]
        }
      },
      {
        id: "hide",
        text: t("Скрыть рану и жить как прежде", "Hide the wound and carry on"),
        success: {
          text: t("Никто не должен знать. Повязка под одеждой быстро пропитывается кровью.", "No one must know. The bandage under the clothes soaks through quickly."),
          effects: [fx.condition("common-wound"), fx.rep(2)]
        }
      }
    ]
  }
];

/** Недуг каждого мира: подобран под его правила и угрозы */
export const WORLD_HEALTH_EVENTS: Readonly<Record<UniverseId, readonly EventDefinition[]>> = {
  "dark-fantasy": [
    {
      id: "health.dark-fantasy.mist-rot",
      title: t("Серая сыпь", "The grey rash"),
      text: t(
        "После ночи во Мгле на руках проступает серая сыпь, а в костях поселяется холод. Соборный огонь ещё может выжечь болезнь.",
        "After a night in the Mist a grey rash rises on the arms and a cold settles in the bones. Cathedral fire may still burn the sickness out."
      ),
      minAge: 10,
      cooldown: 12,
      maxOccurrences: 2,
      weight: 0.7,
      choices: [
        {
          id: "cathedral",
          text: t("Заплатить за соборный огонь (15 золота)", "Pay for cathedral fire (15 gold)"),
          requires: [when.wealth(15)],
          success: {
            text: t("Огонь жжёт, но сыпь уходит. В пепле остаётся что-то живое.", "The fire burns, but the rash recedes. Something living remains in the ash."),
            effects: [fx.wealth(-15), fx.cure("df-mist-rot"), fx.karma(3)]
          }
        },
        {
          id: "herbs",
          text: t("Травы знахарки", "The herbwife's remedies"),
          check: check(["vitality", "wisdom"], 11),
          success: {
            text: t("Горький отвар вытягивает холод из костей.", "A bitter brew draws the cold from the bones."),
            effects: [fx.cure("df-mist-rot"), fx.stat("vitality", 1)]
          },
          failure: {
            text: t("Сыпь только густеет. Мгла не отпускает.", "The rash only thickens. The Mist does not let go."),
            effects: [fx.condition("df-mist-rot")]
          }
        },
        {
          id: "endure",
          text: t("Перетерпеть, не обращаясь к церкви", "Endure it without the church"),
          check: check(["willpower"], 12),
          success: {
            text: t("Тело справляется само. Вера здесь ни при чём.", "The body copes on its own. Faith has nothing to do with it."),
            effects: [fx.health(3), fx.stat("willpower", 1)]
          },
          failure: {
            text: t("Хворь уходит глубже. Каждое утро начинается с озноба.", "The sickness goes deeper. Every morning begins with a chill."),
            effects: [fx.condition("df-mist-rot")]
          }
        }
      ]
    }
  ],
  isekai: [
    {
      id: "health.isekai.mana-burn",
      title: t("Мана-ожог", "Mana burn"),
      text: t(
        "Заклинание сорвалось, и мана прошла сквозь тело тонкой горячей волной. Кожа покрылась сетью ожогов.",
        "The spell slipped, and mana passed through the body in a thin hot wave. The skin is covered with a web of burns."
      ),
      minAge: 12,
      cooldown: 12,
      maxOccurrences: 2,
      weight: 0.7,
      choices: [
        {
          id: "infirmary",
          text: t("Обратиться в лазарет (10 золота)", "Go to the infirmary (10 gold)"),
          requires: [when.wealth(10)],
          success: {
            text: t("Целители гасят остаточную ману и залечивают ожоги.", "Healers smother the residual mana and mend the burns."),
            effects: [fx.wealth(-10), fx.cure("is-mana-burn")]
          }
        },
        {
          id: "focus",
          text: t("Самому успокоить ману", "Calm the mana yourself"),
          check: check(["intelligence", "willpower"], 11),
          success: {
            text: t("Дыхание выравнивается, ожоги гаснут изнутри.", "The breathing evens out, and the burns cool from within."),
            effects: [fx.cure("is-mana-burn"), fx.skill("spellcraft", 2)]
          },
          failure: {
            text: t("Мана вспыхивает снова. Ожоги остаются.", "The mana flares again. The burns remain."),
            effects: [fx.condition("is-mana-burn")]
          }
        },
        {
          id: "hide",
          text: t("Скрыть ожоги и продолжить путь", "Hide the burns and keep going"),
          success: {
            text: t("Перчатки скрывают следы. Боль — нет.", "Gloves hide the marks. Not the pain."),
            effects: [fx.condition("is-mana-burn"), fx.track(3)]
          }
        }
      ]
    }
  ],
  murim: [
    {
      id: "health.murim.qi-deviation",
      title: t("Сорванное дыхание", "Qi deviation"),
      text: t(
        "Во время тренировки ци пошла не в тот меридиан. В груди горит, а кончики пальцев немеют.",
        "During training qi took the wrong meridian. The chest burns and the fingertips go numb."
      ),
      minAge: 12,
      cooldown: 12,
      maxOccurrences: 2,
      weight: 0.7,
      choices: [
        {
          id: "master",
          text: t("Позвать наставника", "Call for the master"),
          requires: [when.npc("mentor")],
          success: {
            text: t("Наставник кладёт ладонь на спину и возвращает ци в русло.", "The master lays a palm on the back and returns the qi to its course."),
            effects: [fx.cure("mu-qi-deviation"), fx.track(4)]
          }
        },
        {
          id: "breathe",
          text: t("Восстановить дыхание самому", "Restore the breath yourself"),
          check: check(["willpower", "wisdom"], 12),
          success: {
            text: t("Ци успокаивается. Меридианы помнят урок.", "The qi settles. The meridians remember the lesson."),
            effects: [fx.cure("mu-qi-deviation"), fx.skill("inner-cultivation", 2)]
          },
          failure: {
            text: t("Боль не уходит. Дыхание остаётся сбитым.", "The pain does not leave. The breath stays broken."),
            effects: [fx.condition("mu-qi-deviation")]
          }
        },
        {
          id: "force",
          text: t("Продавить боль силой", "Push through the pain"),
          success: {
            text: t("Тело запоминает неправильный путь. Сила растёт, дыхание — нет.", "The body remembers the wrong path. Power grows; the breath does not."),
            effects: [fx.condition("mu-qi-deviation"), fx.track(5)]
          }
        }
      ]
    }
  ],
  xianxia: [
    {
      id: "health.xianxia.serpent-venom",
      title: t("Змеиный яд", "Serpent venom"),
      text: t(
        "Сторож травы успел ужалить прежде, чем {name} успел отступить. Яд растекается по крови и жжёт изнутри.",
        "The herb guardian struck before {name} could retreat. Venom spreads through the blood and burns within."
      ),
      minAge: 10,
      cooldown: 14,
      maxOccurrences: 2,
      weight: 0.7,
      choices: [
        {
          id: "antidote",
          text: t("Купить противоядие (25 золота)", "Buy an antidote (25 gold)"),
          requires: [when.wealth(25)],
          success: {
            text: t("Противоядие горчит, но яд отступает.", "The antidote is bitter, but the venom retreats."),
            effects: [fx.wealth(-25), fx.cure("xx-serpent-venom")]
          }
        },
        {
          id: "refine",
          text: t("Выжечь яд ци", "Burn the venom out with qi"),
          check: check(["vitality", "willpower"], 13),
          success: {
            text: t("Ци проходит по крови и выжигает чужую силу.", "Qi moves through the blood and burns out the foreign power."),
            effects: [fx.cure("xx-serpent-venom"), fx.track(4)]
          },
          failure: {
            text: t("Яд сопротивляется. С каждым ударом сердца он только злее.", "The venom resists. With every heartbeat it grows crueller."),
            effects: [fx.condition("xx-serpent-venom")]
          }
        },
        {
          id: "endure",
          text: t("Стиснуть зубы и идти дальше", "Grit your teeth and walk on"),
          success: {
            text: t("Яд остаётся в крови. Но и опыт — тоже.", "The venom stays in the blood. So does the experience."),
            effects: [fx.condition("xx-serpent-venom"), fx.xp(20)]
          }
        }
      ]
    }
  ],
  hunter: [
    {
      id: "health.hunter.gate-wound",
      title: t("Рана Врат", "Gate wound"),
      text: t(
        "Когти твари оставили на плече длинный порез. Рана не затягивается: в ней ещё живёт чужая мана.",
        "The creature's claws left a long cut on the shoulder. The wound will not close: foreign mana still lives in it."
      ),
      minAge: 14,
      cooldown: 12,
      maxOccurrences: 2,
      weight: 0.7,
      choices: [
        {
          id: "healer",
          text: t("Заплатить целителю (20 золота)", "Pay a healer (20 gold)"),
          requires: [when.wealth(20)],
          success: {
            text: t("Целитель вытягивает ману из раны и накладывает шов.", "The healer draws the mana out and stitches the wound."),
            effects: [fx.wealth(-20), fx.cure("hu-gate-wound")]
          }
        },
        {
          id: "rest",
          text: t("Дать телу время", "Give the body time"),
          check: check(["vitality"], 11),
          success: {
            text: t("Рана наконец закрывается. Остаётся только шрам.", "The wound finally closes. Only a scar remains."),
            effects: [fx.cure("hu-gate-wound"), fx.health(5)]
          },
          failure: {
            text: t("Чужая мана не даёт ране закрыться.", "The foreign mana will not let the wound close."),
            effects: [fx.condition("hu-gate-wound")]
          }
        },
        {
          id: "hide",
          text: t("Скрыть рану от гильдии", "Hide the wound from the guild"),
          success: {
            text: t("Никто не отстранит от рейдов. Плечо напоминает о себе каждую ночь.", "No one will bench you from raids. The shoulder reminds you every night."),
            effects: [fx.condition("hu-gate-wound"), fx.rep(2)]
          }
        }
      ]
    }
  ],
  academy: [
    {
      id: "health.academy.duel-injury",
      title: t("После дуэли", "After the duel"),
      text: t(
        "Поединок закончился, но ушиб не проходит. На пальцах кровь, а наставник уже спрашивает, готов ли {name} к завтрашнему занятию.",
        "The duel is over, but the bruise does not fade. There is blood on the fingers, and the instructor already asks whether {name} is ready for tomorrow's lesson."
      ),
      minAge: 12,
      cooldown: 12,
      maxOccurrences: 2,
      weight: 0.7,
      choices: [
        {
          id: "infirmary",
          text: t("Сходить в лазарет (5 золота)", "Visit the infirmary (5 gold)"),
          requires: [when.wealth(5)],
          success: {
            text: t("Лазарет холодный и пахнет травами, зато к утру всё заживает.", "The infirmary is cold and smells of herbs, but by morning it has healed."),
            effects: [fx.wealth(-5), fx.cure("ac-duel-injury")]
          }
        },
        {
          id: "herbs",
          text: t("Самому приготовить примочку", "Make a poultice yourself"),
          check: check(["intelligence", "wisdom"], 10),
          success: {
            text: t("Примочка держит. Навык запомнился лучше теории.", "The poultice holds. The skill stuck better than theory."),
            effects: [fx.cure("ac-duel-injury"), fx.skill("medicine", 2)]
          },
          failure: {
            text: t("Примочка не помогает. Ушиб остаётся.", "The poultice does not help. The bruise remains."),
            effects: [fx.condition("ac-duel-injury")]
          }
        },
        {
          id: "hide",
          text: t("Скрыть травму и выйти на занятие", "Hide the injury and attend class"),
          success: {
            text: t("Наставник доволен. Рука — не очень.", "The instructor is pleased. The arm is not."),
            effects: [fx.condition("ac-duel-injury"), fx.rep(3)]
          }
        }
      ]
    }
  ]
};
