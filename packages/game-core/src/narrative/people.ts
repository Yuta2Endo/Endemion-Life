// События Stage 02 для любой вселенной: семья, люди вокруг, возраст, таланты, слабости и тайны рода.
// Здесь же общие отложенные последствия: их могут назначать и общие события, и события миров
import { t } from "../i18n.js";
import { check, fx, when } from "./dsl.js";
import type { ConsequenceDefinition, EventDefinition } from "./types.js";

export const PEOPLE_EVENTS: readonly EventDefinition[] = [
  {
    id: "common.sibling-quarrel",
    kind: "family",
    title: t("Ссора с братом или сестрой", "A quarrel with a sibling"),
    text: t("Из-за сломанной игрушки дело дошло до драки. Родители ждут, кто первым извинится.", "A broken toy has led to a fight. The parents wait to see who apologises first."),
    minAge: 4,
    maxAge: 14,
    cooldown: 4,
    conditions: [when.npc("sibling")],
    choices: [
      { id: "apologize", text: t("Извиниться первым", "Apologise first"), success: { text: t("Мир восстановлен, и игрушку чинят вместе.", "Peace is restored, and the toy is mended together."), effects: [fx.affinity("sibling", 12), fx.karma(3), fx.stat("wisdom", 1)] } },
      { id: "stand", text: t("Стоять на своём", "Stand your ground"), success: { text: t("Гордость сохранена. Неделю дома холодно.", "Pride is kept. The house is cold for a week."), effects: [fx.affinity("sibling", -10), fx.stat("willpower", 1)] } }
    ]
  },
  {
    id: "common.parent-lesson",
    kind: "family",
    title: t("Урок у очага", "A lesson by the hearth"),
    text: t("Вечером родитель зовёт {name} к себе: «Пора научить тебя тому, что умею я».", "In the evening a parent calls {name} over: 'Time to teach you what I know.'"),
    minAge: 7,
    maxAge: 15,
    maxOccurrences: 2,
    cooldown: 4,
    conditions: [when.npc("parent"), when.affinity("parent", 10)],
    choices: [
      { id: "learn", text: t("Слушать внимательно", "Listen closely"), success: { text: t("Руки запоминают раньше головы.", "The hands remember before the head does."), effects: [fx.npcSkill("mother", 4), fx.npcSkill("father", 4), fx.affinity("parent", 8)] } },
      { id: "bored", text: t("Сбежать к друзьям", "Run off to friends"), success: { text: t("Родитель вздыхает и убирает инструменты.", "The parent sighs and puts the tools away."), effects: [fx.affinity("parent", -6), fx.stat("agility", 1)] } }
    ]
  },
  {
    id: "common.parent-illness",
    kind: "family",
    title: t("Болезнь в семье", "Illness in the family"),
    text: t("Родитель слёг. Лекарь качает головой и называет цену.", "A parent has fallen ill. The healer shakes his head and names a price."),
    minAge: 12,
    cooldown: 10,
    weight: 0.8,
    conditions: [when.npc("parent")],
    choices: [
      { id: "pay", text: t("Заплатить лекарю (25 золота)", "Pay the healer (25 gold)"), requires: [when.wealth(25)], success: { text: t("Родитель поправляется и долго держит {name} за руку.", "The parent recovers and holds {name}'s hand for a long time."), effects: [fx.wealth(-25), fx.affinity("parent", 15), fx.karma(5)] } },
      { id: "nurse", text: t("Выхаживать самому", "Nurse them yourself"), check: check(["wisdom", "vitality"], 12, 0, { skill: "medicine" }), success: { text: t("Месяц бессонных ночей — и болезнь отступает.", "A month of sleepless nights, and the illness retreats."), effects: [fx.affinity("parent", 20), fx.skill("medicine", 5)] }, failure: { text: t("Похороны в дождливый день.", "A funeral on a rainy day."), effects: [fx.npcDies("parent"), fx.stat("willpower", 2), fx.affinity("family", 5)] } },
      { id: "away", text: t("Не возвращаться домой", "Not go home"), success: { text: t("Весть о похоронах приходит слишком поздно.", "The news of the funeral comes too late."), effects: [fx.npcDies("parent"), fx.affinity("family", -15), fx.karma(-10)] } }
    ]
  },
  {
    id: "common.grandparent-tale",
    kind: "family",
    title: t("Рассказ старика", "The old one's tale"),
    text: t("Бабушка или дед наконец решается рассказать о том, о чём в семье молчат.", "A grandparent finally decides to tell what the family never speaks of."),
    minAge: 8,
    maxAge: 30,
    maxOccurrences: 1,
    conditions: [when.npc("grandparent"), when.secretHidden(), when.affinity("grandparent", 20)],
    choices: [
      { id: "listen", text: t("Выслушать до конца", "Listen to the end"), success: { text: t("Тайна рода раскрыта. Мир больше не будет прежним.", "The family secret is revealed. The world will never be the same."), effects: [fx.reveal("familySecret"), fx.affinity("grandparent", 10)] } },
      { id: "stop", text: t("Попросить не говорить", "Ask them not to tell"), success: { text: t("Некоторые двери лучше не открывать.", "Some doors are better left closed."), effects: [fx.stat("wisdom", 1)] } }
    ]
  },
  {
    id: "common.secret-surfaces",
    kind: "family",
    title: t("Тайна рода", "The family secret"),
    text: t("Старые бумаги, случайно найденные на чердаке, рассказывают историю, которую от {name} скрывали.", "Old papers found by chance in the attic tell a story that was hidden from {name}."),
    minAge: 18,
    maxOccurrences: 1,
    weight: 0.7,
    conditions: [when.secretHidden(), when.noNpc("grandparent")],
    choices: [
      { id: "read", text: t("Прочитать всё", "Read it all"), success: { text: t("Тайна рода раскрыта.", "The family secret is revealed."), effects: [fx.reveal("familySecret"), fx.stat("intelligence", 1)] } },
      { id: "burn", text: t("Сжечь не читая", "Burn it unread"), success: { text: t("Пепел уносит ветер.", "The wind carries away the ash."), effects: [fx.stat("willpower", 1), fx.karma(2)] } }
    ]
  },
  {
    id: "common.friend-needs-help",
    kind: "npc",
    title: t("Друг в беде", "A friend in trouble"),
    text: t("Друг приходит ночью: долги, угрозы и никого, к кому ещё можно обратиться.", "A friend comes at night: debts, threats and no one else to turn to."),
    minAge: 14,
    cooldown: 6,
    conditions: [when.npc("friend")],
    choices: [
      { id: "help", text: t("Помочь деньгами (20 золота)", "Help with money (20 gold)"), requires: [when.wealth(20)], success: { text: t("Друг клянётся вернуть долг. Когда-нибудь.", "The friend swears to repay. Someday."), effects: [fx.wealth(-20), fx.affinity("friend", 20), fx.karma(5), fx.later("common.c-friend-repays", 4)] } },
      { id: "stand", text: t("Пойти вместе к кредиторам", "Go with them to the creditors"), check: check(["charisma", "strength"], 12, 0, { skill: "persuasion" }), success: { text: t("Кредиторы соглашаются подождать.", "The creditors agree to wait."), effects: [fx.affinity("friend", 15), fx.rep(3)] }, failure: { text: t("Разговор кончается дракой.", "The talk ends in a fight."), effects: [fx.health(-15), fx.affinity("friend", 8)] } },
      { id: "refuse", text: t("Отказать", "Refuse"), success: { text: t("Дверь закрывается. Дружба — тоже.", "The door closes. So does the friendship."), effects: [fx.affinity("friend", -30), fx.npcRole("friend", "rival")] } }
    ]
  },
  {
    id: "common.rival-appears",
    kind: "npc",
    title: t("Тот, кто всегда на шаг впереди", "The one always a step ahead"),
    text: t("Новый сверстник лучше {name} во всём — и не упускает случая это показать.", "A new peer is better than {name} at everything — and never misses a chance to show it."),
    minAge: 8,
    maxAge: 25,
    maxOccurrences: 1,
    conditions: [when.noNpc("rival")],
    choices: [
      { id: "compete", text: t("Принять вызов", "Take up the challenge"), success: { text: t("Соперник появился. Тренировки стали злее.", "A rival has appeared. Training has grown fiercer."), effects: [fx.npc("rival"), fx.stat("willpower", 1), fx.xp(15)] } },
      { id: "befriend", text: t("Попробовать подружиться", "Try to make friends"), check: check(["charisma"], 11), success: { text: t("Соперник неожиданно смеётся. Может, из этого выйдет дружба.", "The rival unexpectedly laughs. Maybe this will become a friendship."), effects: [fx.npc("friend"), fx.stat("charisma", 1)] }, failure: { text: t("Протянутая рука повисает в воздухе.", "The offered hand hangs in the air."), effects: [fx.npc("rival"), fx.affinity("rival", -10)] } }
    ]
  },
  {
    id: "common.rival-reconcile",
    kind: "npc",
    title: t("Старый соперник", "The old rival"),
    text: t("Соперник, постаревший и усталый, приходит без оружия. «Может, хватит?»", "The rival, older and tired, comes unarmed. 'Maybe that's enough?'"),
    minAge: 35,
    maxOccurrences: 1,
    conditions: [when.npc("rival")],
    choices: [
      { id: "reconcile", text: t("Протянуть руку", "Offer a hand"), success: { text: t("Вражда стоила лучших лет. Остаток жизни — уже друзья.", "The feud cost the best years. The rest of life — as friends."), effects: [fx.npcRole("rival", "friend"), fx.affinity("friend", 30), fx.karma(10), fx.stat("wisdom", 2)] } },
      { id: "refuse", text: t("Ничего не забыто", "Nothing is forgotten"), success: { text: t("Соперник уходит. Он больше не вернётся.", "The rival leaves. He will not return."), effects: [fx.affinity("rival", -20), fx.stat("willpower", 1)] } }
    ]
  },
  {
    id: "common.mentor-last-lesson",
    kind: "npc",
    title: t("Последний урок", "The last lesson"),
    text: t("Наставник стар и болен. Он зовёт {name}, чтобы передать то, что не успел.", "The mentor is old and ill. He summons {name} to pass on what remains."),
    minAge: 20,
    maxOccurrences: 1,
    conditions: [when.npc("mentor"), when.affinity("mentor", 20)],
    choices: [
      { id: "stay", text: t("Остаться рядом до конца", "Stay until the end"), success: { text: t("Последний урок длится до рассвета. Утром наставника не стало.", "The last lesson lasts until dawn. By morning the mentor is gone."), effects: [fx.npcSkill("mentor", 10), fx.track(10), fx.npcDies("mentor"), fx.stat("wisdom", 2)] } },
      { id: "busy", text: t("Сослаться на дела", "Plead other business"), success: { text: t("Весть о смерти наставника приходит через месяц.", "Word of the mentor's death arrives a month later."), effects: [fx.npcDies("mentor"), fx.karma(-5), fx.weakness("night-terrors")] } }
    ]
  },
  {
    id: "common.child-grows",
    kind: "family",
    title: t("Ребёнок спрашивает", "The child asks"),
    text: t("Ребёнок спрашивает {name}, кем быть, когда вырастет.", "The child asks {name} what to be when grown."),
    minAge: 28,
    cooldown: 8,
    conditions: [when.npc("child")],
    choices: [
      { id: "follow", text: t("«Иди по моему пути»", "'Follow my path'"), success: { text: t("Ребёнок смотрит с восхищением.", "The child looks on in admiration."), effects: [fx.affinity("child", 10), fx.rep(2)] } },
      { id: "free", text: t("«Выбирай сам»", "'Choose for yourself'"), success: { text: t("Ребёнок задумывается — и улыбается.", "The child thinks — and smiles."), effects: [fx.affinity("child", 15), fx.stat("wisdom", 1)] } },
      { id: "busy", text: t("«Некогда, потом»", "'No time, later'"), success: { text: t("Ребёнок больше не спрашивает.", "The child never asks again."), effects: [fx.affinity("child", -15), fx.wealth(10)] } }
    ]
  },
  {
    id: "common.talent-awakens",
    kind: "personal",
    title: t("Скрытый дар", "A hidden gift"),
    text: t("В трудную минуту {name} делает то, чего никогда не умел. Тело и разум будто вспоминают.", "In a hard moment {name} does what was never possible before. Body and mind seem to remember."),
    minAge: 8,
    maxOccurrences: 3,
    cooldown: 6,
    weight: 1.2,
    conditions: [when.dormantTalent()],
    choices: [
      { id: "embrace", text: t("Принять дар", "Embrace the gift"), success: { text: t("Скрытый талант проявился.", "A hidden talent has shown itself."), effects: [fx.awakenTalent(), fx.xp(20)] } },
      { id: "fear", text: t("Испугаться и спрятать", "Fear it and hide it"), check: check(["willpower"], 12), success: { text: t("Дар не спрашивает разрешения и всё равно проявляется.", "The gift doesn't ask permission and shows itself anyway."), effects: [fx.awakenTalent(), fx.stat("willpower", 1)] }, failure: { text: t("Дар засыпает снова — до лучших времён.", "The gift falls asleep again — until better times."), effects: [fx.stat("wisdom", 1)] } }
    ]
  },
  {
    id: "common.overcome-weakness",
    kind: "stat",
    title: t("Бороться с собой", "Fighting oneself"),
    text: t("Слабость опять подвела в самый важный момент. Может, пора с ней покончить?", "The weakness failed {name} again at the most important moment. Perhaps it's time to end it?"),
    minAge: 14,
    cooldown: 5,
    conditions: [when.weakness()],
    choices: [
      { id: "train", text: t("Год упорной работы над собой", "A year of hard work on oneself"), check: check(["willpower", "wisdom"], 14), success: { text: t("Слабость побеждена.", "The weakness is overcome."), effects: [fx.overcomeWeakness(), fx.stat("willpower", 1), fx.xp(30)] }, failure: { text: t("Не вышло. Но в этот раз было ближе.", "It didn't work. But this time it was closer."), effects: [fx.stat("willpower", 1)] } },
      { id: "accept", text: t("Смириться", "Accept it"), success: { text: t("Слабость — тоже часть тебя.", "A weakness is part of you too."), effects: [fx.stat("wisdom", 1)] } }
    ]
  },
  {
    id: "common.potential-sign",
    kind: "personal",
    title: t("Взгляд со стороны", "An outside view"),
    text: t("Странствующий провидец задерживает взгляд на {name}: «Хочешь знать, на что ты способен?»", "A wandering seer lingers on {name}: 'Do you want to know what you are capable of?'"),
    minAge: 12,
    maxOccurrences: 1,
    weight: 0.6,
    choices: [
      { id: "ask", text: t("Узнать", "Find out"), success: { text: t("Провидец называет цифру и уходит, не взяв платы.", "The seer names a number and leaves without taking payment."), effects: [fx.reveal("potential"), fx.reveal("destiny")] } },
      { id: "no", text: t("Судьбу не узнают — её делают", "Fate is not learned — it is made"), success: { text: t("Провидец смеётся: «Правильный ответ».", "The seer laughs: 'The right answer.'"), effects: [fx.stat("willpower", 1), fx.stat("luck", 1)] } }
    ]
  },
  {
    id: "common.destiny-save",
    kind: "personal",
    title: t("Рука судьбы", "The hand of fate"),
    text: t("Случай, который должен был кончиться смертью, обходит {name} стороной.", "An accident that should have been fatal passes {name} by."),
    minAge: 10,
    maxOccurrences: 1,
    weight: 0.5,
    conditions: [when.hidden("destiny", 8)],
    choices: [
      { id: "thank", text: t("Поблагодарить судьбу", "Thank fate"), success: { text: t("Судьба любит тех, кто благодарен.", "Fate loves the grateful."), effects: [fx.stat("luck", 2), fx.karma(5), fx.reveal("destiny")] } }
    ]
  },
  {
    id: "common.midlife",
    kind: "age",
    title: t("Половина пути", "Halfway down the road"),
    text: t("Утром в зеркале — первая седина. {name} вспоминает, о чём мечтал в юности.", "In the morning mirror, the first grey hair. {name} remembers youthful dreams."),
    minAge: 38,
    maxAge: 50,
    maxOccurrences: 1,
    choices: [
      { id: "change", text: t("Начать всё заново", "Start over"), success: { text: t("Новое дело, новый город, старые руки.", "A new trade, a new city, the same old hands."), effects: [fx.stat("willpower", 2), fx.wealth(-15), fx.xp(40)] } },
      { id: "family", text: t("Больше времени с близкими", "More time with loved ones"), success: { text: t("Самые тёплые годы впереди.", "The warmest years lie ahead."), effects: [fx.affinity("family", 10), fx.stat("wisdom", 1)] } },
      { id: "keep", text: t("Всё правильно, ничего не менять", "All is well, change nothing"), success: { text: t("Покой — тоже выбор.", "Peace is a choice too."), effects: [fx.res("energy", 20)] } }
    ]
  },
  {
    id: "common.legacy",
    kind: "age",
    title: t("Что останется после", "What remains after"),
    text: t("До конца срока остаётся немного. {name} думает, что оставить после себя.", "Little time remains. {name} thinks about what to leave behind."),
    maxOccurrences: 1,
    conditions: [when.yearsLeft(8)],
    stages: ["middle", "elder"],
    choices: [
      { id: "heir", text: t("Передать всё детям", "Leave everything to the children"), requires: [when.npc("child")], success: { text: t("Дети обещают продолжить дело.", "The children promise to carry on."), effects: [fx.affinity("child", 20), fx.wealth(-30), fx.karma(5)] } },
      { id: "student", text: t("Взять последнего ученика", "Take one last student"), success: { text: t("Ученик ловит каждое слово.", "The student hangs on every word."), effects: [fx.rep(8), fx.xp(30)] } },
      { id: "memoir", text: t("Написать воспоминания", "Write a memoir"), success: { text: t("Книга будет жить дольше автора.", "The book will outlive its author."), effects: [fx.skill("lore", 5), fx.rep(5)] } }
    ]
  },
  {
    id: "common.reunion",
    kind: "npc",
    title: t("Нежданная встреча", "An unexpected meeting"),
    text: t("На рынке кто-то окликает {name} по детскому прозвищу.", "At the market someone calls {name} by a childhood nickname."),
    minAge: 25,
    maxOccurrences: 1,
    conditions: [when.noNpc("friend")],
    choices: [
      { id: "talk", text: t("Остановиться поговорить", "Stop to talk"), success: { text: t("Старая дружба оживает, будто и не было этих лет.", "An old friendship revives as if the years never passed."), effects: [fx.npc("friend"), fx.affinity("friend", 15), fx.stat("charisma", 1)] } },
      { id: "pass", text: t("Сделать вид, что не узнал", "Pretend not to recognise them"), success: { text: t("Прошлое остаётся в прошлом.", "The past stays in the past."), effects: [] } }
    ]
  }
];

export const COMMON_CONSEQUENCES: readonly ConsequenceDefinition[] = [
  {
    id: "common.c-friend-repays",
    title: t("Долг возвращён", "A debt repaid"),
    text: t("Друг, которому {name} когда-то помог, возвращает долг с процентами.", "The friend {name} once helped repays the debt with interest."),
    conditions: [when.npc("friend")],
    effects: [fx.wealth(35), fx.affinity("friend", 10)]
  }
];
