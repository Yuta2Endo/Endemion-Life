// Девять Рек, Stage 02: праведный союз и тёмный культ, искажение ци у идущих тёмным путём, честь кланов
import { t } from "../i18n.js";
import { check, fx, when } from "../narrative/dsl.js";
import type { WorldDefinition } from "./types.js";

export const MURIM_WORLD: WorldDefinition = {
  mechanics: [
    { name: t("Искажение ци", "Qi deviation"), description: t("Тёмный путь ускоряет рост силы, но ци искажается. С 60 оно ранит тело каждый год, на 100 — убивает.", "The dark path speeds growth, but qi deviates. From 60 it wounds the body every year; at 100 it kills.") },
    { name: t("Праведные и тёмные", "Orthodox and demonic"), description: t("Праведный союз и тёмный культ следят за каждым бойцом. Их отношение открывает и закрывает двери.", "The Orthodox Alliance and the Demonic Cult watch every fighter. Their regard opens and closes doors.") },
    { name: t("Лицо", "Face"), description: t("Честь в цзянху важнее золота: поединки и обиды запоминаются надолго.", "Honour in the jianghu matters more than gold: duels and slights are long remembered.") }
  ],
  originProfiles: {
    "clan-heir": { socialClassId: "clan", skills: { "martial-arts": 8, persuasion: 3 }, factions: { "orthodox-alliance": 10 }, history: t("Клан Цзян держит переправу через Третью реку уже двести лет. Старейшины ждут от наследника славы.", "The Jiang clan has held the Third River crossing for two hundred years. The elders expect glory from the heir.") },
    "sect-disciple": { socialClassId: "disciple", family: "foundling", skills: { "martial-arts": 6, "inner-cultivation": 3 }, factions: { "orthodox-alliance": 15 }, history: t("Корзину с младенцем нашли у ворот праведной секты на рассвете праздника Фонарей.", "A basket with an infant was found at the righteous sect's gates on the morning of the Lantern Festival.") },
    "street-rat": { socialClassId: "commoner", family: "single", skills: { stealth: 8, athletics: 3 }, history: t("Мать торгует лепёшками у пристани. Отец ушёл в цзянху и не вернулся.", "Mother sells flatbreads at the pier. Father left for the jianghu and never returned.") },
    "physician-child": { socialClassId: "commoner", skills: { medicine: 10 }, history: t("Род лекарей лечит всех: праведных, тёмных и бандитов. Поэтому их не трогает никто.", "A line of physicians treats everyone: righteous, demonic and bandits alike. That is why no one touches them.") }
  },
  raceTalents: { human: ["meridian-prodigy"] },
  socialClasses: [
    { id: "commoner", name: t("Простолюдин", "Commoner"), description: t("Рынок, пристань и налоги чиновнику.", "Market, pier and taxes to the magistrate."), standing: 1, income: 1, occupations: [t("Лодочник", "Boatman"), t("Торговка лепёшками", "Flatbread seller"), t("Носильщик", "Porter")] },
    { id: "disciple", name: t("Ученик секты", "Sect disciple"), description: t("Миска риса, тренировки и устав.", "A bowl of rice, training and the rules."), standing: 2, income: 1, occupations: [t("Старший брат секты", "Senior sect brother")] },
    { id: "wanderer", name: t("Странствующий воин", "Wandering martial artist"), description: t("Меч, дорога и чужие долги.", "A sword, the road and other people's debts."), standing: 2, income: 2, occupations: [t("Странствующий мечник", "Wandering swordsman")] },
    { id: "clan", name: t("Великий клан", "Great clan"), description: t("Кровь, земля и древние техники.", "Blood, land and ancient techniques."), standing: 3, income: 4, occupations: [t("Старейшина клана", "Clan elder"), t("Глава ветви клана", "Head of a clan branch")] },
    { id: "sect-elder", name: t("Старейшина", "Elder"), description: t("Те, чьё слово решает судьбы учеников.", "Those whose word decides the fate of disciples."), standing: 4, income: 6, occupations: [t("Старейшина секты", "Sect elder")] }
  ],
  meters: [{ id: "qi-deviation", name: t("Искажение ци", "Qi deviation"), description: t("Ци течёт не туда. Тёмные техники копят искажение.", "Qi flows the wrong way. Demonic techniques build deviation."), min: 0, max: 100, initial: 0, danger: true }],
  factions: [
    { id: "orthodox-alliance", name: t("Праведный союз", "Orthodox Alliance"), description: t("Девять сект, клянущихся защищать слабых.", "Nine sects sworn to protect the weak.") },
    { id: "demonic-cult", name: t("Тёмный культ", "Demonic Cult"), description: t("Те, кому сила важнее пути.", "Those for whom power matters more than the way.") },
    { id: "beggars-sect", name: t("Секта нищих", "Beggars' Sect"), description: t("Глаза и уши цзянху.", "The eyes and ears of the jianghu.") }
  ],
  skills: [
    { id: "martial-arts", name: t("Боевые искусства", "Martial arts"), description: t("Стойки, удары и формы школы.", "Stances, strikes and the school's forms."), category: "combat", stats: ["agility", "strength"] },
    { id: "inner-cultivation", name: t("Внутренняя работа", "Inner cultivation"), description: t("Дыхание, меридианы и даньтян.", "Breath, meridians and the dantian."), category: "cultivation", stats: ["willpower", "vitality"] },
    { id: "lightness", name: t("Искусство лёгкости", "Lightness skill"), description: t("Бег по крышам и воде.", "Running over rooftops and water."), category: "combat", stats: ["agility", "willpower"] }
  ],
  talents: [
    { id: "meridian-prodigy", name: t("Открытые меридианы", "Open meridians"), description: t("Ци течёт свободно, как вода по руслу.", "Qi flows freely, like water in its bed."), trackFactor: 1.25, skills: ["inner-cultivation"], checks: ["willpower"], weight: 0.7 },
    { id: "sword-heart", name: t("Сердце меча", "Sword heart"), description: t("Клинок понимает мысль раньше руки.", "The blade understands thought before the hand."), growth: ["agility"], skills: ["martial-arts"], checks: ["agility"] },
    { id: "iron-skin", name: t("Железная кожа", "Iron skin"), description: t("Удары оставляют синяки, а не раны.", "Blows leave bruises, not wounds."), growth: ["vitality"], checks: ["vitality"] }
  ],
  weaknesses: [
    { id: "blocked-meridian", name: t("Закупоренный меридиан", "Blocked meridian"), description: t("Ци упирается в узел и не идёт дальше.", "Qi hits a knot and goes no further."), trackFactor: 0.8, conflicts: ["meridian-prodigy"] },
    { id: "short-temper", name: t("Горячая кровь", "Hot blood"), description: t("Обида требует ответа немедленно.", "A slight demands an answer at once."), checks: ["wisdom"] }
  ],
  professions: [
    { id: "escort", name: t("Охрана караванов", "Caravan escort"), description: t("Охранное бюро и дорога меж рек.", "An escort agency and the road between rivers."), skill: "martial-arts", stats: ["strength", "agility"], base: 4 },
    { id: "physician", name: t("Лекарь", "Physician"), description: t("Иглы, травы и точки меридианов.", "Needles, herbs and meridian points."), skill: "medicine", stats: ["intelligence", "wisdom"], base: 4 },
    { id: "informant", name: t("Осведомитель", "Informant"), description: t("Слухи стоят денег.", "Rumours are worth money."), skill: "stealth", stats: ["charisma", "agility"], base: 3 }
  ],
  education: [
    { id: "mu-village-school", name: t("Деревенская школа", "Village school"), description: t("Иероглифы и классические тексты.", "Characters and the classics."), tier: 1, skills: ["lore"] },
    { id: "mu-outer-court", name: t("Внешний двор секты", "Sect outer court"), description: t("Базовые формы и устав секты.", "Basic forms and the sect's rules."), tier: 2, skills: ["martial-arts", "inner-cultivation"] },
    { id: "mu-inner-court", name: t("Внутренний двор", "Inner court"), description: t("Сокровенные техники для избранных.", "Secret techniques for the chosen."), tier: 3, skills: ["inner-cultivation", "lightness"] }
  ],
  specializations: [
    { id: "swordsman", name: t("Путь меча", "Way of the sword"), description: t("Один клинок, тысяча форм.", "One blade, a thousand forms."), statBonus: { agility: 2, willpower: 1 }, skill: "martial-arts" },
    { id: "fist", name: t("Путь кулака", "Way of the fist"), description: t("Тело как оружие.", "The body as a weapon."), statBonus: { strength: 2, vitality: 1 }, skill: "martial-arts" },
    { id: "needle", name: t("Путь иглы", "Way of the needle"), description: t("Лечить и убивать одним касанием.", "Healing and killing with one touch."), statBonus: { intelligence: 2, agility: 1 }, skill: "medicine" }
  ],
  familySecrets: [
    { id: "mu-demon-father", name: t("Отец из культа", "A father from the cult"), hint: t("Мать прячет под половицей кинжал с чёрной кисточкой.", "Mother hides a dagger with a black tassel under the floorboards."), reveal: t("Отец был мастером тёмного культа. Его техника записана на обороте кинжала.", "Father was a master of the Demonic Cult. His technique is written on the back of the dagger."), effects: [fx.faction("demonic-cult", 20), fx.ability("blood-art"), fx.meter("qi-deviation", 10)], origins: ["street-rat", "sect-disciple"] },
    { id: "mu-lost-manual", name: t("Потерянный трактат", "The lost manual"), hint: t("Дед перед смертью шептал о тайнике под третьей ступенью храма.", "Before dying, grandfather whispered of a cache beneath the temple's third step."), reveal: t("Под ступенью — трактат утерянной школы. Его ищет половина цзянху.", "Beneath the step lies a lost school's manual. Half the jianghu is searching for it."), effects: [fx.skill("inner-cultivation", 10), fx.track(15)] },
    { id: "mu-blood-feud", name: t("Кровная месть", "A blood feud"), hint: t("Раз в год семья молча зажигает свечу за человека, имени которого не называют.", "Once a year the family silently lights a candle for someone whose name is never spoken."), reveal: t("Клан Тан вырезал прежнюю семью. Месть ждёт уже двадцать лет.", "The Tang clan slaughtered the former family. Vengeance has waited twenty years."), effects: [fx.npc("rival"), fx.stat("willpower", 2)] }
  ],
  birthplaces: [
    t("пристань у Третьей реки", "a pier on the Third River"),
    t("ворота праведной секты на горе Хуа", "the gate of a righteous sect on Mount Hua"),
    t("поместье великого клана", "a great clan's estate"),
    t("лавка лекаря на рыночной улице", "a physician's shop on the market street")
  ],
  omens: [
    { text: t("Над рекой всю ночь кричали журавли.", "Cranes cried over the river all night.") },
    { text: t("В ту ночь на горе треснул древний меч в храме.", "That night an ancient sword cracked in the mountain temple."), minDestiny: 7 },
    { text: t("Странствующий монах оставил у дверей чашу риса и ушёл.", "A wandering monk left a bowl of rice at the door and walked away.") },
    { text: t("В небе прошла звезда с красным хвостом — знак великого бойца.", "A red-tailed star crossed the sky — the sign of a great martial artist."), minDestiny: 9 }
  ],
  npcTitles: {
    mentor: [t("Отшельник с горы", "Mountain hermit"), t("Безногий мастер меча", "Legless sword master")],
    teacher: [t("Старший брат секты", "Senior sect brother"), t("Сельский книжник", "Village scholar")],
    rival: [t("Наследник клана Тан", "Heir of the Tang clan"), t("Гордый ученик соседней секты", "Proud disciple of a rival sect")],
    friend: [t("Мальчишка из Секты нищих", "Boy from the Beggars' Sect"), t("Дочь лодочника", "Boatman's daughter")]
  },
  consequences: [
    { id: "mu.c-bandit-revenge", title: t("Месть разбойников", "The bandits' revenge"), text: t("Атаман, которого {name} когда-то опозорил, вернулся с братьями.", "The chieftain {name} once shamed has returned with his brothers."), chance: 0.7, effects: [fx.health(-25), fx.npc("rival")] },
    { id: "mu.c-saved-merchant", title: t("Долг спасённого", "The rescued man's debt"), text: t("Купец, спасённый от разбойников, разбогател и не забыл: он присылает подарки и рекомендации.", "The merchant saved from bandits has grown rich and not forgotten: he sends gifts and recommendations."), effects: [fx.wealth(50), fx.rep(5), fx.npc("friend")] },
    { id: "mu.c-cult-summons", title: t("Зов культа", "The cult's summons"), text: t("Тёмный культ напоминает, что его техники не бывают бесплатными.", "The Demonic Cult reminds that its techniques are never free."), conditions: [when.flag("demonic-path")], effects: [fx.faction("demonic-cult", 10), fx.faction("orthodox-alliance", -15), fx.meter("qi-deviation", 10)] },
    { id: "mu.c-duel-fame", title: t("Слава поединка", "Fame of the duel"), text: t("О поединке {name} поют в чайных. Ученики ищут встречи.", "Teahouses sing of {name}'s duel. Students seek a meeting."), effects: [fx.rep(8), fx.faction("orthodox-alliance", 5)] }
  ],
  abilityCategories: { "light-step": "combat", "sword-qi": "combat", "blood-art": "cultivation" },
  abilities: [
    { id: "pressure-points", name: t("Удар по точкам", "Pressure-point strike"), description: t("Одно касание — и противник не двигается.", "One touch and the opponent cannot move."), category: "combat" },
    { id: "golden-bell", name: t("Золотой колокол", "Golden Bell"), description: t("Ци одевает тело в броню.", "Qi clothes the body in armour."), category: "cultivation" }
  ],
  events: [
    {
      id: "mu.village-school",
      kind: "personal",
      title: t("Учитель иероглифов", "The calligraphy teacher"),
      text: t("Старый книжник набирает учеников. Платить можно рисом.", "An old scholar takes students. Payment in rice is accepted."),
      minAge: 6,
      maxAge: 10,
      maxOccurrences: 1,
      conditions: [when.educationAtMost(0)],
      choices: [
        { id: "study", text: t("Учиться", "Study"), success: { text: t("Кисть оставляет первые ровные знаки.", "The brush leaves its first even strokes."), effects: [fx.education("mu-village-school"), fx.npc("teacher")] } },
        { id: "fight", text: t("Учиться драться на улице", "Learn to fight in the street"), success: { text: t("Кулаки становятся крепче.", "The fists grow harder."), effects: [fx.skill("martial-arts", 4), fx.stat("strength", 1)] } }
      ]
    },
    {
      id: "mu.outer-court",
      kind: "path",
      title: t("Экзамен у ворот", "The gate exam"),
      text: t("Праведная секта открывает ворота для новых учеников. Экзамен — подняться на гору без отдыха.", "A righteous sect opens its gates to new disciples. The exam: climb the mountain without rest."),
      minAge: 8,
      maxAge: 16,
      maxOccurrences: 1,
      conditions: [when.educationAtMost(1)],
      choices: [
        { id: "climb", text: t("Подниматься", "Climb"), check: check(["vitality", "willpower"], 10), success: { text: t("На вершине ждёт старший брат с чашей воды.", "At the top a senior brother waits with a cup of water."), effects: [fx.education("mu-outer-court"), fx.flag("martial-school"), fx.socialClass("disciple"), fx.faction("orthodox-alliance", 10)] }, failure: { text: t("Ноги подкосились на последней сотне ступеней.", "The legs gave way on the last hundred steps."), effects: [fx.stat("willpower", 1)] } },
        { id: "skip", text: t("Не идти", "Don't go"), success: { text: t("Дом важнее.", "Home matters more."), effects: [fx.affinity("family", 5)] } }
      ]
    },
    {
      id: "mu.deviation-crisis",
      kind: "stat",
      title: t("Ци обращается вспять", "Qi turns back"),
      text: t("Во время медитации ци рвётся из даньтяня. Перед глазами темнеет.", "During meditation qi tears out of the dantian. Vision darkens."),
      minAge: 12,
      cooldown: 4,
      conditions: [when.meter("qi-deviation", 45)],
      choices: [
        { id: "calm", text: t("Усмирить дыхание", "Calm the breath"), check: check(["willpower", "wisdom"], 14, 0, { skill: "inner-cultivation" }), success: { text: t("Ци возвращается в русло.", "Qi returns to its course."), effects: [fx.meter("qi-deviation", -20), fx.skill("inner-cultivation", 3)] }, failure: { text: t("Кровь горлом. Меридианы повреждены.", "Blood in the throat. The meridians are damaged."), effects: [fx.health(-30), fx.weakness("blocked-meridian")] } },
        { id: "healer", text: t("Позвать лекаря иглами", "Call a needle physician"), requires: [when.wealth(30)], success: { text: t("Тридцать игл, ночь боли — и облегчение.", "Thirty needles, a night of pain — and relief."), effects: [fx.wealth(-30), fx.meter("qi-deviation", -30)] } }
      ]
    },
    {
      id: "mu.clan-duty",
      kind: "family",
      title: t("Долг перед кланом", "Duty to the clan"),
      text: t("Старейшины клана велят вступить в брак ради союза с соседним кланом.", "The clan elders order a marriage for an alliance with a neighbouring clan."),
      minAge: 18,
      maxAge: 30,
      maxOccurrences: 1,
      conditions: [when.socialClass("clan"), when.noNpc("spouse")],
      choices: [
        { id: "obey", text: t("Подчиниться", "Obey"), success: { text: t("Свадьба пышная. Супруг вежлив и чужд.", "The wedding is lavish. The spouse is polite and distant."), effects: [fx.npc("spouse"), fx.affinity("spouse", -20), fx.affinity("parent", 15), fx.flag("married"), fx.rep(5)] } },
        { id: "refuse", text: t("Отказаться", "Refuse"), check: check(["charisma", "willpower"], 13), success: { text: t("Старейшины уступают, но запоминают.", "The elders yield, but remember."), effects: [fx.affinity("parent", -15), fx.stat("willpower", 2)] }, failure: { text: t("Изгнание из клана.", "Exile from the clan."), effects: [fx.socialClass("wanderer"), fx.affinity("family", -25), fx.wealth(-20)] } }
      ]
    },
    {
      id: "mu.rival-challenge",
      kind: "npc",
      title: t("Перчатка соперника", "The rival's gauntlet"),
      text: t("Соперник при свидетелях вызывает {name} на поединок на мосту. Отказ — потеря лица.", "Before witnesses the rival challenges {name} to a duel on the bridge. Refusing means losing face."),
      minAge: 14,
      cooldown: 5,
      conditions: [when.npc("rival")],
      choices: [
        { id: "duel", text: t("Принять вызов", "Accept"), check: check(["agility", "strength"], 11, 0, { skill: "martial-arts", versus: "rival" }), success: { text: t("Клинок соперника летит в реку.", "The rival's blade flies into the river."), effects: [fx.rep(10), fx.affinity("rival", 15), fx.skill("martial-arts", 3), fx.later("mu.c-duel-fame", 2)] }, failure: { text: t("Поражение на мосту. Позор держится долго.", "Defeat on the bridge. The shame lingers."), effects: [fx.rep(-10), fx.health(-25), fx.weakness("short-temper")] } },
        { id: "bow", text: t("Поклониться и уйти", "Bow and walk away"), success: { text: t("Лицо потеряно, жизнь сохранена.", "Face lost, life kept."), effects: [fx.rep(-6), fx.stat("wisdom", 2)] } }
      ]
    },
    {
      id: "mu.specialize",
      kind: "path",
      title: t("Выбор пути", "Choosing the way"),
      text: t("Мастер говорит: пора выбрать свой путь. Меч, кулак или игла.", "The master says: time to choose your way. Sword, fist or needle."),
      minAge: 16,
      maxOccurrences: 1,
      conditions: [when.rank(2), when.noSpecialization()],
      choices: [
        { id: "sword", text: t("Путь меча", "Way of the sword"), success: { text: t("Меч становится продолжением руки.", "The sword becomes an extension of the arm."), effects: [fx.specialization("swordsman")] } },
        { id: "fist", text: t("Путь кулака", "Way of the fist"), success: { text: t("Тело закаляется как сталь.", "The body is tempered like steel."), effects: [fx.specialization("fist"), fx.ability("golden-bell")] } },
        { id: "needle", text: t("Путь иглы", "Way of the needle"), success: { text: t("Тысяча точек тела открывают тайны.", "A thousand points of the body reveal their secrets."), effects: [fx.specialization("needle"), fx.ability("pressure-points")] } }
      ]
    },
    {
      id: "mu.inner-court",
      kind: "path",
      title: t("Внутренний двор", "The inner court"),
      text: t("Старейшина приглашает лучших во внутренний двор, где учат сокровенным техникам.", "An elder invites the best into the inner court, where secret techniques are taught."),
      minAge: 15,
      maxOccurrences: 1,
      conditions: [when.education(2), when.rank(1), when.faction("orthodox-alliance", 10)],
      choices: [
        { id: "enter", text: t("Войти", "Enter"), check: check(["willpower", "agility"], 13, 0, { skill: "inner-cultivation" }), success: { text: t("Ворота внутреннего двора закрываются за спиной.", "The inner court's gates close behind."), effects: [fx.education("mu-inner-court"), fx.npc("mentor"), fx.track(10)] }, failure: { text: t("Старейшина качает головой: не сейчас.", "The elder shakes his head: not now."), effects: [fx.skill("inner-cultivation", 2)] } }
      ]
    }
  ]
};
