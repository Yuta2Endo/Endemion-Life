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
    { id: "df.ash-cathedral", name: t("Собор Последнего Огня", "Cathedral of the Last Flame"), text: t("Пепел святых хранят под алтарём.", "The ashes of saints are kept beneath the altar."), minAge: 16 }
  ],
  isekai: [
    { id: "is.guild-hall", name: t("Зал Гильдии", "The Guild hall"), text: t("Доска контрактов, кружки эля и чужие карты подземелий.", "A contract board, mugs of ale and other people's dungeon maps."), minAge: 14 },
    { id: "is.whisper-wood", name: t("Шепчущий лес", "The Whispering Wood"), text: t("Лес, который Гильдия отмечает на картах красным.", "A wood the Guild marks in red on its maps."), minAge: 15 }
  ],
  murim: [
    { id: "mu.river-pass", name: t("Перевал Третьей реки", "The Third River pass"), text: t("Единственная тропа через горы, которую не стережёт таможня.", "The only mountain path the customs do not watch."), minAge: 14 },
    { id: "mu.beggar-yard", name: t("Двор Секты нищих", "The Beggars' yard"), text: t("Здесь знают всё, что происходит на дорогах.", "Here they know everything that happens on the roads."), minAge: 15 }
  ],
  xianxia: [
    { id: "xi.forbidden-path", name: t("Запретная тропа", "The forbidden path"), text: t("Тропа за дальним пиком, куда внешним ученикам ходить нельзя.", "A path beyond the far peak, forbidden to outer disciples."), minAge: 14 },
    { id: "xi.spirit-spring", name: t("Духовный источник", "The spirit spring"), text: t("Вода источника помнит всех, кто из неё пил.", "The spring's water remembers everyone who drank from it."), minAge: 16 }
  ],
  hunter: [
    { id: "hu.gate-d", name: t("Врата D у Мапхо", "The D-rank Gate at Mapo"), text: t("Синий разлом над пустырём. Ассоциация оценила его как D.", "A blue rift over a wasteland. The Association rated it D."), minAge: 16 },
    { id: "hu.association", name: t("Отделение Ассоциации", "The Association office"), text: t("Лицензии, ранги и очередь на регистрацию добычи.", "Licences, ranks and the queue to register loot."), minAge: 16 }
  ],
  academy: [
    { id: "ac.court-stair", name: t("Парадная лестница дворца", "The palace's grand stair"), text: t("По этой лестнице проходят только с приглашением.", "Only those with an invitation walk this stair."), minAge: 16 },
    { id: "ac.duelling-yard", name: t("Дуэльный двор", "The duelling yard"), text: t("Песок двора помнит больше крови, чем балов.", "The yard's sand remembers more blood than balls."), minAge: 16 }
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
