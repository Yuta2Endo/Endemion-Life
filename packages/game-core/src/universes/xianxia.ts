import { t } from "../i18n.js";
import { check, fx, when } from "../narrative/dsl.js";
import type { UniverseDefinition } from "./types.js";

export const XIANXIA: UniverseDefinition = {
  id: "xianxia",
  name: t("Небесный Предел", "The Heavenly Verge"),
  tagline: t("Бросить вызов Небесам и прожить тысячу лет", "Defy the Heavens and live a thousand years"),
  description: t(
    "Над облаками парят пики бессмертных сект. Смертные живут недолго, но тот, у кого есть корень духа, может собирать ци неба и земли, проходить небесные испытания и продлевать жизнь на века.",
    "Immortal sect peaks float above the clouds. Mortals live short lives, but those with a spirit root can gather the qi of heaven and earth, pass heavenly tribulations and extend their lives by centuries."
  ),
  rules: [
    t("Корень духа: без него культивация невозможна", "Spirit root: without it cultivation is impossible"),
    t("Каждое царство культивации продлевает жизнь на десятки и сотни лет", "Each cultivation realm extends life by decades or centuries"),
    t("Небесная скорбь: прорыв может убить", "Heavenly tribulation: a breakthrough can kill")
  ],
  theme: { accent: "#8fb39a", glow: "rgba(143, 179, 154, 0.35)" },
  lifespan: 68,
  manaName: t("Ци", "Qi"),
  races: [
    { id: "human", name: t("Человек", "Human"), description: t("Смертный, мечтающий о бессмертии.", "A mortal dreaming of immortality."), statMods: { willpower: 1, luck: 1 } },
    { id: "fox-spirit", name: t("Лисий дух", "Fox spirit"), description: t("Дух, принявший облик человека.", "A spirit that took human form."), statMods: { charisma: 3, wisdom: 1, strength: -2 }, lifespanBonus: 40 },
    { id: "half-dragon", name: t("Полукровка дракона", "Half-dragon"), description: t("В жилах течёт капля драконьей крови.", "A drop of dragon blood flows in the veins."), statMods: { strength: 2, vitality: 2, charisma: -1, intelligence: -1 }, lifespanBonus: 30 }
  ],
  origins: [
    { id: "farm-child", name: t("Дитя крестьян", "Farmer's child"), description: t("Рисовые поля у подножия священной горы.", "Rice fields at the foot of a sacred mountain."), statMods: { vitality: 1, willpower: 1 }, wealth: 5, weight: 4 },
    { id: "outer-disciple", name: t("Внешний ученик", "Outer disciple"), description: t("Корень духа слабый, но двери секты открыты.", "A weak spirit root, but the sect's doors are open."), statMods: { wisdom: 1, intelligence: 1 }, wealth: 10, flags: ["spirit-root"], weight: 2 },
    { id: "cultivator-clan", name: t("Клан культиваторов", "Cultivator clan"), description: t("Ци течёт в крови рода уже десять поколений.", "Qi has flowed in the bloodline for ten generations."), statMods: { wisdom: 2, charisma: 1 }, wealth: 70, reputation: 10, flags: ["spirit-root"], weight: 1 },
    { id: "beggar", name: t("Нищий мальчишка", "Beggar child"), description: t("Ни дома, ни имени, ни корня — только упрямство.", "No home, no name, no root — only stubbornness."), statMods: { willpower: 2, luck: 2 }, wealth: 0, weight: 2 }
  ],
  track: {
    name: t("Культивация", "Cultivation"),
    description: t("Ци копится в теле каждый год. На пороге царства — прорыв и небесная скорбь.", "Qi accumulates every year. At each realm's threshold come a breakthrough and a heavenly tribulation."),
    pointsName: t("Ци", "Qi"),
    stats: ["wisdom", "willpower", "intelligence"],
    minAge: 6,
    yearlyFactor: 0.6,
    requiresFlag: "spirit-root",
    ranks: [
      { name: t("Смертный", "Mortal"), threshold: 0, statBonus: {} },
      { name: t("Закалка Ци", "Qi Refining"), threshold: 15, statBonus: { vitality: 2, wisdom: 1 }, lifespanBonus: 20 },
      { name: t("Основание", "Foundation Establishment"), threshold: 50, statBonus: { vitality: 4, wisdom: 3, willpower: 2 }, lifespanBonus: 80, abilities: ["flying-sword"] },
      { name: t("Золотое Ядро", "Golden Core"), threshold: 120, statBonus: { vitality: 7, wisdom: 6, willpower: 5, strength: 3 }, lifespanBonus: 250, abilities: ["spirit-sense"] },
      { name: t("Зарождение Души", "Nascent Soul"), threshold: 240, statBonus: { vitality: 11, wisdom: 10, willpower: 8, strength: 5 }, lifespanBonus: 600 }
    ]
  },
  abilities: [
    { id: "flying-sword", name: t("Летающий меч", "Flying Sword"), description: t("Меч, послушный мысли.", "A sword that obeys thought.") },
    { id: "spirit-sense", name: t("Духовное чутьё", "Spirit Sense"), description: t("Видеть ци на сотни ли вокруг.", "Sense qi for hundreds of li around.") },
    { id: "alchemy", name: t("Алхимия", "Alchemy"), description: t("Варить пилюли из духовных трав.", "Brew pills from spirit herbs.") }
  ],
  events: [
    {
      id: "xx.root-test",
      title: t("Проверка корня духа", "Spirit root test"),
      text: t("Посланник секты Облачного Пика приехал в деревню с камнем проверки. Дети по очереди касаются его ладонью.", "An envoy of the Cloud Peak sect arrives with a testing stone. Children take turns touching it."),
      minAge: 6,
      maxAge: 12,
      maxOccurrences: 1,
      weight: 6,
      conditions: [when.noFlag("spirit-root")],
      choices: [
        {
          id: "touch",
          text: t("Коснуться камня", "Touch the stone"),
          check: check(["wisdom", "luck"], 10),
          success: { text: t("Камень вспыхивает зелёным светом. Посланник задерживает взгляд на {name}.", "The stone flares green. The envoy's gaze lingers on {name}."), effects: [fx.flag("spirit-root"), fx.track(5), fx.rep(5)] },
          failure: { text: t("Камень молчит. Посланник уходит к следующему ребёнку.", "The stone stays silent. The envoy moves to the next child."), effects: [fx.stat("willpower", 2)] }
        },
        {
          id: "hide",
          text: t("Спрятаться — родителям нужны руки в поле", "Hide — the parents need hands in the fields"),
          success: { text: t("Посланник уезжает. Жизнь идёт своим чередом.", "The envoy leaves. Life goes on."), effects: [fx.stat("vitality", 1), fx.karma(3)] }
        }
      ]
    },
    {
      id: "xx.hidden-root",
      title: t("Пробуждение на краю смерти", "Awakening at death's door"),
      text: t("Сорвавшись со скалы, {name} висит над пропастью. В груди вдруг вспыхивает что-то тёплое.", "Having slipped off a cliff, {name} hangs above the abyss. Suddenly something warm flares in the chest."),
      minAge: 12,
      maxAge: 40,
      maxOccurrences: 1,
      weight: 0.8,
      conditions: [when.noFlag("spirit-root")],
      choices: [
        {
          id: "grasp",
          text: t("Ухватиться за это тепло", "Grasp that warmth"),
          check: check(["willpower"], 12),
          success: { text: t("Скрытый корень духа пробуждается. Пальцы крошат камень.", "A hidden spirit root awakens. Fingers crumble the stone."), effects: [fx.flag("spirit-root"), fx.track(8), fx.stat("strength", 1)] },
          failure: { text: t("Тепло гаснет. Падение, боль — но жизнь.", "The warmth fades. A fall, pain — but alive."), effects: [fx.health(-40)] }
        }
      ]
    },
    {
      id: "xx.herb",
      title: t("Духовная трава", "A spirit herb"),
      text: t("На уступе растёт тысячелетний женьшень. Рядом дремлет змея-страж.", "A thousand-year ginseng grows on a ledge. A guardian serpent dozes nearby."),
      minAge: 10,
      cooldown: 4,
      weight: 2,
      choices: [
        {
          id: "take",
          text: t("Сорвать траву", "Pick the herb"),
          check: check(["agility", "luck"], 12, 2),
          success: { text: t("Трава тает на языке и наполняет тело ци.", "The herb melts on the tongue and fills the body with qi."), effects: [fx.track(18), fx.health(20)] },
          failure: { text: t("Змея просыпается. Яд жжёт кровь.", "The serpent wakes. Venom burns the blood."), effects: [fx.health(-35)] }
        },
        {
          id: "sell",
          text: t("Указать путь торговцам и взять долю", "Sell the location to merchants for a share"),
          success: { text: t("Торговцы платят щедро.", "The merchants pay generously."), effects: [fx.wealth(45)] }
        }
      ]
    },
    {
      id: "xx.tribulation",
      title: t("Небесная скорбь", "Heavenly tribulation"),
      text: t("Ци достигло предела царства. Над головой {name} собираются чёрные тучи, в них вспыхивают молнии.", "Qi has reached the realm's limit. Black clouds gather over {name}, lightning flickering within."),
      minAge: 8,
      cooldown: 1,
      weight: 6,
      conditions: [when.flag("spirit-root"), when.trackReady()],
      choices: [
        {
          id: "face",
          text: t("Принять молнии на себя", "Face the lightning"),
          check: check(["willpower", "vitality", "wisdom"], 11, 5),
          success: { text: t("Девятая молния гаснет. Тело перерождается в новом царстве.", "The ninth bolt fades. The body is reborn in a new realm."), effects: [fx.breakthrough(), fx.xp(80), fx.rep(10)] },
          failure: { text: t("Молния прожигает до костей. Ци рассеивается.", "Lightning scorches to the bone. Qi disperses."), effects: [fx.health(-60), fx.track(-15)] }
        },
        {
          id: "suppress",
          text: t("Подавить ци и отложить прорыв", "Suppress the qi and delay the breakthrough"),
          success: { text: t("Тучи расходятся. Небеса подождут.", "The clouds part. The Heavens will wait."), effects: [fx.stat("wisdom", 1)] }
        }
      ]
    },
    {
      id: "xx.alchemy",
      title: t("Печь алхимика", "The alchemist's furnace"),
      text: t("Старейшина-алхимик ищет помощника, который не испугается взрывов.", "An alchemist elder seeks an assistant unafraid of explosions."),
      minAge: 14,
      maxOccurrences: 1,
      conditions: [when.flag("spirit-root")],
      choices: [
        {
          id: "apprentice",
          text: t("Стать помощником", "Become the assistant"),
          check: check(["intelligence", "wisdom"], 13),
          success: { text: t("Первая пилюля — кривая, но работает.", "The first pill is lopsided, but it works."), effects: [fx.ability("alchemy"), fx.stat("intelligence", 2), fx.wealth(20)] },
          failure: { text: t("Печь взрывается. Брови отрастут.", "The furnace explodes. The eyebrows will grow back."), effects: [fx.health(-15), fx.stat("intelligence", 1)] }
        },
        {
          id: "decline",
          text: t("Отказаться: меч надёжнее", "Decline: the sword is more reliable"),
          success: { text: t("Тренировки продолжаются.", "Training continues."), effects: [fx.track(5)] }
        }
      ]
    }
  ]
};
