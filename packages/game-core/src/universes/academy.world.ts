// Империя Лиреваль, Stage 02: милость двора и скандалы, лестница сословий, которую можно пройти указом императора,
// и Башня магов, которая ценит знание выше крови
import { t } from "../i18n.js";
import { check, fx, when } from "../narrative/dsl.js";
import type { WorldDefinition } from "./types.js";

export const ACADEMY_WORLD: WorldDefinition = {
  mechanics: [
    { name: t("Милость двора", "Court favour"), description: t("Знатность и обаяние копят милость двора. Большая милость может принести указ о новом сословии.", "Rank and charm build court favour. Great favour can bring a decree raising your station.") },
    { name: t("Скандал", "Scandal"), description: t("Слухи и проступки копят скандал. Пока он велик, репутация падает каждый год.", "Rumours and misdeeds build scandal. While it is high, reputation falls every year.") },
    { name: t("Лестница сословий", "Ladder of estates"), description: t("Простолюдин, служилый, младшая знать, высшая знать: каждая ступень открывает двери академии и двора.", "Commoner, service class, lesser nobility, high nobility: each rung opens doors of the academy and court.") }
  ],
  originProfiles: {
    "duke-heir": { socialClassId: "high-noble", skills: { persuasion: 8, etiquette: 6 }, factions: { "imperial-court": 20 }, meters: { "court-favor": 40 }, history: t("Дом герцогов Валлейн стоит рядом с троном уже четыреста лет. Наследника ждут союзы, дуэли и зависть.", "The ducal house of Vallein has stood beside the throne for four hundred years. The heir can expect alliances, duels and envy.") },
    "minor-noble": { socialClassId: "lesser-noble", skills: { etiquette: 5, melee: 3 }, meters: { "court-favor": 20 }, history: t("Баронство отцу досталось от деда вместе с долгами. Младшему ребёнку не достанется ничего, кроме фамилии.", "Father inherited the barony from grandfather along with the debts. The younger child will inherit nothing but the name.") },
    scholarship: { socialClassId: "commoner", skills: { lore: 8 }, factions: { "magic-tower": 15 }, history: t("Мать — прачка в квартале у порта. Она откладывала каждый медяк на книги.", "Mother is a laundress in the harbour quarter. She saved every copper for books.") },
    bastard: { socialClassId: "service", family: "bastard", skills: { stealth: 5, persuasion: 3 }, meters: { scandal: 20, "court-favor": 10 }, history: t("Отец — граф, который никогда не назовёт ребёнка своим. Мать получает от него содержание и молчит.", "Father is a count who will never call the child his own. Mother receives an allowance from him and stays silent.") }
  },
  raceTalents: { "half-elf": ["arcane-blood"], human: ["courtly-grace"] },
  socialClasses: [
    { id: "commoner", name: t("Простолюдин", "Commoner"), description: t("Ремесло, налоги и никакой магии по праву рождения.", "A trade, taxes and no magic by birthright."), standing: 1, income: 1, occupations: [t("Прачка", "Laundress"), t("Портовый грузчик", "Dock worker"), t("Писарь", "Clerk")] },
    { id: "service", name: t("Служилое сословие", "Service class"), description: t("Чиновники, офицеры и придворные слуги.", "Officials, officers and court servants."), standing: 2, income: 3, occupations: [t("Придворный секретарь", "Court secretary"), t("Офицер гвардии", "Guard officer")] },
    { id: "lesser-noble", name: t("Младшая знать", "Lesser nobility"), description: t("Баронства, титулы и бесконечные долги.", "Baronies, titles and endless debts."), standing: 3, income: 4, occupations: [t("Барон", "Baron"), t("Баронесса", "Baroness")] },
    { id: "high-noble", name: t("Высшая знать", "High nobility"), description: t("Герцоги и графы, решающие судьбу Империи.", "Dukes and counts who decide the Empire's fate."), standing: 4, income: 7, occupations: [t("Герцог", "Duke"), t("Графиня", "Countess")] },
    { id: "imperial", name: t("Ближний круг императора", "The Emperor's inner circle"), description: t("Те, кто стоит у трона.", "Those who stand by the throne."), standing: 5, income: 10, occupations: [t("Советник императора", "Imperial councillor")] }
  ],
  meters: [
    { id: "court-favor", name: t("Милость двора", "Court favour"), description: t("Как к вам относятся при дворе.", "How the court regards you."), min: 0, max: 100, initial: 10 },
    { id: "scandal", name: t("Скандал", "Scandal"), description: t("Слухи, которые ходят о вас.", "The rumours that circulate about you."), min: 0, max: 100, initial: 0, danger: true }
  ],
  factions: [
    { id: "imperial-court", name: t("Императорский двор", "The Imperial Court"), description: t("Трон и его фавориты.", "The throne and its favourites.") },
    { id: "magic-tower", name: t("Башня магов", "The Mage Tower"), description: t("Архимаги, которые ценят знание выше крови.", "Archmages who value knowledge above blood.") },
    { id: "rose-society", name: t("Общество Розы", "The Rose Society"), description: t("Тайный клуб аристократок, плетущих интриги.", "A secret club of noblewomen weaving intrigue.") }
  ],
  skills: [
    { id: "arcana", name: t("Арканистика", "Arcana"), description: t("Теория и практика магии кругов.", "Theory and practice of circle magic."), category: "magic", stats: ["intelligence", "wisdom"] },
    { id: "etiquette", name: t("Этикет", "Etiquette"), description: t("Поклоны, титулы и правила двора.", "Bows, titles and the rules of court."), category: "social", stats: ["charisma", "wisdom"] },
    { id: "duelling", name: t("Дуэльное искусство", "Duelling"), description: t("Шпага и заклинание по кодексу чести.", "Rapier and spell by the code of honour."), category: "combat", stats: ["agility", "intelligence"] }
  ],
  talents: [
    { id: "arcane-blood", name: t("Арканная кровь", "Arcane blood"), description: t("Круги маны расширяются почти без усилий.", "Mana circles widen almost effortlessly."), trackFactor: 1.25, skills: ["arcana"], checks: ["intelligence"], weight: 0.7 },
    { id: "courtly-grace", name: t("Придворное изящество", "Courtly grace"), description: t("Двор принимает как своего.", "The court accepts them as one of its own."), growth: ["charisma"], skills: ["etiquette"], checks: ["charisma"] },
    { id: "blade-dancer", name: t("Танцующий клинок", "Blade dancer"), description: t("Шпага летает, как на балу.", "The rapier flies as if at a ball."), growth: ["agility"], skills: ["duelling"], checks: ["agility"] }
  ],
  weaknesses: [
    { id: "low-birth-shame", name: t("Стыд происхождения", "Shame of birth"), description: t("Чужая фамилия звучит как упрёк.", "Others' surnames sound like a reproach."), checks: ["charisma"], conflicts: ["courtly-grace"] },
    { id: "gambler", name: t("Азартные игры", "Gambling"), description: t("Карты в салонах съедают жалованье.", "Cards in the salons eat the allowance."), income: 0.6 }
  ],
  professions: [
    { id: "court-mage", name: t("Придворный маг", "Court mage"), description: t("Защита дворца и фейерверки на праздниках.", "Palace wards and festival fireworks."), skill: "arcana", stats: ["intelligence", "wisdom"], base: 6 },
    { id: "diplomat", name: t("Дипломат", "Diplomat"), description: t("Слова, которые останавливают войны.", "Words that stop wars."), skill: "etiquette", stats: ["charisma", "wisdom"], base: 5 },
    { id: "duellist", name: t("Наёмный дуэлянт", "Hired duellist"), description: t("Защищает чужую честь за плату.", "Defends other people's honour for pay."), skill: "duelling", stats: ["agility", "strength"], base: 4 }
  ],
  education: [
    { id: "ac-tutor", name: t("Домашний наставник", "Home tutor"), description: t("Языки, история и манеры.", "Languages, history and manners."), tier: 1, skills: ["lore", "etiquette"] },
    { id: "ac-astrein", name: t("Академия Астрейн", "Astrein Academy"), description: t("Королевская академия магии.", "The Royal Academy of Magic."), tier: 2, skills: ["arcana", "duelling"] },
    { id: "ac-tower", name: t("Башня магов", "The Mage Tower"), description: t("Ученичество у архимага.", "An apprenticeship to an archmage."), tier: 3, skills: ["arcana", "lore"] }
  ],
  specializations: [
    { id: "battle-mage", name: t("Боевой маг", "Battle mage"), description: t("Заклинания, которые решают сражения.", "Spells that decide battles."), statBonus: { intelligence: 2, willpower: 1 }, skill: "arcana" },
    { id: "court-schemer", name: t("Придворный интриган", "Court schemer"), description: t("Магия намёков и чужих тайн.", "The magic of hints and others' secrets."), statBonus: { charisma: 2, wisdom: 1 }, skill: "etiquette" },
    { id: "spellsword", name: t("Шпага кругов", "Circle blade"), description: t("Клинок и круг маны в одном выпаде.", "Blade and mana circle in one lunge."), statBonus: { agility: 2, intelligence: 1 }, skill: "duelling" }
  ],
  familySecrets: [
    { id: "ac-royal-blood", name: t("Кровь императоров", "Imperial blood"), hint: t("На запястье — родимое пятно в форме короны, и мать всегда закрывает его рукавом.", "On the wrist is a crown-shaped birthmark, and mother always covers it with a sleeve."), reveal: t("Прабабка была дочерью императора, скрытой от войны за престол.", "A great-grandmother was an emperor's daughter, hidden from the war of succession."), effects: [fx.meter("court-favor", 25), fx.faction("imperial-court", 20), fx.meter("scandal", 15)] },
    { id: "ac-traitor-house", name: t("Дом изменника", "A traitor's house"), hint: t("На семейном гербе стёрта одна звезда, и об этом не принято спрашивать.", "One star has been scraped off the family crest, and one does not ask about it."), reveal: t("Предок участвовал в заговоре против трона. Доказательства невиновности спрятаны в библиотеке.", "An ancestor took part in a plot against the throne. Proof of innocence is hidden in the library."), effects: [fx.rep(10), fx.meter("court-favor", 10), fx.skill("lore", 5)], origins: ["duke-heir", "minor-noble"] },
    { id: "ac-tower-debt", name: t("Долг перед Башней", "A debt to the Tower"), hint: t("Мать получает письма с печатью Башни магов и сжигает их не читая.", "Mother receives letters sealed by the Mage Tower and burns them unread."), reveal: t("Мать когда-то была ученицей архимага и сбежала. Башня до сих пор ждёт её — или её ребёнка.", "Mother was once an archmage's apprentice and fled. The Tower still waits for her — or her child."), effects: [fx.faction("magic-tower", 20), fx.awakenTalent(), fx.npc("mentor")] }
  ],
  birthplaces: [
    t("герцогский дворец над рекой Лир", "a ducal palace above the river Lir"),
    t("обветшалый замок баронства на границе", "a shabby baronial castle on the border"),
    t("квартал прачек у столичного порта", "the laundresses' quarter by the capital's harbour"),
    t("тайный загородный дом графа", "a count's secret country house")
  ],
  omens: [
    { text: t("В ночь рождения во дворце давали бал, и музыка была слышна по всей реке.", "On the night of the birth a ball was held at the palace, and the music carried along the river.") },
    { text: t("Звездочёты академии записали в хронику падающую звезду над городом.", "The academy's astrologers recorded a falling star over the city."), minDestiny: 6 },
    { text: t("Повитуха получила кошелёк от неизвестного и приказ молчать.", "The midwife received a purse from a stranger and an order to keep quiet.") },
    { text: t("Все магические светильники столицы вспыхнули разом и погасли.", "Every magical lamp in the capital flared at once and went out."), minDestiny: 9 }
  ],
  npcTitles: {
    mentor: [t("Архимаг Башни", "Tower archmage"), t("Опальный придворный маг", "Disgraced court mage")],
    teacher: [t("Гувернантка", "Governess"), t("Профессор академии Астрейн", "Astrein professor")],
    rival: [t("Наследник соперничающего дома", "Heir of a rival house"), t("Гениальная стипендиатка", "Brilliant scholarship student")],
    friend: [t("Младший сын маркиза", "Marquis's younger son"), t("Соседка по общежитию", "Dormitory roommate")],
    partner: [t("Партнёр по танцу на балу", "Dance partner from the ball"), t("Таинственный корреспондент", "Mysterious correspondent")]
  },
  consequences: [
    { id: "ac.c-duel-grudge", title: t("Месть проигравшего", "The loser's revenge"), text: t("Тот, кого {name} победил на дуэли, распускает слухи при дворе.", "The one {name} defeated in a duel spreads rumours at court."), chance: 0.7, effects: [fx.meter("scandal", 15), fx.npc("rival")] },
    { id: "ac.c-ball-acquaintance", title: t("Знакомство с бала", "An acquaintance from the ball"), text: t("Партнёр по танцу присылает письмо. Потом второе.", "The dance partner sends a letter. Then a second one."), conditions: [when.noNpc("spouse")], effects: [fx.npc("partner"), fx.meter("court-favor", 5)] },
    { id: "ac.c-silence-price", title: t("Цена молчания", "The price of silence"), text: t("Тот, кому заплатили за молчание, хочет ещё. Шантаж набирает силу.", "The one paid for silence wants more. The blackmail grows."), effects: [fx.wealth(-40), fx.meter("scandal", 20), fx.karma(-5)] },
    { id: "ac.c-bribe-exposed", title: t("Взятка раскрыта", "The bribe exposed"), text: t("Ревизия академии нашла запись о взятке за поступление.", "An academy audit found a record of the admission bribe."), chance: 0.5, effects: [fx.meter("scandal", 25), fx.faction("magic-tower", -15)] },
    { id: "ac.c-exam-notice", title: t("Заметка Башни", "A note from the Tower"), text: t("Архимаг, чей экзамен {name} не пропустил ради бала, присылает короткое письмо: дверь Башни ещё открыта.", "The archmage whose exam {name} did not skip for a ball sends a short letter: the Tower's door is still open."), effects: [fx.faction("magic-tower", 8), fx.skill("arcana", 3)] }
  ],
  abilityCategories: { "arcane-shield": "magic", starfall: "magic", etiquette: "social" },
  abilities: [
    { id: "charm-word", name: t("Чарующее слово", "Charming Word"), description: t("Фраза, после которой собеседник не может отказать.", "A phrase after which no one can refuse."), category: "social" },
    { id: "riposte-circle", name: t("Круговой рипост", "Circle Riposte"), description: t("Ответный выпад, усиленный кругом маны.", "A counter-thrust strengthened by a mana circle."), category: "combat" }
  ],
  events: [
    {
      id: "ac.child-bow",
      kind: "personal",
      title: t("Первый поклон", "The first bow"),
      text: t("На детском вечере дома нужно поклониться незнакомому гербу. Гувернантка смотрит, не дрогнут ли колени.", "At the house's children's evening you must bow to an unfamiliar crest. The governess watches whether the knees shake."),
      minAge: 6,
      maxAge: 12,
      maxOccurrences: 1,
      weight: 2,
      choices: [
        { id: "bow", text: t("Поклониться как учили", "Bow as you were taught"), success: { text: t("Герб принимает поклон. Колени держат.", "The crest accepts the bow. The knees hold."), effects: [fx.stat("charisma", 1), fx.meter("court-favor", 2)] } },
        { id: "still", text: t("Стоять прямо", "Stay standing"), success: { text: t("Зал замечает. Гувернантка молчит до дома.", "The hall notices. The governess is silent until home."), effects: [fx.stat("willpower", 1), fx.meter("scandal", 2)] } },
        { id: "ask", text: t("Спросить, чей это герб", "Ask whose crest it is"), success: { text: t("Вопрос детский. Ответ запоминают взрослые.", "The question is a child's. The adults remember the answer."), effects: [fx.stat("intelligence", 1), fx.skill("etiquette", 2)] } }
      ]
    },
    {
      id: "ac.last-name",
      kind: "age",
      title: t("Имя на программе", "A name on the programme"),
      text: t("Дом ставит последний бал при вашей жизни. Спрашивают, чьё имя поставить первым в программе: наследника или оставить своё и закрыть вечер.", "The house holds the last ball of your life. They ask whose name goes first on the programme: the heir's, or yours, and then the evening closes."),
      minAge: 56,
      maxOccurrences: 1,
      weight: 2,
      conditions: [when.flag("academy-student")],
      choices: [
        { id: "heir", text: t("Поставить имя наследника", "Put the heir's name first"), success: { text: t("Программа открывается чужим именем. Зал принимает.", "The programme opens on another name. The hall accepts it."), effects: [fx.rep(4), fx.karma(3), fx.meter("court-favor", 4)] } },
        { id: "own", text: t("Оставить своё и закрыть", "Keep your own and close it"), success: { text: t("Вечер короткий. Долг дома закрыт.", "The evening is short. The house's debt is closed."), effects: [fx.stat("wisdom", 1), fx.meter("court-favor", -2)] } }
      ]
    },
    {
      id: "ac.tutor",
      kind: "personal",
      title: t("Гувернантка", "The governess"),
      text: t("В дом приходит строгая гувернантка. Она обещает научить языкам и манерам — или сбежать через неделю.", "A strict governess arrives. She promises to teach languages and manners — or to flee within a week."),
      minAge: 5,
      maxAge: 10,
      maxOccurrences: 1,
      conditions: [when.educationAtMost(0)],
      choices: [
        { id: "obey", text: t("Слушаться", "Obey"), success: { text: t("Реверанс получается с третьего раза.", "The curtsey succeeds on the third try."), effects: [fx.education("ac-tutor"), fx.npc("teacher"), fx.meter("court-favor", 3)] } },
        { id: "prank", text: t("Подложить лягушку в чай", "Put a frog in her tea"), success: { text: t("Гувернантка уходит. Отец в ярости.", "The governess leaves. Father is furious."), effects: [fx.affinity("father", -10), fx.stat("agility", 1), fx.meter("scandal", 5)] } }
      ]
    },
    {
      id: "ac.salon",
      kind: "world",
      title: t("Салон Общества Розы", "The Rose Society salon"),
      text: t("Хозяйка салона намекает: Общество Розы может поднять {name} при дворе. Нужна лишь маленькая услуга.", "The salon hostess hints: the Rose Society could raise {name} at court. Only a small favour is needed."),
      minAge: 16,
      cooldown: 5,
      conditions: [when.standing(2)],
      choices: [
        { id: "help", text: t("Оказать услугу", "Do the favour"), check: check(["charisma", "intelligence"], 12, 0, { skill: "etiquette" }), success: { text: t("Письмо доставлено, нужный человек опозорен.", "The letter is delivered, the right person disgraced."), effects: [fx.meter("court-favor", 15), fx.faction("rose-society", 15), fx.karma(-5)] }, failure: { text: t("Письмо перехвачено. Скандал.", "The letter is intercepted. Scandal."), effects: [fx.meter("scandal", 20), fx.faction("rose-society", -10)] } },
        { id: "decline", text: t("Вежливо отказаться", "Politely decline"), success: { text: t("Хозяйка улыбается холодно.", "The hostess smiles coldly."), effects: [fx.faction("rose-society", -5), fx.karma(3)] } }
      ]
    },
    {
      id: "ac.scandal-storm",
      kind: "stat",
      title: t("Буря слухов", "A storm of rumours"),
      text: t("О {name} говорят во всех салонах. Двери закрываются одна за другой.", "Every salon is talking about {name}. Doors close one after another."),
      minAge: 14,
      cooldown: 4,
      conditions: [when.meter("scandal", 50)],
      choices: [
        { id: "charm", text: t("Появиться на балу и переломить молву", "Appear at a ball and turn the tide"), check: check(["charisma", "wisdom"], 14, 0, { skill: "etiquette", meters: [{ id: "court-favor", per: 0.004, base: 20 }] }), success: { text: t("Одна блестящая речь — и о слухах забывают.", "One brilliant speech and the rumours are forgotten."), effects: [fx.meter("scandal", -35), fx.meter("court-favor", 5)] }, failure: { text: t("Смех за спиной громче музыки.", "The laughter behind your back is louder than the music."), effects: [fx.meter("scandal", -10), fx.rep(-5)] } },
        { id: "leave", text: t("Уехать в поместье на год", "Retire to the estate for a year"), success: { text: t("Столица забывает, но и милость двора остывает.", "The capital forgets, but court favour cools too."), effects: [fx.meter("scandal", -40), fx.meter("court-favor", -15), fx.affinity("family", 5)] } }
      ]
    },
    {
      id: "ac.father-recognition",
      kind: "family",
      title: t("Письмо графа", "The count's letter"),
      text: t("Граф-отец впервые пишет сам. Он болен и думает о наследстве.", "The count, your father, writes himself for the first time. He is ill and thinking about the inheritance."),
      minAge: 16,
      maxOccurrences: 1,
      conditions: [when.origin("bastard"), when.npc("father")],
      choices: [
        { id: "visit", text: t("Приехать к нему", "Go to him"), check: check(["charisma", "wisdom"], 12), success: { text: t("Граф признаёт ребёнка перед свидетелями.", "The count acknowledges the child before witnesses."), effects: [fx.socialClass("lesser-noble"), fx.affinity("father", 30), fx.wealth(80), fx.meter("scandal", 10)] }, failure: { text: t("Законные наследники выставляют {name} за ворота.", "The legitimate heirs throw {name} out of the gates."), effects: [fx.affinity("father", 10), fx.npc("rival"), fx.meter("scandal", 10)] } },
        { id: "ignore", text: t("Не отвечать", "Don't answer"), success: { text: t("Гордость дороже наследства.", "Pride is worth more than an inheritance."), effects: [fx.stat("willpower", 2), fx.affinity("father", -10)] } }
      ]
    },
    {
      id: "ac.rival-house",
      kind: "npc",
      title: t("Вызов соперничающего дома", "A rival house's challenge"),
      text: t("Соперник при всей академии бросает {name} перчатку: дуэль магией, до первой крови.", "Before the whole academy the rival throws down a gauntlet: a magic duel, to first blood."),
      minAge: 14,
      cooldown: 4,
      conditions: [when.npc("rival"), when.flag("academy-student")],
      choices: [
        { id: "duel", text: t("Принять дуэль", "Accept the duel"), check: check(["intelligence", "agility"], 12, 1, { skill: "duelling", versus: "rival" }), success: { text: t("Щит соперника рассыпается искрами.", "The rival's shield shatters into sparks."), effects: [fx.rep(10), fx.meter("court-favor", 5), fx.affinity("rival", 10), fx.later("ac.c-duel-grudge", 3)] }, failure: { text: t("Первая кровь — своя.", "First blood is your own."), effects: [fx.rep(-8), fx.health(-15), fx.meter("scandal", 5)] } },
        { id: "wit", text: t("Ответить остроумием", "Answer with wit"), check: check(["charisma", "intelligence"], 12, 0, { skill: "etiquette" }), success: { text: t("Аудитория смеётся над соперником.", "The audience laughs at the rival."), effects: [fx.rep(6), fx.affinity("rival", -10)] }, failure: { text: t("Шутка не удалась.", "The joke falls flat."), effects: [fx.rep(-4)] } }
      ]
    },
    {
      id: "ac.specialize",
      kind: "path",
      title: t("Выбор кафедры", "Choosing a chair"),
      text: t("Третий круг пройден. Академия предлагает выбрать кафедру.", "The Third Circle is reached. The academy offers a choice of chair."),
      minAge: 16,
      maxOccurrences: 1,
      conditions: [when.rank(2), when.noSpecialization()],
      choices: [
        { id: "battle", text: t("Боевая магия", "Battle magic"), success: { text: t("Полигон становится вторым домом.", "The training ground becomes a second home."), effects: [fx.specialization("battle-mage")] } },
        { id: "court", text: t("Придворная магия", "Court magic"), success: { text: t("Магия улыбок и полутонов.", "The magic of smiles and half-tones."), effects: [fx.specialization("court-schemer"), fx.ability("charm-word"), fx.meter("court-favor", 10)] } },
        { id: "blade", text: t("Магия клинка", "Blade magic"), success: { text: t("Шпага поёт рунами.", "The rapier sings with runes."), effects: [fx.specialization("spellsword"), fx.ability("riposte-circle")] } }
      ]
    },
    {
      id: "ac.tower",
      kind: "path",
      title: t("Приглашение Башни", "The Tower's invitation"),
      text: t("Архимаг Башни ищет ученика. Башне всё равно, чья у тебя кровь.", "A Tower archmage seeks an apprentice. The Tower does not care whose blood you carry."),
      minAge: 18,
      maxOccurrences: 1,
      conditions: [when.education(2), when.stat("intelligence", 18)],
      choices: [
        { id: "accept", text: t("Подняться в Башню", "Ascend the Tower"), check: check(["intelligence", "wisdom"], 15, 0, { skill: "arcana" }), success: { text: t("Двери Башни открываются.", "The Tower's doors open."), effects: [fx.education("ac-tower"), fx.npc("mentor"), fx.faction("magic-tower", 20), fx.track(10)] }, failure: { text: t("Архимаг выбирает другого.", "The archmage chooses another."), effects: [fx.skill("arcana", 3)] } },
        { id: "court", text: t("Остаться при дворе", "Stay at court"), success: { text: t("Двор ближе, чем звёзды.", "The court is closer than the stars."), effects: [fx.meter("court-favor", 8)] } }
      ]
    },
    {
      id: "ac.circle-side",
      kind: "path",
      title: t("Чей круг", "Whose circle"),
      text: t("Третий круг держится. Башня и двор предлагают не кафедру, а чьим именем подписывать работу. Второго выбора не будет.", "The Third Circle holds. The Tower and the court offer not a chair, but whose name the work will carry. There will not be a second choice."),
      minAge: 18,
      maxOccurrences: 1,
      weight: 2,
      conditions: [when.flag("academy-student"), when.rank(2)],
      choices: [
        { id: "tower", text: t("Подпись Башни", "The Tower's signature"), success: { text: t("Работа уходит в архив Башни.", "The work goes into the Tower's archive."), effects: [fx.faction("magic-tower", 10), fx.skill("arcana", 4)] } },
        { id: "court", text: t("Подпись двора", "The court's signature"), success: { text: t("Имя звучит в зале, не в архиве.", "The name sounds in the hall, not in the archive."), effects: [fx.meter("court-favor", 10), fx.stat("charisma", 1)] } }
      ]
    },
    {
      id: "ac.tower-reply",
      kind: "chain",
      title: t("Ответ Башни", "The Tower's reply"),
      text: t("Башня отвечает на ночь, которую {name} провёл над кругами, а не на балу. Дом ждёт, куда встанет имя.", "The Tower answers the night {name} spent over the circles, not at the ball. The house waits to see where the name will stand."),
      minAge: 18,
      maxOccurrences: 1,
      scheduledOnly: true,
      conditions: [when.flag("academy-student")],
      choices: [
        { id: "climb", text: t("Принять место в Башне", "Take the place in the Tower"), success: { text: t("Дверь Башни открыта. Дом пришлёт холодную записку.", "The Tower's door is open. The house will send a cold note."), effects: [fx.faction("magic-tower", 10), fx.skill("arcana", 4), fx.meter("court-favor", -4)] } },
        { id: "house", text: t("Вернуть ответ дому", "Return the answer to the house"), success: { text: t("Башня подождёт. Кровь — нет.", "The Tower can wait. Blood will not."), effects: [fx.meter("court-favor", 8), fx.faction("magic-tower", -4), fx.stat("charisma", 1)] } }
      ]
    },
    {
      id: "ac.late-ball",
      kind: "family",
      title: t("Бал, который нельзя пропустить", "A ball that cannot be missed"),
      text: t("Дом ставит бал в честь стареющего родителя. Башня в ту же ночь принимает закрытый разбор.", "The house holds a ball in honour of an ageing parent. The Tower sits a closed review the same night."),
      minAge: 40,
      maxOccurrences: 1,
      weight: 2,
      conditions: [when.flag("academy-student"), when.npc("parent")],
      choices: [
        { id: "dance", text: t("Танцевать с родителем", "Dance with the parent"), success: { text: t("Один танец стоит места в Башне.", "One dance is worth a place in the Tower."), effects: [fx.affinity("parent", 16), fx.meter("court-favor", 4), fx.faction("magic-tower", -3)] } },
        { id: "review", text: t("Сидеть на разборе", "Sit the review"), success: { text: t("Башня кивает. Дома танцуют без вас.", "The Tower nods. At home they dance without you."), effects: [fx.skill("arcana", 4), fx.track(4), fx.affinity("parent", -10)] } }
      ]
    },
    {
      id: "ac.ball-or-exam",
      kind: "personal",
      title: t("Бал или экзамен", "The ball or the exam"),
      text: t("Дом устраивает бал в ту же ночь, когда Башня принимает закрытый экзамен. Пропустить бал — оскорбить кровь. Пропустить экзамен — закрыть Башню на годы.", "The house holds a ball the same night the Tower sits a closed exam. Missing the ball insults the blood. Missing the exam closes the Tower for years."),
      minAge: 16,
      maxOccurrences: 1,
      weight: 2,
      conditions: [when.flag("academy-student")],
      choices: [
        { id: "ball", text: t("Танцевать до рассвета", "Dance until dawn"), success: { text: t("Имя дома звучит в каждой зале. Башня молчит.", "The house's name sounds in every hall. The Tower is silent."), effects: [fx.meter("court-favor", 12), fx.rep(6), fx.faction("magic-tower", -6), fx.stat("charisma", 1)] } },
        { id: "exam", text: t("Сидеть над кругами", "Sit over the circles"), success: { text: t("Чернила вместо танца. Дом пришлёт холодное письмо.", "Ink instead of a dance. The house will send a cold letter."), effects: [fx.skill("arcana", 6), fx.track(6), fx.meter("court-favor", -5), fx.later("ac.c-exam-notice", 2), fx.flag("sat-exam"), fx.schedule("ac.tower-reply", 4)] } },
        { id: "both", text: t("Успеть на оба", "Make both"), check: check(["intelligence", "charisma"], 14, 0, { skill: "etiquette" }), success: { text: t("Один танец и одна решённая печать. Никто не заметил отсутствия.", "One dance and one solved seal. No one noticed the absence."), effects: [fx.meter("court-favor", 4), fx.skill("arcana", 3), fx.stat("luck", 1)] }, failure: { text: t("Опоздание на бал и пустой лист на экзамене.", "Late to the ball and a blank sheet at the exam."), effects: [fx.meter("scandal", 8), fx.rep(-4)] } }
      ]
    }
  ]
};
