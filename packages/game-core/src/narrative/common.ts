// События, которые случаются в любой вселенной: детство, учёба, любовь, болезни, ремесло
import { t } from "../i18n.js";
import { check, fx, when } from "./dsl.js";
import { LEGACY_EVENTS } from "../legacy/stories.js";
import { ECONOMY_EVENTS } from "./economy-events.js";
import { PEOPLE_EVENTS } from "./people.js";
import type { EventDefinition } from "./types.js";

export const COMMON_EVENTS: readonly EventDefinition[] = [
  {
    id: "common.own-bent",
    kind: "personal",
    title: t("Свой нрав", "One's own bent"),
    text: t("Год выдался тихим, и {name} может заняться тем, к чему характер тянет сам.", "The year is quiet, and {name} can spend it on what the temperament itself leans toward."),
    minAge: 16,
    maxOccurrences: 1,
    choices: [
      {
        id: "brave",
        text: t("Идти туда, где опасно", "Go where it is dangerous"),
        requires: [when.temperament("brave")],
        success: { text: t("Страх не исчез. Рука стала твёрже.", "The fear did not leave. The hand grew steadier."), effects: [fx.stat("strength", 1), fx.rep(2)] }
      },
      {
        id: "cunning",
        text: t("Обойти преграду, а не ломать её", "Go around the obstacle instead of breaking it"),
        requires: [when.temperament("cunning")],
        success: { text: t("Обход короче прямой дороги.", "The way around is shorter than the straight road."), effects: [fx.stat("intelligence", 1), fx.wealth(8)] }
      },
      {
        id: "kind",
        text: t("Отложить своё и помочь", "Set your own work aside and help"),
        requires: [when.temperament("kind")],
        success: { text: t("Чужое дело съело день. Имя запомнили.", "Someone else's trouble ate the day. The name was remembered."), effects: [fx.stat("wisdom", 1), fx.karma(3)] }
      },
      {
        id: "ambitious",
        text: t("Взять дело выше своих лет", "Take a task beyond your years"),
        requires: [when.temperament("ambitious")],
        success: { text: t("Дело тяжелее, чем казалось. Отказываться поздно.", "The task is heavier than it looked. It is too late to refuse."), effects: [fx.stat("willpower", 1), fx.xp(15)] }
      },
      {
        id: "calm",
        text: t("Не спешить и доделать", "Do not hurry, and finish it"),
        requires: [when.temperament("calm")],
        success: { text: t("Год ушёл на одно дело. Оно сделано.", "The year went to one task. It is done."), effects: [fx.stat("wisdom", 1), fx.res("energy", 10)] }
      },
      {
        id: "curious",
        text: t("Открыть то, что закрыто", "Open what is shut"),
        requires: [when.temperament("curious")],
        success: { text: t("За дверью оказался не клад, а вопрос. Этого хватило.", "Behind the door was not a hoard but a question. That was enough."), effects: [fx.stat("intelligence", 1), fx.xp(10)] }
      }
    ]
  },
  {
    id: "common.first-steps",
    title: t("Первые шаги", "First steps"),
    text: t(
      "{name} отпускает руку взрослого и делает первые шаги. Впереди — лестница, позади — мягкий ковёр.",
      "{name} lets go of a grown-up's hand and takes their first steps. Ahead lies a staircase, behind a soft rug."
    ),
    minAge: 1,
    maxAge: 2,
    maxOccurrences: 1,
    choices: [
      {
        id: "stairs",
        text: t("Карабкаться по лестнице", "Climb the stairs"),
        check: check(["agility", "vitality"], 7),
        success: { text: t("Ступенька за ступенькой — и вершина покорена.", "Step by step, the summit is conquered."), effects: [fx.stat("agility", 1), fx.stat("willpower", 1)] },
        failure: { text: t("Падение, слёзы и первая шишка. Зато урок усвоен.", "A fall, tears and a first bump. Lesson learned."), effects: [fx.health(-3), fx.stat("vitality", 1)] }
      },
      {
        id: "rug",
        text: t("Вернуться к ковру и игрушкам", "Go back to the rug and the toys"),
        success: { text: t("Игрушки разобраны по цвету и размеру. Взрослые переглядываются.", "The toys get sorted by colour and size. The adults exchange glances."), effects: [fx.stat("intelligence", 1)] }
      }
    ]
  },
  {
    id: "common.night-fear",
    title: t("Шорох в темноте", "A rustle in the dark"),
    text: t("Ночью из-под кровати доносится тихий шорох. Родители спят.", "At night a faint rustle comes from under the bed. The parents are asleep."),
    minAge: 3,
    maxAge: 7,
    maxOccurrences: 1,
    choices: [
      {
        id: "look",
        text: t("Заглянуть под кровать", "Look under the bed"),
        check: check(["willpower"], 7),
        success: { text: t("Там всего лишь кошка. Страх больше не властен над {name}.", "It is only a cat. Fear no longer rules {name}."), effects: [fx.stat("willpower", 2)] },
        failure: { text: t("Крик будит весь дом. До утра — под одеялом.", "A scream wakes the whole house. Under the blanket until dawn."), effects: [fx.res("energy", -10)] }
      },
      {
        id: "call",
        text: t("Позвать родителей", "Call the parents"),
        success: { text: t("Мама остаётся рядом и рассказывает старую сказку.", "Mother stays close and tells an old tale."), effects: [fx.stat("charisma", 1), fx.stat("wisdom", 1)] }
      }
    ]
  },
  {
    id: "common.first-friend",
    title: t("Новый ребёнок во дворе", "A new child in the yard"),
    text: t(
      "Во дворе сидит незнакомый ребёнок и молча чертит палкой на песке. Другие дети над ним смеются.",
      "A strange child sits in the yard, silently drawing in the sand with a stick. The other children laugh at them."
    ),
    minAge: 4,
    maxAge: 10,
    maxOccurrences: 1,
    choices: [
      {
        id: "befriend",
        text: t("Подсесть рядом и спросить, что он рисует", "Sit down and ask what they are drawing"),
        success: { text: t("Это карта выдуманного королевства. С этого дня у {name} есть друг.", "It is a map of an imaginary kingdom. From this day {name} has a friend."), effects: [fx.stat("charisma", 2), fx.karma(5), fx.flag("childhood-friend"), fx.npc("friend")] }
      },
      {
        id: "defend",
        text: t("Встать между ним и обидчиками", "Stand between them and the bullies"),
        check: check(["strength", "charisma"], 8),
        success: { text: t("Обидчики отступают. О смелости {name} говорит весь двор.", "The bullies back off. The whole yard talks of {name}'s courage."), effects: [fx.stat("strength", 1), fx.rep(3), fx.karma(5), fx.flag("childhood-friend"), fx.npc("friend")] },
        failure: { text: t("Разбитый нос, но новый друг помогает подняться.", "A bloody nose, but the new friend helps you up."), effects: [fx.health(-5), fx.stat("willpower", 1), fx.karma(5), fx.flag("childhood-friend"), fx.npc("friend")] }
      },
      {
        id: "join",
        text: t("Смеяться вместе со всеми", "Laugh along with everyone"),
        success: { text: t("Свои принимают {name} в компанию. Но на душе почему-то тяжело.", "The others accept {name} into the group. Yet the heart feels heavy."), effects: [fx.stat("charisma", 1), fx.karma(-5)] }
      }
    ]
  },
  {
    id: "common.study-or-play",
    title: t("Книги или улица", "Books or the street"),
    text: t("Наставник оставил толстую книгу и велел прочесть к вечеру. За окном друзья зовут играть.", "The tutor left a thick book to be read by evening. Outside, friends are calling to play."),
    minAge: 6,
    maxAge: 12,
    cooldown: 3,
    maxOccurrences: 2,
    choices: [
      {
        id: "read",
        text: t("Читать до последней страницы", "Read to the last page"),
        check: check(["intelligence", "willpower"], 8),
        success: { text: t("Книга прочитана, и в ней нашлось кое-что интересное.", "The book is finished, and it held something interesting."), effects: [fx.stat("intelligence", 2), fx.xp(10), fx.skill("lore", 3)] },
        failure: { text: t("Буквы пляшут перед глазами. Сон побеждает.", "Letters dance before the eyes. Sleep wins."), effects: [fx.stat("intelligence", 1)] }
      },
      {
        id: "play",
        text: t("Сбежать на улицу", "Run outside"),
        success: { text: t("Догонялки до темноты. Колени разбиты, зато ноги крепнут.", "Tag until dark. Scraped knees, but stronger legs."), effects: [fx.stat("agility", 1), fx.stat("vitality", 1), fx.stat("charisma", 1)] }
      }
    ]
  },
  {
    id: "common.fever",
    title: t("Лихорадка", "Fever"),
    text: t("Жар не спадает третий день. Лекарь просит дорого, знахарка — почти даром.", "The fever has not broken for three days. The physician asks a high price, the herbwife almost nothing."),
    minAge: 2,
    maxAge: 70,
    cooldown: 8,
    weight: 0.6,
    choices: [
      {
        id: "physician",
        text: t("Позвать лекаря (30 золота)", "Call the physician (30 gold)"),
        requires: [when.wealth(30)],
        success: { text: t("Горькое лекарство помогает. Через неделю — на ногах.", "The bitter medicine works. On your feet within a week."), effects: [fx.wealth(-30), fx.health(10)] }
      },
      {
        id: "herbs",
        text: t("Довериться травам знахарки", "Trust the herbwife's remedies"),
        check: check(["vitality", "luck"], 10),
        success: { text: t("Отвар из горьких корней сбивает жар. Тело становится крепче.", "A brew of bitter roots breaks the fever. The body grows stronger."), effects: [fx.wealth(-2), fx.stat("vitality", 1)] },
        failure: { text: t("Болезнь отступает медленно и оставляет след.", "The illness recedes slowly and leaves its mark."), effects: [fx.wealth(-2), fx.health(-20), fx.stat("vitality", -1)] }
      },
      {
        id: "endure",
        text: t("Перетерпеть", "Endure it"),
        check: check(["vitality", "willpower"], 12),
        success: { text: t("Воля сильнее жара.", "Will is stronger than fever."), effects: [fx.stat("willpower", 1)] },
        failure: { text: t("Неделя в бреду. Силы возвращаются с трудом.", "A week of delirium. Strength returns slowly."), effects: [fx.health(-30), fx.stat("strength", -1)] }
      }
    ]
  },
  {
    id: "common.mentor",
    title: t("Старый мастер", "The old master"),
    text: t(
      "Седой мастер наблюдает за {name} несколько дней, а потом предлагает учиться у него. Ученичество тяжёлое, плата — годы жизни.",
      "A grey-haired master watches {name} for several days, then offers an apprenticeship. It is hard, and the price is years of one's life."
    ),
    minAge: 12,
    maxAge: 17,
    maxOccurrences: 1,
    choices: [
      {
        id: "accept",
        text: t("Стать учеником", "Become an apprentice"),
        success: { text: t("Каждый день — изнурительный труд. Но руки и разум учатся быстрее.", "Every day is gruelling labour. But hands and mind learn faster."), effects: [fx.stat("willpower", 2), fx.stat("wisdom", 1), fx.xp(30), fx.flag("mentor"), fx.npc("mentor")] }
      },
      {
        id: "test",
        text: t("Сначала проверить мастера вопросом", "First test the master with a question"),
        check: check(["intelligence", "wisdom"], 11),
        success: { text: t("Мастер смеётся: ответ на вопрос оказался вторым уроком.", "The master laughs: the answer was the second lesson."), effects: [fx.stat("intelligence", 2), fx.stat("wisdom", 1), fx.xp(30), fx.flag("mentor"), fx.npc("mentor")] },
        failure: { text: t("Мастер пожимает плечами и уходит. Шанс упущен.", "The master shrugs and walks away. The chance is gone."), effects: [fx.stat("wisdom", 1)] }
      },
      {
        id: "refuse",
        text: t("Отказаться: своя дорога важнее", "Refuse: your own road matters more"),
        success: { text: t("Свобода дороже. Но иногда {name} вспоминает этот разговор.", "Freedom is worth more. Yet sometimes {name} recalls that talk."), effects: [fx.stat("willpower", 1), fx.stat("luck", 1)] }
      }
    ]
  },
  {
    id: "common.first-love",
    title: t("Взгляд на празднике", "A glance at the festival"),
    text: t("На празднике урожая кто-то долго смотрит на {name} из толпы и улыбается.", "At the harvest festival someone in the crowd gazes at {name} for a long time and smiles."),
    minAge: 15,
    maxAge: 30,
    maxOccurrences: 1,
    conditions: [when.noFlag("in-love")],
    choices: [
      {
        id: "approach",
        text: t("Подойти и пригласить на танец", "Walk over and ask for a dance"),
        check: check(["charisma"], 11),
        success: {
          text: t("Танец длится до рассвета. С этого вечера {name} не одиноко.", "The dance lasts until dawn. From that night {name} is not alone."),
          effects: [fx.stat("charisma", 1), fx.res("energy", 10), fx.flag("in-love"), fx.npc("partner"), fx.schedule("common.love-test", 3)]
        },
        failure: { text: t("Слова застревают в горле. Незнакомец уходит с другим.", "Words stick in the throat. The stranger leaves with someone else."), effects: [fx.stat("willpower", 1)] }
      },
      {
        id: "gift",
        text: t("Оставить цветок и записку", "Leave a flower and a note"),
        check: check(["intelligence", "luck"], 10),
        success: {
          text: t("Через неделю приходит ответ. Переписка становится встречами.", "A week later a reply arrives. Letters turn into meetings."),
          effects: [fx.stat("wisdom", 1), fx.flag("in-love"), fx.npc("partner"), fx.schedule("common.love-test", 3)]
        },
        failure: { text: t("Записку уносит ветер. Возможно, так было нужно.", "The wind carries the note away. Perhaps it was meant to be."), effects: [] }
      },
      {
        id: "ignore",
        text: t("Отвернуться: сейчас не до этого", "Turn away: not now"),
        success: { text: t("Сердце спокойно, мысли ясны.", "The heart is calm, the mind is clear."), effects: [fx.stat("willpower", 1)] }
      }
    ]
  },
  {
    id: "common.love-test",
    title: t("Трудный выбор", "A hard choice"),
    text: t(
      "Любимому человеку предлагают место в далёком городе. Он просит {name} поехать вместе — или отпустить.",
      "Your beloved is offered a position in a distant city. They ask {name} to come along — or to let them go."
    ),
    scheduledOnly: true,
    conditions: [when.flag("in-love")],
    choices: [
      {
        id: "go",
        text: t("Бросить всё и уехать вместе", "Leave everything and go together"),
        success: { text: t("Новый город, новая жизнь — вдвоём.", "A new city, a new life — together."), effects: [fx.stat("charisma", 1), fx.karma(5), fx.flag("married"), fx.wealth(-10), fx.npcRole("partner", "spouse"), fx.affinity("spouse", 10)] }
      },
      {
        id: "stay",
        text: t("Уговорить остаться", "Persuade them to stay"),
        check: check(["charisma", "wisdom"], 14),
        success: { text: t("Любовь оказывается сильнее карьеры. Свадьба — весной.", "Love proves stronger than ambition. The wedding is in spring."), effects: [fx.rep(3), fx.flag("married"), fx.npcRole("partner", "spouse")] },
        failure: { text: t("Ссора, обида — и пустой дом.", "A quarrel, resentment and an empty house."), effects: [fx.flag("in-love", false), fx.res("energy", -20), fx.stat("willpower", 1), fx.npcRole("partner", "ex-partner"), fx.affinity("ex-partner", -20)] }
      },
      {
        id: "release",
        text: t("Отпустить", "Let them go"),
        success: { text: t("Прощание без слёз. Самое трудное решение в жизни {name}.", "A farewell without tears. The hardest decision of {name}'s life."), effects: [fx.flag("in-love", false), fx.stat("wisdom", 2), fx.karma(5), fx.npcRole("partner", "ex-partner")] }
      }
    ]
  },
  {
    id: "common.lost-purse",
    title: t("Чужой кошель", "Someone else's purse"),
    text: t("На дороге лежит тяжёлый кошель с гербом торгового дома.", "A heavy purse bearing a merchant house's crest lies on the road."),
    minAge: 10,
    maxAge: 80,
    cooldown: 10,
    maxOccurrences: 2,
    choices: [
      {
        id: "return",
        text: t("Вернуть владельцу", "Return it to its owner"),
        success: { text: t("Купец не верит своим глазам и щедро благодарит.", "The merchant cannot believe it and thanks you generously."), effects: [fx.wealth(15), fx.rep(5), fx.karma(10)] }
      },
      {
        id: "keep",
        text: t("Оставить себе", "Keep it"),
        success: { text: t("Золото приятно звенит. Совесть — тоже, но тише.", "The gold jingles pleasantly. So does conscience, but more quietly."), effects: [fx.wealth(60), fx.karma(-15)] }
      }
    ]
  },
  {
    id: "common.trade-offer",
    title: t("Рискованная сделка", "A risky deal"),
    text: t(
      "Знакомый торговец предлагает вложиться в караван к дальним землям. Прибыль может быть огромной — как и потери.",
      "A trader you know offers a stake in a caravan to distant lands. Profit could be huge — and so could losses."
    ),
    minAge: 20,
    maxAge: 70,
    cooldown: 6,
    conditions: [when.wealth(20)],
    choices: [
      {
        id: "invest",
        text: t("Вложить 20 золота", "Invest 20 gold"),
        check: check(["intelligence", "luck"], 14),
        success: { text: t("Караван вернулся с шёлком и пряностями. Вклад окупился втрое.", "The caravan returned with silk and spice. The stake paid back threefold."), effects: [fx.wealth(40), fx.rep(2)] },
        failure: { text: t("Караван сгинул в песках. Деньги — тоже.", "The caravan vanished in the sands. So did the money."), effects: [fx.wealth(-20), fx.stat("wisdom", 1)] }
      },
      {
        id: "decline",
        text: t("Отказаться", "Decline"),
        success: { text: t("Синица в руке надёжнее.", "A bird in the hand is safer."), effects: [] }
      }
    ]
  },
  {
    id: "common.calling",
    title: t("Дело всей жизни", "A life's work"),
    text: t("Пора выбрать, чем {name} будет зарабатывать на хлеб.", "It is time to choose how {name} will earn their bread."),
    minAge: 17,
    maxAge: 24,
    maxOccurrences: 1,
    conditions: [when.noFlag("profession"), when.noProfession()],
    choices: [
      {
        id: "guard",
        text: t("Стража и наёмная служба", "Guard and mercenary service"),
        success: { text: t("Тяжёлая служба закаляет тело.", "Hard service steels the body."), effects: [fx.stat("strength", 2), fx.stat("vitality", 1), fx.wealth(10), fx.flag("profession"), fx.flag("job-guard"), fx.profession("guard")] }
      },
      {
        id: "scholar",
        text: t("Писарь и учёный", "Scribe and scholar"),
        check: check(["intelligence"], 12),
        success: { text: t("Архивы открывают свои тайны.", "The archives reveal their secrets."), effects: [fx.stat("intelligence", 2), fx.stat("wisdom", 1), fx.wealth(8), fx.flag("profession"), fx.flag("job-scholar"), fx.profession("scholar")] },
        failure: { text: t("Экзамен провален. Остаётся работа переписчика.", "The exam is failed. Only copyist work remains."), effects: [fx.stat("intelligence", 1), fx.wealth(4), fx.flag("profession"), fx.profession("laborer")] }
      },
      {
        id: "merchant",
        text: t("Торговля", "Trade"),
        success: { text: t("Первая лавка — маленькая, но своя.", "The first shop is small, but your own."), effects: [fx.stat("charisma", 2), fx.wealth(20), fx.flag("profession"), fx.flag("job-merchant"), fx.profession("merchant")] }
      },
      {
        id: "wanderer",
        text: t("Странствия", "Wandering"),
        success: { text: t("Дорога зовёт. Каждый город — новая история.", "The road calls. Every town is a new story."), effects: [fx.stat("agility", 1), fx.stat("luck", 2), fx.xp(25), fx.flag("profession"), fx.flag("job-wanderer"), fx.profession("wanderer")] }
      }
    ]
  },
  {
    id: "common.heir",
    title: t("Новая жизнь в доме", "New life in the house"),
    text: t("В семье {name} ждут ребёнка. Дом наполняется хлопотами.", "{name}'s family is expecting a child. The house fills with bustle."),
    minAge: 20,
    maxAge: 45,
    maxOccurrences: 2,
    cooldown: 4,
    conditions: [when.flag("married")],
    choices: [
      {
        id: "home",
        text: t("Больше времени проводить дома", "Spend more time at home"),
        success: { text: t("Ребёнок растёт в любви. Род продолжится.", "The child grows up loved. The line will continue."), effects: [fx.stat("wisdom", 1), fx.karma(5), fx.flag("has-child"), fx.wealth(-10), fx.npc("child"), fx.affinity("child", 10)] }
      },
      {
        id: "work",
        text: t("Работать вдвое больше ради будущего", "Work twice as hard for the future"),
        success: { text: t("Достаток растёт, но первые шаги ребёнка {name} пропускает.", "Wealth grows, but {name} misses the child's first steps."), effects: [fx.wealth(25), fx.res("energy", -20), fx.flag("has-child"), fx.npc("child"), fx.affinity("child", -10)] }
      }
    ]
  },
  {
    id: "common.old-wound",
    title: t("Ноют старые кости", "Old bones ache"),
    text: t("Годы дают о себе знать: утром суставы не слушаются, а лестницы стали длиннее.", "The years make themselves felt: joints refuse to obey in the morning, and stairs have grown longer."),
    minAge: 50,
    cooldown: 8,
    choices: [
      {
        id: "exercise",
        text: t("Каждое утро упражняться", "Exercise every morning"),
        check: check(["vitality", "willpower"], 14),
        success: { text: t("Тело благодарит за заботу.", "The body is grateful for the care."), effects: [fx.stat("vitality", 1), fx.health(15)] },
        failure: { text: t("Перестарались — неделя в постели.", "Overdid it — a week in bed."), effects: [fx.health(-15)] }
      },
      {
        id: "rest",
        text: t("Беречь силы и больше отдыхать", "Save strength and rest more"),
        success: { text: t("Покой и тёплый очаг.", "Peace and a warm hearth."), effects: [fx.res("energy", 20), fx.stat("wisdom", 1)] }
      },
      {
        id: "teach",
        text: t("Передавать опыт молодым", "Pass experience to the young"),
        success: { text: t("Ученики ловят каждое слово. Имя {name} будут помнить.", "Students hang on every word. {name}'s name will be remembered."), effects: [fx.rep(5), fx.stat("charisma", 1), fx.xp(20)] }
      }
    ]
  },
  // Stage 02: семья, люди вокруг, возраст, таланты и тайны рода
  ...PEOPLE_EVENTS,
  // Stage 03: сюжеты рода и поколений
  ...LEGACY_EVENTS,
  // Stage 04: хозяйство и общество
  ...ECONOMY_EVENTS
];
