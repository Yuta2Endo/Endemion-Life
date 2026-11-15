// R5.6: пробуждение реликвий Третьей дороги. События доступны только роду,
// который уже владеет реликвией, поэтому до её получения пул событий не меняется.
import { t } from "../i18n.js";
import { fx, when } from "./dsl.js";
import type { EventDefinition } from "./types.js";

const awakening = (event: Omit<EventDefinition, "kind" | "maxOccurrences" | "lineageMax">): EventDefinition => ({
  kind: "legacy",
  maxOccurrences: 1,
  lineageMax: 1,
  ...event
});

export const RELIC_AWAKENING_EVENTS: readonly EventDefinition[] = [
  awakening({
    id: "common.awakening-drowned-bell",
    title: t("Колокол под полом", "The bell beneath the floor"),
    text: t("Ночью «Колокол утопленницы» звонит сам. На полу проступает имя того, кто утонул, когда его отливали. {name} может ответить на звон или заставить колокол замолчать навсегда.", "At night the Drowned Bell rings by itself. A name appears on the floorboards: the one who drowned when it was cast. {name} can answer the toll or silence the bell forever."),
    minAge: 20,
    weight: 4,
    conditions: [when.world("dark-fantasy"), when.relic("drowned-bell")],
    choices: [
      {
        id: "awaken",
        text: t("Ответить на звон", "Answer the toll"),
        success: {
          text: t("Колокол больше не тонет. Он звучит в груди, и Мгла обходит дом стороной.", "The bell no longer drowns. It sounds in the chest, and the Mist gives the house a wide berth."),
          effects: [fx.relic("drowned-toll"), fx.health(-10)]
        }
      },
      {
        id: "seal",
        text: t("Заставить колокол замолчать", "Silence the bell"),
        success: {
          text: t("Колокол замолкает. На полу остаётся имя, которое больше никто не произнесёт.", "The bell falls silent. A name remains on the floorboards that no one will speak again."),
          effects: [fx.stat("willpower", 1), fx.rep(4), fx.karma(6)]
        }
      }
    ]
  }),
  awakening({
    id: "common.awakening-caravan-ledger",
    title: t("Имена в журнале", "Names in the ledger"),
    text: t("«Журнал каравана» раскрывается сам. На пустых страницах проступают имена людей, которых караван потерял в тумане. {name} может вернуть их Лиге или вписать в журнал собственное имя.", "The Caravan Ledger opens by itself. Names of the people the caravan lost in the mist appear on the blank pages. {name} can return them to the League or write their own name into the ledger."),
    minAge: 20,
    weight: 4,
    conditions: [when.world("isekai"), when.relic("caravan-ledger")],
    choices: [
      {
        id: "awaken",
        text: t("Вернуть имена Лиге", "Return the names to the League"),
        success: {
          text: t("Журнал становится книгой без страниц. Лига помнит долг, а караваны больше не теряются в тумане.", "The ledger becomes a book without pages. The League remembers the debt, and caravans no longer lose themselves in the mist."),
          effects: [fx.relic("ledger-unbound"), fx.health(-5)]
        }
      },
      {
        id: "seal",
        text: t("Продать имена торговцам", "Sell the names to the merchants"),
        success: {
          text: t("Купцы платят за то, чего не видели. Журнал закрывается, и туман снова становится просто туманом.", "The merchants pay for what they never saw. The ledger closes, and the mist becomes only mist again."),
          effects: [fx.wealth(40), fx.rep(6), fx.karma(-2)]
        }
      }
    ]
  }),
  awakening({
    id: "common.awakening-iron-shrine-tablet",
    title: t("Имя на обороте", "A name on the back"),
    text: t("«Железная дощечка» нагревается в руке. На обороте проступает имя хранителя кумирни, который так и не вернул свой долг. {name} может отнести имя в кумирню или сжечь дощечку.", "The Iron Shrine Tablet grows hot in the hand. A name appears on its back: the shrine keeper who never repaid his debt. {name} can carry the name to the shrine or burn the tablet."),
    minAge: 20,
    weight: 4,
    conditions: [when.world("murim"), when.relic("iron-shrine-tablet")],
    choices: [
      {
        id: "awaken",
        text: t("Отнести имя в кумирню", "Carry the name to the shrine"),
        success: {
          text: t("Дощечка становится именем. Долг отпускает дыхание, и ци идёт ровнее.", "The tablet becomes a name. The debt releases the breath, and qi flows steadier."),
          effects: [fx.relic("named-tablet"), fx.health(-10)]
        }
      },
      {
        id: "seal",
        text: t("Сжечь дощечку", "Burn the tablet"),
        success: {
          text: t("Огонь забирает долг вместе с именем. Кумирня молчит, но кто-то кланяется в темноте.", "Fire takes the debt and the name together. The shrine is silent, but someone bows in the dark."),
          effects: [fx.stat("vitality", 1), fx.rep(5), fx.karma(3)]
        }
      }
    ]
  }),
  awakening({
    id: "common.awakening-star-well-cup",
    title: t("Чаша помнит небо", "The cup remembers the sky"),
    text: t("«Чаша звёздного колодца» наполняется сама. В воде отражается небо, которого нет над головой, и одна звезда зовёт {name} по имени. Можно выпить воду или вылить её обратно в колодец.", "The Cup of the Star Well fills by itself. The water reflects a sky that is not overhead, and one star calls {name} by name. The water can be drunk or poured back into the well."),
    minAge: 20,
    weight: 4,
    conditions: [when.world("xianxia"), when.relic("star-well-cup")],
    choices: [
      {
        id: "awaken",
        text: t("Выпить воду", "Drink the water"),
        success: {
          text: t("Чаша отражает всё небо сразу. Звёзды больше не спорят, и Дао становится тише.", "The cup reflects the whole sky at once. The stars stop arguing, and the Dao grows quiet."),
          effects: [fx.relic("full-sky-cup"), fx.health(-10)]
        }
      },
      {
        id: "seal",
        text: t("Вылить воду обратно", "Pour the water back"),
        success: {
          text: t("Вода возвращается в колодец. Звезда замолкает, но на камне остаётся её свет.", "The water returns to the well. The star falls silent, but its light remains on the stone."),
          effects: [fx.stat("wisdom", 1), fx.rep(3), fx.karma(6)]
        }
      }
    ]
  }),
  awakening({
    id: "common.awakening-red-gate-core",
    title: t("Ядро просыпается", "The core wakes"),
    text: t("«Ядро Красных Врат» бьётся в такт сердцу. В комнате становится тише, и {name} слышит, как далеко за городом открывается ещё один разлом. Ядро можно принять в себя или отдать Ассоциации.", "The Red Gate Core beats in time with the heart. The room goes quiet, and {name} hears another rift opening far beyond the city. The core can be taken into the body or handed to the Association."),
    minAge: 20,
    weight: 4,
    conditions: [when.world("hunter"), when.relic("red-gate-core")],
    choices: [
      {
        id: "awaken",
        text: t("Принять ядро", "Take the core in"),
        success: {
          text: t("Осколок становится сердцем. Врата рядом затихают, узнавая своё.", "The shard becomes a heart. Nearby Gates quiet when they recognise their own."),
          effects: [fx.relic("red-gate-heart"), fx.health(-15)]
        }
      },
      {
        id: "seal",
        text: t("Отдать ядро Ассоциации", "Hand the core to the Association"),
        success: {
          text: t("Ассоциация забирает ядро и платит так, будто вы спасли им год. Разлом за городом остаётся их проблемой.", "The Association takes the core and pays as if you saved them a year. The rift beyond the city is their problem now."),
          effects: [fx.wealth(50), fx.rep(6), fx.stat("luck", 1)]
        }
      }
    ]
  }),
  awakening({
    id: "common.awakening-star-chart",
    title: t("Карта показывает утро", "The chart shows a morning"),
    text: t("«Звёздная карта» перерисовывается сама. На ней остаётся одна звезда и одно утро, которого ещё не было. {name} может следовать карте или сжечь её, пока Двор и Башня не увидели.", "The Star Chart redraws itself. One star remains, and one morning that has not happened yet. {name} can follow the chart or burn it before the Court and the Tower see it."),
    minAge: 20,
    weight: 4,
    conditions: [when.world("academy"), when.relic("star-chart")],
    choices: [
      {
        id: "awaken",
        text: t("Следовать карте", "Follow the chart"),
        success: {
          text: t("Карта становится небом последней звезды. Двор и Башня спорят, но утро уже назначено.", "The chart becomes the sky of the last star. The Court and the Tower argue, but the morning is already set."),
          effects: [fx.relic("starless-chart"), fx.health(-5)]
        }
      },
      {
        id: "seal",
        text: t("Сжечь карту", "Burn the chart"),
        success: {
          text: t("Бумага сворачивается в пепел. Двор не получает утра, Башня не получает звезду, а скандал гаснет сам.", "The paper curls into ash. The Court does not get the morning, the Tower does not get the star, and the scandal dies on its own."),
          effects: [fx.stat("charisma", 1), fx.rep(5), fx.karma(2)]
        }
      }
    ]
  })
];
