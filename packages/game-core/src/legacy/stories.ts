// Generational Story Engine: сюжеты рода. События вида "legacy" учитывают поколение, семью, славу рода, сословие и нити,
// которые оставили предки. Последствия для рода (lineageLater) переживают персонажа и наступают при потомке.
// Сюжет записывается в хронику рода; сколько раз он случился в роду — lineage.stories
import { t, type LocalizedText } from "../i18n.js";
import { check, fx, when } from "../narrative/dsl.js";
import type { ConsequenceDefinition, Effect, EventDefinition } from "../narrative/types.js";

/** Нити рода: что переходит к потомкам вместе с родом */
export const THREADS: Readonly<Record<string, { name: LocalizedText; description: LocalizedText }>> = {
  "old-enemy": { name: t("Старый враг", "An old enemy"), description: t("Кто-то помнит обиду, нанесённую роду, и ждёт своего часа.", "Someone remembers a wrong done by the family and waits for their hour.") },
  "family-feud": { name: t("Семейная распря", "A family feud"), description: t("Родня не простила старую ссору. Холод передаётся по наследству.", "The kin never forgave an old quarrel. The chill is inherited.") },
  "ancient-knowledge": { name: t("Древнее знание", "Ancient knowledge"), description: t("Род хранит знание, которое передают от родителя к ребёнку.", "The family keeps knowledge passed from parent to child.") },
  "buried-secret": { name: t("Запечатанная тайна", "A sealed secret"), description: t("Письмо предка так и не прочитали. Оно ждёт.", "An ancestor's letter was never read. It waits.") },
  betrayal: { name: t("Память о предательстве", "The memory of betrayal"), description: t("Род не забывает, кто его предал.", "The family does not forget who betrayed it.") }
};

/** Фамильные реликвии: именованные предметы рода, переходящие к потомкам.
 * Каждая реликвия применяет свой эффект один раз при получении. */
export const RELICS: Readonly<Record<string, { id: string; name: LocalizedText; description: LocalizedText; effects: Effect[] }>> = {
  "ancestral-blade": {
    id: "ancestral-blade",
    name: t("Предковый клинок", "Ancestral Blade"),
    description: t("Клинок, который носили основатели рода. Дарит немного славы.", "An ancestral blade carried by the founders of the line. Brings a little renown."),
    effects: [fx.renown(2)]
  },
  "system-crystal": {
    id: "system-crystal",
    name: t("Кристалл Системы", "System Crystal"),
    description: t("Осколок Системы, наполненный незнакомой энергией.", "A shard of the System, filled with unfamiliar energy."),
    effects: [fx.xp(20)]
  },
  "clan-scroll": {
    id: "clan-scroll",
    name: t("Свиток клана", "Clan Scroll"),
    description: t("Записи клановых учений, усиливающие волю.", "Records of clan teachings, strengthening the will."),
    effects: [fx.stat("willpower", 1)]
  },
  "spirit-root-amulet": {
    id: "spirit-root-amulet",
    name: t("Амулет духовного корня", "Spirit Root Amulet"),
    description: t("Оберег для тех, чья душа откликается на Дао.", "A talisman for those whose soul answers to the Dao."),
    effects: [fx.karma(3)]
  },
  "gate-hunter-badge": {
    id: "gate-hunter-badge",
    name: t("Знак охотника Врат", "Gate Hunter Badge"),
    description: t("Знак тех, кто stood на страже Врат.", "Badge of those who stand guard at the Gates."),
    effects: [fx.faction("association", 2)]
  },
  "noble-signet": {
    id: "noble-signet",
    name: t("Знак знати", "Noble Signet"),
    description: t("Печать знатного рода, открывающая двери.", "The signet of a noble house, opening doors."),
    effects: [fx.wealth(15)]
  }
};

/** Найти реликвию по id. Возвращает undefined, если реликвия неизвестна. */
export function findRelic(id: string): { id: string; name: LocalizedText; description: LocalizedText; effects: Effect[] } | undefined {
  return RELICS[id];
}

/** Сюжет рода: по умолчанию один раз за жизнь и один раз за род (lineageMax) */
const legacy = (event: Omit<EventDefinition, "kind">): EventDefinition => ({ kind: "legacy", maxOccurrences: 1, lineageMax: 1, ...event });

export const LEGACY_EVENTS: readonly EventDefinition[] = [
  legacy({
    id: "legacy.heir-born",
    title: t("Рождение наследника", "An heir is born"),
    text: t("В доме {name} плачет младенец. Старшие уже спорят, на кого он похож и какое имя ему дать.", "A baby cries in {name}'s house. The elders already argue whom the child resembles and what name to give."),
    minAge: 16,
    conditions: [when.npcAged("child", 0, 1)],
    choices: [
      { id: "ancestor", text: t("Назвать в честь предка", "Name the child after an ancestor"), success: { text: t("Имя предка снова звучит в доме. Род помнит своих.", "An ancestor's name sounds in the house again. The family remembers its own."), effects: [fx.renown(3), fx.affinity("child", 5)] } },
      { id: "rite", text: t("Провести родовой обряд (15 золота)", "Hold the family rite (15 gold)"), requires: [when.wealth(15)], success: { text: t("Старый обряд проведён по всем правилам. Говорят, его благословение приходит, когда ребёнок вырастет.", "The old rite is performed by every rule. They say its blessing arrives when the child is grown."), effects: [fx.wealth(-15), fx.renown(2), fx.lineageLater("legacy.c-rite-blessing", 16)] } },
      { id: "quiet", text: t("Тихий праздник только для своих", "A quiet celebration, just the family"), success: { text: t("Без гостей и речей, зато вместе.", "No guests and no speeches, but together."), effects: [fx.affinity("spouse", 8), fx.karma(2)] } }
    ]
  }),
  legacy({
    id: "legacy.family-conflict",
    title: t("Семейный раздор", "Family strife"),
    text: t("Взрослые дети спорят, кому достанется дело семьи. За ужином уже никто не смотрит друг на друга.", "The grown children argue over who will inherit the family's work. At dinner no one looks at anyone anymore."),
    minAge: 35,
    cooldown: 10,
    lineageMax: 3,
    conditions: [when.npcAged("child", 16)],
    choices: [
      { id: "judge", text: t("Рассудить по справедливости", "Judge fairly"), check: check(["wisdom", "charisma"], 13, 0, { skill: "persuasion" }), success: { text: t("Решение принято, и его приняли все.", "A decision is made, and everyone accepts it."), effects: [fx.affinity("child", 10), fx.renown(2)] }, failure: { text: t("Каждый уходит обиженным. Обида переживёт этот дом.", "Everyone leaves aggrieved. The grudge will outlive this house."), effects: [fx.affinity("child", -15), fx.thread("family-feud")] } },
      { id: "eldest", text: t("Всё — старшему, как заведено", "Everything to the eldest, as is the custom"), success: { text: t("Порядок соблюдён. Младшие молчат, но запоминают.", "Order is kept. The younger ones stay silent but remember."), effects: [fx.affinity("child", -5), fx.renown(1)] } },
      { id: "step-back", text: t("Пусть разберутся сами", "Let them sort it out themselves"), success: { text: t("Ссора растёт без присмотра.", "The quarrel grows unchecked."), effects: [fx.thread("family-feud"), fx.stat("willpower", 1)] } }
    ]
  }),
  legacy({
    id: "legacy.estate-dispute",
    title: t("Спор о наследстве", "An inheritance dispute"),
    text: t("Дальняя родня приходит с бумагами: «Покойный обещал это нам». Соседи с интересом ждут, чем кончится.", "Distant kin arrive with papers: 'The deceased promised this to us.' The neighbours wait eagerly to see how it ends."),
    minAge: 18,
    maxAge: 60,
    lineageMax: 2,
    conditions: [when.generation(2)],
    choices: [
      { id: "court", text: t("Отстоять права в суде", "Defend your rights in court"), check: check(["intelligence", "charisma"], 13, 0, { skill: "persuasion" }), success: { text: t("Судья на вашей стороне. Наследство остаётся в семье.", "The judge sides with you. The inheritance stays in the family."), effects: [fx.wealth(25), fx.renown(2)] }, failure: { text: t("Дело проиграно, а с ним и часть имущества.", "The case is lost, and part of the estate with it."), effects: [fx.wealth(-20), fx.renown(-3)] } },
      { id: "share", text: t("Поделиться по-родственному", "Share as kin should"), success: { text: t("Родня уходит довольной. О щедрости рода говорят ещё долго.", "The kin leave content. People speak of the family's generosity for a long time."), effects: [fx.wealth(-15), fx.karma(5), fx.renown(3), fx.affinity("family", 5)] } },
      { id: "threaten", text: t("Выставить их за порог", "Throw them out"), check: check(["strength", "willpower"], 12), success: { text: t("Они уходят. Но уходят, запомнив.", "They leave. But they leave remembering."), effects: [fx.wealth(10), fx.renown(-2), fx.thread("old-enemy")] }, failure: { text: t("Драка на пороге. Позор на весь квартал.", "A brawl on the doorstep. A disgrace for the whole quarter."), effects: [fx.health(-15), fx.renown(-5), fx.thread("old-enemy")] } }
    ]
  }),
  legacy({
    id: "legacy.throne-dispute",
    title: t("Спор о главенстве", "A dispute over the headship"),
    text: t("Кузен заявляет, что главой дома должен быть он. У него есть сторонники — и, кажется, оружие.", "A cousin claims that he should be head of the house. He has supporters — and, it seems, weapons."),
    minAge: 20,
    maxAge: 70,
    lineageMax: 2,
    conditions: [when.generation(2), when.standing(3)],
    choices: [
      { id: "claim", text: t("Отстоять своё право перед родом", "Defend your right before the family"), check: check(["charisma", "willpower"], 15, 0, { skill: "persuasion" }), success: { text: t("Род признаёт вас главой. Кузен склоняет голову.", "The family acknowledges you as head. The cousin bows his head."), effects: [fx.renown(10), fx.rep(5)] }, failure: { text: t("Род раскалывается. Часть родни уходит с кузеном, а с ней — положение семьи.", "The family splits. Part of the kin leaves with the cousin, and with them the family's standing."), effects: [fx.renown(-8), fx.classStep(-1), fx.thread("old-enemy")] } },
      { id: "duel", text: t("Решить поединком", "Settle it with a duel"), requires: [when.world("murim", "dark-fantasy", "xianxia", "hunter")], check: check(["strength", "agility"], 15, 0, { skill: "melee" }), success: { text: t("Кузен лежит в пыли. Больше никто не спорит.", "The cousin lies in the dust. No one argues anymore."), effects: [fx.renown(12), fx.rep(5), fx.xp(40)] }, failure: { text: t("Раны заживут. Право главенства — уже нет.", "The wounds will heal. The right to the headship will not."), effects: [fx.health(-40), fx.renown(-5)] } },
      { id: "yield", text: t("Уступить ради мира в роду", "Yield for the sake of peace"), success: { text: t("Кузен становится главой. Зато семья цела.", "The cousin becomes head. But the family is whole."), effects: [fx.renown(-3), fx.karma(5), fx.affinity("family", 10)] } }
    ]
  }),
  legacy({
    id: "legacy.relative-vanishes",
    title: t("Исчезновение", "A disappearance"),
    text: t("Брат или сестра уходит на рассвете, оставив короткую записку: «Не ищите».", "A sibling leaves at dawn, leaving a short note: 'Do not look for me.'"),
    minAge: 14,
    lineageMax: 2,
    conditions: [when.npcAged("sibling", 16)],
    weight: 0.6,
    choices: [
      { id: "search", text: t("Искать (20 золота)", "Search (20 gold)"), requires: [when.wealth(20)], success: { text: t("Следы теряются у реки. Но надежда остаётся: нанятые люди продолжат поиски.", "The tracks vanish by the river. But hope remains: the hired men will keep searching."), effects: [fx.kinMissing("sibling"), fx.wealth(-20), fx.lineageLater("legacy.c-lost-found", 6)] } },
      { id: "wait", text: t("Ждать, оставив свет в окне", "Wait, leaving a light in the window"), success: { text: t("Свет горит каждую ночь.", "The light burns every night."), effects: [fx.kinMissing("sibling"), fx.stat("willpower", 1)] } }
    ]
  }),
  legacy({
    id: "legacy.lost-returns",
    title: t("Возвращение", "The return"),
    text: t("На пороге стоит человек, которого семья давно считала пропавшим. Постаревший, в чужой одежде.", "On the doorstep stands someone the family long thought lost. Older, in foreign clothes."),
    minAge: 10,
    cooldown: 8,
    lineageMax: 4,
    conditions: [when.missingKin()],
    choices: [
      { id: "embrace", text: t("Обнять без вопросов", "Embrace them without questions"), success: { text: t("Слёзы, смех и долгая ночь разговоров.", "Tears, laughter and a long night of talk."), effects: [fx.kinReturns(), fx.affinity("family", 10), fx.karma(3)] } },
      { id: "question", text: t("Сначала узнать, где пропадал", "First find out where they were"), check: check(["wisdom"], 12), success: { text: t("Рассказ о годах вдали открывает то, что род скрывал.", "The tale of the years away reveals what the family hid."), effects: [fx.kinReturns(), fx.reveal("familySecret"), fx.stat("wisdom", 1)] }, failure: { text: t("Допрос обижает. Вернувшийся остаётся, но держится в стороне.", "The questioning offends. The returned one stays but keeps their distance."), effects: [fx.kinReturns(), fx.affinity("family", -5)] } }
    ]
  }),
  legacy({
    id: "legacy.old-enemy",
    title: t("Старый враг", "The old enemy"),
    text: t("Человек с чужим гербом называет имя вашего предка и говорит, что пришёл забрать долг.", "A man with a foreign crest names your ancestor and says he has come to collect a debt."),
    minAge: 16,
    cooldown: 12,
    maxOccurrences: 2,
    lineageMax: 4,
    conditions: [when.thread("old-enemy")],
    choices: [
      { id: "face", text: t("Встретить лицом к лицу", "Face him"), check: check(["strength", "willpower"], 15, 0, { skill: "melee" }), success: { text: t("Враг уходит побеждённым. Этот долг закрыт.", "The enemy leaves defeated. This debt is settled."), effects: [fx.thread("old-enemy", false), fx.renown(8), fx.xp(40)] }, failure: { text: t("Враг берёт своё кровью и золотом.", "The enemy takes his due in blood and gold."), effects: [fx.health(-35), fx.wealth(-20)] } },
      { id: "reconcile", text: t("Предложить мир", "Offer peace"), check: check(["charisma", "wisdom"], 14, 0, { skill: "persuasion" }), success: { text: t("Старую обиду наконец проговаривают вслух. Враг протягивает руку.", "The old wrong is finally spoken aloud. The enemy offers his hand."), effects: [fx.thread("old-enemy", false), fx.karma(8), fx.renown(3)] }, failure: { text: t("«Мир? После того, что сделал ваш род?»", "'Peace? After what your family did?'"), effects: [fx.renown(-3)] } },
      { id: "pay", text: t("Откупиться (30 золота)", "Buy him off (30 gold)"), requires: [when.wealth(30)], success: { text: t("Золото меняет хозяина. Враг уходит, но не забывает.", "The gold changes hands. The enemy leaves but does not forget."), effects: [fx.wealth(-30), fx.renown(-4)] } }
    ]
  }),
  legacy({
    id: "legacy.family-secret",
    title: t("Письмо предка", "An ancestor's letter"),
    text: t("В бумагах покойного — запечатанное письмо: «Тому, кто придёт после меня».", "Among the deceased's papers is a sealed letter: 'To whoever comes after me.'"),
    minAge: 16,
    conditions: [when.generation(2), when.secretHidden()],
    choices: [
      { id: "read", text: t("Сломать печать", "Break the seal"), success: { text: t("Предок пишет о том, о чём молчал всю жизнь.", "The ancestor writes of what they kept silent their whole life."), effects: [fx.reveal("familySecret"), fx.thread("buried-secret", false)] } },
      { id: "seal", text: t("Оставить запечатанным", "Leave it sealed"), success: { text: t("Письмо возвращается в шкатулку. Может, его прочтут дети.", "The letter returns to its box. Perhaps the children will read it."), effects: [fx.thread("buried-secret"), fx.stat("willpower", 1)] } }
    ]
  }),
  legacy({
    id: "legacy.marriage-alliance",
    title: t("Брак между родами", "A marriage between houses"),
    text: t("Старый союзный род присылает сватов. Союз укрепит обе семьи, но о любви в письме ни слова.", "An old allied house sends matchmakers. The union would strengthen both families, but the letter says nothing of love."),
    minAge: 17,
    maxAge: 35,
    conditions: [when.married(false), when.standing(2)],
    choices: [
      { id: "accept", text: t("Согласиться на союз", "Accept the alliance"), success: { text: t("Свадьба пышная, приданое щедрое. Супруг вежлив, а остальное придёт со временем.", "The wedding is lavish, the dowry generous. The spouse is courteous; the rest may come with time."), effects: [fx.npc("spouse"), fx.flag("married"), fx.renown(6), fx.wealth(30), fx.affinity("spouse", -5)] } },
      { id: "love", text: t("Выбрать того, кого любишь", "Choose the one you love"), requires: [when.npc("partner")], success: { text: t("Сваты уезжают ни с чем. Род ворчит, но свадьба всё равно весёлая.", "The matchmakers leave empty-handed. The family grumbles, but the wedding is merry all the same."), effects: [fx.npcRole("partner", "spouse"), fx.flag("married"), fx.renown(-4), fx.affinity("family", -5), fx.affinity("spouse", 10)] } },
      { id: "refuse", text: t("Отказать", "Refuse"), success: { text: t("Отказ вежлив, но союзники обижены.", "The refusal is polite, but the allies are offended."), effects: [fx.renown(-2), fx.stat("willpower", 1)] } }
    ]
  }),
  legacy({
    id: "legacy.betrayal",
    title: t("Предательство", "Betrayal"),
    text: t("Кто-то из родни продал соперникам то, что знали только свои.", "One of the kin sold the rivals what only family knew."),
    minAge: 25,
    weight: 0.6,
    conditions: [when.npcAged("family", 18)],
    choices: [
      { id: "expose", text: t("Найти предателя", "Find the traitor"), check: check(["intelligence", "wisdom"], 13), success: { text: t("Предатель найден и изгнан из дома. Род знает, кому верить.", "The traitor is found and cast out. The family knows whom to trust."), effects: [fx.renown(3), fx.affinity("family", -5)] }, failure: { text: t("Подозрения падают на невиновного. Дом полон шёпота.", "Suspicion falls on an innocent. The house is full of whispers."), effects: [fx.renown(-6), fx.affinity("family", -10)] } },
      { id: "forgive", text: t("Простить и возместить потерю (15 золота)", "Forgive and cover the loss (15 gold)"), requires: [when.wealth(15)], success: { text: t("Прощение даётся тяжело. Но род помнит и это.", "Forgiveness comes hard. But the family remembers this too."), effects: [fx.wealth(-15), fx.karma(6), fx.thread("betrayal")] } },
      { id: "cut", text: t("Порвать с роднёй", "Break with the kin"), success: { text: t("Двери закрыты для всех, кто мог предать.", "The doors are shut to anyone who could betray."), effects: [fx.affinity("family", -10), fx.thread("family-feud")] } }
    ]
  }),
  legacy({
    id: "legacy.restore-name",
    title: t("Вернуть доброе имя", "Restore the family name"),
    text: t("Имя рода произносят с усмешкой. Ошибки предков легли на плечи {name}.", "The family name is spoken with a smirk. The ancestors' mistakes rest on {name}'s shoulders."),
    minAge: 18,
    cooldown: 10,
    maxOccurrences: 2,
    lineageMax: 4,
    conditions: [when.renownAtMost(-15)],
    choices: [
      { id: "deeds", text: t("Доказать делом", "Prove it with deeds"), check: check(["charisma", "willpower"], 13), success: { text: t("Люди начинают говорить о роде иначе.", "People begin to speak of the family differently."), effects: [fx.renown(15), fx.rep(5)] }, failure: { text: t("Мало кто заметил. Но начало положено.", "Few noticed. But it is a start."), effects: [fx.renown(3)] } },
      { id: "gold", text: t("Щедро жертвовать (50 золота)", "Donate generously (50 gold)"), requires: [when.wealth(50)], success: { text: t("Новый колокол на площади носит имя рода.", "A new bell in the square bears the family's name."), effects: [fx.wealth(-50), fx.renown(10)] } },
      { id: "accept", text: t("Жить своей жизнью", "Live your own life"), success: { text: t("Чужое прошлое — не приговор.", "Someone else's past is not a sentence."), effects: [fx.stat("wisdom", 1)] } }
    ]
  }),
  legacy({
    id: "legacy.heir-in-danger",
    title: t("Беда с наследником", "The heir in danger"),
    text: t("Гонец приносит весть: ваш взрослый ребёнок попал в беду далеко от дома.", "A messenger brings word: your grown child is in trouble far from home."),
    minAge: 40,
    weight: 0.3,
    lineageMax: 3,
    conditions: [when.npcAged("child", 16)],
    choices: [
      { id: "ride", text: t("Мчаться на помощь", "Ride to the rescue"), check: check(["vitality", "agility"], 14), success: { text: t("Вы успеваете. Ребёнок жив и никогда этого не забудет.", "You make it in time. The child lives and will never forget it."), effects: [fx.affinity("child", 20), fx.health(-10), fx.renown(3)] }, failure: { text: t("Вы опоздали. Домой возвращаетесь с гробом.", "You arrive too late. You return home with a coffin."), effects: [fx.npcDies("child"), fx.stat("willpower", 2), fx.thread("old-enemy")] } },
      { id: "send", text: t("Послать людей и золото (40 золота)", "Send men and gold (40 gold)"), requires: [when.wealth(40)], success: { text: t("Наёмники привозят ребёнка домой живым.", "The hired men bring the child home alive."), effects: [fx.wealth(-40), fx.affinity("child", 10)] } },
      { id: "pray", text: t("Ждать и молиться", "Wait and pray"), check: check(["luck"], 13), success: { text: t("Ребёнок выбирается сам. Отношения немного остыли.", "The child gets out alone. Your bond has cooled a little."), effects: [fx.affinity("child", -5)] }, failure: { text: t("Письмо приходит через месяц. Чёрная печать.", "A letter arrives a month later. A black seal."), effects: [fx.npcDies("child"), fx.karma(-3)] } }
    ]
  }),
  legacy({
    id: "legacy.rise",
    title: t("Возвышение рода", "The rise of the family"),
    text: t("Слава рода дошла до самых высоких дверей. Вас зовут туда, куда предков не пускали.", "The family's renown has reached the highest doors. You are invited where your ancestors were never admitted."),
    minAge: 25,
    lineageMax: 3,
    conditions: [when.renown(30)],
    choices: [
      { id: "accept", text: t("Войти в эти двери", "Walk through those doors"), success: { text: t("Род поднимается на ступень выше.", "The family rises a step higher."), effects: [fx.classStep(1), fx.renown(5), fx.rep(5)] } },
      { id: "modest", text: t("Остаться собой", "Stay who you are"), success: { text: t("Скромность прославляет род ещё больше.", "Modesty brings the family even more renown."), effects: [fx.karma(5), fx.renown(8)] } }
    ]
  }),
  legacy({
    id: "legacy.fall",
    title: t("Падение рода", "The fall of the family"),
    text: t("Кредиторы и сплетни подтачивают дом. Старые друзья больше не отвечают на письма.", "Creditors and gossip gnaw at the house. Old friends no longer answer letters."),
    minAge: 20,
    lineageMax: 3,
    conditions: [when.renownAtMost(-30)],
    choices: [
      { id: "sell", text: t("Продать фамильное имущество", "Sell the family estate"), success: { text: t("Долги закрыты. Положение — потеряно.", "The debts are paid. The standing is lost."), effects: [fx.classStep(-1), fx.wealth(40)] } },
      { id: "fight", text: t("Бороться за каждый клочок", "Fight for every scrap"), check: check(["intelligence", "charisma"], 15, 0, { skill: "trade" }), success: { text: t("Дом устоял. О роде снова говорят с уважением.", "The house stands. People speak of the family with respect again."), effects: [fx.renown(10)] }, failure: { text: t("Борьба только ускоряет падение.", "The struggle only hastens the fall."), effects: [fx.classStep(-1), fx.renown(-5)] } }
    ]
  }),
  legacy({
    id: "legacy.adopt-heir",
    title: t("Сирота у порога", "An orphan at the door"),
    text: t("Ребёнок без семьи смотрит на {name} так, будто давно ждал именно этого дома. Своих детей у {name} нет.", "A child with no family looks at {name} as if this were the very home they had waited for. {name} has no children of their own."),
    minAge: 30,
    maxAge: 65,
    lineageMax: 3,
    conditions: [when.noNpc("child")],
    choices: [
      { id: "adopt", text: t("Взять ребёнка в семью", "Take the child into the family"), success: { text: t("В доме снова слышен детский смех. Род продолжится.", "Children's laughter fills the house again. The line will continue."), effects: [fx.adopt(), fx.karma(5), fx.renown(2)] } },
      { id: "help", text: t("Помочь найти другой дом (10 золота)", "Help find another home (10 gold)"), requires: [when.wealth(10)], success: { text: t("Ребёнок уходит к добрым людям. Иногда он пишет.", "The child goes to kind people. Sometimes they write."), effects: [fx.wealth(-10), fx.karma(3)] } },
      { id: "pass", text: t("Пройти мимо", "Walk past"), success: { text: t("Дверь закрывается. Тишина в доме остаётся.", "The door closes. The silence in the house remains."), effects: [] } }
    ]
  }),
  legacy({
    id: "legacy.ancient-knowledge",
    title: t("Передача знания", "Passing on the knowledge"),
    text: t("Пора передать детям то, что род хранил поколениями.", "It is time to pass on to the children what the family has kept for generations."),
    minAge: 45,
    conditions: [when.npcAged("child", 14)],
    choices: [
      { id: "teach", text: t("Учить самому, год за годом", "Teach them yourself, year after year"), success: { text: t("Знание живёт в руках и памяти детей.", "The knowledge lives in the children's hands and memory."), effects: [fx.thread("ancient-knowledge"), fx.affinity("child", 10), fx.xp(30)] } },
      { id: "write", text: t("Записать всё в книгу рода", "Write it all in the family book"), success: { text: t("Книга будет ждать того, кто её откроет.", "The book will wait for whoever opens it."), effects: [fx.thread("ancient-knowledge"), fx.skill("lore", 5)] } },
      { id: "keep", text: t("Унести знание с собой", "Take the knowledge to the grave"), success: { text: t("Некоторым знаниям лучше умереть.", "Some knowledge is better left to die."), effects: [fx.stat("wisdom", 1), fx.thread("ancient-knowledge", false)] } }
    ]
  }),
  legacy({
    id: "legacy.relic-ancestral-blade",
    title: t("Клинок под половицей", "The blade beneath the floorboards"),
    text: t("При починке старого дома {name} находит под половицей свёрток: клинок в промасленной ткани и герб, которого нет в летописи рода.", "While repairing the old house, {name} finds a bundle beneath the floorboards: a blade wrapped in oiled cloth and a crest absent from the family chronicle."),
    minAge: 16,
    weight: 3,
    conditions: [when.world("dark-fantasy")],
    choices: [
      { id: "keep", text: t("Взять клинок в дом", "Take the blade into the house"), success: { text: t("Клинок занимает место над очагом. Теперь у рода есть своя реликвия.", "The blade takes its place above the hearth. The family has a relic of its own now."), effects: [fx.relic("ancestral-blade")] } },
      { id: "sell", text: t("Продать находку", "Sell the find"), success: { text: t("Старьёвщик платит без торга: герб ему знаком.", "The junk dealer pays without haggling: he knows the crest."), effects: [fx.wealth(12)] } }
    ]
  }),
  legacy({
    id: "legacy.relic-system-crystal",
    title: t("Осколок Системы", "A shard of the System"),
    text: t("За закрытые Врата Система выдаёт {name} награду, которой нет в её каталоге: тёплый кристалл с чужим рисунком граней.", "For the cleared Gate the System grants {name} a reward absent from its catalogue: a warm crystal with an unfamiliar pattern of facets."),
    minAge: 15,
    weight: 3,
    conditions: [when.world("isekai")],
    choices: [
      { id: "keep", text: t("Оставить кристалл себе", "Keep the crystal"), success: { text: t("Кристалл отзывается на мысли. Система молчит, но что-то в нём живёт.", "The crystal answers to thought. The System says nothing, but something lives within it."), effects: [fx.relic("system-crystal")] } },
      { id: "sell", text: t("Продать осколок оценщику", "Sell the shard to an appraiser"), success: { text: t("Оценщик долго вертит кристалл, потом называет цену.", "The appraiser turns the crystal for a long while, then names a price."), effects: [fx.wealth(18)] } }
    ]
  }),
  legacy({
    id: "legacy.relic-clan-scroll",
    title: t("Свиток в архиве", "The scroll in the archive"),
    text: t("Разбирая архив клана, {name} находит свиток с печатью основателя: записи о дыхании и воле, которых нет в открытых уроках.", "Sorting the clan archive, {name} finds a scroll bearing the founder's seal: notes on breath and will absent from the open lessons."),
    minAge: 16,
    weight: 3,
    conditions: [when.world("murim")],
    choices: [
      { id: "keep", text: t("Сохранить свиток для рода", "Keep the scroll for the family"), success: { text: t("Свиток переходит к роду. Старшие делают вид, что не заметили.", "The scroll passes to the family. The elders pretend not to notice."), effects: [fx.relic("clan-scroll")] } },
      { id: "return", text: t("Вернуть свиток клану", "Return the scroll to the clan"), success: { text: t("Старшие принимают свиток с поклоном. Клан запоминает жест.", "The elders accept the scroll with a bow. The clan remembers the gesture."), effects: [fx.rep(3), fx.karma(2)] } }
    ]
  }),
  legacy({
    id: "legacy.relic-spirit-root-amulet",
    title: t("Амулет у духовной жилы", "The amulet by the spirit vein"),
    text: t("На испытании у духовной жилы старейшина вкладывает в руку {name} амулет: «Твой корень откликается. Пусть вещь помнит это».", "At the trial by the spirit vein, an elder places an amulet in {name}'s hand: 'Your root answers. Let this thing remember it.'"),
    minAge: 12,
    weight: 3,
    conditions: [when.world("xianxia")],
    choices: [
      { id: "keep", text: t("Принять амулет", "Accept the amulet"), success: { text: t("Амулет теплеет на ладони, будто внутри дышит ци.", "The amulet warms in the palm as if qi breathes inside."), effects: [fx.relic("spirit-root-amulet")] } },
      { id: "decline", text: t("Отказаться от дара", "Decline the gift"), success: { text: t("Старейшина кивает: не всякий дар нужно брать.", "The elder nods: not every gift must be taken."), effects: [fx.karma(1), fx.stat("willpower", 1)] } }
    ]
  }),
  legacy({
    id: "legacy.relic-gate-hunter-badge",
    title: t("Знак павшего охотника", "A fallen hunter's badge"),
    text: t("В вещах охотника, чей рейд закончился плохо, {name} находит значок с номером. Ассоциация не успела его изъять.", "Among the belongings of a hunter whose raid ended badly, {name} finds a numbered badge. The Association has not yet reclaimed it."),
    minAge: 18,
    weight: 3,
    conditions: [when.world("hunter")],
    choices: [
      { id: "keep", text: t("Оставить значок себе", "Keep the badge"), success: { text: t("Металл холодный, но у входа в Врата его узнают.", "The metal is cold, but at the Gate entrance they recognise it."), effects: [fx.relic("gate-hunter-badge")] } },
      { id: "return", text: t("Передать значок Ассоциации", "Hand the badge to the Association"), success: { text: t("Ассоциация благодарит коротко и по-казённому.", "The Association thanks you briefly and officially."), effects: [fx.rep(3)] } }
    ]
  }),
  legacy({
    id: "legacy.relic-noble-signet",
    title: t("Перстень с печатью", "The signet ring"),
    text: t("В бумагах семейного поверенного {name} находит перстень с печатью: им скрепляли письма, о которых род предпочитал молчать.", "Among the family lawyer's papers, {name} finds a signet ring: it sealed letters the family preferred not to mention."),
    minAge: 16,
    weight: 3,
    conditions: [when.world("academy")],
    choices: [
      { id: "keep", text: t("Оставить перстень роду", "Keep the ring for the family"), success: { text: t("Печать снова принадлежит дому. Двери открываются чуть легче.", "The seal belongs to the house again. Doors open a little more easily."), effects: [fx.relic("noble-signet")] } },
      { id: "sell", text: t("Продать перстень антиквару", "Sell the ring to an antiquary"), success: { text: t("Антиквар платит щедро и не задаёт вопросов о гербе.", "The antiquary pays generously and asks no questions about the crest."), effects: [fx.wealth(20)] } }
    ]
  }),
  legacy({
    id: "legacy.relic-demand",
    title: t("Долг предка", "An ancestor's debt"),
    text: t("Кредитор с гербовой печатью приносит письмо: предок заложил одну из реликвий рода. Он готов принять сам предмет вместо долга.", "A creditor with a sealed letter arrives: an ancestor pledged one of the family relics. He is willing to take the object itself instead of the debt."),
    minAge: 16,
    cooldown: 15,
    maxOccurrences: 2,
    lineageMax: 2,
    weight: 1.5,
    conditions: [when.anyRelic()],
    choices: [
      { id: "refuse", text: t("Отказать и заплатить словом", "Refuse and pay with words"), success: { text: t("Кредитор уходит ни с чем. В городе помнят, что род не отдаёт своё.", "The creditor leaves empty-handed. The city remembers that the family does not give up its own."), effects: [fx.renown(-2)] } },
      { id: "give-ancestral-blade", text: t("Отдать предковый клинок", "Surrender the Ancestral Blade"), requires: [when.relic("ancestral-blade")], success: { text: t("Клинок уходит в чужие руки. Долг закрыт, но память о нём остаётся.", "The blade passes into foreign hands. The debt is closed, but the memory remains."), effects: [fx.loseRelic("ancestral-blade"), fx.karma(2)] } },
      { id: "give-system-crystal", text: t("Отдать кристалл Системы", "Surrender the System Crystal"), requires: [when.relic("system-crystal")], success: { text: t("Кристалл гаснет в чужой ладони. Кредитор доволен больше, чем следовало бы.", "The crystal dims in a foreign palm. The creditor looks more pleased than he should."), effects: [fx.loseRelic("system-crystal"), fx.karma(2)] } },
      { id: "give-clan-scroll", text: t("Отдать свиток клана", "Surrender the Clan Scroll"), requires: [when.relic("clan-scroll")], success: { text: t("Свиток покидает дом. Часть клановой памяти уходит вместе с ним.", "The scroll leaves the house. Part of the clan's memory goes with it."), effects: [fx.loseRelic("clan-scroll"), fx.karma(2)] } },
      { id: "give-spirit-root-amulet", text: t("Отдать амулет духовного корня", "Surrender the Spirit Root Amulet"), requires: [when.relic("spirit-root-amulet")], success: { text: t("Амулет больше не отвечает на вашу ци. Он чужой.", "The amulet no longer answers your qi. It belongs to someone else."), effects: [fx.loseRelic("spirit-root-amulet"), fx.karma(2)] } },
      { id: "give-gate-hunter-badge", text: t("Отдать знак охотника Врат", "Surrender the Gate Hunter Badge"), requires: [when.relic("gate-hunter-badge")], success: { text: t("Знак исчезает в кармане кредитора. У Врат больше не узнают ваш номер.", "The badge disappears into the creditor's pocket. At the Gates they no longer know your number."), effects: [fx.loseRelic("gate-hunter-badge"), fx.karma(2)] } },
      { id: "give-noble-signet", text: t("Отдать знак знати", "Surrender the Noble Signet"), requires: [when.relic("noble-signet")], success: { text: t("Печать переходит к чужому роду. Ваши письма теперь скрепляет простая сургучная лепёшка.", "The seal passes to another house. Your letters are now sealed with plain wax."), effects: [fx.loseRelic("noble-signet"), fx.karma(2)] } }
    ]
  }),
  /** Демонстрационная сюжетная цепочка Stage 04.4: фамильный сюжет с этапами, выборами и ветвящимися концами. */
  legacy({
    id: "story.broken-oath.1",
    title: t("Семейная скрипта", "The family crypt"),
    text: t("В подвале родового дома {name} находит запертую ларём скрипту. На крышке выгравировано имя предка и дата, которой нет в летописи рода.", "In the basement of the family home {name} finds a chest locked with an old lidded jar. The lid is engraved with an ancestor's name and a date not found in the family chronicle."),
    minAge: 16,
    maxOccurrences: 1,
    lineageMax: 1,
    choices: [
      {
        id: "enter",
        text: t("Вскрыть ларь и прочитать скрипту", "Break the seal and read the letter"),
        success: {
          text: t("Слово предка пробуждает вопросы, на которые предок не успел ответить.", "The ancestor's word awakens questions the ancestor never had time to answer."),
          effects: [fx.advanceStory("story.broken-oath", 0, 1, "lineage"), fx.recordStoryChoice("story.broken-oath", "story.broken-oath.1", "enter", "lineage"), fx.schedule("story.broken-oath.2", 5)]
        }
      },
      {
        id: "leave",
        text: t("Оставить скрипту нетронутой", "Leave the letter untouched"),
        success: {
          text: t("Тайна остаётся запечатанной, как и велели предки.", "The secret remains sealed, as the ancestors commanded."),
          effects: [fx.completeStory("story.broken-oath", "lineage")]
        }
      }
    ]
  }),
  legacy({
    id: "story.broken-oath.2",
    scheduledOnly: true,
    maxOccurrences: 1,
    lineageMax: 1,
    title: t("Дневник клятвопренебрежца", "The oathbreaker's journal"),
    text: t("Пять лет спустя {name} находит в потайном ящике стола дневник того samego предка. Страницы пусты до середины, а затем начинаются записи о клятве, которую предок нарушил.", "Five years later {name} finds a secret drawer in the desk containing the journal of that same ancestor. Its pages are blank until the middle, where entries begin about an oath the ancestor broke."),
    minAge: 21,
    conditions: [when.storyStage("story.broken-oath", 1, "lineage")],
    choices: [
      {
        id: "read",
        text: t("Прочитать записи до конца", "Read the entries to the end"),
        success: {
          text: t("Клятва нарушена ради спасения рода. Предок просит потомка решить, что делать с этим знанием.", "The oath was broken to save the line. The ancestor asks the descendant to decide what to do with this knowledge."),
          effects: [fx.advanceStory("story.broken-oath", 1, 2, "lineage"), fx.recordStoryChoice("story.broken-oath", "story.broken-oath.2", "read", "lineage"), fx.schedule("story.broken-oath.3", 8)]
        }
      },
      {
        id: "hide",
        text: t("Спрятать дневник обратно", "Hide the journal back"),
        success: {
          text: t("Предковые тайны должны оставаться предковыми.", "Ancestral secrets must remain ancestral."),
          effects: [fx.completeStory("story.broken-oath", "lineage")]
        }
      }
    ]
  }),
  legacy({
    id: "story.broken-oath.3",
    scheduledOnly: true,
    maxOccurrences: 1,
    lineageMax: 1,
    title: t("Суд предка", "The ancestor's judgment"),
    text: t("Восемь лет спустя {name} стоит перед семейным порогом и чувствует, как выбор предка переносится на его плечи. Принять клятву или отвергнуть её?", "Eight years later {name} stands at the family threshold and feels the ancestor's choice transferred to their shoulders. Accept the oath or reject it?"),
    minAge: 29,
    conditions: [when.storyStage("story.broken-oath", 2, "lineage"), when.storyChoice("story.broken-oath", "story.broken-oath.2", "read", "lineage")],
    choices: [
      {
        id: "accept",
        text: t("Принять клятву и продолжить дело", "Accept the oath and continue the cause"),
        success: {
          text: t("Род обретает новую цель. Предок был бы доволен.", "The line gains a new purpose. The ancestor would be pleased."),
          effects: [fx.completeStory("story.broken-oath", "lineage"), fx.renown(5)]
        }
      },
      {
        id: "reject",
        text: t("Отвергнуть клятву и идти своей дорогой", "Reject the oath and walk your own road"),
        success: {
          text: t("Род теряет направление, но обретает свободу выбора.", "The line loses its direction but gains freedom of choice."),
          effects: [fx.completeStory("story.broken-oath", "lineage"), fx.renown(-5)]
        }
      }
    ]
  })
];

/** Последствия для рода: наступают по годам рода, даже если вызвавший их персонаж уже умер */
export const LINEAGE_CONSEQUENCES: readonly ConsequenceDefinition[] = [
  {
    id: "legacy.c-rite-blessing",
    title: t("Благословение обряда", "The rite's blessing"),
    text: t("Тот, ради кого когда-то провели родовой обряд, вырос. Удача рода с ним.", "The one for whom the family rite was once held has grown up. The family's luck is with them."),
    effects: [fx.stat("luck", 2), fx.renown(2)]
  },
  {
    id: "legacy.c-lost-found",
    title: t("Пропавший найден", "The lost one is found"),
    text: t("Нанятые много лет назад люди наконец приносят весть: пропавший жив.", "The men hired years ago finally bring word: the lost one is alive."),
    conditions: [when.missingKin()],
    effects: [fx.kinReturns(), fx.affinity("family", 5)]
  },
  {
    id: "legacy.c-enemy-returns",
    title: t("Старый враг напоминает о себе", "The old enemy makes itself known"),
    text: t("Сгоревший амбар, распущенные слухи. Враг рода не забыл.", "A burned barn, spread rumours. The family's enemy has not forgotten."),
    conditions: [when.thread("old-enemy")],
    effects: [fx.wealth(-15), fx.rep(-3), fx.schedule("legacy.old-enemy", 1)]
  },
  {
    id: "legacy.c-knowledge",
    title: t("Знание предков", "The ancestors' knowledge"),
    text: t("Книга рода открывается на нужной странице. То, что знали предки, теперь знает {name}.", "The family book opens to the right page. What the ancestors knew, {name} now knows."),
    conditions: [when.thread("ancient-knowledge")],
    effects: [fx.xp(50), fx.stat("wisdom", 2), fx.track(10), fx.skill("lore", 5)]
  }
];

export function findLineageConsequence(id: string): ConsequenceDefinition | undefined {
  return LINEAGE_CONSEQUENCES.find((c) => c.id === id);
}
