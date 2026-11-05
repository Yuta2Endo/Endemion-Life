// Пепельные Королевства, Stage 02: скверна и Последний Огонь, сословия под погасшим солнцем, клятвы и их цена
import { t } from "../i18n.js";
import { check, fx, when } from "../narrative/dsl.js";
import type { WorldDefinition } from "./types.js";

export const DARK_FANTASY_WORLD: WorldDefinition = {
  mechanics: [
    { name: t("Скверна", "Corruption"), description: t("Клятва Мгле копит скверну каждый год. Она ускоряет путь, но крадёт карму, а на пределе забирает человека целиком.", "An oath to the Mist builds corruption every year. It speeds the path but steals karma, and at its peak takes the whole person.") },
    { name: t("Последний Огонь", "The Last Flame"), description: t("Клятва Ордену разжигает внутренний огонь: он выжигает скверну и защищает от Мглы.", "An oath to the Order kindles an inner flame: it burns away corruption and shields against the Mist.") },
    { name: t("Сословия Пепла", "Estates of Ash"), description: t("Изгой, крепостной, горожанин, клир или знать: сословие решает, кто тебя накормит и кто тебя повесит.", "Outcast, serf, townsfolk, clergy or nobility: your estate decides who feeds you and who hangs you.") }
  ],
  originProfiles: {
    peasant: { socialClassId: "serf", skills: { survival: 5, athletics: 3 }, history: t("Род пахарей держится за мёрзлую землю барона уже семь поколений. Каждую зиму кто-то не доживает до весны.", "A ploughman's line has clung to the baron's frozen soil for seven generations. Every winter someone does not live to spring.") },
    "chapel-orphan": { socialClassId: "outcast", family: "foundling", skills: { medicine: 5, lore: 3 }, factions: { "order-of-ash": 10 }, history: t("Младенца оставили на ступенях часовни в ночь Пепельной службы. Сёстры назвали его по святому того дня.", "The infant was left on the chapel steps on the night of the Ash Mass. The sisters named the child after that day's saint.") },
    "fallen-noble": { socialClassId: "nobility", skills: { persuasion: 5, melee: 3 }, factions: { crown: -10 }, history: t("Дом был велик, пока дед не проиграл войну за трон. Теперь от него остались герб, долги и полуразрушенная башня.", "The house was great until grandfather lost the war for the throne. Now only a crest, debts and a half-ruined tower remain.") },
    "mist-touched": { socialClassId: "outcast", family: "single", skills: { survival: 5, stealth: 3 }, meters: { corruption: 10 }, factions: { "mist-cult": 10 }, history: t("Мать вынашивала ребёнка в год, когда Мгла подошла к самым стенам. Соседи шепчутся, что она ходила за стену по ночам.", "Mother carried the child in the year the Mist reached the very walls. Neighbours whisper that she walked beyond the wall at night.") }
  },
  raceTalents: { ashborn: ["mist-sensitive"], graveborn: ["grave-strength"] },
  socialClasses: [
    { id: "outcast", name: t("Изгой", "Outcast"), description: t("Ни земли, ни господина, ни защиты.", "No land, no lord, no protection."), standing: 0, income: 0, occupations: [t("Бродяга", "Vagrant"), t("Могильщик", "Gravedigger")] },
    { id: "serf", name: t("Крепостной", "Serf"), description: t("Земля барона и долг барону.", "The baron's land and the debt to the baron."), standing: 1, income: 1, occupations: [t("Пахарь", "Ploughman"), t("Пастух", "Herder"), t("Углежог", "Charcoal burner")] },
    { id: "townsfolk", name: t("Горожанин", "Townsfolk"), description: t("Цех, стены и комендантский час.", "A guild, walls and a curfew."), standing: 2, income: 2, occupations: [t("Кузнец", "Smith"), t("Фонарщик", "Lamplighter"), t("Торговка свечами", "Candle seller")] },
    { id: "clergy", name: t("Клир", "Clergy"), description: t("Служители Последнего Огня.", "Servants of the Last Flame."), standing: 3, income: 3, occupations: [t("Пастырь Огня", "Flame pastor"), t("Соборный писарь", "Cathedral scribe")] },
    { id: "nobility", name: t("Знать", "Nobility"), description: t("Гербы, клятвы вассалов и вечная война за трон.", "Crests, vassal oaths and the endless war for the throne."), standing: 4, income: 5, occupations: [t("Лорд павшего дома", "Lord of a fallen house"), t("Рыцарь без земли", "Landless knight")] }
  ],
  meters: [
    { id: "corruption", name: t("Скверна", "Corruption"), description: t("Мгла внутри. На пределе человек становится полым.", "The Mist within. At its peak a person becomes hollow."), min: 0, max: 100, initial: 0, danger: true },
    { id: "ember", name: t("Последний Огонь", "Last Flame"), description: t("Внутренний огонь клятвенника Ордена.", "The inner fire of one sworn to the Order."), min: 0, max: 100, initial: 0 }
  ],
  factions: [
    { id: "order-of-ash", name: t("Орден Пепла", "Order of Ash"), description: t("Рыцари, хранящие огонь соборов.", "Knights who keep the cathedral fires.") },
    { id: "mist-cult", name: t("Шепчущие", "The Whisperers"), description: t("Те, кто молится тому, что живёт во Мгле.", "Those who pray to what lives in the Mist.") },
    { id: "crown", name: t("Пепельный трон", "The Ashen Throne"), description: t("Король, который не видел солнца.", "A king who has never seen the sun.") }
  ],
  skills: [
    { id: "oathcraft", name: t("Сила клятвы", "Oathcraft"), description: t("Умение черпать силу из данного слова.", "Drawing strength from a sworn word."), category: "magic", stats: ["willpower", "vitality"] },
    { id: "hollow-hunting", name: t("Охота на полых", "Hollow hunting"), description: t("Где у полого слабое место и как не стать им самому.", "Where a hollow is weak and how not to become one."), category: "combat", stats: ["strength", "agility"] },
    { id: "relic-lore", name: t("Знание реликвий", "Relic lore"), description: t("Отличить святыню от проклятия.", "Telling a relic from a curse."), category: "knowledge", stats: ["intelligence", "wisdom"] }
  ],
  talents: [
    { id: "ash-blessed", name: t("Благословение Пепла", "Ash-blessed"), description: t("Клятва ложится на душу легко, как будто её ждали.", "An oath settles on the soul easily, as if it were awaited."), trackFactor: 1.25, checks: ["willpower"], skills: ["oathcraft"] },
    { id: "mist-sensitive", name: t("Чуткость к Мгле", "Mist-sensitive"), description: t("Чувствует Мглу за версту и слышит её шёпот.", "Senses the Mist a mile away and hears its whisper."), growth: ["wisdom"], checks: ["wisdom"] },
    { id: "grave-strength", name: t("Сила курганов", "Barrow strength"), description: t("Тело, выкованное холодом гор.", "A body forged by the cold of the mountains."), growth: ["strength", "vitality"], skills: ["hollow-hunting"], checks: ["strength"] }
  ],
  weaknesses: [
    { id: "mist-sickness", name: t("Мгляная хворь", "Mist sickness"), description: t("Лёгкие помнят каждый вдох Мглы.", "The lungs remember every breath of Mist."), healing: 0.75, checks: ["vitality"], conflicts: ["grave-strength"] },
    { id: "haunted", name: t("Одержимость тенями", "Haunted"), description: t("Мёртвые приходят во снах и говорят.", "The dead come in dreams and speak."), checks: ["willpower"] }
  ],
  professions: [
    { id: "hollow-hunter", name: t("Охотник на полых", "Hollow hunter"), description: t("Платят за каждую голову из Мглы.", "Paid for every head from the Mist."), skill: "hollow-hunting", stats: ["strength", "agility"], base: 4 },
    { id: "lamplighter", name: t("Фонарщик", "Lamplighter"), description: t("Огни вдоль стен должны гореть всю ночь.", "The lights along the walls must burn all night."), skill: "survival", stats: ["vitality", "willpower"], base: 2 },
    { id: "relic-dealer", name: t("Торговец реликвиями", "Relic dealer"), description: t("Святыни, кости и то, что выдают за них.", "Relics, bones and what passes for them."), skill: "relic-lore", stats: ["intelligence", "charisma"], base: 4 }
  ],
  education: [
    { id: "df-letters", name: t("Грамота при часовне", "Chapel letters"), description: t("Псалмы, счёт и имена святых.", "Psalms, sums and the names of saints."), tier: 1, skills: ["lore"] },
    { id: "df-squire", name: t("Оруженосец Ордена", "Squire of the Order"), description: t("Меч, клятва и огонь.", "Sword, oath and fire."), tier: 2, skills: ["oathcraft", "melee"] },
    { id: "df-schola", name: t("Соборная схола", "Cathedral schola"), description: t("Тайные книги о природе Мглы.", "Secret books on the nature of the Mist."), tier: 3, skills: ["relic-lore", "medicine"] }
  ],
  specializations: [
    { id: "flamewarden", name: t("Хранитель пламени", "Flamewarden"), description: t("Огонь клятвы как щит для других.", "The oath's fire as a shield for others."), statBonus: { willpower: 2, wisdom: 1 }, skill: "oathcraft" },
    { id: "hollowbane", name: t("Гроза полых", "Hollowbane"), description: t("Клинок, который полые узнают издали.", "A blade the hollow recognise from afar."), statBonus: { strength: 2, agility: 1 }, skill: "hollow-hunting" },
    { id: "mistwalker", name: t("Идущий во Мгле", "Mistwalker"), description: t("Ходить там, откуда не возвращаются.", "Walking where no one returns from."), statBonus: { wisdom: 2, luck: 1 }, skill: "survival" }
  ],
  familySecrets: [
    { id: "df-mist-blood", name: t("Кровь Шепчущих", "Whisperer blood"), hint: t("Бабка по матери не отражается в зеркалах, и об этом в доме не говорят.", "Mother's grandmother casts no reflection, and no one in the house speaks of it."), reveal: t("Предок давал клятву Мгле. Её отзвук живёт в крови.", "An ancestor swore to the Mist. Its echo lives in the blood."), effects: [fx.meter("corruption", 10), fx.ability("mist-sight"), fx.faction("mist-cult", 15)] },
    { id: "df-stolen-crown", name: t("Украденная корона", "The stolen crown"), hint: t("В подвале башни стоит запертый сундук, ключ от которого отец носит на шее.", "In the tower cellar stands a locked chest; father wears its key around his neck."), reveal: t("Дом не проиграл войну за трон: его предали. Доказательства лежат в сундуке.", "The house did not lose the war for the throne: it was betrayed. The proof lies in the chest."), effects: [fx.rep(10), fx.faction("crown", -20), fx.wealth(40)], origins: ["fallen-noble"] },
    { id: "df-buried-relic", name: t("Закопанная святыня", "The buried relic"), hint: t("Под очагом семья хранит что-то, что нельзя продавать даже в голод.", "Under the hearth the family keeps something that must not be sold even in famine."), reveal: t("Это палец святого Пепла. Сила реликвии отзывается в руках.", "It is the finger of a saint of Ash. The relic's power answers in your hands."), effects: [fx.skill("relic-lore", 10), fx.meter("ember", 10), fx.karma(5)] }
  ],
  birthplaces: [
    t("деревня у Чёрной реки, где никогда не тает лёд", "a village by the Black River where the ice never melts"),
    t("приют при соборе Последнего Огня", "the shelter of the Cathedral of the Last Flame"),
    t("башня павшего дома на краю болот", "a fallen house's tower at the edge of the marsh"),
    t("хутор за последней сторожевой стеной", "a farmstead beyond the last watch wall")
  ],
  omens: [
    { text: t("Свечи в часовне в ту ночь горели ровно, без копоти.", "That night the chapel candles burned steady, without soot.") },
    { text: t("Мгла отступила от стен на целую милю — впервые за десять лет.", "The Mist drew back a full mile from the walls — the first time in ten years."), minDestiny: 7 },
    { text: t("Вороны кружили над крышей до рассвета.", "Ravens circled the roof until dawn.") },
    { text: t("На небе на миг показался край погасшего солнца.", "For a moment the rim of the dead sun showed in the sky."), minDestiny: 9 }
  ],
  npcTitles: {
    mentor: [t("Седой рыцарь Ордена", "Grey knight of the Order"), t("Слепая пророчица", "Blind seer")],
    teacher: [t("Сестра часовни", "Chapel sister"), t("Соборный книжник", "Cathedral bookman")],
    rival: [t("Сын старосты", "The reeve's son"), t("Послушник-выскочка", "Upstart novice")],
    friend: [t("Подкидыш из приюта", "Foundling from the shelter"), t("Дочь фонарщика", "Lamplighter's daughter")]
  },
  consequences: [
    { id: "df.c-oath-price", title: t("Цена клятвы", "The price of the oath"), text: t("Мгла пришла за своей долей. Ночью {name} просыпается с чёрными венами на руках.", "The Mist came for its share. At night {name} wakes with black veins on the arms."), conditions: [when.flag("mist-oath")], effects: [fx.meter("corruption", 15), fx.health(-15), fx.weakness("haunted")] },
    { id: "df.c-village-gratitude", title: t("Деревня помнит", "The village remembers"), text: t("Спасённые от чумы присылают гонца: в деревне {name} называют святым.", "Those saved from the plague send a messenger: in the village they call {name} a saint."), effects: [fx.rep(10), fx.faction("order-of-ash", 10), fx.npc("friend")] },
    { id: "df.c-relic-curse", title: t("Проклятие реликвии", "The relic's curse"), text: t("Украденная святыня мстит: тени у кровати {name} шепчут имена мёртвых.", "The stolen relic takes revenge: shadows by {name}'s bed whisper the names of the dead."), chance: 0.7, effects: [fx.weakness("haunted"), fx.karma(-5)] },
    { id: "df.c-mill-years", title: t("Годы на мельнице", "The mill years"), text: t("Долг отца отработан. Мельник отпускает {name} и на прощание даёт рекомендацию в цех.", "Father's debt is worked off. The miller releases {name} and gives a recommendation to the guild."), effects: [fx.socialClass("townsfolk"), fx.skill("craft", 5), fx.wealth(10)] },
    { id: "df.c-hollow-mercy", title: t("Полый, которого пощадили", "The hollow that was spared"), text: t("Тот, кого {name} однажды пощадил, приходит снова. Он ещё помнит своё имя и приносит предупреждение.", "The one {name} once spared returns. It still remembers its name and brings a warning."), effects: [fx.skill("hollow-hunting", 5), fx.stat("wisdom", 1), fx.meter("ember", 5)] },
    { id: "df.c-winter-kept", title: t("Зима у очага", "The winter by the hearth"), text: t("Деревня, которую {name} не бросил зимой, присылает хлеб и просит назвать ребёнка в честь спасителя.", "The village {name} did not abandon in winter sends bread and asks to name a child after the one who stayed."), effects: [fx.renown(4), fx.affinity("family", 8), fx.karma(3)] }
  ],
  abilityCategories: { "ember-ward": "magic", "cinder-blade": "combat", "mist-sight": "magic" },
  abilities: [
    { id: "last-light", name: t("Последний свет", "Last Light"), description: t("Вспышка Огня, от которой полые рассыпаются пеплом.", "A flash of the Flame that turns hollows to ash."), category: "magic" },
    { id: "hollow-mark", name: t("Метка полого", "Hollow Mark"), description: t("Удар, после которого полый не встаёт.", "A strike after which a hollow does not rise."), category: "combat" }
  ],
  events: [
    {
      id: "df.child-ash",
      kind: "personal",
      title: t("Горсть пепла", "A handful of ash"),
      text: t("Сестра часовни даёт детям горсть холодного пепла и просит не пробовать его на язык. Кто-то из сверстников уже пробует.", "A chapel sister gives the children a handful of cold ash and asks them not to taste it. One of the others already does."),
      minAge: 6,
      maxAge: 12,
      maxOccurrences: 1,
      weight: 2,
      choices: [
        { id: "keep", text: t("Сжать пепел в кулаке", "Close the ash in a fist"), success: { text: t("Ладонь серая до вечера. Сестра кивает.", "The palm stays grey until evening. The sister nods."), effects: [fx.stat("willpower", 1), fx.faction("order-of-ash", 4)] } },
        { id: "taste", text: t("Попробовать, как другие", "Taste it, like the others"), success: { text: t("Вкус железа и сна. Мгла запоминает рот.", "A taste of iron and sleep. The Mist remembers the mouth."), effects: [fx.meter("corruption", 4), fx.stat("wisdom", 1)] } },
        { id: "home", text: t("Отнести горсть домой", "Carry the handful home"), success: { text: t("Дома пепел сыплют в очаг. Ночь теплее.", "At home the ash goes into the hearth. The night is warmer."), effects: [fx.affinity("parent", 6), fx.karma(2)] } }
      ]
    },
    {
      id: "df.last-oath",
      kind: "age",
      title: t("Последняя клятва", "The last oath"),
      text: t("Силы уже не хватает на стену. Орден спрашивает, кому передать клинок: послушнику или оставить его у соборного огня.", "There is no longer strength for the wall. The Order asks who will take the blade: a novice, or the cathedral fire."),
      minAge: 50,
      maxOccurrences: 1,
      weight: 2,
      conditions: [when.flag("oath-sworn")],
      choices: [
        { id: "novice", text: t("Отдать клинок послушнику", "Give the blade to a novice"), success: { text: t("Чужие руки принимают вес. Имя остаётся на стене.", "Other hands take the weight. The name stays on the wall."), effects: [fx.rep(6), fx.karma(4), fx.faction("order-of-ash", 6)] } },
        { id: "fire", text: t("Положить клинок в огонь", "Lay the blade in the fire"), success: { text: t("Сталь гаснет. Клятва не просит продолжения.", "The steel goes dark. The oath asks for no continuation."), effects: [fx.meter("ember", 8), fx.stat("wisdom", 1)] } }
      ]
    },
    {
      id: "df.chapel-school",
      kind: "personal",
      title: t("Сестра с книгой", "The sister with a book"),
      text: t("Сестра часовни ищет детей, которые будут учиться грамоте за кусок хлеба и тёплый угол.", "A chapel sister seeks children to learn letters for a crust of bread and a warm corner."),
      minAge: 6,
      maxAge: 11,
      maxOccurrences: 1,
      conditions: [when.educationAtMost(0)],
      choices: [
        { id: "learn", text: t("Учиться", "Learn"), success: { text: t("Буквы оказываются ключами к миру.", "Letters turn out to be keys to the world."), effects: [fx.education("df-letters"), fx.npc("teacher"), fx.stat("intelligence", 1)] } },
        { id: "work", text: t("Работать: дома нужны руки", "Work: hands are needed at home"), success: { text: t("Руки грубеют раньше, чем у сверстников.", "Hands harden sooner than the other children's."), effects: [fx.stat("strength", 1), fx.skill("survival", 3), fx.affinity("parent", 5)] } }
      ]
    },
    {
      id: "df.squire",
      kind: "path",
      title: t("Рыцарь у ворот", "A knight at the gate"),
      text: t("Рыцарь Ордена Пепла ищет оруженосца. Служба тяжела, но открывает путь к клятве.", "A knight of the Order of Ash seeks a squire. The service is hard but opens the way to the oath."),
      minAge: 12,
      maxAge: 18,
      maxOccurrences: 1,
      conditions: [when.educationAtMost(1), when.karmaAtLeast(-30)],
      choices: [
        { id: "serve", text: t("Пойти в оруженосцы", "Become a squire"), check: check(["strength", "willpower"], 10), success: { text: t("Рыцарь кивает. Начинается служба.", "The knight nods. Service begins."), effects: [fx.education("df-squire"), fx.npc("mentor"), fx.faction("order-of-ash", 15), fx.flag("mentor")] }, failure: { text: t("Рыцарь выбирает другого, но запоминает упрямый взгляд.", "The knight chooses another, but remembers the stubborn gaze."), effects: [fx.stat("willpower", 1)] } },
        { id: "refuse", text: t("Отказаться", "Refuse"), success: { text: t("Свой путь — свои ошибки.", "One's own road, one's own mistakes."), effects: [fx.stat("luck", 1)] } }
      ]
    },
    {
      id: "df.ember-vigil",
      kind: "path",
      title: t("Ночное бдение", "The night vigil"),
      text: t("Орден зовёт клятвенников стоять ночь у соборного огня. Говорят, тот, кто выдержит до рассвета, слышит голос Последнего Огня.", "The Order calls its sworn to stand a night by the cathedral fire. They say whoever lasts till dawn hears the voice of the Last Flame."),
      minAge: 16,
      cooldown: 4,
      conditions: [when.flag("order-oath")],
      choices: [
        { id: "stand", text: t("Стоять до рассвета", "Stand until dawn"), check: check(["willpower", "vitality"], 13, 2, { skill: "oathcraft" }), success: { text: t("На рассвете огонь отвечает. Внутри разгорается пламя.", "At dawn the fire answers. A flame kindles within."), effects: [fx.meter("ember", 15), fx.meter("corruption", -10), fx.track(8), fx.skill("oathcraft", 3)] }, failure: { text: t("Сон побеждает к полуночи. Наставник молчит, но смотрит тяжело.", "Sleep wins by midnight. The mentor is silent, but the look is heavy."), effects: [fx.meter("ember", 3), fx.affinity("mentor", -5)] } },
        { id: "skip", text: t("Сослаться на раны", "Plead wounds"), success: { text: t("Ночь в тепле. Орден запомнит.", "A night in the warmth. The Order will remember."), effects: [fx.faction("order-of-ash", -5), fx.health(10)] } }
      ]
    },
    {
      id: "df.whisper",
      kind: "stat",
      title: t("Шёпот изнутри", "A whisper from within"),
      text: t("Скверна набрала силу. Голос во сне обещает: ещё немного, и {name} станет сильнее всех, кого знает.", "The corruption has grown strong. A voice in dreams promises: a little more, and {name} will be stronger than anyone they know."),
      minAge: 14,
      cooldown: 5,
      conditions: [when.meter("corruption", 40)],
      choices: [
        { id: "purge", text: t("Выжечь скверну у соборного огня", "Burn out the corruption at the cathedral fire"), check: check(["willpower", "wisdom"], 14, 0, { meters: [{ id: "ember", per: 0.005, base: 0 }] }), success: { text: t("Боль невыносима, но голос стихает.", "The pain is unbearable, but the voice falls silent."), effects: [fx.meter("corruption", -25), fx.health(-20), fx.karma(5)] }, failure: { text: t("Огонь жжёт, но скверна держится крепче.", "The fire burns, but the corruption holds tighter."), effects: [fx.meter("corruption", -5), fx.health(-25)] } },
        { id: "embrace", text: t("Принять дар", "Accept the gift"), success: { text: t("Сила течёт по жилам, холодная и сладкая.", "Power flows through the veins, cold and sweet."), effects: [fx.meter("corruption", 15), fx.track(15), fx.karma(-10), fx.faction("mist-cult", 10)] } }
      ]
    },
    {
      id: "df.father-debt",
      kind: "family",
      title: t("Долг отца", "Father's debt"),
      text: t("Ростовщик пришёл к отцу в третий раз. Теперь он требует не деньги, а службу сына или дочери.", "The moneylender has come to father a third time. Now he demands not money but the service of a child."),
      minAge: 14,
      maxAge: 30,
      maxOccurrences: 1,
      conditions: [when.npc("father"), when.standingAtMost(2)],
      choices: [
        { id: "pay", text: t("Отдать всё, что есть (30 золота)", "Give all you have (30 gold)"), requires: [when.wealth(30)], success: { text: t("Ростовщик уходит. Отец впервые обнимает {name}.", "The moneylender leaves. Father embraces {name} for the first time."), effects: [fx.wealth(-30), fx.affinity("father", 20), fx.karma(5)] } },
        { id: "serve", text: t("Отработать долг", "Work off the debt"), success: { text: t("Три года на чужой мельнице. Тело крепнет, отец смотрит виновато.", "Three years at someone else's mill. The body grows strong, father looks guilty."), effects: [fx.stat("strength", 2), fx.affinity("father", 10), fx.later("df.c-mill-years", 3)] } },
        { id: "refuse", text: t("Это его долг, не мой", "It is his debt, not mine"), success: { text: t("Дверь хлопает. Отец больше не заговаривает об этом.", "The door slams. Father never speaks of it again."), effects: [fx.affinity("father", -25), fx.stat("willpower", 1)] } }
      ]
    },
    {
      id: "df.hollow-kin",
      kind: "family",
      title: t("Знакомое лицо во Мгле", "A familiar face in the Mist"),
      text: t("На краю Мглы стоит полый в старом плаще брата. Он не нападает — просто смотрит.", "At the edge of the Mist stands a hollow in a brother's old cloak. It does not attack — it only watches."),
      minAge: 16,
      maxOccurrences: 1,
      weight: 0.6,
      conditions: [when.npc("sibling")],
      choices: [
        { id: "release", text: t("Подарить ему покой", "Grant it rest"), check: check(["strength", "willpower"], 13, 0, { skill: "hollow-hunting" }), success: { text: t("Последний удар — и полый шепчет «спасибо».", "One last blow, and the hollow whispers 'thank you'."), effects: [fx.npcDies("sibling"), fx.karma(10), fx.stat("willpower", 2), fx.skill("hollow-hunting", 5)] }, failure: { text: t("Рука дрогнула. Полый уходит во Мглу, унося часть сердца.", "The hand trembled. The hollow walks into the Mist, taking part of the heart."), effects: [fx.npcDies("sibling"), fx.weakness("haunted")] } },
        { id: "follow", text: t("Пойти за ним", "Follow it"), check: check(["wisdom", "luck"], 15), success: { text: t("Полый приводит к тайнику брата: меч и письмо.", "The hollow leads to the brother's cache: a sword and a letter."), effects: [fx.npcDies("sibling"), fx.wealth(30), fx.ability("hollow-mark")] }, failure: { text: t("Мгла смыкается. Выбраться удаётся чудом.", "The Mist closes in. Escaping takes a miracle."), effects: [fx.npcDies("sibling"), fx.meter("corruption", 15), fx.health(-30)] } }
      ]
    },
    {
      id: "df.rival-knight",
      kind: "npc",
      title: t("Вызов на ристалище", "A challenge at the lists"),
      text: t("Соперник при всех называет {name} трусом и бросает перчатку.", "A rival publicly calls {name} a coward and throws down a gauntlet."),
      minAge: 15,
      cooldown: 5,
      conditions: [when.npc("rival")],
      choices: [
        { id: "fight", text: t("Принять вызов", "Accept the challenge"), check: check(["strength", "agility"], 11, 0, { skill: "melee", versus: "rival" }), success: { text: t("Соперник в пыли. Толпа ревёт.", "The rival lies in the dust. The crowd roars."), effects: [fx.rep(10), fx.affinity("rival", 10), fx.skill("melee", 3), fx.xp(40)] }, failure: { text: t("Поражение при всех. Соперник смеётся.", "Defeat in front of everyone. The rival laughs."), effects: [fx.rep(-8), fx.health(-20), fx.affinity("rival", -10)] } },
        { id: "refuse", text: t("Промолчать", "Stay silent"), success: { text: t("Сплетни живут дольше синяков.", "Gossip outlives bruises."), effects: [fx.rep(-5), fx.stat("wisdom", 1)] } }
      ]
    },
    {
      id: "df.specialize",
      kind: "path",
      title: t("Выбор пути клятвы", "Choosing the oath's way"),
      text: t("Клятва окрепла. Наставники Ордена спрашивают, кем {name} станет: щитом, клинком или проводником во Мгле.", "The oath has grown strong. The Order's masters ask what {name} will become: shield, blade or guide into the Mist."),
      minAge: 18,
      maxOccurrences: 1,
      conditions: [when.rank(2), when.noSpecialization()],
      choices: [
        { id: "flamewarden", text: t("Хранитель пламени", "Flamewarden"), success: { text: t("Огонь становится щитом для слабых.", "The fire becomes a shield for the weak."), effects: [fx.specialization("flamewarden"), fx.ability("last-light"), fx.meter("ember", 10)] } },
        { id: "hollowbane", text: t("Гроза полых", "Hollowbane"), success: { text: t("Клинок помнит каждого полого.", "The blade remembers every hollow."), effects: [fx.specialization("hollowbane"), fx.ability("hollow-mark")] } },
        { id: "mistwalker", text: t("Идущий во Мгле", "Mistwalker"), success: { text: t("Мгла расступается перед шагами.", "The Mist parts before the steps."), effects: [fx.specialization("mistwalker"), fx.meter("corruption", 5), fx.skill("survival", 10)] } }
      ]
    },
    {
      id: "df.schola",
      kind: "personal",
      title: t("Письмо из собора", "A letter from the cathedral"),
      text: t("Соборная схола приглашает учёного клятвенника изучать запретные книги о Мгле.", "The cathedral schola invites a learned oath-sworn to study the forbidden books on the Mist."),
      minAge: 20,
      maxOccurrences: 1,
      conditions: [when.education(2), when.stat("intelligence", 14)],
      choices: [
        { id: "study", text: t("Учиться в схоле", "Study at the schola"), check: check(["intelligence", "wisdom"], 14), success: { text: t("Книги открывают, откуда пришла Мгла.", "The books reveal where the Mist came from."), effects: [fx.education("df-schola"), fx.socialClass("clergy"), fx.stat("intelligence", 2)] }, failure: { text: t("Наставники схолы не впечатлены.", "The schola's masters are not impressed."), effects: [fx.stat("intelligence", 1)] } },
        { id: "decline", text: t("Остаться на стенах", "Stay on the walls"), success: { text: t("Кто-то должен держать огни.", "Someone has to keep the lights."), effects: [fx.rep(3)] } }
      ]
    },
    {
      id: "df.oath-weight",
      kind: "path",
      title: t("Вес клятвы", "The weight of the oath"),
      text: t("Клятва окрепла. Орден предлагает не новый ранг, а сторону: держать огонь для слабых или уйти во Мглу, где сила дешевле.", "The oath has grown. The Order offers not a new rank, but a side: keep the fire for the weak, or walk into the Mist where power is cheaper."),
      minAge: 20,
      maxOccurrences: 1,
      weight: 2,
      conditions: [when.flag("oath-sworn"), when.rank(2)],
      choices: [
        { id: "flame", text: t("Держать огонь", "Keep the fire"), success: { text: t("Пламя узнаёт своего.", "The flame recognises its own."), effects: [fx.meter("ember", 12), fx.faction("order-of-ash", 10), fx.karma(4)] } },
        { id: "mist", text: t("Шагнуть во Мглу", "Step into the Mist"), success: { text: t("Мгла отвечает быстрее собора.", "The Mist answers faster than the cathedral."), effects: [fx.meter("corruption", 10), fx.track(8), fx.karma(-6), fx.faction("mist-cult", 8)] } }
      ]
    },
    {
      id: "df.ash-return",
      kind: "chain",
      title: t("Пепел возвращается", "The ash returns"),
      text: t("Прошло несколько лет. Орден спрашивает, держит ли {name} слово, данное у собора, или Мгла уже ближе клятвы.", "Years have passed. The Order asks whether {name} still keeps the word sworn at the cathedral, or whether the Mist is closer than the oath."),
      minAge: 20,
      maxOccurrences: 1,
      scheduledOnly: true,
      conditions: [when.flag("oath-sworn")],
      choices: [
        { id: "hold", text: t("Повторить клятву вслух", "Repeat the oath aloud"), success: { text: t("Пепел снова ложится на плечи. Клятва тяжелее, но своя.", "Ash settles on the shoulders again. The oath is heavier, but it is yours."), effects: [fx.meter("ember", 10), fx.faction("order-of-ash", 8), fx.karma(4)] } },
        { id: "break", text: t("Сказать, что клятва кончилась", "Say the oath is over"), success: { text: t("Орден отворачивается. Сила не уходит сразу.", "The Order turns away. The power does not leave at once."), effects: [fx.faction("order-of-ash", -12), fx.meter("corruption", 8), fx.stat("willpower", 1)] } }
      ]
    },
    {
      id: "df.elder-fire",
      kind: "family",
      title: t("Огонь для старого дома", "A fire for the old house"),
      text: t("Родитель не выходит за порог уже третью зиму. Соборный огонь можно унести в горсти пепла — или оставить собору.", "A parent has not crossed the threshold for a third winter. The cathedral fire can be carried home in a handful of ash — or left to the cathedral."),
      minAge: 40,
      maxOccurrences: 1,
      weight: 2,
      conditions: [when.flag("order-oath"), when.npc("parent")],
      choices: [
        { id: "carry", text: t("Унести горсть домой", "Carry a handful home"), success: { text: t("Дома становится теплее. Собор замечает недостачу.", "The house grows warmer. The cathedral notices the lack."), effects: [fx.affinity("parent", 14), fx.faction("order-of-ash", -4), fx.karma(3)] } },
        { id: "leave", text: t("Оставить огонь собору", "Leave the fire to the cathedral"), success: { text: t("Клятва цела. Дома жгут сырые дрова.", "The oath is whole. At home they burn wet wood."), effects: [fx.faction("order-of-ash", 6), fx.affinity("parent", -8)] } }
      ]
    },
    {
      id: "df.winter-call",
      kind: "family",
      title: t("Зимний вызов", "A winter summons"),
      text: t("Орден зовёт клятвенника на северную стену. В ту же ночь деревня просит остаться: Мгла уже у околицы, а дома некому держать огонь.", "The Order calls its sworn to the northern wall. The same night the village asks them to stay: the Mist is already at the lane, and no one at home can keep the fire."),
      minAge: 18,
      maxOccurrences: 1,
      weight: 2,
      conditions: [when.flag("oath-sworn"), when.npc("parent")],
      choices: [
        { id: "stay", text: t("Остаться у очага", "Stay by the hearth"), success: { text: t("Стена переживёт ночь без одного клинка. Дом — нет.", "The wall will last the night without one blade. The house will not."), effects: [fx.affinity("parent", 16), fx.karma(6), fx.faction("order-of-ash", -6), fx.later("df.c-winter-kept", 2), fx.flag("winter-kept"), fx.schedule("df.ash-return", 4)] } },
        { id: "ride", text: t("Скакать к Ордену", "Ride for the Order"), success: { text: t("Клятва громче кровли. Дома запомнят, кто уехал.", "The oath is louder than the roof. Home will remember who rode away."), effects: [fx.faction("order-of-ash", 12), fx.track(8), fx.affinity("parent", -12), fx.rep(4)] } },
        { id: "mist", text: t("Пойти во Мглу одному", "Walk into the Mist alone"), requires: [when.flag("mist-oath")], success: { text: t("Мгла расступается перед своим. Деревня видит тень и молится.", "The Mist parts for its own. The village sees a shadow and prays."), effects: [fx.meter("corruption", 8), fx.wealth(20), fx.karma(-6), fx.skill("hollow-hunting", 4)] } }
      ]
    }
  ]
};
