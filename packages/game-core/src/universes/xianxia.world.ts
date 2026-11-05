// Небесный Предел, Stage 02: сердце Дао и кармический долг, секты и бессмертные кланы, века жизни культиватора
import { t } from "../i18n.js";
import { check, fx, when } from "../narrative/dsl.js";
import type { WorldDefinition } from "./types.js";

export const XIANXIA_WORLD: WorldDefinition = {
  mechanics: [
    { name: t("Сердце Дао", "Dao heart"), description: t("Мудрый культиватор с корнем духа укрепляет сердце Дао: оно ускоряет культивацию.", "A wise cultivator with a spirit root strengthens the Dao heart, which speeds cultivation.") },
    { name: t("Кармический долг", "Karmic debt"), description: t("Злые дела копят долг перед Небесами. Большой долг замедляет культивацию и делает скорбь опаснее.", "Evil deeds build a debt to the Heavens. A large debt slows cultivation and makes tribulation deadlier.") },
    { name: t("Века жизни", "Centuries of life"), description: t("Культиваторы переживают смертных родных. Сильные наставники живут веками.", "Cultivators outlive their mortal kin. Powerful masters live for centuries.") }
  ],
  originProfiles: {
    "farm-child": { socialClassId: "mortal", skills: { survival: 5, athletics: 3 }, history: t("Семья выращивает рис у подножия священной горы. Деды говорят, что когда-то в роду был бессмертный.", "The family grows rice at the foot of a sacred mountain. The elders say there was once an immortal in the line.") },
    "outer-disciple": { socialClassId: "outer-sect", skills: { cultivation: 6 }, factions: { "cloud-peak": 10 }, history: t("Родители отдали ребёнка в секту за горсть духовных камней: так было лучше для всех.", "The parents gave the child to the sect for a handful of spirit stones: it was better for everyone.") },
    "cultivator-clan": { socialClassId: "clan-scion", skills: { cultivation: 10, alchemy: 3 }, factions: { "cloud-peak": 15 }, history: t("Клан культиваторов живёт на собственном духовном источнике. Предки смотрят с портретов уже триста лет.", "The cultivator clan lives on its own spirit spring. Ancestors have gazed down from portraits for three hundred years.") },
    beggar: { socialClassId: "mortal", family: "foundling", skills: { stealth: 6 }, history: t("Ни имени, ни дома. Только старый нищий, который делился рисом и умер прошлой зимой.", "No name, no home. Only an old beggar who shared his rice and died last winter.") }
  },
  raceTalents: { "fox-spirit": ["fox-charm"], "half-dragon": ["dragon-vein"], human: ["heavenly-root"] },
  socialClasses: [
    { id: "mortal", name: t("Смертный", "Mortal"), description: t("Рис, налоги и короткая жизнь.", "Rice, taxes and a short life."), standing: 1, income: 1, occupations: [t("Рисовод", "Rice farmer"), t("Дровосек", "Woodcutter"), t("Ткачиха", "Weaver")] },
    { id: "outer-sect", name: t("Внешний ученик", "Outer disciple"), description: t("Работа в секте за право тренироваться.", "Labour in the sect for the right to train."), standing: 2, income: 1, occupations: [t("Внешний ученик", "Outer disciple")] },
    { id: "inner-sect", name: t("Внутренний ученик", "Inner disciple"), description: t("Пещера, ресурсы и учитель.", "A cave, resources and a teacher."), standing: 3, income: 3, occupations: [t("Внутренний ученик", "Inner disciple")] },
    { id: "clan-scion", name: t("Отпрыск клана", "Clan scion"), description: t("Кровь бессмертных и их долги.", "The blood of immortals and their debts."), standing: 3, income: 4, occupations: [t("Старейшина клана", "Clan elder"), t("Хранительница источника", "Spring keeper")] },
    { id: "elder", name: t("Старейшина секты", "Sect elder"), description: t("Пик горы и сотни учеников.", "A mountain peak and hundreds of disciples."), standing: 5, income: 8, occupations: [t("Старейшина пика", "Peak elder")] }
  ],
  meters: [
    { id: "dao-heart", name: t("Сердце Дао", "Dao heart"), description: t("Ясность пути. Ускоряет культивацию.", "Clarity of the path. Speeds cultivation."), min: 0, max: 100, initial: 30 },
    { id: "karmic-debt", name: t("Кармический долг", "Karmic debt"), description: t("Долг перед Небесами.", "A debt to the Heavens."), min: 0, max: 100, initial: 0, danger: true }
  ],
  factions: [
    { id: "cloud-peak", name: t("Секта Облачного Пика", "Cloud Peak Sect"), description: t("Праведная секта с девятью пиками.", "A righteous sect of nine peaks.") },
    { id: "blood-moon", name: t("Секта Кровавой Луны", "Blood Moon Sect"), description: t("Культивация через чужую жизнь.", "Cultivation through the lives of others.") },
    { id: "mortal-court", name: t("Двор смертного императора", "The mortal emperor's court"), description: t("Смертные, которые платят бессмертным.", "Mortals who pay the immortals.") }
  ],
  skills: [
    { id: "cultivation", name: t("Культивация", "Cultivation"), description: t("Сбор ци неба и земли.", "Gathering the qi of heaven and earth."), category: "cultivation", stats: ["wisdom", "willpower"] },
    { id: "alchemy", name: t("Алхимия", "Alchemy"), description: t("Пилюли из духовных трав.", "Pills from spirit herbs."), category: "craft", stats: ["intelligence", "wisdom"] },
    { id: "talismans", name: t("Талисманы", "Talismans"), description: t("Печати, начертанные киноварью.", "Seals drawn in cinnabar."), category: "magic", stats: ["intelligence", "agility"] }
  ],
  talents: [
    { id: "heavenly-root", name: t("Небесный корень", "Heavenly root"), description: t("Корень духа одной стихии: чистый и быстрый.", "A single-element spirit root: pure and swift."), trackFactor: 1.35, skills: ["cultivation"], checks: ["wisdom"], weight: 0.5 },
    { id: "fox-charm", name: t("Лисье очарование", "Fox charm"), description: t("Взгляд, от которого трудно отказать.", "A gaze that is hard to refuse."), growth: ["charisma"], checks: ["charisma"] },
    { id: "dragon-vein", name: t("Драконья жила", "Dragon vein"), description: t("Тело выдерживает молнии скорби.", "The body withstands tribulation lightning."), growth: ["vitality", "strength"], checks: ["vitality"] },
    { id: "pill-sense", name: t("Чутьё алхимика", "Alchemist's sense"), description: t("Слышит, когда пилюля готова.", "Hears when a pill is ready."), skills: ["alchemy"], checks: ["intelligence"] }
  ],
  weaknesses: [
    { id: "mixed-root", name: t("Смешанный корень", "Mixed root"), description: t("Пять стихий спорят в одном корне.", "Five elements quarrel in a single root."), trackFactor: 0.8, conflicts: ["heavenly-root"] },
    { id: "inner-demon", name: t("Внутренний демон", "Inner demon"), description: t("Старая вина шепчет в медитации.", "An old guilt whispers during meditation."), checks: ["willpower"] }
  ],
  professions: [
    { id: "alchemist", name: t("Алхимик", "Alchemist"), description: t("Пилюли продаются дороже золота.", "Pills sell for more than gold."), skill: "alchemy", stats: ["intelligence", "wisdom"], base: 5 },
    { id: "talisman-maker", name: t("Мастер талисманов", "Talisman maker"), description: t("Печати для смертных и бессмертных.", "Seals for mortals and immortals."), skill: "talismans", stats: ["intelligence", "agility"], base: 4 },
    { id: "herb-gatherer", name: t("Собиратель трав", "Herb gatherer"), description: t("Духовные травы растут там, где опасно.", "Spirit herbs grow where it is dangerous."), skill: "survival", stats: ["agility", "luck"], base: 3 }
  ],
  education: [
    { id: "xx-village", name: t("Сельский даос", "Village Taoist"), description: t("Канон Дао и дыхательные упражнения.", "The Dao canon and breathing exercises."), tier: 1, skills: ["lore"] },
    { id: "xx-outer-court", name: t("Внешний двор секты", "Sect outer court"), description: t("Основы сбора ци.", "Basics of qi gathering."), tier: 2, skills: ["cultivation"] },
    { id: "xx-inner-peak", name: t("Внутренний пик", "Inner peak"), description: t("Ученик старейшины.", "An elder's disciple."), tier: 3, skills: ["cultivation", "alchemy"] }
  ],
  specializations: [
    { id: "sword-immortal", name: t("Путь меча бессмертных", "Sword immortal"), description: t("Меч, летящий на тысячу ли.", "A sword that flies a thousand li."), statBonus: { agility: 2, willpower: 1 }, skill: "cultivation" },
    { id: "pill-sage", name: t("Мудрец пилюль", "Pill sage"), description: t("Печь, которая продлевает жизнь.", "A furnace that extends life."), statBonus: { intelligence: 2, wisdom: 1 }, skill: "alchemy" },
    { id: "formation-master", name: t("Мастер формаций", "Formation master"), description: t("Горы и реки как оружие.", "Mountains and rivers as weapons."), statBonus: { intelligence: 2, wisdom: 1 }, skill: "talismans" }
  ],
  familySecrets: [
    { id: "xx-immortal-ancestor", name: t("Бессмертный предок", "An immortal ancestor"), hint: t("На семейном алтаре стоит табличка без имени, перед которой мать каждый день зажигает благовоние.", "On the family altar stands a nameless tablet before which mother lights incense every day."), reveal: t("Прапрадед ушёл в горы и стал бессмертным. Его наследие спит в крови.", "A great-great-grandfather went into the mountains and became immortal. His legacy sleeps in the blood."), effects: [fx.flag("spirit-root"), fx.meter("dao-heart", 15), fx.awakenTalent()] },
    { id: "xx-sealed-soul", name: t("Запечатанная душа", "A sealed soul"), hint: t("На груди ребёнка — родимое пятно в форме печати.", "On the child's chest is a birthmark shaped like a seal."), reveal: t("В душе запечатан древний мастер. Он просыпается и предлагает учить.", "An ancient master is sealed within the soul. He awakens and offers to teach."), effects: [fx.npc("mentor"), fx.skill("cultivation", 10), fx.weakness("inner-demon")] },
    { id: "xx-blood-moon-debt", name: t("Долг Кровавой Луне", "A debt to the Blood Moon"), hint: t("Отец просыпается по ночам от крика и долго смотрит на луну.", "Father wakes at night screaming and stares long at the moon."), reveal: t("Отец когда-то продал Кровавой Луне год жизни своего будущего ребёнка.", "Long ago father sold the Blood Moon a year of his future child's life."), effects: [fx.meter("karmic-debt", 20), fx.faction("blood-moon", 10), fx.affinity("father", -15)] }
  ],
  birthplaces: [
    t("рисовая деревня у горы Линфэн", "a rice village beneath Mount Lingfeng"),
    t("павильон внешнего двора секты Облачного Пика", "an outer-court pavilion of the Cloud Peak Sect"),
    t("поместье клана над духовным источником", "a clan estate above a spirit spring"),
    t("сарай у городских ворот", "a shed by the city gate")
  ],
  omens: [
    { text: t("Над крышей кружили белые журавли.", "White cranes circled the roof.") },
    { text: t("Духовный источник в ту ночь закипел.", "The spirit spring boiled that night."), minDestiny: 6 },
    { text: t("Ветер принёс запах персиков, хотя стояла зима.", "The wind carried the scent of peaches, though it was winter.") },
    { text: t("Небо разорвала молния без грома — так Небеса отмечают тех, кто бросит им вызов.", "Lightning without thunder split the sky — that is how the Heavens mark those who will defy them."), minDestiny: 9 }
  ],
  npcTitles: {
    mentor: [t("Старейшина Облачного Пика", "Cloud Peak elder"), t("Бессмертный отшельник", "Immortal hermit")],
    teacher: [t("Старший брат по секте", "Senior sect brother"), t("Сельский даос", "Village Taoist")],
    rival: [t("Гордый наследник клана Лю", "Proud heir of the Liu clan"), t("Завистливый внешний ученик", "Envious outer disciple")],
    friend: [t("Младшая сестра по секте", "Junior sect sister"), t("Сын собирателя трав", "Herb gatherer's son")]
  },
  consequences: [
    { id: "xx.c-herb-serpent", title: t("Змея помнит", "The serpent remembers"), text: t("Змея-страж выросла и нашла того, кто украл её траву.", "The guardian serpent has grown and found the one who stole its herb."), chance: 0.6, effects: [fx.health(-30), fx.meter("karmic-debt", 5)] },
    { id: "xx.c-alchemy-fame", title: t("Слава первой пилюли", "Fame of the first pill"), text: t("Пилюли {name} хвалят на рынке секты. Приходят заказчики.", "{name}'s pills are praised at the sect market. Customers arrive."), effects: [fx.wealth(40), fx.skill("alchemy", 5), fx.faction("cloud-peak", 5)] },
    { id: "xx.c-mortal-kin", title: t("Смертные родные", "Mortal kin"), text: t("Пока {name} культивировал, смертные родные постарели. Пора навестить их, пока не поздно.", "While {name} cultivated, mortal kin grew old. Time to visit before it's too late."), conditions: [when.npc("parent")], effects: [fx.affinity("parent", 10), fx.meter("dao-heart", 5)] },
    { id: "xx.c-tribulation-scar", title: t("Шрам скорби", "Tribulation scar"), text: t("Молнии оставили шрам на душе. Внутренний демон шепчет по ночам.", "The lightning left a scar on the soul. An inner demon whispers at night."), chance: 0.5, effects: [fx.weakness("inner-demon")] },
    { id: "xx.c-letter-unopened", title: t("Нераспечатанное письмо", "The unopened letter"), text: t("Письмо смертных родных так и лежит на алтаре. Чернила выцвели. Сердце Дао от этого не стало яснее.", "The letter from mortal kin still lies on the altar. The ink has faded. The Dao heart is no clearer for it."), effects: [fx.affinity("parent", -8), fx.meter("karmic-debt", 6)] }
  ],
  abilityCategories: { "flying-sword": "cultivation", "spirit-sense": "cultivation", alchemy: "utility" },
  abilities: [
    { id: "body-tempering", name: t("Закалка тела", "Body Tempering"), description: t("Кожа крепче бронзы.", "Skin harder than bronze."), category: "cultivation" },
    { id: "thunder-talisman", name: t("Громовой талисман", "Thunder Talisman"), description: t("Печать, призывающая гром.", "A seal that calls down thunder."), category: "magic" }
  ],
  events: [
    {
      id: "xx.child-stone",
      kind: "personal",
      title: t("Камень у ручья", "A stone by the stream"),
      text: t("У ручья лежит гладкий камень. Старшие говорят: если корень духа есть, камень потеплеет в ладони. Если нет — останется холодным.", "A smooth stone lies by the stream. The elders say: if there is a spirit root, the stone will warm in the palm. If not, it stays cold."),
      minAge: 6,
      maxAge: 12,
      maxOccurrences: 1,
      weight: 2,
      choices: [
        { id: "hold", text: t("Держать, пока не ответит", "Hold it until it answers"), success: { text: t("Ладонь теплеет не сразу. Этого достаточно.", "The palm does not warm at once. That is enough."), effects: [fx.stat("wisdom", 1), fx.meter("dao-heart", 3)] } },
        { id: "skip", text: t("Бросить камень в воду", "Throw the stone into the water"), success: { text: t("Круги расходятся. Вопрос остаётся на берегу.", "The rings spread. The question stays on the bank."), effects: [fx.stat("willpower", 1)] } },
        { id: "home", text: t("Унести камень матери", "Take the stone to mother"), success: { text: t("Мать кладёт его на алтарь и ничего не спрашивает.", "Mother sets it on the altar and asks nothing."), effects: [fx.affinity("mother", 6), fx.karma(2)] } }
      ]
    },
    {
      id: "xx.last-incense",
      kind: "age",
      title: t("Последнее благовоние", "The last incense"),
      text: t("Срок, отпущенный смертному телу, близок. Пик спрашивает, передать ли печь ученику или погасить её самому.", "The span given to a mortal body is near. The peak asks whether to pass the furnace to a student or put it out yourself."),
      minAge: 55,
      maxOccurrences: 1,
      weight: 2,
      conditions: [when.flag("spirit-root")],
      choices: [
        { id: "pass", text: t("Передать печь", "Pass the furnace"), success: { text: t("Чужие руки принимают жар. Имя остаётся на табличке.", "Other hands take the heat. The name stays on the tablet."), effects: [fx.rep(5), fx.faction("cloud-peak", 6), fx.karma(3)] } },
        { id: "quench", text: t("Погасить самому", "Put it out yourself"), success: { text: t("Дым редеет. Долг перед пиком закрыт.", "The smoke thins. The debt to the peak is closed."), effects: [fx.meter("dao-heart", 6), fx.stat("wisdom", 1)] } }
      ]
    },
    {
      id: "xx.taoist",
      kind: "personal",
      title: t("Сельский даос", "The village Taoist"),
      text: t("Деревенский даос учит детей канону и дыханию. Говорят, так растят корень духа.", "The village Taoist teaches children the canon and breathing. They say this nurtures the spirit root."),
      minAge: 5,
      maxAge: 10,
      maxOccurrences: 1,
      conditions: [when.educationAtMost(0)],
      choices: [
        { id: "learn", text: t("Учиться", "Learn"), success: { text: t("Дыхание выравнивается, мысли становятся тише.", "Breathing steadies, thoughts grow quieter."), effects: [fx.education("xx-village"), fx.npc("teacher"), fx.meter("dao-heart", 5)] } },
        { id: "fields", text: t("Работать в поле", "Work in the fields"), success: { text: t("Спина крепнет.", "The back grows strong."), effects: [fx.stat("vitality", 1), fx.affinity("parent", 5)] } }
      ]
    },
    {
      id: "xx.sect-gate",
      kind: "path",
      title: t("Девять тысяч ступеней", "Nine thousand steps"),
      text: t("Секта Облачного Пика принимает тех, кто поднимется по лестнице без отдыха.", "The Cloud Peak Sect accepts those who climb the stairway without rest."),
      minAge: 8,
      maxAge: 18,
      maxOccurrences: 1,
      conditions: [when.flag("spirit-root"), when.educationAtMost(1)],
      choices: [
        { id: "climb", text: t("Подниматься", "Climb"), check: check(["willpower", "vitality"], 11), success: { text: t("На последней ступени ждёт старейшина.", "An elder waits on the last step."), effects: [fx.education("xx-outer-court"), fx.socialClass("outer-sect"), fx.faction("cloud-peak", 10)] }, failure: { text: t("Ноги отказали за сотню ступеней до вершины.", "The legs failed a hundred steps short."), effects: [fx.stat("willpower", 1), fx.meter("dao-heart", 3)] } }
      ]
    },
    {
      id: "xx.inner-peak",
      kind: "path",
      title: t("Выбор старейшины", "An elder's choice"),
      text: t("Старейшина ищет личного ученика из внешнего двора.", "An elder seeks a personal disciple from the outer court."),
      minAge: 12,
      maxOccurrences: 1,
      conditions: [when.education(2), when.rank(1)],
      choices: [
        { id: "kneel", text: t("Преклонить колени", "Kneel"), check: check(["wisdom", "willpower"], 13, 0, { skill: "cultivation" }), success: { text: t("Старейшина касается макушки: «Мой ученик».", "The elder touches the crown of the head: 'My disciple.'"), effects: [fx.education("xx-inner-peak"), fx.socialClass("inner-sect"), fx.npc("mentor"), fx.track(10)] }, failure: { text: t("Старейшина проходит мимо.", "The elder walks past."), effects: [fx.meter("dao-heart", -5)] } }
      ]
    },
    {
      id: "xx.dao-insight",
      kind: "stat",
      title: t("Озарение у водопада", "Insight at the waterfall"),
      text: t("Глядя на водопад, {name} вдруг понимает что-то о течении ци.", "Watching a waterfall, {name} suddenly understands something about the flow of qi."),
      minAge: 12,
      cooldown: 6,
      conditions: [when.flag("spirit-root"), when.stat("wisdom", 18)],
      choices: [
        { id: "meditate", text: t("Медитировать сорок дней", "Meditate for forty days"), check: check(["wisdom", "willpower"], 14, 2, { meters: [{ id: "dao-heart", per: 0.004, base: 30 }] }), success: { text: t("Сердце Дао крепнет, ци течёт быстрее.", "The Dao heart grows firm, qi flows faster."), effects: [fx.meter("dao-heart", 12), fx.track(12), fx.skill("cultivation", 4)] }, failure: { text: t("Озарение ускользает.", "The insight slips away."), effects: [fx.meter("dao-heart", 3)] } }
      ]
    },
    {
      id: "xx.parent-ages",
      kind: "family",
      title: t("Седина матери", "Mother's grey hair"),
      text: t("Мать поседела. Культивация {name} идёт годами, а её годы на исходе.", "Mother has gone grey. {name}'s cultivation takes years, and her years are running out."),
      minAge: 25,
      maxOccurrences: 1,
      conditions: [when.npc("mother"), when.flag("spirit-root")],
      choices: [
        { id: "pill", text: t("Сварить пилюлю долголетия", "Brew a longevity pill"), check: check(["intelligence", "wisdom"], 15, 0, { skill: "alchemy" }), success: { text: t("Мать молодеет на десять лет и плачет от счастья.", "Mother grows ten years younger and weeps with joy."), effects: [fx.affinity("mother", 25), fx.meter("dao-heart", 5), fx.karma(10)] }, failure: { text: t("Пилюля бесполезна для смертного тела.", "The pill is useless for a mortal body."), effects: [fx.affinity("mother", 5), fx.skill("alchemy", 3)] } },
        { id: "visit", text: t("Провести с ней год", "Spend a year with her"), success: { text: t("Год без культивации. Самый тёплый год.", "A year without cultivation. The warmest year."), effects: [fx.affinity("mother", 15), fx.meter("dao-heart", 8), fx.track(-5)] } },
        { id: "seclusion", text: t("Уйти в уединение", "Enter seclusion"), success: { text: t("Когда {name} выходит, у порога ждёт только табличка.", "When {name} emerges, only a memorial tablet waits at the door."), effects: [fx.track(15), fx.npcDies("mother"), fx.weakness("inner-demon")] } }
      ]
    },
    {
      id: "xx.blood-moon-offer",
      kind: "world",
      title: t("Предложение Кровавой Луны", "The Blood Moon's offer"),
      text: t("Посланник Кровавой Луны предлагает технику, которая удвоит скорость культивации. Цена — чужие жизни.", "A Blood Moon envoy offers a technique that would double cultivation speed. The price is other lives."),
      minAge: 16,
      maxOccurrences: 1,
      conditions: [when.flag("spirit-root")],
      choices: [
        { id: "accept", text: t("Принять", "Accept"), success: { text: t("Сила приходит. Долг перед Небесами — тоже.", "Power comes. So does a debt to the Heavens."), effects: [fx.track(25), fx.meter("karmic-debt", 30), fx.faction("blood-moon", 25), fx.faction("cloud-peak", -20), fx.karma(-20)] } },
        { id: "refuse", text: t("Отказать", "Refuse"), success: { text: t("Посланник улыбается и уходит.", "The envoy smiles and leaves."), effects: [fx.meter("dao-heart", 5), fx.faction("cloud-peak", 5)] } },
        { id: "report", text: t("Донести секте", "Report to the sect"), check: check(["charisma", "wisdom"], 12), success: { text: t("Секта награждает бдительность.", "The sect rewards vigilance."), effects: [fx.faction("cloud-peak", 15), fx.wealth(30), fx.npc("rival")] }, failure: { text: t("Посланник ускользает, а слухи остаются.", "The envoy slips away, but rumours remain."), effects: [fx.rep(-5)] } }
      ]
    },
    {
      id: "xx.specialize",
      kind: "path",
      title: t("Выбор Дао", "Choosing a Dao"),
      text: t("Основание заложено. Пора выбрать, на чём строить бессмертие.", "The Foundation is laid. Time to choose what immortality will be built on."),
      minAge: 18,
      maxOccurrences: 1,
      conditions: [when.rank(2), when.noSpecialization()],
      choices: [
        { id: "sword", text: t("Меч", "The sword"), success: { text: t("Меч взлетает и слушается мысли.", "The sword rises and obeys thought."), effects: [fx.specialization("sword-immortal")] } },
        { id: "pill", text: t("Пилюли", "Pills"), success: { text: t("Печь становится второй душой.", "The furnace becomes a second soul."), effects: [fx.specialization("pill-sage"), fx.profession("alchemist")] } },
        { id: "formation", text: t("Формации", "Formations"), success: { text: t("Горы складываются в узор.", "The mountains fold into a pattern."), effects: [fx.specialization("formation-master"), fx.ability("thunder-talisman")] } }
      ]
    },
    {
      id: "xx.dao-side",
      kind: "path",
      title: t("Сторона Дао", "A side of the Dao"),
      text: t("Основание держится. Пик и Кровавая Луна предлагают не пилюлю, а сторону. Второго раза не будет.", "The Foundation holds. The peak and the Blood Moon offer not a pill, but a side. There will not be a second time."),
      minAge: 20,
      maxOccurrences: 1,
      weight: 2,
      conditions: [when.flag("spirit-root"), when.rank(2)],
      choices: [
        { id: "peak", text: t("Остаться на пике", "Stay on the peak"), success: { text: t("Сердце Дао яснее. Луна отступает.", "The Dao heart is clearer. The moon withdraws."), effects: [fx.faction("cloud-peak", 10), fx.meter("dao-heart", 8)] } },
        { id: "moon", text: t("Принять тень Луны", "Accept the moon's shadow"), success: { text: t("Сила приходит с долгом.", "Power comes with a debt."), effects: [fx.faction("blood-moon", 10), fx.meter("karmic-debt", 8), fx.track(6)] } }
      ]
    },
    {
      id: "xx.cave-door",
      kind: "chain",
      title: t("Дверь пещеры снова", "The cave door again"),
      text: t("Срок, который {name} купил молчанием, кончился. Секта спрашивает, открывать ли дверь смертным или закрыть её навсегда.", "The time {name} bought with silence is over. The sect asks whether to open the door to mortals or shut it for good."),
      minAge: 22,
      maxOccurrences: 1,
      scheduledOnly: true,
      conditions: [when.flag("spirit-root")],
      choices: [
        { id: "open", text: t("Открыть дверь", "Open the door"), success: { text: t("Ци рассеивается. Родные ещё ждут на тропе.", "Qi scatters. Kin are still waiting on the path."), effects: [fx.affinity("parent", 12), fx.meter("dao-heart", -4), fx.karma(6)] } },
        { id: "seal", text: t("Запечатать дверь", "Seal the door"), success: { text: t("Год ци возвращается. Письма больше не кладут у порога.", "The year of qi returns. Letters are no longer left at the threshold."), effects: [fx.track(8), fx.meter("dao-heart", 6), fx.affinity("parent", -8)] } }
      ]
    },
    {
      id: "xx.mortal-winter",
      kind: "family",
      title: t("Зима смертных", "A mortal winter"),
      text: t("Пока пик молчит, смертный родитель пишет, что зима будет последней, которую он встретит на ногах.", "While the peak is silent, a mortal parent writes that this winter will be the last they meet on their feet."),
      minAge: 40,
      maxOccurrences: 1,
      weight: 2,
      conditions: [when.flag("spirit-root"), when.npc("parent")],
      choices: [
        { id: "descend", text: t("Спуститься на зиму", "Descend for the winter"), success: { text: t("Ци стынет по дороге. Дома ещё топят печь.", "Qi cools on the road. At home the stove is still lit."), effects: [fx.affinity("parent", 16), fx.track(-3), fx.karma(5)] } },
        { id: "incense", text: t("Жечь благовоние на пике", "Burn incense on the peak"), success: { text: t("Дым уходит вверх. Письмо остаётся в рукаве.", "The smoke goes up. The letter stays in the sleeve."), effects: [fx.meter("dao-heart", 5), fx.affinity("parent", -10)] } }
      ]
    },
    {
      id: "xx.seclusion-letter",
      kind: "family",
      title: t("Письмо в затворе", "A letter in seclusion"),
      text: t("На сороковой день затвора у двери пещеры кладут письмо. Смертные родные просят спуститься, пока ещё живы. Секта говорит: кто выйдет раньше срока, потеряет год ци.", "On the fortieth day of seclusion a letter is left at the cave door. Mortal kin ask for a descent while they still live. The sect says whoever leaves early loses a year of qi."),
      minAge: 18,
      maxOccurrences: 1,
      weight: 2,
      conditions: [when.flag("spirit-root"), when.npc("parent")],
      choices: [
        { id: "break", text: t("Сломать затвор", "Break seclusion"), success: { text: t("Ци рассеивается по дороге вниз. Мать ещё узнаёт.", "Qi scatters on the road down. Mother still recognises you."), effects: [fx.affinity("parent", 18), fx.meter("dao-heart", -6), fx.karma(8), fx.track(-4)] } },
        { id: "stay", text: t("Не открывать дверь", "Do not open the door"), success: { text: t("Год ци сохранён. Письмо остаётся за порогом.", "The year of qi is kept. The letter stays outside the threshold."), effects: [fx.track(12), fx.meter("dao-heart", 6), fx.affinity("parent", -12), fx.later("xx.c-letter-unopened", 2), fx.flag("door-shut"), fx.schedule("xx.cave-door", 4)] } },
        { id: "pill", text: t("Послать пилюлю с учеником", "Send a pill with a disciple"), requires: [when.skill("alchemy", 8)], success: { text: t("Пилюля дойдёт быстрее ног. Затвор не сломан.", "The pill will arrive sooner than feet. Seclusion holds."), effects: [fx.skill("alchemy", 2), fx.affinity("parent", 10), fx.faction("cloud-peak", 4)] } }
      ]
    }
  ]
};
