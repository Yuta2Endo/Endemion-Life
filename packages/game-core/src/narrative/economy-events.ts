// Stage 04: экономические и социальные события. Общие — для любого мира (кризис, возможность, семейный спор о деньгах,
// подъём и падение сословия, влияние, политические последствия, восстановление); миров — свои налоги, гильдии, кланы,
// духовные ресурсы, гражданские права и сборы короны. Всё через общий Narrative Engine: условия, вес, пауза, предел повторов
import { t } from "../i18n.js";
import type { UniverseId } from "../types.js";
import { check, fx, when } from "./dsl.js";
import type { EventDefinition } from "./types.js";

const life = (event: EventDefinition): EventDefinition => ({ kind: "life", ...event });
/** Событие мира: вес по умолчанию у событий мира и так 2 (narrative/selection.ts) */
const world = (event: EventDefinition): EventDefinition => ({ kind: "world", ...event });

export const ECONOMY_EVENTS: readonly EventDefinition[] = [
  // Stage 09: дело и достижение. Приходят один раз и только когда факт уже есть
  life({
    id: "eco.deed-fame",
    title: t("Слава по дороге", "Fame from the road"),
    text: t("О деле {name} говорят на дорогах. Славу можно взять себе или оставить краю.", "People on the roads talk of {name}'s deed. The fame can be taken or left to the land."),
    minAge: 16,
    conditions: [when.deedAny()],
    cooldown: 4,
    maxOccurrences: 1,
    choices: [
      { id: "take", text: t("Принять славу", "Take the fame"), success: { text: t("Имя звучит громче.", "The name rings louder."), effects: [fx.rep(6)] } },
      { id: "leave", text: t("Оставить славу краю", "Leave the fame to the land"), success: { text: t("Говорят о крае, не о вас. Краю от этого легче.", "They talk of the land, not of you. The land is easier for it."), effects: [fx.prosperity(4), fx.karma(2)] } }
    ]
  }),
  life({
    id: "eco.dynasty",
    title: t("Род помнит", "The family remembers"),
    text: t("Четвёртое поколение. Старейшины спрашивают, чем {name} укрепит дом.", "The fourth generation. The elders ask what {name} will strengthen the house with."),
    minAge: 16,
    conditions: [when.achievement("dynasty")],
    cooldown: 4,
    maxOccurrences: 1,
    choices: [
      { id: "name", text: t("Укрепить имя рода", "Strengthen the family name"), success: { text: t("О доме говорят с уважением.", "The house is spoken of with respect."), effects: [fx.renown(6)] } },
      { id: "gold", text: t("Попросить золото на дом", "Ask for gold for the house"), success: { text: t("Сундук тяжелеет. Имя подождёт.", "The chest grows heavier. The name can wait."), effects: [fx.wealth(30)] } }
    ]
  }),
  // Stage 06: край. Приходят только при накопленном напряжении или благополучии и не повторяются чаще паузы
  life({
    id: "eco.strain",
    title: t("Край на пределе", "The land at its limit"),
    text: t("Дороги разбиты, в лавках пусто, люди злы. {name} может вложить золото в общий котёл или переждать.", "The roads are broken, the shops are empty, people are angry. {name} can put gold into the common pot or wait it out."),
    minAge: 16,
    conditions: [when.strain(60)],
    cooldown: 6,
    maxOccurrences: 4,
    choices: [
      { id: "help", text: t("Вложить 20 золота", "Put in 20 gold"), requires: [when.wealth(20)], success: { text: t("Котёл полнеет. Напряжение спадает.", "The pot fills. The strain eases."), effects: [fx.wealth(-20), fx.strain(-8), fx.rep(2)] } },
      { id: "wait", text: t("Переждать", "Wait it out"), success: { text: t("Год проходит. Край держится сам, но люди запоминают, кто прошёл мимо.", "The year passes. The land holds on its own, but people remember who walked past."), effects: [fx.rep(-1)] } }
    ]
  }),
  life({
    id: "eco.prosper",
    title: t("Щедрый год", "A generous year"),
    text: t("Край сыт: амбары полны, и староста предлагает долю тем, кто живёт здесь.", "The land is well fed: the barns are full, and the elder offers a share to those who live here."),
    minAge: 16,
    conditions: [when.prosperity(50)],
    cooldown: 6,
    maxOccurrences: 4,
    choices: [
      { id: "take", text: t("Взять долю", "Take the share"), success: { text: t("Доля весома. Амбары после этого заметно пустее.", "The share is generous. The barns are noticeably emptier after."), effects: [fx.wealth(15), fx.prosperity(-6)] } },
      { id: "leave", text: t("Оставить долю краю", "Leave the share to the land"), success: { text: t("Амбары остаются полными. Об этом говорят до зимы.", "The barns stay full. People talk of it until winter."), effects: [fx.prosperity(2), fx.rep(2), fx.karma(2)] } }
    ]
  }),
  // ——— Общие ———
  life({
    id: "eco.hard-times",
    title: t("Тяжёлые времена", "Hard times"),
    text: t("Цены растут быстрее заработка. В лавках шепчутся, что дальше будет хуже. {name} пересчитывает сбережения.", "Prices rise faster than earnings. In the shops they whisper that worse is coming. {name} counts the savings."),
    minAge: 18,
    conditions: [when.cycle("slump"), when.wealth(30)],
    cooldown: 8,
    maxOccurrences: 3,
    choices: [
      { id: "tighten", text: t("Затянуть пояс", "Tighten the belt"), success: { text: t("Скромный стол, старая одежда. Зато сбережения целы.", "A modest table, old clothes. But the savings survive."), effects: [fx.wealth(-8), fx.stat("willpower", 1)] } },
      {
        id: "gamble",
        text: t("Пустить остатки в оборот", "Put what is left to work"),
        check: check(["intelligence", "luck"], 14),
        success: { text: t("Пока все боялись, {name} купил дёшево. Теперь продаёт дороже.", "While everyone was afraid, {name} bought cheap. Now sells dear."), effects: [fx.wealth(25), fx.rep(1)] },
        failure: { text: t("Рынок упал ещё ниже. Сбережения тают.", "The market fell further still. The savings melt away."), effects: [fx.wealth(-25)] }
      },
      { id: "share", text: t("Помочь соседям в нужде", "Help neighbours in need"), success: { text: t("Кому-то хлеб, кому-то дрова. Об этом помнят.", "Bread for one, firewood for another. People remember."), effects: [fx.wealth(-15), fx.rep(4), fx.karma(8)] } }
    ]
  }),
  life({
    id: "eco.boom-chance",
    title: t("Попутный ветер", "A fair wind"),
    text: t("Торговля идёт в гору, и знакомый предлагает долю в новом деле. Время редкое: такие годы не длятся долго.", "Trade is booming, and an acquaintance offers a share in a new venture. Rare times: such years never last long."),
    minAge: 20,
    conditions: [when.cycle("boom"), when.wealth(30)],
    cooldown: 8,
    maxOccurrences: 3,
    choices: [
      {
        id: "invest",
        text: t("Вложить 30 золота", "Invest 30 gold"),
        requires: [when.wealth(30)],
        check: check(["intelligence", "charisma"], 12),
        success: { text: t("Дело пошло. Доля приносит вдвое больше вложенного.", "The venture takes off. The share brings back double the stake."), effects: [fx.wealth(30), fx.rep(2)] },
        failure: { text: t("Компаньон оказался ненадёжным. Деньги не вернуть.", "The partner proved unreliable. The money is gone."), effects: [fx.wealth(-30), fx.stat("wisdom", 1)] }
      },
      { id: "decline", text: t("Отказаться", "Decline"), success: { text: t("Спокойнее спать без чужих долгов.", "Easier to sleep without other people's debts."), effects: [] } }
    ]
  }),
  life({
    id: "eco.need-help",
    title: t("Денег не хватает", "Money runs short"),
    text: t("Который год подряд {name} не сводит концы с концами. Долги копятся, и люди начинают отводить глаза.", "Year after year {name} cannot make ends meet. Debts pile up and people begin to look away."),
    minAge: 16,
    conditions: [when.hardship(2)],
    cooldown: 4,
    maxOccurrences: 4,
    choices: [
      {
        id: "family",
        text: t("Попросить помощи у родни", "Ask family for help"),
        requires: [when.npc("family")],
        success: { text: t("Родные помогают, хоть и с упрёком. Долги закрыты.", "Family helps, though with reproach. The debts are settled."), effects: [fx.wealth(25), fx.affinity("family", -5)] }
      },
      { id: "work", text: t("Браться за любую работу", "Take any work going"), success: { text: t("Тяжело и унизительно, но на хлеб хватает.", "Hard and humiliating, but there is bread."), effects: [fx.wealth(15), fx.health(-8), fx.stat("vitality", 1)] } },
      { id: "pride", text: t("Перетерпеть самому", "Endure it alone"), success: { text: t("Гордость не кормит, но закаляет.", "Pride does not feed you, but it hardens you."), effects: [fx.stat("willpower", 2), fx.rep(-2)] } }
    ]
  }),
  life({
    id: "eco.family-money",
    title: t("Семейный спор о деньгах", "A family quarrel over money"),
    text: t("Брат или сестра требует свою долю: «Ты живёшь в достатке, а я считаю медяки». Разговор быстро переходит на крик.", "A sibling demands their share: 'You live well while I count coppers.' The talk quickly turns to shouting."),
    minAge: 25,
    conditions: [when.npcAged("sibling", 18), when.wealth(60)],
    cooldown: 12,
    maxOccurrences: 2,
    choices: [
      { id: "share", text: t("Поделиться (20 золота)", "Share (20 gold)"), success: { text: t("Ссора утихает. В семье снова ужинают вместе.", "The quarrel fades. The family dines together again."), effects: [fx.wealth(-20), fx.affinity("sibling", 15), fx.karma(5)] } },
      {
        id: "arbiter",
        text: t("Позвать старших рассудить", "Call the elders to judge"),
        check: check(["charisma", "wisdom"], 13),
        success: { text: t("Решили по справедливости: немного каждому. Обида не задержалась.", "A fair ruling: a little to each. The grudge did not linger."), effects: [fx.wealth(-8), fx.affinity("sibling", 5), fx.rep(2)] },
        failure: { text: t("Старшие встали на сторону брата. Пришлось отдать больше.", "The elders took the sibling's side. You had to give more."), effects: [fx.wealth(-25), fx.affinity("sibling", -5)] }
      },
      { id: "refuse", text: t("Отказать", "Refuse"), success: { text: t("Дверь хлопает. Соседи слышали каждое слово.", "The door slams. The neighbours heard every word."), effects: [fx.affinity("sibling", -20), fx.rep(-2)] } }
    ]
  }),
  life({
    id: "eco.rise",
    title: t("Место повыше", "A higher place"),
    text: t("Достаток и доброе имя открывают двери, которые раньше были закрыты. За долю, грамоту или покровительство можно подняться на ступень выше.", "Wealth and a good name open doors that used to be shut. A share, a charter or a patron can lift you a step higher."),
    minAge: 25,
    conditions: [when.wealth(200), when.reputation(20), when.standingAtMost(3)],
    cooldown: 15,
    maxOccurrences: 2,
    choices: [
      { id: "buy", text: t("Заплатить за место (150 золота)", "Pay for the place (150 gold)"), requires: [when.wealth(150)], success: { text: t("Новое положение, новые знакомые — и новые обязанности.", "A new station, new acquaintances — and new duties."), effects: [fx.wealth(-150), fx.classStep(1), fx.rep(5), fx.renown(2)] } },
      { id: "stay", text: t("Остаться, кем есть", "Stay as you are"), success: { text: t("Старые друзья ценят, что {name} не задрал нос.", "Old friends appreciate that {name} did not turn up their nose."), effects: [fx.rep(2), fx.karma(3)] } }
    ]
  }),
  life({
    id: "eco.fall",
    title: t("Под гору", "Downhill"),
    text: t("Бедность не скрыть: долги, заложенные вещи, пустой стол. Сословие требует расходов, которых {name} больше не может нести.", "Poverty cannot be hidden: debts, pawned belongings, an empty table. The station demands expenses {name} can no longer bear."),
    minAge: 20,
    conditions: [when.hardship(3), when.standing(2)],
    cooldown: 15,
    maxOccurrences: 2,
    choices: [
      { id: "sell", text: t("Продать положение и начать заново", "Sell the station and start again"), success: { text: t("Меньше почёта, меньше расходов. Можно дышать.", "Less honour, fewer expenses. You can breathe."), effects: [fx.classStep(-1), fx.wealth(40), fx.rep(-3), fx.renown(-2)] } },
      { id: "endure", text: t("Держаться за имя", "Cling to the name"), success: { text: t("Имя сохранено. Шёпот за спиной — тоже.", "The name is kept. So are the whispers behind your back."), effects: [fx.rep(-5), fx.stat("willpower", 1)] } }
    ]
  }),
  life({
    id: "eco.influence",
    title: t("Игра за влияние", "A game of influence"),
    text: t("Влиятельный покровитель предлагает союз: его связи в обмен на верность и молчание о его делах.", "A powerful patron offers an alliance: his connections in exchange for loyalty and silence about his affairs."),
    minAge: 25,
    conditions: [when.reputation(15)],
    cooldown: 12,
    maxOccurrences: 2,
    choices: [
      { id: "accept", text: t("Принять покровительство", "Accept the patronage"), success: { text: t("Двери открываются легче. Совесть закрывается тоже.", "Doors open more easily. So does conscience close."), effects: [fx.rep(6), fx.wealth(20), fx.karma(-8)] } },
      {
        id: "play",
        text: t("Играть на две стороны", "Play both sides"),
        check: check(["charisma", "intelligence"], 15),
        success: { text: t("Обе стороны уверены, что {name} — их человек.", "Both sides are sure {name} is their man."), effects: [fx.rep(8), fx.wealth(30), fx.karma(-5)] },
        failure: { text: t("Обман раскрылся. Теперь у {name} два врага вместо друга.", "The deception came out. Now {name} has two enemies instead of a friend."), effects: [fx.rep(-10)] }
      },
      { id: "refuse", text: t("Остаться независимым", "Stay independent"), success: { text: t("Свободным быть дороже, но честнее.", "Freedom costs more, but it is honest."), effects: [fx.karma(4), fx.stat("willpower", 1)] } }
    ]
  }),
  life({
    id: "eco.politics",
    title: t("Цена громкого имени", "The price of a loud name"),
    text: t("Имя {name} на слуху, и это не нравится власти. Чиновник намекает, что щедрость к казне избавит от проверок.", "{name}'s name is on everyone's lips, and the authorities dislike it. An official hints that generosity to the treasury would spare you inspections."),
    minAge: 25,
    conditions: [when.reputation(35), when.wealth(40)],
    cooldown: 15,
    maxOccurrences: 2,
    choices: [
      { id: "pay", text: t("Поделиться с казной (30 золота)", "Share with the treasury (30 gold)"), success: { text: t("Проверки обходят дом стороной.", "The inspections pass the house by."), effects: [fx.wealth(-30)] } },
      { id: "speak", text: t("Открыто осудить вымогательство", "Openly condemn the extortion"), success: { text: t("Народ на стороне {name}. Власть запомнила.", "The people side with {name}. The authorities remember."), effects: [fx.rep(5), fx.karma(6), fx.wealth(-10)] } },
      { id: "ignore", text: t("Сделать вид, что не понял", "Pretend not to understand"), success: { text: t("Проверка пришла. Нашли, к чему придраться.", "The inspection came. They found something to fault."), effects: [fx.wealth(-20), fx.rep(-2)] } }
    ]
  })
];

/** События миров: подключаются к событиям своего мира в universes/registry.ts */
export const WORLD_ECONOMY_EVENTS: Readonly<Record<UniverseId, readonly EventDefinition[]>> = {
  // Пепельные Королевства: знать, Орден, наследственные привилегии
  "dark-fantasy": [
  world({
    id: "df.eco-tithe",
    title: t("Десятина Ордена", "The Order's tithe"),
    text: t("Орден Пепла объявляет двойную десятину: «Огонь очагов дорожает, а Мгла не ждёт». Сборщик стучит в дверь.", "The Order of Ash proclaims a double tithe: 'Hearth-fire grows dear, and the Mist does not wait.' The collector knocks."),
    minAge: 18,
    conditions: [when.world("dark-fantasy"), when.wealth(20)],
    cooldown: 10,
    maxOccurrences: 2,
    choices: [
      { id: "pay", text: t("Заплатить", "Pay"), success: { text: t("Орден благодарит. Свет у порога горит ярче.", "The Order gives thanks. The light at the threshold burns brighter."), effects: [fx.wealth(-15), fx.faction("order-of-ash", 10)] } },
      {
        id: "crown",
        text: t("Просить защиты у Пепельного трона", "Seek protection from the Ashen Throne"),
        check: check(["charisma"], 13),
        success: { text: t("Трон напоминает Ордену, кто собирает налоги в королевстве.", "The Throne reminds the Order who taxes the kingdom."), effects: [fx.faction("crown", 10), fx.faction("order-of-ash", -8)] },
        failure: { text: t("При дворе только посмеялись. Орден узнал о жалобе.", "The court only laughed. The Order learned of the complaint."), effects: [fx.faction("order-of-ash", -12), fx.wealth(-15)] }
      },
      { id: "refuse", text: t("Отказать сборщику", "Turn the collector away"), success: { text: t("Ночью у двери шепчутся чужие голоса. Шепчущие ценят тех, кто не кланяется Ордену.", "At night strange voices whisper at the door. The Whisperers value those who do not bow to the Order."), effects: [fx.faction("order-of-ash", -15), fx.faction("mist-cult", 6), fx.meter("corruption", 3)] } }
    ]
  }),
  world({
    id: "df.eco-noble-dues",
    title: t("Право сеньора", "The lord's right"),
    text: t("Неурожай, а крепостные просят отсрочить оброк. Наследственное право позволяет взять своё силой.", "A bad harvest, and the serfs ask to delay their dues. Hereditary right allows you to take what is yours by force."),
    minAge: 18,
    conditions: [when.world("dark-fantasy"), when.socialClass("nobility")],
    cooldown: 10,
    maxOccurrences: 3,
    choices: [
      { id: "collect", text: t("Взыскать сполна", "Collect in full"), success: { text: t("Амбары полны. Взгляды в деревне — холодны.", "The granaries are full. The looks in the village are cold."), effects: [fx.wealth(30), fx.karma(-10), fx.rep(-4)] } },
      { id: "forgive", text: t("Простить в этот год", "Forgive this year"), success: { text: t("В деревне пьют за здоровье господина.", "The village drinks to the lord's health."), effects: [fx.karma(10), fx.rep(5), fx.faction("crown", -3)] } }
    ]
  })
  ],
  // Арденвейл: гильдии, торговля, раздел наследства
  isekai: [
  world({
    id: "is.eco-guild-war",
    title: t("Ценовая война", "A price war"),
    text: t("Гильдия искателей и Торговая лига не поделили добычу из подземелий. Каждая сторона ждёт, на чью сторону встанет {name}.", "The Adventurers' Guild and the Merchant League cannot agree over dungeon spoils. Each side waits to see whom {name} will back."),
    minAge: 18,
    conditions: [when.world("isekai")],
    cooldown: 12,
    maxOccurrences: 2,
    choices: [
      { id: "guild", text: t("За Гильдию", "Back the Guild"), success: { text: t("Гильдия помнит своих.", "The Guild remembers its own."), effects: [fx.faction("guild", 12), fx.faction("merchant-league", -10), fx.wealth(10)] } },
      { id: "league", text: t("За Лигу", "Back the League"), success: { text: t("Лига платит щедро, но дорогу в Гильдию теперь придётся искать заново.", "The League pays generously, but the road to the Guild must now be found anew."), effects: [fx.faction("merchant-league", 12), fx.faction("guild", -10), fx.wealth(20)] } },
      {
        id: "mediate",
        text: t("Помирить их", "Broker a peace"),
        check: check(["charisma", "intelligence"], 14),
        success: { text: t("Договор подписан. Обе стороны называют {name} честным посредником.", "The treaty is signed. Both sides call {name} an honest broker."), effects: [fx.faction("guild", 5), fx.faction("merchant-league", 5), fx.rep(6)] },
        failure: { text: t("Переговоры сорвались, и обе стороны винят посредника.", "The talks collapsed, and both sides blame the broker."), effects: [fx.faction("guild", -5), fx.faction("merchant-league", -5)] }
      }
    ]
  })
  ],
  // Девять Рек: кланы, общинная экономика, статус
  murim: [
  world({
    id: "mu.eco-clan-granary",
    title: t("Общий амбар", "The common granary"),
    text: t("Клан собирает зерно в общий амбар на чёрный год. Старейшины записывают, кто сколько принёс: от этого зависит место за общим столом.", "The clan gathers grain into a common granary against a black year. The elders note who brought how much: it decides one's place at the common table."),
    minAge: 16,
    conditions: [when.world("murim")],
    cooldown: 8,
    maxOccurrences: 3,
    choices: [
      { id: "give", text: t("Внести долю (10 золота)", "Contribute a share (10 gold)"), requires: [when.wealth(10)], success: { text: t("Имя {name} старейшины называют первым.", "The elders name {name} first."), effects: [fx.wealth(-10), fx.faction("orthodox-alliance", 8), fx.rep(3)] } },
      { id: "beggars", text: t("Отдать нищим у реки", "Give to the beggars by the river"), requires: [when.wealth(5)], success: { text: t("Секта нищих помнит каждую чашу риса.", "The Beggars' Sect remembers every bowl of rice."), effects: [fx.wealth(-5), fx.faction("beggars-sect", 10), fx.karma(5)] } },
      { id: "keep", text: t("Оставить себе", "Keep it"), success: { text: t("Место за столом — с краю.", "A seat at the table — at the far end."), effects: [fx.rep(-3)] } }
    ]
  })
  ],
  // Небесный Предел: секты, духовные ресурсы, иерархия
  xianxia: [
  world({
    id: "xi.eco-spirit-share",
    title: t("Раздача духовных камней", "The spirit-stone allotment"),
    text: t("Секта делит духовные камни по старшинству. Младшим достаются крохи, старшим — горсти. Можно смириться, а можно бросить вызов.", "The sect divides spirit stones by seniority. Juniors get crumbs, seniors get handfuls. One can accept it — or challenge it."),
    minAge: 14,
    conditions: [when.world("xianxia"), when.flag("spirit-root")],
    cooldown: 10,
    maxOccurrences: 3,
    choices: [
      { id: "accept", text: t("Принять свою долю", "Accept your share"), success: { text: t("Мало, но честно по уставу.", "Little, but fair by the rules."), effects: [fx.track(3), fx.faction("cloud-peak", 3)] } },
      {
        id: "challenge",
        text: t("Вызвать старшего на поединок за долю", "Challenge a senior for their share"),
        check: check(["strength", "willpower"], 15),
        success: { text: t("Старший повержен. Горсть камней — и уважение младших.", "The senior is defeated. A handful of stones — and the juniors' respect."), effects: [fx.track(10), fx.faction("cloud-peak", 5), fx.rep(4)] },
        failure: { text: t("Наставник наказывает за дерзость.", "The master punishes the insolence."), effects: [fx.health(-12), fx.faction("cloud-peak", -8)] }
      },
      { id: "trade", text: t("Продать камни смертным торговцам", "Sell the stones to mortal merchants"), success: { text: t("Двор смертного императора платит золотом. Секта морщится.", "The mortal court pays in gold. The sect frowns."), effects: [fx.wealth(20), fx.faction("mortal-court", 6), fx.faction("cloud-peak", -4)] } }
    ]
  })
  ],
  // Нео-Сеул: городская экономика, налоги, гражданские права
  hunter: [
  world({
    id: "hu.eco-tax-audit",
    title: t("Налоговая проверка", "A tax audit"),
    text: t("Городская налоговая служба нашла «расхождения» в декларации. Повестка пришла в тот же день, что и счёт за аренду.", "The city tax service found 'discrepancies' in the return. The summons arrived the same day as the rent bill."),
    minAge: 20,
    conditions: [when.world("hunter"), when.wealth(40)],
    cooldown: 10,
    maxOccurrences: 2,
    choices: [
      { id: "pay", text: t("Заплатить недоимку", "Pay the arrears"), success: { text: t("Дело закрыто. Ассоциация отмечает добросовестность.", "Case closed. The Association notes your good faith."), effects: [fx.wealth(-25), fx.faction("association", 5)] } },
      {
        id: "lawyer",
        text: t("Нанять юриста", "Hire a lawyer"),
        check: check(["intelligence"], 13),
        success: { text: t("Юрист разносит претензии в пух и прах.", "The lawyer tears the claims to shreds."), effects: [fx.wealth(-8), fx.rep(2)] },
        failure: { text: t("Суд проигран, плюс гонорар юриста.", "The case is lost — plus the lawyer's fee."), effects: [fx.wealth(-40)] }
      },
      { id: "protest", text: t("Выйти на акцию за права граждан", "Join the civil-rights protest"), success: { text: t("Тысячи горожан требуют прекратить поборы. Корпорации недовольны.", "Thousands of citizens demand an end to the levies. The corporations are displeased."), effects: [fx.rep(5), fx.karma(5), fx.faction("hanseong-corp", -10), fx.wealth(-10)] } }
    ]
  })
  ],
  // Империя Лиреваль: корона, майорат, государственные сборы
  academy: [
  world({
    id: "ac.eco-crown-levy",
    title: t("Сбор на войну", "A war levy"),
    text: t("Корона объявляет чрезвычайный сбор на войну. Майорат освобождает только старших сыновей знатных домов.", "The Crown proclaims an emergency war levy. The majorat exempts only the eldest sons of noble houses."),
    minAge: 18,
    conditions: [when.world("academy"), when.wealth(20)],
    cooldown: 12,
    maxOccurrences: 2,
    choices: [
      { id: "pay", text: t("Заплатить сбор", "Pay the levy"), success: { text: t("Имя внесено в список верных короне.", "Your name is entered on the list of the Crown's loyal."), effects: [fx.wealth(-20), fx.faction("imperial-court", 10)] } },
      {
        id: "petition",
        text: t("Просить отсрочки через Общество Розы", "Seek a delay through the Rose Society"),
        check: check(["charisma"], 14),
        success: { text: t("Нужное слово в нужном салоне — и сбор отложен.", "The right word in the right salon — and the levy is deferred."), effects: [fx.faction("rose-society", 8), fx.wealth(-5)] },
        failure: { text: t("В салонах смеются над просителем.", "The salons laugh at the petitioner."), effects: [fx.meter("scandal", 8), fx.wealth(-20)] }
      },
      { id: "evade", text: t("Уклониться", "Evade"), success: { text: t("Сбор не уплачен. Двор такого не забывает.", "The levy goes unpaid. The court does not forget such things."), effects: [fx.faction("imperial-court", -15), fx.meter("scandal", 10)] } }
    ]
  })
  ]
};
