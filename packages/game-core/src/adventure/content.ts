// Stage 05: приключения шести миров. Это описания, не правила: исход считает adventure/adventure.ts.
// Stage 11: у каждого мира вторая дорога. Она требует первую и открывается с места, которое уже есть.
// Stage 17: в конце второй дороги есть развилка. Оба конца завершают дело, награды разные и не больше первой ветки.
// Награды — существующие эффекты игры. Пройденное второй раз не начинается.
import { t } from "../i18n.js";
import { check, fx, when } from "../narrative/dsl.js";
import type { Effect } from "../narrative/types.js";
import { findProfession, findSkill } from "../rpg/skills.js";
import { UNIVERSE_IDS, type UniverseId } from "../types.js";
import { getUniverse } from "../universes/registry.js";
import type { AdventureDefinition, PlaceDefinition, StepOutcome } from "./types.js";

const PLACES: Readonly<Record<UniverseId, readonly PlaceDefinition[]>> = {
  "dark-fantasy": [
    { id: "df.ember-wall", name: t("Тлеющая застава", "The Ember Wall"), text: t("Последняя стена перед Мглой. Фонари здесь не гасят никогда.", "The last wall before the Mist. The lamps here are never put out."), minAge: 14 },
    { id: "df.ash-cathedral", name: t("Собор Последнего Огня", "Cathedral of the Last Flame"), text: t("Пепел святых хранят под алтарём.", "The ashes of saints are kept beneath the altar."), minAge: 16 },
    { id: "df.sunken-bell", name: t("Затонувшая звонница", "The Sunken Belfry"), text: t("Колокол под затопленной часовней звонит только в те ночи, когда Мгла отступает.", "The bell beneath the flooded chapel rings only on nights when the Mist recedes."), minAge: 18 },
    { id: "df.last-light", name: t("Последний огонь", "The Last Light"), text: t("Часовня на самом конце тракта, где лампа горит с той ночи, когда пришла Мгла.", "A chapel at the very end of the highway, where a lamp has burned since the night the Mist came."), minAge: 20 }
  ],
  isekai: [
    { id: "is.guild-hall", name: t("Зал Гильдии", "The Guild hall"), text: t("Доска контрактов, кружки эля и чужие карты подземелий.", "A contract board, mugs of ale and other people's dungeon maps."), minAge: 14 },
    { id: "is.whisper-wood", name: t("Шепчущий лес", "The Whispering Wood"), text: t("Лес, который Гильдия отмечает на картах красным.", "A wood the Guild marks in red on its maps."), minAge: 15 },
    { id: "is.sunken-road", name: t("Затонувшая дорога", "The Sunken Road"), text: t("Старый тракт, который карты Гильдии до сих пор рисуют поверх болота.", "An old highway the Guild's maps still draw over the marsh."), minAge: 18 },
    { id: "is.old-signpost", name: t("Старый указатель", "The old signpost"), text: t("Развилка, где сходятся три тракта и две карты Гильдии. Возчики говорят, что здесь дорога вспоминает, кем вы были.", "A fork where three highways and two Guild maps meet. Drivers say the road here remembers who you were."), minAge: 19 }
  ],
  murim: [
    { id: "mu.river-pass", name: t("Перевал Третьей реки", "The Third River pass"), text: t("Единственная тропа через горы, которую не стережёт таможня.", "The only mountain path the customs do not watch."), minAge: 14 },
    { id: "mu.beggar-yard", name: t("Двор Секты нищих", "The Beggars' yard"), text: t("Здесь знают всё, что происходит на дорогах.", "Here they know everything that happens on the roads."), minAge: 15 },
    { id: "mu.iron-shrine", name: t("Железная кумирня", "The Iron Shrine"), text: t("Кумирня на перевале, где молятся не богам, а клинкам.", "A shrine on the pass where people pray not to gods but to blades."), minAge: 18 },
    { id: "mu.sword-grave", name: t("Могила клинков", "The grave of swords"), text: t("Долина, где из земли торчат рукояти безымянных клинков. Сюда приходят те, кому нечего оставить после смерти.", "A valley where the hilts of nameless blades stand out of the earth. Those with nothing to leave behind come here."), minAge: 19 }
  ],
  xianxia: [
    { id: "xi.forbidden-path", name: t("Запретная тропа", "The forbidden path"), text: t("Тропа за дальним пиком, куда внешним ученикам ходить нельзя.", "A path beyond the far peak, forbidden to outer disciples."), minAge: 14 },
    { id: "xi.spirit-spring", name: t("Духовный источник", "The spirit spring"), text: t("Вода источника помнит всех, кто из неё пил.", "The spring's water remembers everyone who drank from it."), minAge: 16 },
    { id: "xi.star-well", name: t("Звёздный колодец", "The star well"), text: t("Колодец на краю секты, в котором вода отражает небо не этого мира.", "A well at the sect's edge whose water reflects a sky not of this world."), minAge: 19 },
    { id: "xi.mirror-terrace", name: t("Зеркальная терраса", "The mirror terrace"), text: t("Терраса над облаками, где полированный камень отражает небо, которого нет над сектой.", "A terrace above the clouds, where polished stone reflects a sky that is not above the sect."), minAge: 20 }
  ],
  hunter: [
    { id: "hu.gate-d", name: t("Врата D у Мапхо", "The D-rank Gate at Mapo"), text: t("Синий разлом над пустырём. Ассоциация оценила его как D.", "A blue rift over a wasteland. The Association rated it D."), minAge: 16 },
    { id: "hu.association", name: t("Отделение Ассоциации", "The Association office"), text: t("Лицензии, ранги и очередь на регистрацию добычи.", "Licences, ranks and the queue to register loot."), minAge: 16 },
    { id: "hu.red-gate", name: t("Красные Врата", "The Red Gate"), text: t("Разлом над Ханганом, который Ассоциация закрыла для всех, кроме S-ранга.", "A rift over the Han that the Association has closed to everyone but S-ranks."), minAge: 19 },
    { id: "hu.gate-zero", name: t("Нулевые Врата", "Gate Zero"), text: t("Заброшенная станция метро, где стоят Врата, которые Ассоциация так и не смогла закрыть. По ночам они повторяют чужой рейд.", "An abandoned subway station where a Gate the Association could never close still stands. At night it replays someone else's raid."), minAge: 20 }
  ],
  academy: [
    { id: "ac.court-stair", name: t("Парадная лестница дворца", "The palace's grand stair"), text: t("По этой лестнице проходят только с приглашением.", "Only those with an invitation walk this stair."), minAge: 16 },
    { id: "ac.duelling-yard", name: t("Дуэльный двор", "The duelling yard"), text: t("Песок двора помнит больше крови, чем балов.", "The yard's sand remembers more blood than balls."), minAge: 16 },
    { id: "ac.observatory", name: t("Башня обсерватории", "The observatory tower"), text: t("Верхняя башня академии, где карты звёзд сверяют с картами придворных.", "The academy's upper tower, where star charts are checked against court charts."), minAge: 19 },
    { id: "ac.rooftop", name: t("Крыша академии", "The academy rooftop"), text: t("Плоская крыша над обсерваторией, где небо ближе, чем кажется, и ректор иногда читает его без приборов.", "A flat roof above the observatory, where the sky is closer than it seems and the rector sometimes reads it without instruments."), minAge: 20 }
  ]
};

const ADVENTURES: Readonly<Record<UniverseId, readonly AdventureDefinition[]>> = {
  "dark-fantasy": [
    {
      id: "df.night-watch",
      placeId: "df.ember-wall",
      name: t("Ночной дозор", "The night watch"),
      text: t("Ордену не хватает людей на стене. Одна ночь — и имя запишут в книгу дозора.", "The Order is short of people on the wall. One night, and the name goes into the watch book."),
      minAge: 16,
      steps: [
        {
          id: "gate",
          text: t("У ворот заставы часовой спрашивает, с чем пришли.", "At the outpost gate a sentry asks what you came for."),
          choices: [
            { id: "oath", text: t("Назвать клятву Ордену", "Name your oath to the Order"), requires: [when.faction("order-of-ash", 10)], success: { text: t("Часовой узнаёт своего и пропускает без вопросов.", "The sentry recognises one of their own and lets you through."), effects: [fx.faction("order-of-ash", 3)], next: "wall" } },
            { id: "talk", text: t("Попросить место в дозоре", "Ask for a place on the watch"), check: check(["charisma"], 11), success: { text: t("Часовой уступает место у фонаря.", "The sentry yields the place by the lamp."), effects: [fx.xp(15)], next: "wall" }, failure: { text: t("Вас оставляют за воротами до утра.", "You are left outside the gate until morning."), effects: [fx.rep(-2)], fail: true } }
          ]
        },
        {
          id: "wall",
          text: t("К полуночи Мгла поднимается к самым зубцам. В ней что-то движется.", "By midnight the Mist rises to the very battlements. Something moves in it."),
          choices: [
            { id: "hunt", text: t("Выйти на стену с клинком", "Take the wall with a blade"), check: check(["strength", "agility"], 12, 0, { skill: "hollow-hunting" }), success: { text: t("Полый рассыпается пеплом. Дозор видел всё.", "The hollow falls to ash. The watch saw it all."), effects: [fx.xp(40), fx.skill("hollow-hunting", 4), fx.wealth(15)], next: "dawn" }, failure: { text: t("Мгла оказывается ближе, чем казалась. Вас уносят со стены.", "The Mist is closer than it looked. They carry you off the wall."), effects: [fx.health(-25)], fail: true } },
            { id: "lamp", text: t("Держать фонарь и звать подмогу", "Hold the lamp and call for help"), success: { text: t("Огонь не даёт Мгле перейти стену. Рыцари успевают.", "The fire keeps the Mist off the wall. The knights arrive in time."), effects: [fx.xp(20), fx.rep(4), fx.faction("order-of-ash", 4)], next: "dawn" } }
          ]
        },
        {
          id: "dawn",
          text: t("На рассвете капитан дозора открывает книгу.", "At dawn the captain of the watch opens the book."),
          choices: [
            { id: "sign", text: t("Вписать своё имя", "Write your name"), success: { text: t("Имя в книге дозора. Орден запомнит эту ночь.", "The name is in the watch book. The Order will remember this night."), effects: [fx.xp(30), fx.rep(6), fx.ability("hollow-mark")], complete: true } }
          ]
        }
      ]
    },
    {
      id: "df.ash-relic",
      placeId: "df.ash-cathedral",
      requires: ["df.night-watch"],
      name: t("Пепел под алтарём", "Ash beneath the altar"),
      text: t("После ночи на стене сёстры зовут в собор: под алтарём лежит реликвия, которую Мгла уже тронула.", "After the night on the wall the sisters call you to the cathedral: beneath the altar lies a relic the Mist has already touched."),
      minAge: 18,
      steps: [
        {
          id: "altar",
          text: t("Настоятельница не пускает к алтарю без слова.", "The abbess will not let anyone near the altar without a word."),
          choices: [
            { id: "oath", text: t("Повторить клятву дозора", "Repeat the watch oath"), requires: [when.ability("hollow-mark")], success: { text: t("Она узнаёт отмеченного и отходит.", "She recognises the marked and steps aside."), effects: [fx.faction("order-of-ash", 3)], next: "relic" } },
            { id: "ask", text: t("Попросить допустить как паломника", "Ask to be admitted as a pilgrim"), check: check(["charisma"], 12), success: { text: t("Вас пускают на час и не больше.", "You are allowed an hour and no more."), effects: [fx.xp(15)], next: "relic" }, failure: { text: t("Дверь собора закрывается.", "The cathedral door closes."), effects: [fx.rep(-2)], fail: true } }
          ]
        },
        {
          id: "relic",
          text: t("Реликвия тёплая. Пепел на ней шевелится.", "The relic is warm. The ash on it stirs."),
          choices: [
            { id: "cleanse", text: t("Очистить огнём клятвы", "Cleanse it with the fire of an oath"), check: check(["willpower"], 13, 0, { skill: "oathcraft" }), success: { text: t("Пепел опадает. Реликвия гаснет и стынет.", "The ash falls away. The relic goes dark and cold."), effects: [fx.xp(40), fx.skill("oathcraft", 4)], next: "keep" }, failure: { text: t("Огонь клятвы не берёт. Вас выносят на паперть.", "The oath's fire does not take. They carry you out onto the steps."), effects: [fx.health(-20)], fail: true } },
            { id: "read", text: t("Прочитать, что выбито на окладе", "Read what is cut into the mounting"), check: check(["intelligence"], 12, 0, { skill: "relic-lore" }), success: { text: t("Надпись говорит, как держать реликвию, чтобы пепел уснул.", "The inscription tells how to hold the relic so the ash sleeps."), effects: [fx.xp(30), fx.skill("relic-lore", 3)], next: "keep" }, failure: { text: t("Надпись не читается. Пепел сыплется на руки.", "The inscription will not be read. Ash spills onto your hands."), effects: [fx.health(-15)], fail: true } }
          ]
        },
        {
          id: "keep",
          text: t("Настоятельница спрашивает, кому отдать остывшую реликвию.", "The abbess asks who should keep the cooled relic."),
          choices: [
            { id: "order", text: t("Оставить Ордену", "Leave it with the Order"), success: { text: t("Реликвия уходит в ризницу. Орден записывает ваше имя рядом.", "The relic goes to the sacristy. The Order writes your name beside it."), effects: [fx.xp(30), fx.faction("order-of-ash", 6), fx.rep(4)], complete: true } },
            { id: "bury", text: t("Закопать за стеной, чтобы Мгла не нашла", "Bury it beyond the wall so the Mist cannot find it"), success: { text: t("Реликвия уходит в холодную землю. Огонь в груди становится тише, но скверна не получает пищи.", "The relic goes into cold earth. The fire in the chest grows quieter, but the corruption gets no food."), effects: [fx.xp(20), fx.meter("corruption", -8), fx.karma(4), fx.faction("order-of-ash", -3)], complete: true } }
          ]
        }
      ]
    },
    {
      id: "df.bell-toll",
      placeId: "df.sunken-bell",
      requires: ["df.ash-relic"],
      name: t("Звон под водой", "A toll beneath the water"),
      text: t("Сёстры просят снять колокол до следующей ночи: его звон слышат не только живые.", "The sisters ask the bell be taken down before the next night: not only the living hear it."),
      minAge: 20,
      steps: [
        {
          id: "shore",
          text: t("У затопленной паперти вода стоит по грудь. Сёстры ждут на берегу.", "Water stands chest-deep at the flooded steps. The sisters wait on the bank."),
          choices: [
            { id: "wade", text: t("Войти в воду с фонарём", "Wade in with the lamp"), check: check(["willpower"], 13, 0, { skill: "oathcraft" }), success: { text: t("Фонарь держит свет. Вы доходите до колокола.", "The lamp holds its light. You reach the bell."), effects: [fx.xp(15), fx.skill("oathcraft", 2)], next: "bell" }, failure: { text: t("Вода гасит фонарь. Сёстры вытаскивают вас на берег.", "The water puts out the lamp. The sisters drag you back to the bank."), effects: [fx.health(-10), fx.rep(-2)], fail: true } },
            { id: "oath", text: t("Показать метку дозора", "Show the watch's mark"), requires: [when.ability("hollow-mark")], success: { text: t("Сёстры узнают отметку и отходят от воды.", "The sisters recognise the mark and step away from the water."), effects: [fx.faction("order-of-ash", 3)], next: "bell" } }
          ]
        },
        {
          id: "bell",
          text: t("Колокол бьёт под водой. С каждым ударом пепел на руках темнеет.", "The bell tolls beneath the water. With every stroke the ash on your hands darkens."),
          choices: [
            { id: "cut", text: t("Перерубить колокольную цепь", "Cut the bell's chain"), check: check(["strength"], 14, 0, { skill: "hollow-hunting" }), success: { text: t("Цепь лопается. Колокол оседает в ил.", "The chain snaps. The bell settles into the silt."), effects: [fx.xp(40), fx.skill("hollow-hunting", 4), fx.meter("corruption", -5)], next: "toll" }, failure: { text: t("Цепь держит. Вода бьёт в лицо, и вы теряете опору.", "The chain holds. Water strikes your face and you lose your footing."), effects: [fx.health(-15)], fail: true } },
            { id: "listen", text: t("Прислушаться к тому, что поёт колокол", "Listen to what the bell sings"), check: check(["intelligence"], 13, 0, { skill: "relic-lore" }), success: { text: t("В звоне слышна молитва. Вы находите, где цепь закреплена.", "A prayer lies in the toll. You find where the chain is fixed."), effects: [fx.xp(30), fx.skill("relic-lore", 4)], next: "toll" }, failure: { text: t("Звон заполняет голову. Вы приходите в себя на паперти.", "The toll fills your head. You come to on the steps."), effects: [fx.health(-15), fx.meter("corruption", 5)], fail: true } }
          ]
        },
        {
          id: "toll",
          text: t("Колокол смолкает. Сёстры спрашивают, кому он будет звонить теперь.", "The bell falls silent. The sisters ask whom it will toll for now."),
          choices: [
            { id: "chapel", text: t("Оставить колокол сёстрам", "Leave the bell to the sisters"), success: { text: t("Сёстры уносят колокол в часовню. Орден записывает ваше имя рядом.", "The sisters carry the bell to the chapel. The Order writes your name beside it."), effects: [fx.xp(30), fx.faction("order-of-ash", 6), fx.rep(5)], complete: true } },
            { id: "deep", text: t("Утопить колокол глубже", "Sink the bell deeper"), success: { text: t("Перед тем как утопить колокол, вы снимаете язык и прячете его в рукав. Колокол уходит в ил. Скверна в груди становится тише, но Орден не прощает самовольства.", "Before sinking the bell you take its clapper and hide it in your sleeve. The bell goes into the silt. The corruption in your chest quiets, but the Order does not forgive wilfulness."), effects: [fx.xp(20), fx.meter("corruption", -8), fx.karma(4), fx.faction("order-of-ash", -2), fx.relic("drowned-bell")], complete: true } }
          ]
        }
      ]
    },
    {
      id: "df.last-vigil",
      placeId: "df.last-light",
      requires: ["df.bell-toll"],
      name: t("Последний дозор", "The last vigil"),
      text: t("Сестра Эловен держит последнюю лампу на тракте. Орден хочет унести её за стену, но на дороге всё ещё теряются люди.", "Sister Elowen keeps the last lamp on the highway. The Order wants it carried behind the wall, but people are still lost on the road."),
      minAge: 20,
      steps: [
        {
          id: "arrival",
          text: t("У часовни сестра Эловен поднимает лампу так, чтобы свет упал на ваше лицо.", "At the chapel Sister Elowen raises the lamp so its light falls on your face."),
          choices: [
            { id: "greet", text: t("Назвать себя и спросить о лампе", "Give your name and ask about the lamp"), success: { text: t("Она называет вас дозорным, хотя вы не давали клятвы, и отворяет дверь.", "She calls you a watcher, though you swore no oath, and opens the door."), effects: [fx.xp(10), fx.faction("order-of-ash", 2)], next: "talk" } }
          ]
        },
        {
          id: "talk",
          text: t("Эловен рассказывает о сестре Мире, ушедшей по тракту в ночь, когда затонувший колокол звонил последний раз. Она слышит этот звон во сне.", "Elowen speaks of her sister Mira, who walked the highway on the night the sunken bell last rang. She hears that toll in her sleep."),
          choices: [
            { id: "listen", text: t("Слушать, пока она не назовёт имя", "Listen until she says the name"), check: check(["willpower", "wisdom"], 13, 0, { skill: "oathcraft" }), success: { text: t("Она называет Миру и отдаёт ключ от часовни: решать, где стоять огню, будете вы.", "She names Mira and gives you the chapel key: you will decide where the fire stands."), effects: [fx.xp(20), fx.skill("oathcraft", 2), fx.faction("order-of-ash", 2)], next: "test" }, failure: { text: t("Звон в её рассказе становится вашим. Вы приходите в себя на полу часовни.", "The toll in her story becomes yours. You come to on the chapel floor."), effects: [fx.health(-10), fx.meter("corruption", 4)], fail: true } },
            { id: "vow", text: t("Повторить клятву дозора", "Repeat the watch's oath"), requires: [when.ability("hollow-mark")], success: { text: t("Эловен узнаёт метку и говорит без обиняков: лампа должна идти по дороге.", "Elowen recognises the mark and speaks plainly: the lamp must walk the road."), effects: [fx.xp(15), fx.faction("order-of-ash", 3)], next: "test" } }
          ]
        },
        {
          id: "test",
          text: t("Со стороны Мглы идут огни: полые несут фонари, которых у них не было. Лампу нужно пронести по тракту до верстового камня и вернуть горящей.", "Lights come from the Mist: hollows carry lamps they never had. The lamp must be carried down the highway to the milestone and brought back burning."),
          choices: [
            { id: "carry", text: t("Понести лампу самому", "Carry the lamp yourself"), check: check(["willpower", "strength"], 14, 0, { skill: "oathcraft" }), success: { text: t("Огонь не гаснет. Полые отступают от света, и верстовой камень оказывается ближе, чем вы думали.", "The fire does not go out. The hollows retreat from the light, and the milestone is closer than you thought."), effects: [fx.xp(40), fx.skill("oathcraft", 3), fx.meter("ember", 8)], next: "choice" }, failure: { text: t("Ветер с Мглы задувает фитиль. Вы возвращаетесь с пустыми руками и обожжёнными ладонями.", "Wind from the Mist snuffs the wick. You return empty-handed, palms burned."), effects: [fx.health(-20), fx.meter("corruption", 5)], fail: true } },
            { id: "drive", text: t("Погасить чужие фонари и идти в темноте", "Put out the strangers' lamps and walk in the dark"), check: check(["wisdom"], 13, 0, { skill: "hollow-hunting" }), success: { text: t("Вы гасите один фонарь за другим. Мгла теряет дорогу и откатывается от часовни.", "You snuff one lamp after another. The Mist loses the road and rolls back from the chapel."), effects: [fx.xp(30), fx.skill("hollow-hunting", 3), fx.meter("corruption", -4)], next: "choice" }, failure: { text: t("Фонари оказываются глазами. Вы едва успеваете отступить к часовне.", "The lamps turn out to be eyes. You barely retreat to the chapel."), effects: [fx.health(-15)], fail: true } }
          ]
        },
        {
          id: "choice",
          text: t("На рассвете Эловен спрашивает, где лампа будет стоять дальше.", "At dawn Elowen asks where the lamp will stand from now on."),
          choices: [
            { id: "wall", text: t("Унести лампу за стену", "Carry the lamp behind the wall"), success: { text: t("Орден принимает огонь и ставит у него своих людей. Эловен остаётся на тракте одна, но лампа будет гореть ещё сто лет.", "The Order takes the fire and sets its own people by it. Elowen stays alone on the highway, but the lamp will burn another hundred years."), effects: [fx.xp(30), fx.faction("order-of-ash", 7), fx.rep(4), fx.wealth(15)], complete: true } },
            { id: "road", text: t("Оставить лампу на тракте и позвонить в колокол", "Leave the lamp on the highway and ring the bell"), requires: [when.relic("drowned-bell")], success: { text: t("Вы вынимаете из-под плаща язык затонувшего колокола и вешаете его над дверью. Теперь лампа звонит тем, кто сбился с дороги, и Мгла обходит свет стороной.", "You take the drowned bell's clapper from under your cloak and hang it over the door. Now the lamp tolls for those who have lost the road, and the Mist goes around the light."), effects: [fx.xp(40), fx.faction("order-of-ash", 3), fx.rep(6), fx.meter("corruption", -6), fx.meter("ember", 10)], complete: true } }
          ]
        }
      ]
    }
  ],
  isekai: [
    {
      id: "is.first-contract",
      placeId: "is.guild-hall",
      name: t("Первый контракт", "The first contract"),
      text: t("На доске висит контракт без подписи: Шепчущий лес, три дня, награда по возвращении.", "An unsigned contract hangs on the board: the Whispering Wood, three days, payment on return."),
      minAge: 15,
      steps: [
        {
          id: "board",
          text: t("Клерк Гильдии смотрит на вас поверх кружки.", "The Guild clerk looks at you over a mug."),
          choices: [
            { id: "licence", text: t("Показать лицензию", "Show your licence"), requires: [when.profession("adventurer")], success: { text: t("Клерк ставит печать без вопросов.", "The clerk stamps it without questions."), effects: [fx.faction("guild", 3)], next: "wood" } },
            { id: "ask", text: t("Попросить контракт без лицензии", "Ask for the contract without a licence"), check: check(["charisma"], 12), success: { text: t("Клерк машет рукой: один раз можно.", "The clerk waves you on: once is allowed."), effects: [fx.xp(10)], next: "wood" }, failure: { text: t("Без лицензии контракт не дают.", "No licence, no contract."), effects: [], fail: true } }
          ]
        },
        {
          id: "wood",
          text: t("В лесу тропа обрывается у логова. Внутри что-то большое.", "In the wood the path ends at a den. Something large is inside."),
          choices: [
            { id: "fight", text: t("Войти с оружием", "Go in armed"), check: check(["agility", "strength"], 12, 0, { skill: "guild-craft" }), success: { text: t("Логово пустеет. Добыча — за плечами.", "The den is empty. The spoils go on your back."), effects: [fx.xp(40), fx.skill("guild-craft", 4), fx.wealth(20)], next: "report" }, failure: { text: t("Из логова приходится уходить ползком.", "You have to crawl out of the den."), effects: [fx.health(-25)], fail: true } },
            { id: "lure", text: t("Выманить зверя на тропу", "Lure the beast onto the path"), check: check(["wisdom"], 11), success: { text: t("Зверь выходит сам и попадает в силки.", "The beast comes out on its own and into the snare."), effects: [fx.xp(30), fx.skill("survival", 3)], next: "report" }, failure: { text: t("Зверь выходит не туда. Приходится бежать.", "The beast comes out the wrong way. You have to run."), effects: [fx.health(-15)], fail: true } }
          ]
        },
        {
          id: "report",
          text: t("Клерк сверяет добычу с контрактом.", "The clerk checks the spoils against the contract."),
          choices: [
            { id: "report", text: t("Сдать контракт", "Turn in the contract"), success: { text: t("Печать, золото и первое выполненное дело.", "A stamp, gold and a first completed job."), effects: [fx.xp(30), fx.wealth(25), fx.faction("guild", 6), fx.rep(4)], complete: true } }
          ]
        }
      ]
    },
    {
      id: "is.second-contract",
      placeId: "is.whisper-wood",
      requires: ["is.first-contract"],
      name: t("Второй контракт", "The second contract"),
      text: t("Гильдия вешает новый лист: в Шепчущем лесу видели зверя, которого нет в бестиарии.", "The Guild posts a new sheet: a beast has been seen in the Whispering Wood that is not in the bestiary."),
      minAge: 17,
      steps: [
        {
          id: "sheet",
          text: t("Клерк узнаёт вас и пододвигает лист.", "The clerk recognises you and slides the sheet across."),
          choices: [
            { id: "take", text: t("Взять контракт", "Take the contract"), success: { text: t("Печать ставится без разговоров.", "The stamp goes on without talk."), effects: [fx.faction("guild", 3), fx.xp(10)], next: "den" } }
          ]
        },
        {
          id: "den",
          text: t("Логово глубже, чем в прошлый раз. Зверь не один.", "The den is deeper than last time. The beast is not alone."),
          choices: [
            { id: "fight", text: t("Принять бой", "Take the fight"), check: check(["strength", "agility"], 13, 0, { skill: "guild-craft" }), success: { text: t("Оба зверя падают. Добыча тяжёлая.", "Both beasts fall. The spoils are heavy."), effects: [fx.xp(40), fx.skill("guild-craft", 4), fx.wealth(20)], next: "turnin" }, failure: { text: t("Второго зверя вы не ждали. Приходится уходить.", "You did not expect the second beast. You have to leave."), effects: [fx.health(-25)], fail: true } },
            { id: "trap", text: t("Поставить силки на тропе", "Set a snare on the path"), check: check(["wisdom"], 12, 0, { skill: "survival" }), success: { text: t("Зверь сам приходит в силки.", "The beast walks into the snare on its own."), effects: [fx.xp(30), fx.skill("survival", 3)], next: "turnin" }, failure: { text: t("Силки рвутся. Зверь уходит в чащу.", "The snare breaks. The beast goes deeper into the wood."), effects: [fx.health(-15)], fail: true } }
          ]
        },
        {
          id: "turnin",
          text: t("Клерк сверяет добычу со списком.", "The clerk checks the spoils against the list."),
          choices: [
            { id: "report", text: t("Сдать контракт", "Turn in the contract"), success: { text: t("Второе дело в книге Гильдии. Доля больше первой.", "A second job in the Guild's book. The share is larger than the first."), effects: [fx.xp(30), fx.wealth(25), fx.faction("guild", 5), fx.rep(3)], complete: true } },
            { id: "keep", text: t("Оставить шкуру себе и заплатить штраф", "Keep the hide and pay the fine"), success: { text: t("Клерк ставит штраф и закрывает лист. Шкура остаётся, книга Гильдии — нет.", "The clerk writes a fine and closes the sheet. The hide stays, the Guild book does not."), effects: [fx.xp(15), fx.wealth(-10), fx.skill("survival", 3), fx.faction("guild", -4)], complete: true } }
          ]
        }
      ]
    },
    {
      id: "is.lost-caravan",
      placeId: "is.sunken-road",
      requires: ["is.second-contract"],
      name: t("Пропавший караван", "The lost caravan"),
      text: t("Купеческий обоз ушёл по старой дороге и не вернулся. Гильдия платит за ответ, а не за товар.", "A merchant train took the old road and did not return. The Guild pays for an answer, not for the goods."),
      minAge: 19,
      steps: [
        {
          id: "post",
          text: t("У болота стоит брошенная повозка. На борту — печать Лиги.", "An abandoned wagon stands by the marsh. The League's seal is on its side."),
          choices: [
            { id: "track", text: t("Идти по следам колёс", "Follow the wheel ruts"), check: check(["intelligence"], 12, 0, { skill: "guild-craft" }), success: { text: t("Следы ведут в воду и выходят с другой стороны.", "The tracks lead into the water and come out on the other side."), effects: [fx.xp(15)], next: "marsh" }, failure: { text: t("Следы теряются в трясине. Вы едва выбираетесь.", "The tracks vanish in the mire. You barely get out."), effects: [fx.health(-10)], fail: true } },
            { id: "call", text: t("Позвать возчиков в туман", "Call the drivers into the mist"), check: check(["charisma"], 12), success: { text: t("Из тумана отвечает голос. Он знает ваше имя.", "A voice answers from the mist. It knows your name."), effects: [fx.xp(10), fx.faction("guild", 2)], next: "marsh" }, failure: { text: t("Туман отвечает чужими голосами. Гильдия не любит таких шуток.", "The mist answers in strangers' voices. The Guild does not like such jokes."), effects: [fx.meter("system-favor", -2)], fail: true } }
          ]
        },
        {
          id: "marsh",
          text: t("В тумане слышны голоса обоза. Они зовут по именам, которых вы не знаете.", "Voices of the caravan sound in the mist. They call names you do not know."),
          choices: [
            { id: "follow", text: t("Идти на голоса", "Follow the voices"), check: check(["willpower"], 13, 0, { skill: "spellcraft" }), success: { text: t("Голоса смолкают. На кочке лежит журнал.", "The voices fall silent. A ledger lies on a hummock."), effects: [fx.xp(35), fx.skill("spellcraft", 4)], next: "ledger" }, failure: { text: t("Голоса заводят вас в трясину. Вы выбираетесь без сил.", "The voices lead you into the mire. You crawl out exhausted."), effects: [fx.health(-15), fx.meter("system-favor", -5)], fail: true } },
            { id: "light", text: t("Зажечь магический свет", "Kindle a magical light"), check: check(["intelligence"], 12, 0, { skill: "invention" }), success: { text: t("Свет выхватывает повозку и журнал на сиденье.", "The light picks out the wagon and the ledger on its seat."), effects: [fx.xp(30), fx.skill("invention", 4)], next: "ledger" }, failure: { text: t("Свет гаснет. Вы идёте назад по собственным следам.", "The light dies. You walk back along your own tracks."), effects: [fx.health(-15)], fail: true } }
          ]
        },
        {
          id: "ledger",
          text: t("На дне повозки лежит журнал Лиги. Последняя запись сделана вашей рукой.", "The League's ledger lies at the bottom of the wagon. The last entry is in your hand."),
          choices: [
            { id: "guild", text: t("Отдать журнал Гильдии", "Give the ledger to the Guild"), success: { text: t("Гильдия закрывает дело. Ваше имя вписывают в отчёт.", "The Guild closes the case. Your name goes into the report."), effects: [fx.xp(30), fx.wealth(30), fx.faction("guild", 6), fx.rep(4)], complete: true } },
            { id: "league", text: t("Продать журнал Лиге", "Sell the ledger to the League"), success: { text: t("Перед сделкой вы вырываете страницу со своей записью и оставляете её себе. Лига платит больше, чем Гильдия. Клерк не спрашивает, откуда журнал.", "Before the deal you tear out the page with your own entry and keep it. The League pays more than the Guild. The clerk does not ask where the ledger came from."), effects: [fx.xp(20), fx.wealth(45), fx.faction("merchant-league", 6), fx.faction("guild", -3), fx.relic("caravan-ledger")], complete: true } }
          ]
        }
      ]
    },
    {
      id: "is.road-home",
      placeId: "is.old-signpost",
      requires: ["is.lost-caravan"],
      name: t("Дорога домой", "The road home"),
      text: t("У старого указателя стоит фургон с гербом Лиги. Возчик Руй ждёт последнюю телегу, которой нет ни на одной карте.", "A wagon with the League's crest stands at the old signpost. Caravan master Rui waits for the last cart, which is on no map at all."),
      minAge: 19,
      steps: [
        {
          id: "arrival",
          text: t("Руй держит вожжи обеими руками, хотя лошадей уже распрягли.", "Rui grips the reins with both hands, though the horses have already been unhitched."),
          choices: [
            { id: "hail", text: t("Окликнуть его по имени", "Call him by name"), success: { text: t("Он вздрагивает, потом кланяется: имя слышали в последний раз на затонувшей дороге.", "He flinches, then bows: the last time anyone said his name was on the sunken road."), effects: [fx.xp(10), fx.faction("merchant-league", 2)], next: "talk" } }
          ]
        },
        {
          id: "talk",
          text: t("Руй рассказывает, как обоз вошёл в копию зала Гильдии. Люди вернулись, а книги Лиги говорят, что они никогда не уезжали. Его клеймо на руке ничего не доказывает.", "Rui tells how the caravan walked into a copy of the Guild hall. The people came back, but the League's books say they never left. The brand on his hand proves nothing."),
          choices: [
            { id: "listen", text: t("Слушать и сверять его рассказ с картой", "Listen and check his story against the map"), check: check(["intelligence", "wisdom"], 13, 0, { skill: "guild-craft" }), success: { text: t("На карте находится место, которого не было: развилка сдвинулась на полдня пути.", "The map shows a place that was not there: the fork has moved half a day's walk."), effects: [fx.xp(20), fx.skill("guild-craft", 2), fx.faction("merchant-league", 2)], next: "test" }, failure: { text: t("Чем дольше он говорит, тем меньше остаётся на карте. Вы отступаете, пока не поздно.", "The longer he speaks, the less remains on the map. You step back before it is too late."), effects: [fx.health(-10), fx.meter("system-favor", -3)], fail: true } },
            { id: "brand", text: t("Показать печать Лиги", "Show the League's seal"), requires: [when.faction("merchant-league", 12)], success: { text: t("Руй видит печать и говорит быстрее: у него остался один фургон и одна ночь.", "Rui sees the seal and speaks faster: he has one wagon and one night left."), effects: [fx.xp(15), fx.faction("merchant-league", 3)], next: "test" } }
          ]
        },
        {
          id: "test",
          text: t("Дорога под фургоном становится мягкой, как вода. Указатель показывает сразу на три стороны, и только одна из них ведёт к настоящему тракту.", "The road softens under the wagon like water. The signpost points three ways at once, and only one leads to the real highway."),
          choices: [
            { id: "lead", text: t("Вести фургон по следам колёс", "Lead the wagon along the wheel ruts"), check: check(["wisdom"], 13, 0, { skill: "survival" }), success: { text: t("Следы держатся твёрдо. К рассвету фургон стоит на настоящей дороге.", "The ruts hold firm. By dawn the wagon stands on the real road."), effects: [fx.xp(35), fx.skill("survival", 3)], next: "choice" }, failure: { text: t("Дорога уходит из-под колёс. Вы вытаскиваете фургон из трясины без груза.", "The road slips from under the wheels. You drag the wagon out of the mire empty."), effects: [fx.health(-15)], fail: true } },
            { id: "measure", text: t("Измерить развилку и переставить указатель", "Measure the fork and move the signpost"), check: check(["intelligence"], 14, 0, { skill: "invention" }), success: { text: t("Указатель поворачивается с сухим щелчком. Фургон проходит там, где дорога настоящая.", "The signpost turns with a dry click. The wagon passes where the road is real."), effects: [fx.xp(35), fx.skill("invention", 3)], next: "choice" }, failure: { text: t("Стрелка ломается в руках. Приходится идти назад по памяти.", "The pointer breaks in your hands. You have to walk back from memory."), effects: [fx.health(-10), fx.meter("system-favor", -3)], fail: true } }
          ]
        },
        {
          id: "choice",
          text: t("Настоящий тракт впереди. Руй спрашивает, куда везти последний фургон.", "The real highway lies ahead. Rui asks where the last wagon should go."),
          choices: [
            { id: "guild", text: t("Вернуть фургон Гильдии", "Bring the wagon back to the Guild"), success: { text: t("Клерк принимает груз и ставит печать на пустой лист. Руй получает долю, Гильдия — товар, а дорога — ещё одну запись.", "The clerk takes the load and stamps an empty sheet. Rui gets his share, the Guild the goods, and the road one more entry."), effects: [fx.xp(30), fx.wealth(25), fx.faction("guild", 7), fx.rep(4)], complete: true } },
            { id: "home", text: t("Отдать Руй страницу из журнала и отпустить его", "Give Rui his page from the ledger and let him go"), requires: [when.relic("caravan-ledger")], success: { text: t("Вы находите в журнале страницу с его именем и отдаёте ему. Руй рвёт её над развилкой, и дорога отпускает фургон. Лига теряет возчика, но не человека.", "You find the page bearing his name in the ledger and give it to him. Rui tears it over the fork, and the road releases the wagon. The League loses a driver, but not a man."), effects: [fx.xp(40), fx.wealth(20), fx.faction("merchant-league", 5), fx.faction("guild", -2), fx.karma(5)], complete: true } }
          ]
        }
      ]
    }
  ],
  murim: [
    {
      id: "mu.smugglers",
      placeId: "mu.river-pass",
      name: t("Тропа контрабандистов", "The smugglers' path"),
      text: t("Через перевал идёт чужой караван без печати клана. Секта нищих предлагает провести вас следом.", "A caravan without the clan's seal crosses the pass. The Beggars' Sect offers to take you after it."),
      minAge: 16,
      steps: [
        {
          id: "yard",
          text: t("Во дворе Секты нищих вас кормят рисом и ждут ответа.", "In the Beggars' yard they feed you rice and wait for an answer."),
          choices: [
            { id: "listen", text: t("Выслушать, что знают нищие", "Hear what the beggars know"), success: { text: t("Тропа, время и число охраны. Больше нищие не скажут.", "The path, the hour and the number of guards. The beggars will say no more."), effects: [fx.faction("beggars-sect", 4), fx.xp(15)], next: "pass" } }
          ]
        },
        {
          id: "pass",
          text: t("На перевале караван встаёт на ночлег. Охрана не спит.", "At the pass the caravan makes camp. The guards stay awake."),
          choices: [
            { id: "shadow", text: t("Пройти мимо охраной незамеченным", "Pass the guards unseen"), check: check(["agility"], 12, 0, { skill: "lightness" }), success: { text: t("Крыши телег остаются внизу. Вас не заметили.", "The wagon roofs stay below. You were not seen."), effects: [fx.xp(35), fx.skill("lightness", 4)], next: "choice" }, failure: { text: t("Охрана поднимает крик. Приходится уходить ни с чем.", "The guards raise the alarm. You leave with nothing."), effects: [fx.health(-15), fx.rep(-3)], fail: true } },
            { id: "face", text: t("Выйти открыто и назвать себя", "Step out and name yourself"), check: check(["strength", "charisma"], 12, 0, { skill: "martial-arts" }), success: { text: t("Старший охраны узнаёт школу и уступает дорогу.", "The chief guard recognises the school and yields the road."), effects: [fx.xp(30), fx.skill("martial-arts", 3), fx.rep(3)], next: "choice" }, failure: { text: t("Вас принимают за грабителя. Схватка короткая и не в вашу пользу.", "They take you for a robber. The fight is short and not in your favour."), effects: [fx.health(-20)], fail: true } }
          ]
        },
        {
          id: "choice",
          text: t("В телегах — оружие без печати. Его можно отдать клану или оставить нищим.", "The wagons hold weapons without a seal. They can go to the clan or stay with the beggars."),
          choices: [
            { id: "clan", text: t("Отдать караван Праведному союзу", "Give the caravan to the Orthodox Alliance"), success: { text: t("Союз записывает вас в число своих глаз на дороге.", "The Alliance writes you down as one of its eyes on the road."), effects: [fx.xp(30), fx.faction("orthodox-alliance", 8), fx.rep(5), fx.wealth(10)], complete: true } },
            { id: "beggars", text: t("Оставить добычу Секте нищих", "Leave the spoils with the Beggars' Sect"), success: { text: t("Нищие не забывают тех, кто делится.", "The beggars do not forget those who share."), effects: [fx.xp(30), fx.faction("beggars-sect", 8), fx.karma(4)], complete: true } }
          ]
        }
      ]
    },
    {
      id: "mu.river-debt",
      placeId: "mu.river-pass",
      requires: ["mu.smugglers"],
      name: t("Долг переправы", "The crossing's debt"),
      text: t("Клан, который держит переправу, должен Праведному союзу. Союз просит вернуть долг словами или силой.", "The clan that holds the crossing owes the Orthodox Alliance. The Alliance asks the debt returned in words or by force."),
      minAge: 17,
      steps: [
        {
          id: "gate",
          text: t("У ворот переправы стоит старший охраны. Он вас помнит.", "The chief guard stands at the crossing gate. He remembers you."),
          choices: [
            { id: "name", text: t("Назвать дело, с которым пришли", "Name the errand you came on"), success: { text: t("Вас пропускают во двор клана.", "You are let into the clan yard."), effects: [fx.xp(15), fx.rep(2)], next: "hall" } }
          ]
        },
        {
          id: "hall",
          text: t("Глава клана не спорит с долгом. Он спорит с тем, кто его заберёт.", "The clan head does not dispute the debt. He disputes who will collect it."),
          choices: [
            { id: "speak", text: t("Говорить от имени Союза", "Speak for the Alliance"), check: check(["charisma"], 13, 0, { skill: "persuasion" }), success: { text: t("Глава уступает. Долг выносят серебром.", "The head yields. The debt is brought out in silver."), effects: [fx.xp(35), fx.skill("persuasion", 3), fx.faction("orthodox-alliance", 4)], next: "return" }, failure: { text: t("Вас выставляют за ворота.", "You are shown out of the gate."), effects: [fx.rep(-3)], fail: true } },
            { id: "stand", text: t("Встать и ждать, пока он кончит", "Stand and wait until he is done"), check: check(["willpower"], 12, 0, { skill: "martial-arts" }), success: { text: t("Молчание оказывается убедительнее слов.", "Silence proves more convincing than words."), effects: [fx.xp(30), fx.skill("martial-arts", 3)], next: "return" }, failure: { text: t("Охрана принимает ожидание за угрозу.", "The guards take the waiting for a threat."), effects: [fx.health(-15)], fail: true } }
          ]
        },
        {
          id: "return",
          text: t("Серебро на столе. Союз ждёт ответа.", "The silver is on the table. The Alliance waits for an answer."),
          choices: [
            { id: "alliance", text: t("Отвезти долг Союзу", "Take the debt to the Alliance"), success: { text: t("Союз закрывает книгу. Ваше имя остаётся в ней.", "The Alliance closes the book. Your name stays in it."), effects: [fx.xp(30), fx.faction("orthodox-alliance", 6), fx.wealth(15), fx.rep(3)], complete: true } },
            { id: "share", text: t("Разделить серебро с Сектой нищих", "Split the silver with the Beggars' Sect"), success: { text: t("Половина уходит нищим. Союз получит меньше, но дорога запомнит щедрость.", "Half goes to the beggars. The Alliance gets less, but the road remembers the generosity."), effects: [fx.xp(20), fx.faction("beggars-sect", 6), fx.faction("orthodox-alliance", 2), fx.karma(4)], complete: true } }
          ]
        }
      ]
    },
    {
      id: "mu.shrine-debt",
      placeId: "mu.iron-shrine",
      requires: ["mu.river-debt"],
      name: t("Долг клинка", "The blade's debt"),
      text: t("Настоятель кумирни собрал долги всех трёх школ. Союз хочет знать, кому он служит.", "The shrine keeper has collected the debts of all three schools. The Alliance wants to know whom he serves."),
      minAge: 19,
      steps: [
        {
          id: "gate",
          text: t("У ворот кумирни лежат клинки без имён.", "Nameless blades lie at the shrine gate."),
          choices: [
            { id: "bow", text: t("Поклониться клинкам", "Bow to the blades"), check: check(["charisma"], 12, 0, { skill: "martial-arts" }), success: { text: t("Настоятель отворяет ворота.", "The keeper opens the gate."), effects: [fx.xp(10), fx.rep(2)], next: "hall" }, failure: { text: t("Клинки остаются немы. Вас не пускают.", "The blades stay silent. You are not admitted."), effects: [fx.meter("qi-deviation", 3)], fail: true } },
            { id: "name", text: t("Назвать союз, который послал вас", "Name the alliance that sent you"), requires: [when.faction("orthodox-alliance", 15)], success: { text: t("Настоятель кланяется и пропускает во двор.", "The keeper bows and lets you into the yard."), effects: [fx.faction("orthodox-alliance", 3)], next: "hall" } }
          ]
        },
        {
          id: "hall",
          text: t("Настоятель раскладывает долговые дощечки. Одна подписана вашим именем.", "The keeper lays out debt tablets. One bears your name."),
          choices: [
            { id: "truth", text: t("Потребовать правды", "Demand the truth"), check: check(["wisdom"], 13, 0, { skill: "inner-cultivation" }), success: { text: t("Настоятель говорит, кто собрал долги в одну книгу.", "The keeper says who gathered the debts into one book."), effects: [fx.xp(35), fx.skill("inner-cultivation", 4)], next: "choice" }, failure: { text: t("Слова срываются в ци. Вас выносят во двор.", "Your words break into qi. They carry you into the yard."), effects: [fx.health(-15), fx.meter("qi-deviation", 5)], fail: true } },
            { id: "blade", text: t("Положить руку на клинок", "Lay your hand on the blade"), check: check(["agility"], 13, 0, { skill: "lightness" }), success: { text: t("Клинок выходит из ножен без звука. Настоятель отступает.", "The blade leaves its sheath without a sound. The keeper steps back."), effects: [fx.xp(30), fx.skill("lightness", 4)], next: "choice" }, failure: { text: t("Клинок режет ладонь. Долг остаётся долгом.", "The blade cuts your palm. The debt remains a debt."), effects: [fx.health(-20)], fail: true } }
          ]
        },
        {
          id: "choice",
          text: t("Настоятель ждёт, какую печать поставить на долг.", "The keeper waits for you to seal the debt."),
          choices: [
            { id: "alliance", text: t("Отдать долг Союзу", "Give the debt to the Alliance"), success: { text: t("Союз принимает книгу. Настоятель больше не кланяется вам.", "The Alliance takes the book. The keeper no longer bows to you."), effects: [fx.xp(30), fx.faction("orthodox-alliance", 7), fx.rep(4), fx.wealth(10)], complete: true } },
            { id: "burn", text: t("Сжечь дощечки", "Burn the tablets"), success: { text: t("Вы берёте одну дощечку — ту, что подписана вашим именем, — и только потом подносите огонь. Огонь съедает имена. Нищие и демонический культ запомнят это по-разному.", "You take one tablet — the one bearing your name — before putting the rest to the fire. Fire eats the names. The beggars and the demonic cult will remember it differently."), effects: [fx.xp(20), fx.faction("beggars-sect", 4), fx.faction("demonic-cult", 3), fx.meter("qi-deviation", -3), fx.karma(3), fx.relic("iron-shrine-tablet")], complete: true } }
          ]
        }
      ]
    },
    {
      id: "mu.nameless-blade",
      placeId: "mu.sword-grave",
      requires: ["mu.shrine-debt"],
      name: t("Безымянный клинок", "The nameless blade"),
      text: t("Хранитель кумирни, у которого сгорело имя, стережёт могилу клинков. Один из них начал звать его по ночам.", "The shrine keeper whose name burned with the tablets guards the grave of swords. One of them has begun calling him at night."),
      minAge: 19,
      steps: [
        {
          id: "arrival",
          text: t("В долине из земли торчат рукояти. Хранитель сидит между ними и не поднимает головы.", "Hilts stand out of the earth across the valley. The keeper sits among them and does not raise his head."),
          choices: [
            { id: "bow", text: t("Поклониться клинкам и хранителю", "Bow to the blades and the keeper"), success: { text: t("Он отвечает на поклон и освобождает место у ближнего клинка.", "He returns the bow and makes room by the nearest blade."), effects: [fx.xp(10), fx.rep(2)], next: "talk" } }
          ]
        },
        {
          id: "talk",
          text: t("Хранитель говорит, что имя его сгорело вместе с дощечками. Клинки помнят имена лучше людей, и один из них зовёт его каждую ночь.", "The keeper says his name burned with the tablets. Blades remember names better than people, and one of them calls him every night."),
          choices: [
            { id: "listen", text: t("Слушать клинок вместе с ним", "Listen to the blade with him"), check: check(["wisdom"], 13, 0, { skill: "inner-cultivation" }), success: { text: t("В звоне железа слышится слог. Хранитель вздрагивает: это начало его имени.", "A syllable sounds in the ring of iron. The keeper flinches: it is the beginning of his name."), effects: [fx.xp(20), fx.skill("inner-cultivation", 2)], next: "test" }, failure: { text: t("Звон идёт по меридианам не туда. Вас выносит на край долины.", "The ring runs the wrong way through your meridians. You are carried to the valley's edge."), effects: [fx.health(-10), fx.meter("qi-deviation", 4)], fail: true } },
            { id: "debt", text: t("Назвать долг, который привёл вас сюда", "Name the debt that brought you here"), requires: [when.faction("orthodox-alliance", 15)], success: { text: t("Хранитель кивает: Союз всё ещё помнит кумирню. Он разрешает пройти к клинку.", "The keeper nods: the Alliance still remembers the shrine. He lets you pass to the blade."), effects: [fx.xp(15), fx.faction("orthodox-alliance", 3)], next: "test" } }
          ]
        },
        {
          id: "test",
          text: t("Клинок выходит из земли на ладонь и поёт имя. Чтобы услышать его целиком, нужно пройти ряд, не обнажая стали.", "The blade rises a hand's width from the earth and sings a name. To hear it whole, one must walk the row without drawing steel."),
          choices: [
            { id: "walk", text: t("Пройти между клинками", "Walk between the blades"), check: check(["willpower", "agility"], 14, 0, { skill: "lightness" }), success: { text: t("Ни один клинок не поднимается против вас. Имя звучит целиком и остаётся в воздухе.", "No blade rises against you. The name sounds whole and stays in the air."), effects: [fx.xp(40), fx.skill("lightness", 3)], next: "choice" }, failure: { text: t("Один клинок всё-таки выходит из земли. Вы уходите с порезом от плеча до локтя.", "One blade leaves the earth after all. You walk away with a cut from shoulder to elbow."), effects: [fx.health(-20), fx.meter("qi-deviation", 5)], fail: true } },
            { id: "pull", text: t("Выдернуть клинок и заставить его замолчать", "Pull the blade and make it silent"), check: check(["strength"], 14, 0, { skill: "martial-arts" }), success: { text: t("Клинок выходит с одного рывка. Имя остаётся на лезвии, как насечка.", "The blade comes free in one pull. The name stays on the steel like a notch."), effects: [fx.xp(35), fx.skill("martial-arts", 3)], next: "choice" }, failure: { text: t("Клинок не поддаётся. Отдача бьёт в ладони и в грудь.", "The blade will not yield. The recoil strikes your palms and chest."), effects: [fx.health(-20)], fail: true } }
          ]
        },
        {
          id: "choice",
          text: t("Хранитель держит клинок и ждёт, кому его отдать.", "The keeper holds the blade and waits to hear whose it will be."),
          choices: [
            { id: "alliance", text: t("Отдать клинок Праведному союзу", "Give the blade to the Orthodox Alliance"), success: { text: t("Союз принимает клинок и записывает хранителя в свидетели. Имя остаётся у них, а не у него.", "The Alliance takes the blade and writes the keeper down as a witness. The name stays with them, not with him."), effects: [fx.xp(30), fx.faction("orthodox-alliance", 7), fx.rep(4), fx.wealth(15)], complete: true } },
            { id: "nameless", text: t("Оставить клинок безымянным и вернуть имя хранителю", "Leave the blade nameless and give the keeper his name back"), requires: [when.relic("iron-shrine-tablet")], success: { text: t("Вы переворачиваете железную дощечку и вписываете на обороте имя, которое пропел клинок. Хранитель берёт клинок и впервые слышит своё имя — не ваше. Нищие запомнят, Союз — нет.", "You turn the iron tablet over and write on its back the name the blade sang. The keeper takes the blade and hears his own name for the first time — not yours. The beggars will remember; the Alliance will not."), effects: [fx.xp(40), fx.meter("qi-deviation", -6), fx.faction("beggars-sect", 4), fx.karma(4), fx.skill("martial-arts", 3)], complete: true } }
          ]
        }
      ]
    }
  ],
  xianxia: [
    {
      id: "xi.forbidden",
      placeId: "xi.forbidden-path",
      name: t("Тропа за пиком", "The path beyond the peak"),
      text: t("За дальним пиком видели духовного зверя. Старейшины запретили ходить туда внешним ученикам.", "A spirit beast was seen beyond the far peak. The elders forbade outer disciples to go there."),
      minAge: 16,
      steps: [
        {
          id: "gate",
          text: t("У начала тропы стоит стела с запретом.", "A stele with the prohibition stands at the start of the path."),
          choices: [
            { id: "read", text: t("Прочитать запрет и запомнить тропу", "Read the prohibition and memorise the path"), success: { text: t("Стела описывает тропу точнее, чем запрещает её.", "The stele describes the path more precisely than it forbids it."), effects: [fx.xp(15), fx.skill("cultivation", 2)], next: "beast" } }
          ]
        },
        {
          id: "beast",
          text: t("У источника сидит зверь из ци. Он не нападает первым.", "A beast of qi sits by the spring. It does not attack first."),
          choices: [
            { id: "calm", text: t("Успокоить зверя сердцем Дао", "Calm the beast with the Dao heart"), check: check(["wisdom", "willpower"], 12, 0, { skill: "cultivation" }), success: { text: t("Зверь пьёт из ваших рук и уходит в гору.", "The beast drinks from your hands and goes up the mountain."), effects: [fx.xp(40), fx.meter("dao-heart", 6), fx.skill("cultivation", 4)], next: "spring" }, failure: { text: t("Ци срывается. Зверь бьёт один раз и исчезает.", "Your qi breaks. The beast strikes once and vanishes."), effects: [fx.health(-20), fx.meter("karmic-debt", 3)], fail: true } },
            { id: "seal", text: t("Запечатать зверя талисманом", "Seal the beast with a talisman"), check: check(["intelligence"], 12, 0, { skill: "talismans" }), success: { text: t("Печать держит. Зверя можно увести в секту.", "The seal holds. The beast can be led back to the sect."), effects: [fx.xp(35), fx.skill("talismans", 4)], next: "spring" }, failure: { text: t("Бумага сгорает. Приходится отступать.", "The paper burns. You have to retreat."), effects: [fx.health(-15)], fail: true } }
          ]
        },
        {
          id: "spring",
          text: t("Источник открыт. Секта узнает об этом в любом случае.", "The spring is open. The sect will learn of it either way."),
          choices: [
            { id: "tell", text: t("Вернуться и доложить старейшинам", "Return and report to the elders"), success: { text: t("Запрет снят лично с вас. Источник остаётся за сектой.", "The prohibition is lifted for you personally. The spring stays with the sect."), effects: [fx.xp(30), fx.faction("cloud-peak", 8), fx.rep(5), fx.ability("thunder-talisman")], complete: true } }
          ]
        }
      ]
    },
    {
      id: "xi.spring-trial",
      placeId: "xi.spirit-spring",
      requires: ["xi.forbidden"],
      name: t("Испытание источника", "The spring's trial"),
      text: t("Старейшины пускают к источнику тех, кто уже ходил за пик. Вода проверяет сама.", "The elders admit to the spring those who have already walked beyond the peak. The water tests on its own."),
      minAge: 18,
      steps: [
        {
          id: "elder",
          text: t("Старейшина спрашивает, зачем вы вернулись.", "An elder asks why you came back."),
          choices: [
            { id: "answer", text: t("Сказать, что источник звал", "Say the spring called"), success: { text: t("Старейшина кивает и отходит от тропы.", "The elder nods and steps off the path."), effects: [fx.xp(15), fx.faction("cloud-peak", 3)], next: "water" } }
          ]
        },
        {
          id: "water",
          text: t("Вода поднимается выше колен и не пускает дальше.", "The water rises above the knees and will not let you further."),
          choices: [
            { id: "still", text: t("Стоять, пока ци не уляжется", "Stand until your qi settles"), check: check(["willpower", "wisdom"], 13, 0, { skill: "cultivation" }), success: { text: t("Вода опадает. Источник признаёт.", "The water falls back. The spring accepts you."), effects: [fx.xp(40), fx.skill("cultivation", 4), fx.meter("dao-heart", 4)], next: "leave" }, failure: { text: t("Ци рвётся. Вода выталкивает на берег.", "Your qi breaks. The water pushes you onto the bank."), effects: [fx.health(-20)], fail: true } }
          ]
        },
        {
          id: "leave",
          text: t("Старейшина ждёт у тропы и спрашивает, что вы видели.", "The elder waits on the path and asks what you saw."),
          choices: [
            { id: "tell", text: t("Рассказать как было", "Tell it as it was"), success: { text: t("Секта записывает вас в число тех, кого источник принял.", "The sect writes you among those the spring accepted."), effects: [fx.xp(30), fx.faction("cloud-peak", 6), fx.rep(4)], complete: true } },
            { id: "silence", text: t("Промолчать и оставить источник себе", "Stay silent and keep the spring to yourself"), success: { text: t("Старейшина кивает на пустой ответ. Ци в груди гуще, долг перед Небесами — тоже.", "The elder nods at the empty answer. The qi in the chest is thicker, and so is the debt to the Heavens."), effects: [fx.xp(20), fx.track(6), fx.meter("karmic-debt", 5), fx.faction("cloud-peak", -2)], complete: true } }
          ]
        }
      ]
    },
    {
      id: "xi.star-trial",
      placeId: "xi.star-well",
      requires: ["xi.spring-trial"],
      name: t("Испытание звёздного колодца", "The star well's trial"),
      text: t("Старейшины говорят, что колодец открывается раз в поколение. Вода уже поднялась.", "The elders say the well opens once in a generation. The water has already risen."),
      minAge: 20,
      steps: [
        {
          id: "rim",
          text: t("На краю колодца стоит старейшина с пустой чашей.", "An elder stands at the well's rim with an empty cup."),
          choices: [
            { id: "cup", text: t("Принять чашу", "Accept the cup"), check: check(["willpower"], 13, 0, { skill: "cultivation" }), success: { text: t("Чаша наполняется сама. Вода пахнет грозой.", "The cup fills itself. The water smells of storm."), effects: [fx.xp(15)], next: "water" }, failure: { text: t("Чаша выскальзывает. Старейшина качает головой.", "The cup slips. The elder shakes their head."), effects: [fx.health(-10), fx.meter("karmic-debt", 3)], fail: true } },
            { id: "ask", text: t("Спросить, что в чаше", "Ask what is in the cup"), check: check(["intelligence"], 12, 0, { skill: "alchemy" }), success: { text: t("Старейшина называет воду по имени. Вы запоминаете.", "The elder names the water. You remember it."), effects: [fx.xp(10), fx.skill("alchemy", 2)], next: "water" }, failure: { text: t("Ответа нет. Вода в чаше темнеет.", "There is no answer. The water in the cup darkens."), effects: [fx.meter("karmic-debt", 2)], fail: true } }
          ]
        },
        {
          id: "water",
          text: t("В отражении воды стоит кто-то с вашим лицом.", "Someone with your face stands in the water's reflection."),
          choices: [
            { id: "drink", text: t("Выпить отражение", "Drink the reflection"), check: check(["willpower"], 14, 0, { skill: "cultivation" }), success: { text: t("Вода входит в меридианы. Дао-сердце бьётся ровнее.", "The water enters your meridians. The Dao heart beats steadier."), effects: [fx.xp(40), fx.meter("dao-heart", 6)], next: "choice" }, failure: { text: t("Отражение смеётся. Вас находят на камнях.", "The reflection laughs. They find you on the stones."), effects: [fx.health(-20), fx.meter("karmic-debt", 5)], fail: true } },
            { id: "seal", text: t("Запечатать воду талисманом", "Seal the water with a talisman"), check: check(["intelligence"], 14, 0, { skill: "talismans" }), success: { text: t("Бумага ложится на воду и не тонет.", "The paper lies on the water and does not sink."), effects: [fx.xp(35), fx.skill("talismans", 4)], next: "choice" }, failure: { text: t("Талисман сгорает. Вода поднимается до края.", "The talisman burns. The water rises to the rim."), effects: [fx.health(-15)], fail: true } }
          ]
        },
        {
          id: "choice",
          text: t("Старейшина спрашивает, что вы видели в колодце.", "The elder asks what you saw in the well."),
          choices: [
            { id: "tell", text: t("Рассказать правду", "Tell the truth"), success: { text: t("Секта записывает вас в число тех, кого колодец признал. Чувство неба остаётся с вами.", "The sect writes you among those the well acknowledged. The sense of the sky stays with you."), effects: [fx.xp(30), fx.faction("cloud-peak", 7), fx.rep(4), fx.ability("spirit-sense")], complete: true } },
            { id: "keep", text: t("Оставить отражение себе", "Keep the reflection"), success: { text: t("Вы прячете чашу с отражением под одеждой и уносите чужое небо в груди. Секта не узнает, но Небеса — да.", "You hide the cup with the reflection under your robe and carry another sky in your chest. The sect will not know, but the Heavens will."), effects: [fx.xp(20), fx.track(8), fx.meter("karmic-debt", 6), fx.faction("cloud-peak", -3), fx.relic("star-well-cup")], complete: true } }
          ]
        }
      ]
    },
    {
      id: "xi.sky-beneath",
      placeId: "xi.mirror-terrace",
      requires: ["xi.star-trial"],
      name: t("Небо под миром", "The sky beneath"),
      text: t("Старейшина Бай ждёт на зеркальной террасе. Его отражение осталось в звёздном колодце много лет назад и теперь поднимается по камню навстречу.", "Elder Bai waits on the mirror terrace. His reflection stayed in the star well years ago and now climbs the stone to meet him."),
      minAge: 20,
      steps: [
        {
          id: "arrival",
          text: t("Камень террасы тёплый, как вода. В нём отражается небо без единой звезды.", "The stone of the terrace is warm as water. It reflects a sky without a single star."),
          choices: [
            { id: "step", text: t("Ступить на террасу и поклониться старейшине", "Step onto the terrace and bow to the elder"), success: { text: t("Бай отвечает на поклон и указывает на своё отражение, стоящее в десяти шагах.", "Bai returns the bow and points to his reflection, standing ten paces away."), effects: [fx.xp(10), fx.faction("cloud-peak", 2)], next: "talk" } }
          ]
        },
        {
          id: "talk",
          text: t("Бай говорит, что колодец показал небо под миром. Он вошёл в него первым и оставил там отражение, чтобы секта получила время. Теперь отражение хочет вернуться.", "Bai says the well showed a sky beneath the world. He entered first and left his reflection there so the sect would have time. Now the reflection wants to return."),
          choices: [
            { id: "listen", text: t("Слушать, что говорит отражение", "Listen to what the reflection says"), check: check(["wisdom", "willpower"], 14, 0, { skill: "cultivation" }), success: { text: t("Отражение говорит голосом Бая, но слова принадлежат небу. Вы понимаете, чего оно просит.", "The reflection speaks in Bai's voice, but the words belong to the sky. You understand what it asks."), effects: [fx.xp(20), fx.skill("cultivation", 2), fx.meter("dao-heart", 4)], next: "test" }, failure: { text: t("Голос заполняет меридианы. Вы приходите в себя у края террасы.", "The voice fills your meridians. You come to at the terrace's edge."), effects: [fx.health(-15), fx.meter("karmic-debt", 4)], fail: true } },
            { id: "elder", text: t("Сослаться на волю старейшин", "Cite the will of the elders"), requires: [when.faction("cloud-peak", 25)], success: { text: t("Бай склоняет голову: воля секты сильнее его собственной. Он отходит от края.", "Bai bows his head: the sect's will is stronger than his own. He steps back from the edge."), effects: [fx.xp(15), fx.faction("cloud-peak", 3)], next: "test" } }
          ]
        },
        {
          id: "test",
          text: t("Отражение стоит на дальнем краю. Камень под ним поднимается, и терраса начинает отражать верхнюю сторону неба.", "The reflection stands at the far edge. The stone rises beneath it, and the terrace begins to reflect the upper side of the sky."),
          choices: [
            { id: "cross", text: t("Пройти по камню, не встречаясь с отражением глазами", "Cross the stone without meeting the reflection's eyes"), check: check(["willpower"], 14, 0, { skill: "cultivation" }), success: { text: t("Вы доходите до края. Отражение отступает на полшага и ждёт.", "You reach the edge. The reflection retreats half a step and waits."), effects: [fx.xp(40), fx.skill("cultivation", 3)], next: "choice" }, failure: { text: t("Взгляд отражения останавливает вас на середине. Камень больше не держит.", "The reflection's gaze stops you halfway. The stone no longer holds."), effects: [fx.health(-20), fx.meter("karmic-debt", 6)], fail: true } },
            { id: "seal", text: t("Закрепить край террасы талисманами", "Fix the terrace's edge with talismans"), check: check(["intelligence"], 13, 0, { skill: "talismans" }), success: { text: t("Четыре бумаги ложатся по углам. Небо под камнем перестаёт подниматься.", "Four papers settle at the corners. The sky beneath the stone stops rising."), effects: [fx.xp(35), fx.skill("talismans", 3)], next: "choice" }, failure: { text: t("Талисманы вспыхивают и обращаются пеплом. Бай оттаскивает вас от края.", "The talismans flare and turn to ash. Bai pulls you back from the edge."), effects: [fx.health(-10)], fail: true } }
          ]
        },
        {
          id: "choice",
          text: t("Бай спрашивает, что делать с небом под миром и с тем, кто его сторожит.", "Bai asks what should be done with the sky beneath the world and the one who guards it."),
          choices: [
            { id: "sect", text: t("Закрыть террасу для секты", "Seal the terrace for the sect"), success: { text: t("Вы ставите печать на камень. Секта получает тихую террасу, Бай — отражение, которое больше не поднимается. Небо под миром остаётся непрочитанным.", "You set the seal on the stone. The sect gains a quiet terrace, Bai a reflection that no longer rises. The sky beneath the world stays unread."), effects: [fx.xp(30), fx.faction("cloud-peak", 7), fx.rep(4), fx.meter("dao-heart", 6)], complete: true } },
            { id: "cup", text: t("Напоить отражение из чаши", "Give the reflection drink from the cup"), requires: [when.relic("star-well-cup")], success: { text: t("Вы поднимаете чашу звёздного колодца. Отражение пьёт и отпускает Бая. Небо под миром закрывается, и долг, который он нёс, гаснет вместе с ним.", "You raise the cup of the star well. The reflection drinks and releases Bai. The sky beneath the world closes, and the debt he carried goes out with it."), effects: [fx.xp(40), fx.meter("dao-heart", 10), fx.meter("karmic-debt", -8), fx.faction("cloud-peak", -2), fx.track(6)], complete: true } }
          ]
        }
      ]
    }
  ],
  hunter: [
    {
      id: "hu.gate-raid",
      placeId: "hu.gate-d",
      name: t("Рейд на Врата D", "The D-rank Gate raid"),
      text: t("Ассоциация набирает группу на Врата у Мапхо. Ранг двери — D, но датчики врут всё чаще.", "The Association is recruiting a party for the Gate at Mapo. The door is rank D, but the sensors lie more often now."),
      minAge: 16,
      steps: [
        {
          id: "briefing",
          text: t("В отделении выдают жетон и схему первого яруса.", "The office issues a token and a map of the first floor."),
          choices: [
            { id: "take", text: t("Взять жетон", "Take the token"), success: { text: t("Жетон на шее, схема в кармане.", "The token is around your neck, the map in a pocket."), effects: [fx.faction("association", 3), fx.xp(10)], next: "floor" } }
          ]
        },
        {
          id: "floor",
          text: t("На первом ярусе датчики замолкают. Впереди — страж Врат.", "On the first floor the sensors go quiet. Ahead is the Gate's guardian."),
          choices: [
            { id: "fight", text: t("Принять бой", "Take the fight"), check: check(["strength", "agility"], 12, 0, { skill: "dungeon-combat" }), success: { text: t("Страж падает. Кристалл ещё тёплый.", "The guardian falls. The crystal is still warm."), effects: [fx.xp(45), fx.skill("dungeon-combat", 4), fx.meter("gate-threat", -8)], next: "core" }, failure: { text: t("Страж сильнее оценки. Группа вытаскивает вас к выходу.", "The guardian is above its rating. The party drags you to the exit."), effects: [fx.health(-30)], fail: true } },
            { id: "kite", text: t("Увести стража от группы", "Draw the guardian off the party"), check: check(["agility"], 13), success: { text: t("Страж идёт за вами, группа бьёт в спину.", "The guardian follows you and the party hits it from behind."), effects: [fx.xp(35), fx.skill("athletics", 3)], next: "core" }, failure: { text: t("Страж быстрее. Приходится отступать всем вместе.", "The guardian is faster. Everyone has to pull back."), effects: [fx.health(-20)], fail: true } }
          ]
        },
        {
          id: "core",
          text: t("Ядро Врат трескается. Добычу нужно зарегистрировать в Ассоциации.", "The Gate's core cracks. The loot has to be registered with the Association."),
          choices: [
            { id: "register", text: t("Сдать добычу по правилам", "Register the loot by the rules"), success: { text: t("Врата закрыты, доля переведена, имя — в сводке города.", "The Gate is closed, the share is paid, the name is in the city report."), effects: [fx.xp(30), fx.wealth(30), fx.meter("fame", 8), fx.rep(4)], complete: true } }
          ]
        }
      ]
    },
    {
      id: "hu.gate-c",
      placeId: "hu.association",
      requires: ["hu.gate-raid"],
      name: t("Врата рангом выше", "A Gate above its rank"),
      text: t("Ассоциация поднимает оценку Врат у Мапхо. Жетон D больше не пускает внутрь.", "The Association raises the rating of the Gate at Mapo. A D token no longer lets anyone in."),
      minAge: 18,
      steps: [
        {
          id: "desk",
          text: t("Клерк Ассоциации смотрит на старый жетон и качает головой.", "The Association clerk looks at the old token and shakes their head."),
          choices: [
            { id: "upgrade", text: t("Попросить жетон рангом выше", "Ask for a higher token"), success: { text: t("Жетон меняют. Схема Врат — новая.", "The token is exchanged. The Gate map is a new one."), effects: [fx.faction("association", 3), fx.xp(10)], next: "rift" } }
          ]
        },
        {
          id: "rift",
          text: t("На втором ярусе страж крупнее того, что пал в прошлый раз.", "On the second floor the guardian is larger than the one that fell last time."),
          choices: [
            { id: "fight", text: t("Принять бой", "Take the fight"), check: check(["strength", "agility"], 13, 0, { skill: "dungeon-combat" }), success: { text: t("Страж падает. Кристалл тяжелее прежнего.", "The guardian falls. The crystal is heavier than the last."), effects: [fx.xp(45), fx.skill("dungeon-combat", 4), fx.meter("gate-threat", -6)], next: "register" }, failure: { text: t("Группа вытаскивает вас к барьеру.", "The party drags you back to the barrier."), effects: [fx.health(-25)], fail: true } }
          ]
        },
        {
          id: "register",
          text: t("Клерк взвешивает кристалл и открывает книгу.", "The clerk weighs the crystal and opens the book."),
          choices: [
            { id: "sign", text: t("Сдать добычу по правилам", "Register the loot by the rules"), success: { text: t("Доля переведена, ранг в книге поднят на строку.", "The share is paid and the rank in the book moves up a line."), effects: [fx.xp(30), fx.wealth(30), fx.meter("fame", 6), fx.rep(3)], complete: true } },
            { id: "quiet", text: t("Сдать кристалл без имени", "Turn in the crystal without a name"), success: { text: t("Клерк принимает кристалл и не спрашивает жетон. Славы нет, доля меньше, угроза Врат падает тише.", "The clerk takes the crystal and does not ask for the token. There is no fame, the share is smaller, and the Gate threat falls more quietly."), effects: [fx.xp(20), fx.wealth(12), fx.meter("gate-threat", -6), fx.meter("fame", -2)], complete: true } }
          ]
        }
      ]
    },
    {
      id: "hu.red-gate-raid",
      placeId: "hu.red-gate",
      requires: ["hu.gate-c"],
      name: t("Рейд на Красные Врата", "The Red Gate raid"),
      text: t("Ассоциация собирает группу вне книги. Официально рейда не будет.", "The Association is assembling a party off the books. Officially there will be no raid."),
      minAge: 20,
      steps: [
        {
          id: "briefing",
          text: t("В подземном гараже ждут четверо без жетонов.", "Four people without tokens wait in the underground garage."),
          choices: [
            { id: "join", text: t("Сесть в машину", "Get in the car"), success: { text: t("Двигатель заводится. Никто не спрашивает вашего ранга.", "The engine starts. No one asks your rank."), effects: [fx.xp(10), fx.faction("association", 2)], next: "rift" } },
            { id: "ask", text: t("Спросить, кто отдал приказ", "Ask who gave the order"), check: check(["charisma"], 12), success: { text: t("Водитель называет имя, которого нет в списках.", "The driver names someone who is not on any list."), effects: [fx.xp(15)], next: "rift" }, failure: { text: t("Вас высаживают у обочины. Слухи о рейде остаются.", "They drop you at the curb. Rumours of the raid remain."), effects: [fx.meter("fame", -2)], fail: true } }
          ]
        },
        {
          id: "rift",
          text: t("За барьером воздух режет лёгкие. Страж смотрит на вас человеческими глазами.", "Beyond the barrier the air cuts the lungs. The guardian looks at you with human eyes."),
          choices: [
            { id: "fight", text: t("Принять бой", "Take the fight"), check: check(["strength", "agility"], 14, 0, { skill: "dungeon-combat" }), success: { text: t("Страж падает. Ядро Врат обнажается.", "The guardian falls. The Gate's core is exposed."), effects: [fx.xp(45), fx.skill("dungeon-combat", 4), fx.meter("gate-threat", -8)], next: "core" }, failure: { text: t("Страж ломает строй. Вас вытаскивают через барьер.", "The guardian breaks the line. They drag you back through the barrier."), effects: [fx.health(-30)], fail: true } },
            { id: "talk", text: t("Заговорить со стражем", "Speak to the guardian"), check: check(["wisdom"], 13, 0, { skill: "mana-control" }), success: { text: t("Страж опускает руки. В его глазах мелькает узнавание.", "The guardian lowers its hands. Recognition flickers in its eyes."), effects: [fx.xp(35), fx.skill("mana-control", 4)], next: "core" }, failure: { text: t("Страж не слышит. Удар отбрасывает вас к барьеру.", "The guardian does not hear. The blow throws you against the barrier."), effects: [fx.health(-20), fx.meter("gate-threat", 5)], fail: true } }
          ]
        },
        {
          id: "core",
          text: t("Ядро Врат пульсирует в такт вашему сердцу. Ассоциация ждёт звонка.", "The Gate's core pulses in time with your heart. The Association waits for a call."),
          choices: [
            { id: "report", text: t("Сообщить в Ассоциацию", "Report to the Association"), success: { text: t("Ассоциация закрывает Врата, вычёркивает рейд из всех отчётов и позволяет вам оставить осколок ядра.", "The Association seals the Gate, strikes the raid from every report, and lets you keep a shard of the core."), effects: [fx.xp(30), fx.wealth(40), fx.faction("association", 6), fx.meter("fame", 8), fx.rep(4), fx.relic("red-gate-core")], complete: true } },
            { id: "corp", text: t("Позвонить в Хансон", "Call Hanseong"), success: { text: t("Хансон платит вдвое и забирает ядро. В сводке Ассоциации Врата всё ещё открыты.", "Hanseong pays double and takes the core. In the Association's report the Gate is still open."), effects: [fx.xp(20), fx.wealth(60), fx.faction("hanseong-corp", 7), fx.meter("fame", -4)], complete: true } }
          ]
        }
      ]
    },
    {
      id: "hu.gate-remembers",
      placeId: "hu.gate-zero",
      requires: ["hu.red-gate-raid"],
      name: t("Врата помнят", "The Gate remembers"),
      text: t("Инспектор Со из Ассоциации стережёт Нулевые Врата. Каждую ночь они заново проигрывают рейд на Красные Врата — с теми же голосами и теми же телами.", "Association inspector Seo watches Gate Zero. Every night it replays the Red Gate raid — with the same voices and the same bodies."),
      minAge: 20,
      steps: [
        {
          id: "arrival",
          text: t("На платформе пахнет озоном. Инспектор Со стоит у барьера с планшетом, на котором нет ни одной записи.", "The platform smells of ozone. Inspector Seo stands by the barrier with a tablet that holds no records at all."),
          choices: [
            { id: "show", text: t("Назвать себя и показать старый жетон", "Give your name and show the old token"), success: { text: t("Со сверяет жетон с памятью, а не с базой, и отступает от барьера.", "Seo checks the token against memory rather than the database and steps away from the barrier."), effects: [fx.xp(10), fx.faction("association", 2)], next: "talk" } }
          ]
        },
        {
          id: "talk",
          text: t("Со говорит, что её брат был в первом рейде на Красные Врата. Врата отвечают его голосом, а отчёт Ассоциации утверждает, что не выжил никто. Она просит войти и понять, помнят Врата или копируют.", "Seo says her brother was in the first Red Gate raid. The Gate answers in his voice, while the Association's report says no one survived. She asks you to go in and learn whether the Gate remembers or copies."),
          choices: [
            { id: "listen", text: t("Слушать запись вместе с ней", "Listen to the recording with her"), check: check(["wisdom"], 13, 0, { skill: "mana-control" }), success: { text: t("Под помехами слышен второй голос — не брата, а самой Со. Запись сделана до её рождения.", "Beneath the static is a second voice — not her brother's, but Seo's own. The recording was made before she was born."), effects: [fx.xp(20), fx.skill("mana-control", 2), fx.faction("association", 2)], next: "test" }, failure: { text: t("Голос брата звучит слишком близко. Со выключает запись и выводит вас наверх.", "Her brother's voice sounds too close. Seo cuts the recording and walks you upstairs."), effects: [fx.health(-10), fx.meter("gate-threat", 5)], fail: true } },
            { id: "badge", text: t("Показать допуск Ассоциации", "Show your Association clearance"), requires: [when.faction("association", 20)], success: { text: t("Со просматривает допуск и отдаёт вам ключ от служебного спуска.", "Seo checks the clearance and gives you the key to the service stair."), effects: [fx.xp(15), fx.faction("association", 3)], next: "test" } }
          ]
        },
        {
          id: "test",
          text: t("Нулевые Врата открываются по расписанию. Внутри рейд повторяется с начала, и ядро записи находится там, где в прошлый раз стоял страж.", "Gate Zero opens on schedule. Inside, the raid starts over, and the recording core stands where the guardian stood last time."),
          choices: [
            { id: "enter", text: t("Войти и пробиться к ядру", "Enter and fight through to the core"), check: check(["strength", "agility"], 14, 0, { skill: "dungeon-combat" }), success: { text: t("Страж падает так же, как в прошлый раз. Ядро остаётся тёплым под ладонью.", "The guardian falls the same way as last time. The core stays warm under your palm."), effects: [fx.xp(40), fx.skill("dungeon-combat", 3), fx.meter("gate-threat", -5)], next: "choice" }, failure: { text: t("Петля начинается заново. Вас выносит на платформу вместе с прибывшей группой.", "The loop starts over. You are carried onto the platform with the arriving party."), effects: [fx.health(-25)], fail: true } },
            { id: "trace", text: t("Проследить сигнал ядра снаружи", "Trace the core's signal from outside"), check: check(["intelligence"], 14, 0, { skill: "lore" }), success: { text: t("Сигнал ведёт не вглубь, а вверх: ядро закреплено под потолком платформы.", "The signal leads not deeper but up: the core is fixed beneath the platform ceiling."), effects: [fx.xp(35), fx.skill("lore", 3)], next: "choice" }, failure: { text: t("Сигнал обрывается, едва вы его находите. Барьер отвечает вспышкой.", "The signal cuts out as soon as you find it. The barrier answers with a flare."), effects: [fx.health(-15), fx.meter("gate-threat", 5)], fail: true } }
          ]
        },
        {
          id: "choice",
          text: t("Ядро в руках. Со ждёт у барьера, а Ассоциация ждёт доклада.", "The core is in your hands. Seo waits at the barrier, and the Association waits for a report."),
          choices: [
            { id: "report", text: t("Закрыть Врата по протоколу", "Close the Gate by protocol"), success: { text: t("Вы сдаёте ядро и подписываете отчёт. Нулевые Врата гаснут, запись уходит в архив, а голос брата Со больше не звучит.", "You hand over the core and sign the report. Gate Zero goes dark, the recording goes to the archive, and Seo's brother's voice is heard no more."), effects: [fx.xp(30), fx.faction("association", 7), fx.meter("fame", 6), fx.rep(4), fx.wealth(20)], complete: true } },
            { id: "remember", text: t("Вернуть ядро Вратам и записать имена", "Return the core to the Gate and record the names"), requires: [when.relic("red-gate-core")], success: { text: t("Вы вставляете осколок ядра в приёмник. Голоса замолкают, а на экране остаются имена — все, включая брата Со. Ассоциация получает отчёт, который не сможет вычеркнуть.", "You set the core's shard into the receiver. The voices fall silent, and names remain on the screen — all of them, including Seo's brother. The Association receives a report it cannot strike out."), effects: [fx.xp(40), fx.meter("gate-threat", -12), fx.karma(6), fx.rep(5), fx.faction("association", 3)], complete: true } }
          ]
        }
      ]
    }
  ],
  academy: [
    {
      id: "ac.court-errand",
      placeId: "ac.court-stair",
      name: t("Поручение двора", "An errand of the court"),
      text: t("Секретарь дворца ищет того, кто отнесёт письмо и вернётся с ответом. Имя поручителя не называют.", "A palace secretary seeks someone to carry a letter and return with the answer. The patron's name is not given."),
      minAge: 16,
      steps: [
        {
          id: "stair",
          text: t("У лестницы гвардеец сверяет приглашения.", "At the stair a guard checks invitations."),
          choices: [
            { id: "favor", text: t("Сослаться на милость двора", "Cite the court's favour"), requires: [when.meter("court-favor", 25)], success: { text: t("Гвардеец пропускает без письма.", "The guard lets you through without a letter."), effects: [fx.meter("court-favor", 2)], next: "letter" } },
            { id: "manner", text: t("Поклониться так, как кланяются свои", "Bow the way the court's own bow"), check: check(["charisma"], 12, 0, { skill: "etiquette" }), success: { text: t("Поклон принят. Вас проводят наверх.", "The bow is accepted. You are shown upstairs."), effects: [fx.xp(15), fx.skill("etiquette", 2)], next: "letter" }, failure: { text: t("Гвардеец указывает на чёрный ход.", "The guard points you to the servants' door."), effects: [fx.meter("scandal", 3)], fail: true } }
          ]
        },
        {
          id: "letter",
          text: t("В галерее вас останавливает дуэлянт: письмо, говорит он, должны были отдать ему.", "In the gallery a duellist stops you: the letter, he says, was meant for him."),
          choices: [
            { id: "duel", text: t("Ответить по кодексу", "Answer by the code"), check: check(["agility"], 12, 0, { skill: "duelling" }), success: { text: t("Укол в перчатку. Дуэлянт уступает письмо.", "A touch to the glove. The duellist yields the letter."), effects: [fx.xp(40), fx.skill("duelling", 4), fx.rep(4)], next: "answer" }, failure: { text: t("Первый же выпад не ваш. Письмо приходится отдать.", "The first pass is not yours. The letter has to be given up."), effects: [fx.health(-15), fx.meter("scandal", 4)], fail: true } },
            { id: "words", text: t("Отговорить его при свидетелях", "Talk him down before witnesses"), check: check(["charisma", "intelligence"], 12), success: { text: t("Галерея слышит отказ. Дуэлянт уходит один.", "The gallery hears the refusal. The duellist leaves alone."), effects: [fx.xp(30), fx.meter("court-favor", 4)], next: "answer" }, failure: { text: t("Спор кончается шумом. Письмо теряется в давке.", "The argument ends in noise. The letter is lost in the crush."), effects: [fx.meter("scandal", 5)], fail: true } }
          ]
        },
        {
          id: "answer",
          text: t("Секретарь принимает ответ и спрашивает, кому записать заслугу.", "The secretary takes the answer and asks who should be credited."),
          choices: [
            { id: "court", text: t("Попросить записать на ваше имя", "Ask to have it written in your name"), success: { text: t("Имя ложится в книгу поручений. Двор запомнит.", "The name goes into the book of errands. The court will remember."), effects: [fx.xp(30), fx.faction("imperial-court", 8), fx.meter("court-favor", 6), fx.wealth(20)], complete: true } }
          ]
        }
      ]
    },
    {
      id: "ac.second-favour",
      placeId: "ac.duelling-yard",
      requires: ["ac.court-errand"],
      name: t("Чужая дуэль", "Someone else's duel"),
      text: t("Двор просит второе: на дуэльном дворе сходятся двое, и письмо снова не должно дойти.", "The court asks a second thing: two people meet in the duelling yard, and a letter must again not arrive."),
      minAge: 18,
      steps: [
        {
          id: "yard",
          text: t("Секундант спрашивает, чью сторону вы держите.", "A second asks whose side you take."),
          choices: [
            { id: "court", text: t("Сказать, что пришли от двора", "Say you came from the court"), success: { text: t("Вас ставят у барьера, где всё видно.", "You are placed by the barrier, where everything can be seen."), effects: [fx.xp(10), fx.faction("imperial-court", 3)], next: "sand" } }
          ]
        },
        {
          id: "sand",
          text: t("Один из дуэлянтов срывает кодекс и идёт на вас.", "One duellist breaks the code and comes at you."),
          choices: [
            { id: "blade", text: t("Ответить шпагой", "Answer with the rapier"), check: check(["agility"], 13, 0, { skill: "duelling" }), success: { text: t("Укол в плечо. Дуэлянт роняет письмо.", "A touch to the shoulder. The duellist drops the letter."), effects: [fx.xp(40), fx.skill("duelling", 4), fx.rep(3)], next: "book" }, failure: { text: t("Первый выпад не ваш. Письмо уносят.", "The first pass is not yours. The letter is carried off."), effects: [fx.health(-15), fx.meter("scandal", 3)], fail: true } },
            { id: "stop", text: t("Остановить дуэль словом", "Stop the duel with a word"), check: check(["charisma"], 13, 0, { skill: "etiquette" }), success: { text: t("Двор слышит отказ. Оба опускают шпаги.", "The court hears the refusal. Both lower their rapiers."), effects: [fx.xp(30), fx.skill("etiquette", 3), fx.meter("court-favor", 4)], next: "book" }, failure: { text: t("Слово тонет в шуме. Дуэль кончается без вас.", "The word is lost in the noise. The duel ends without you."), effects: [fx.meter("scandal", 4)], fail: true } }
          ]
        },
        {
          id: "book",
          text: t("Секретарь открывает книгу поручений на вашей строке.", "The secretary opens the book of errands at your line."),
          choices: [
            { id: "sign", text: t("Поставить вторую отметку", "Make the second mark"), success: { text: t("Вторая отметка ложится под первой. Двор отличает тех, кто приходит дважды.", "The second mark goes under the first. The court tells apart those who come twice."), effects: [fx.xp(30), fx.faction("imperial-court", 6), fx.meter("court-favor", 4), fx.wealth(15)], complete: true } },
            { id: "rose", text: t("Отдать заслугу Обществу Розы", "Give the credit to the Rose Society"), success: { text: t("Секретарь вычёркивает строку. Роза запоминает тех, кто умеет не светиться.", "The secretary strikes the line. The Rose remembers those who know how not to shine."), effects: [fx.xp(20), fx.faction("rose-society", 6), fx.meter("court-favor", -3), fx.meter("scandal", -4)], complete: true } }
          ]
        }
      ]
    },
    {
      id: "ac.star-chart",
      placeId: "ac.observatory",
      requires: ["ac.second-favour"],
      name: t("Звёздная карта", "The star chart"),
      text: t("Ректор просит доставить карту в обсерваторию, не показав её ни Магической башне, ни Розе.", "The rector asks you to deliver a chart to the observatory without showing it to the Mage Tower or the Rose."),
      minAge: 20,
      steps: [
        {
          id: "gate",
          text: t("У входа в башню стоят двое: маг в сером и дама с розой.", "Two people stand at the tower door: a mage in grey and a lady with a rose."),
          choices: [
            { id: "tower", text: t("Пройти с меткой Башни", "Pass with the Tower's mark"), requires: [when.faction("magic-tower", 10)], success: { text: t("Маг в сером отступает. Дама с розой делает вид, что не видит вас.", "The mage in grey steps aside. The lady with the rose pretends not to see you."), effects: [fx.faction("magic-tower", 3)], next: "stairs" } },
            { id: "rose", text: t("Пройти с меткой Розы", "Pass with the Rose's mark"), requires: [when.faction("rose-society", 10)], success: { text: t("Дама с розой улыбается. Маг в сером отворачивается.", "The lady with the rose smiles. The mage in grey turns away."), effects: [fx.faction("rose-society", 3)], next: "stairs" } },
            { id: "slip", text: t("Пройти между ними", "Slip between them"), check: check(["charisma"], 13, 0, { skill: "etiquette" }), success: { text: t("Вы говорите каждому то, что он хочет услышать, и входите.", "You tell each what they want to hear and go in."), effects: [fx.xp(15)], next: "stairs" }, failure: { text: t("Оба замечают карту. Сплетня доходит до двора раньше вас.", "Both notice the chart. The rumour reaches the court before you do."), effects: [fx.meter("scandal", 3)], fail: true } }
          ]
        },
        {
          id: "stairs",
          text: t("На середине лестницы карта нагревается в руках.", "Halfway up the stair the chart grows warm in your hands."),
          choices: [
            { id: "read", text: t("Прочитать карту", "Read the chart"), check: check(["intelligence"], 13, 0, { skill: "arcana" }), success: { text: t("На карте проступает звезда, которой нет на небе.", "A star appears on the chart that is not in the sky."), effects: [fx.xp(35), fx.skill("arcana", 4)], next: "dome" }, failure: { text: t("Символы вспыхивают. Карта обжигает пальцы, и вас слышат внизу.", "The symbols flare. The chart burns your fingers, and they hear you below."), effects: [fx.health(-10), fx.meter("scandal", 4)], fail: true } },
            { id: "guard", text: t("Не смотреть и идти дальше", "Do not look and keep walking"), check: check(["willpower"], 13, 0, { skill: "arcana" }), success: { text: t("Соблазн остаётся позади. Карта остывает.", "The temptation stays behind. The chart cools."), effects: [fx.xp(30)], next: "dome" }, failure: { text: t("Вы всё-таки смотрите. Лестница кажется длиннее, чем была.", "You look after all. The stair seems longer than it was."), effects: [fx.health(-15)], fail: true } }
          ]
        },
        {
          id: "dome",
          text: t("Ректор ждёт в куполе. На карте не хватает одной звезды.", "The rector waits in the dome. One star is missing from the chart."),
          choices: [
            { id: "court", text: t("Отдать карту двору", "Give the chart to the court"), success: { text: t("Двор принимает карту и не спрашивает о недостающей звезде.", "The court takes the chart and does not ask about the missing star."), effects: [fx.xp(30), fx.faction("imperial-court", 7), fx.meter("court-favor", 5), fx.rep(4)], complete: true } },
            { id: "tower", text: t("Отдать карту Магической башне", "Give the chart to the Mage Tower"), success: { text: t("Башня забирает карту и снимает для вас копию. Двор запомнит, что звезда пропала не сама.", "The Tower takes the chart and makes you a copy. The court will remember the star did not vanish on its own."), effects: [fx.xp(20), fx.faction("magic-tower", 7), fx.meter("court-favor", -3), fx.meter("scandal", 3), fx.relic("star-chart")], complete: true } }
          ]
        }
      ]
    },
    {
      id: "ac.unwritten-constellation",
      placeId: "ac.rooftop",
      requires: ["ac.star-chart"],
      name: t("Ненаписанное созвездие", "The unwritten constellation"),
      text: t("Ректор Аврелия зовёт на крышу: на пустой карте каждую ночь проступает созвездие, которого нет ни в одном каталоге. Двор и Башня уже спрашивают о нём.", "Rector Aurelia calls you to the roof: every night a constellation appears on a blank chart that is in no catalogue. The court and the Tower are already asking about it."),
      minAge: 20,
      steps: [
        {
          id: "arrival",
          text: t("Винтовая лестница выходит на плоскую крышу. Аврелия стоит у телескопа, но смотрит не в него.", "The spiral stair opens onto a flat roof. Aurelia stands by the telescope but does not look into it."),
          choices: [
            { id: "climb", text: t("Подняться и назвать себя", "Climb up and give your name"), success: { text: t("Она отступает от телескопа и протягивает вам пустой лист, на котором уже проступают точки.", "She steps away from the telescope and hands you a blank sheet on which points are already appearing."), effects: [fx.xp(10), fx.meter("court-favor", 2)], next: "talk" } }
          ]
        },
        {
          id: "talk",
          text: t("Аврелия признаётся: одна звезда на придворной карте была стёрта её рукой, чтобы защитить ученика. Теперь небо пишет её обратно, и ректор не знает, кто из них прав.", "Aurelia admits it: one star on the court chart was scraped away by her own hand to protect a student. Now the sky is writing it back, and the rector does not know which of them is right."),
          choices: [
            { id: "listen", text: t("Выслушать историю до конца", "Hear the story to the end"), check: check(["intelligence", "wisdom"], 13, 0, { skill: "arcana" }), success: { text: t("Она называет имя ученика и показывает, где звезда стояла. На пустом листе появляется та же точка.", "She names the student and shows where the star stood. The same point appears on the blank sheet."), effects: [fx.xp(20), fx.skill("arcana", 2), fx.meter("court-favor", 2)], next: "test" }, failure: { text: t("История путается в именах. Аврелия замолкает и прячет лист.", "The story tangles in its names. Aurelia falls silent and hides the sheet."), effects: [fx.meter("scandal", 4)], fail: true } },
            { id: "council", text: t("Сослаться на решение Башни", "Cite the Tower's ruling"), requires: [when.faction("magic-tower", 15)], success: { text: t("Ректор принимает печать Башни и разрешает записать созвездие под её надзором.", "The rector accepts the Tower's seal and permits the constellation to be recorded under its watch."), effects: [fx.xp(15), fx.faction("magic-tower", 3)], next: "test" } }
          ]
        },
        {
          id: "test",
          text: t("До рассвета созвездие нужно перенести на карту. Чернила не ложатся на точку, пока у звезды нет имени, а имя не пишется без свидетеля.", "Before dawn the constellation must be copied onto the chart. The ink will not take the point until the star has a name, and no name can be written without a witness."),
          choices: [
            { id: "draw", text: t("Чертить по памяти и назвать звезду самому", "Draw from memory and name the star yourself"), check: check(["intelligence"], 14, 0, { skill: "arcana" }), success: { text: t("Линия ложится ровно. Звезда получает имя, которое никто не сможет отнять.", "The line falls true. The star receives a name no one can take away."), effects: [fx.xp(40), fx.skill("arcana", 3)], next: "choice" }, failure: { text: t("Чернила стекают с листа и обжигают пальцы. Крыша начинает светиться.", "The ink runs off the sheet and burns your fingers. The roof begins to glow."), effects: [fx.health(-10), fx.meter("scandal", 3)], fail: true } },
            { id: "wait", text: t("Ждать, пока небо само назовёт звезду", "Wait for the sky to name the star itself"), check: check(["willpower"], 13, 0, { skill: "arcana" }), success: { text: t("Перед самым рассветом точка вспыхивает и гаснет. Имя остаётся у вас в голове.", "Just before dawn the point flares and fades. The name stays in your head."), effects: [fx.xp(35), fx.meter("court-favor", 4)], next: "choice" }, failure: { text: t("Небо молчит до утра. На листе остаётся пустое место.", "The sky stays silent until morning. An empty place remains on the sheet."), effects: [fx.meter("scandal", 4)], fail: true } }
          ]
        },
        {
          id: "choice",
          text: t("Солнце встаёт. Аврелия спрашивает, кому нести карту.", "The sun rises. Aurelia asks who should carry the chart."),
          choices: [
            { id: "court", text: t("Отдать карту двору", "Give the chart to the court"), success: { text: t("Двор принимает карту с новой звездой и записывает ваше имя рядом с именем ректора. Башня получает копию без подписи.", "The court takes the chart with the new star and writes your name beside the rector's. The Tower receives an unsigned copy."), effects: [fx.xp(30), fx.faction("imperial-court", 7), fx.meter("court-favor", 6), fx.rep(4)], complete: true } },
            { id: "unwritten", text: t("Оставить небо ненаписанным", "Leave the sky unwritten"), requires: [when.relic("star-chart")], success: { text: t("Вы прикладываете копию Башни к пустой карте. Недостающая звезда проступает на обоих листах, и Аврелия впервые видит, кому она светила. Двор получает карту без звезды; Башня — с ней.", "You lay the Tower's copy against the blank chart. The missing star appears on both sheets, and Aurelia sees at last whom it shone for. The court gets a chart without the star; the Tower one with it."), effects: [fx.xp(40), fx.faction("magic-tower", 5), fx.meter("scandal", -5), fx.skill("arcana", 4)], complete: true } }
          ]
        }
      ]
    }
  ]
};

export function placesOf(universeId: UniverseId): readonly PlaceDefinition[] {
  return PLACES[universeId];
}

export function adventuresOf(universeId: UniverseId): readonly AdventureDefinition[] {
  return ADVENTURES[universeId];
}

export function findPlace(universeId: UniverseId, id: string): PlaceDefinition | undefined {
  return PLACES[universeId].find((place) => place.id === id);
}

export function findAdventure(universeId: UniverseId, id: string): AdventureDefinition | undefined {
  return ADVENTURES[universeId].find((adventure) => adventure.id === id);
}

function repeated(ids: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) return id;
    seen.add(id);
  }
  return undefined;
}

function blank(text: { ru: string; en: string }): boolean {
  return text.ru.trim().length === 0 || text.en.trim().length === 0;
}

/** Награда ссылается на то, чего в этом мире нет. Пустая строка — ссылка верна */
function brokenEffect(universeId: UniverseId, effect: Effect): string {
  const universe = getUniverse(universeId);
  switch (effect.type) {
    case "ability":
      return universe.abilities.some((item) => item.id === effect.id) ? "" : `способность ${effect.id}`;
    case "skill":
      return findSkill(universe, effect.id) ? "" : `навык ${effect.id}`;
    case "faction":
      return universe.factions.some((item) => item.id === effect.id) ? "" : `фракция ${effect.id}`;
    case "meter":
      return universe.meters.some((item) => item.id === effect.id) ? "" : `шкала ${effect.id}`;
    case "socialClass":
      return universe.socialClasses.some((item) => item.id === effect.id) ? "" : `сословие ${effect.id}`;
    case "profession":
      return findProfession(universe, effect.id) ? "" : `ремесло ${effect.id}`;
    case "education":
      return universe.education.some((item) => item.id === effect.id) ? "" : `образование ${effect.id}`;
    default:
      return "";
  }
}

function outcomeProblems(universeId: UniverseId, adventureId: string, stepId: string, outcome: StepOutcome, steps: ReadonlySet<string>): string[] {
  const where = `${universeId} ${adventureId} ${stepId}`;
  const problems: string[] = [];
  const gates = [outcome.next ? "next" : "", outcome.complete ? "complete" : "", outcome.fail ? "fail" : ""].filter((item) => item.length > 0);
  if (gates.length !== 1) problems.push(`${where}: исход должен вести ровно в одно место`);
  if (outcome.next && (outcome.next === stepId || !steps.has(outcome.next))) problems.push(`${where}: шаг ${outcome.next} не найден`);
  if (blank(outcome.text)) problems.push(`${where}: пустой текст исхода`);
  for (const effect of outcome.effects) {
    const broken = brokenEffect(universeId, effect);
    if (broken) problems.push(`${where}: ${broken} не из этого мира`);
  }
  return problems;
}

/**
 * Проверка описаний приключений. Ничего не меняет и не выдаёт наград.
 * Пустой список — ссылки, id и награды сходятся.
 * Свой список вместо живого — чтобы проверить, что ошибка вообще ловится
 */
export function contentProblems(source?: Readonly<Record<UniverseId, readonly AdventureDefinition[]>>): string[] {
  const problems: string[] = [];
  const allIds: string[] = [];
  for (const universeId of UNIVERSE_IDS) {
    const places = placesOf(universeId);
    const adventures = source?.[universeId] ?? adventuresOf(universeId);
    const placeIds = new Set(places.map((place) => place.id));
    const adventureIds = adventures.map((item) => item.id);
    const repeatedPlace = repeated(places.map((place) => place.id));
    if (repeatedPlace) problems.push(`${universeId}: место ${repeatedPlace} повторяется`);
    const repeatedAdventure = repeated(adventureIds);
    if (repeatedAdventure) problems.push(`${universeId}: приключение ${repeatedAdventure} повторяется`);
    for (const place of places) if (blank(place.name) || blank(place.text)) problems.push(`${universeId}: пустой текст места ${place.id}`);
    for (const adventure of adventures) {
      allIds.push(adventure.id);
      if (!placeIds.has(adventure.placeId)) problems.push(`${adventure.id}: места ${adventure.placeId} нет`);
      for (const required of adventure.requires ?? []) {
        if (required === adventure.id || !adventureIds.includes(required)) problems.push(`${adventure.id}: требует ${required}, которого нет`);
      }
      if (blank(adventure.name) || blank(adventure.text)) problems.push(`${adventure.id}: пустой текст`);
      const stepIds = new Set(adventure.steps.map((step) => step.id));
      const repeatedStep = repeated(adventure.steps.map((step) => step.id));
      if (repeatedStep) problems.push(`${adventure.id}: шаг ${repeatedStep} повторяется`);
      for (const step of adventure.steps) {
        if (blank(step.text)) problems.push(`${adventure.id} ${step.id}: пустой текст`);
        const repeatedChoice = repeated(step.choices.map((choice) => choice.id));
        if (repeatedChoice) problems.push(`${adventure.id} ${step.id}: вариант ${repeatedChoice} повторяется`);
        if (step.choices.length === 0) problems.push(`${adventure.id} ${step.id}: нет вариантов`);
        for (const choice of step.choices) {
          if (blank(choice.text)) problems.push(`${adventure.id} ${step.id} ${choice.id}: пустой текст`);
          problems.push(...outcomeProblems(universeId, adventure.id, step.id, choice.success, stepIds));
          if (choice.failure) problems.push(...outcomeProblems(universeId, adventure.id, step.id, choice.failure, stepIds));
        }
      }
    }
  }
  const repeatedId = repeated(allIds);
  if (repeatedId) problems.push(`приключение ${repeatedId} есть в двух мирах`);
  return problems;
}
