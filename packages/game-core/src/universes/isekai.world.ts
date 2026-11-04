// Арденвейл, Stage 02: Система выдаёт задания со сроком, наградой и штрафом; её расположение ускоряет рост.
// Сословия держатся на Гильдии и баронах, а память прошлой жизни открывает изобретения
import { t } from "../i18n.js";
import { check, fx, when } from "../narrative/dsl.js";
import type { WorldDefinition } from "./types.js";

export const ISEKAI_WORLD: WorldDefinition = {
  mechanics: [
    { name: t("Задания Системы", "System quests"), description: t("Хор Системы выдаёт задания со сроком. Выполнили — награда и расположение Системы, провалили — штраф.", "The System Choir issues quests with a deadline. Complete them for a reward and the System's favour; fail and pay a penalty.") },
    { name: t("Расположение Системы", "System favour"), description: t("Чем выше расположение, тем быстрее растут ранги Гильдии. Без заданий оно понемногу угасает.", "The higher the favour, the faster Guild ranks grow. Without quests it slowly fades.") },
    { name: t("Память прошлой жизни", "Past-life memory"), description: t("Кто принял воспоминания, тот до двадцати лет быстрее умнеет и может изобретать.", "Those who accept their memories grow smarter faster until twenty and can invent.") }
  ],
  originProfiles: {
    villager: { socialClassId: "commoner", skills: { survival: 5, athletics: 3 }, history: t("Деревня у края леса живёт охотой и дружбой с соседним эльфийским родом.", "The village at the forest's edge lives by hunting and friendship with a neighbouring elven clan.") },
    "merchant-child": { socialClassId: "burgher", skills: { trade: 8 }, factions: { "merchant-league": 15 }, history: t("Лавка деда пережила две войны и одного дракона. Отец мечтает о собственном караване.", "Grandfather's shop survived two wars and one dragon. Father dreams of his own caravan.") },
    "baron-child": { socialClassId: "gentry", skills: { persuasion: 5, melee: 3 }, factions: { crown: 10 }, history: t("Маленькое баронство на границе: замок, три деревни и вечный спор с соседом за мельницу.", "A small barony on the border: a castle, three villages and an eternal quarrel with the neighbour over a mill.") },
    orphan: { socialClassId: "commoner", family: "orphan", skills: { stealth: 5 }, history: t("Родители погибли при набеге гоблинов. Приют при храме Хора стал первым домом.", "The parents died in a goblin raid. The orphanage at the Choir's temple became the first home.") }
  },
  raceTalents: { elf: ["mana-affinity"], beastkin: ["beast-senses"], dwarf: ["forge-blood"], human: ["system-darling"] },
  socialClasses: [
    { id: "commoner", name: t("Простолюдин", "Commoner"), description: t("Поле, лес и налоги барону.", "Fields, forest and taxes to the baron."), standing: 1, income: 1, occupations: [t("Охотник", "Hunter"), t("Мельник", "Miller"), t("Травница", "Herbalist")] },
    { id: "burgher", name: t("Горожанин", "Burgher"), description: t("Цеха, лавки и вольности городов.", "Guilds, shops and town liberties."), standing: 2, income: 3, occupations: [t("Лавочник", "Shopkeeper"), t("Мастер цеха", "Guild master")] },
    { id: "adventurer", name: t("Искатель приключений", "Adventurer"), description: t("Лицензия Гильдии вместо герба.", "A Guild licence instead of a crest."), standing: 2, income: 2, occupations: [t("Искатель ранга C", "Rank C adventurer")] },
    { id: "gentry", name: t("Мелкая знать", "Gentry"), description: t("Титул, замок и долги.", "A title, a castle and debts."), standing: 3, income: 5, occupations: [t("Барон", "Baron"), t("Баронесса", "Baroness")] },
    { id: "hero", name: t("Герой королевства", "Hero of the realm"), description: t("Те, чьё имя поют барды.", "Those whose names the bards sing."), standing: 4, income: 8, occupations: [t("Герой", "Hero")] }
  ],
  meters: [{ id: "system-favor", name: t("Расположение Системы", "System favour"), description: t("Как благосклонен Хор Системы.", "How kindly the System Choir regards you."), min: 0, max: 100, initial: 20 }],
  factions: [
    { id: "guild", name: t("Гильдия искателей", "Adventurers' Guild"), description: t("Лицензии, задания и ранги.", "Licences, quests and ranks.") },
    { id: "merchant-league", name: t("Торговая лига", "Merchant League"), description: t("Те, кто считает золото.", "Those who count the gold.") },
    { id: "crown", name: t("Корона Арденвейла", "Crown of Ardenvale"), description: t("Король и его маги.", "The king and his mages.") }
  ],
  skills: [
    { id: "guild-craft", name: t("Дело искателя", "Adventuring"), description: t("Карты, ловушки, монстры и контракты Гильдии.", "Maps, traps, monsters and Guild contracts."), category: "combat", stats: ["agility", "intelligence"] },
    { id: "spellcraft", name: t("Магия", "Spellcraft"), description: t("Заклинания по формулам — или по памяти о физике.", "Spells by formula — or by remembered physics."), category: "magic", stats: ["intelligence", "wisdom"] },
    { id: "invention", name: t("Изобретательство", "Invention"), description: t("Вещи, которых этот мир ещё не видел.", "Things this world has never seen."), category: "craft", stats: ["intelligence", "luck"] }
  ],
  talents: [
    { id: "system-darling", name: t("Любимец Системы", "System's darling"), description: t("Хор Системы звучит громче и щедрее.", "The System Choir sounds louder and more generous."), trackFactor: 1.2, checks: ["luck"], weight: 0.7 },
    { id: "mana-affinity", name: t("Родство с маной", "Mana affinity"), description: t("Мана течёт сама, без усилий.", "Mana flows on its own, effortlessly."), growth: ["intelligence", "wisdom"], skills: ["spellcraft"], checks: ["intelligence"] },
    { id: "beast-senses", name: t("Звериное чутьё", "Beast senses"), description: t("Слышит ловушку раньше, чем видит.", "Hears a trap before seeing it."), growth: ["agility"], skills: ["guild-craft"], checks: ["agility"] },
    { id: "forge-blood", name: t("Кровь кузни", "Forge blood"), description: t("Металл слушается рук.", "Metal obeys the hands."), skills: ["craft", "invention"], checks: ["strength"] }
  ],
  weaknesses: [
    { id: "otherworld-ache", name: t("Тоска по прошлому миру", "Otherworld ache"), description: t("Иногда кажется, что настоящая жизнь осталась там.", "Sometimes it seems real life was left behind there."), checks: ["willpower"] },
    { id: "mana-leak", name: t("Утечка маны", "Mana leak"), description: t("Мана уходит, как вода в песок.", "Mana drains like water into sand."), trackFactor: 0.85, conflicts: ["mana-affinity"] }
  ],
  professions: [
    { id: "adventurer", name: t("Искатель приключений", "Adventurer"), description: t("Контракты Гильдии и добыча из подземелий.", "Guild contracts and dungeon loot."), skill: "guild-craft", stats: ["agility", "strength"], base: 4 },
    { id: "inventor", name: t("Изобретатель", "Inventor"), description: t("Мастерская и патенты короны.", "A workshop and crown patents."), skill: "invention", stats: ["intelligence", "luck"], base: 4 },
    { id: "court-mage", name: t("Маг при бароне", "Baron's mage"), description: t("Защитные круги и прогноз погоды.", "Warding circles and weather forecasts."), skill: "spellcraft", stats: ["intelligence", "wisdom"], base: 5 }
  ],
  education: [
    { id: "is-temple", name: t("Храмовая школа Хора", "Choir temple school"), description: t("Письмо, счёт и песни Системы.", "Writing, sums and the System's songs."), tier: 1, skills: ["lore"] },
    { id: "is-guild-course", name: t("Курс Гильдии", "Guild course"), description: t("Как не умереть в первом подземелье.", "How not to die in the first dungeon."), tier: 2, skills: ["guild-craft", "survival"] },
    { id: "is-royal-academy", name: t("Королевская академия магии", "Royal Academy of Magic"), description: t("Высшая магия и учёные споры.", "High magic and learned disputes."), tier: 3, skills: ["spellcraft", "lore"] }
  ],
  specializations: [
    { id: "spellblade", name: t("Магический мечник", "Spellblade"), description: t("Клинок и заклинание в одном движении.", "Blade and spell in one motion."), statBonus: { agility: 2, intelligence: 1 }, skill: "guild-craft" },
    { id: "artificer", name: t("Артефактор", "Artificer"), description: t("Магия, запертая в вещах.", "Magic locked inside objects."), statBonus: { intelligence: 2, luck: 1 }, skill: "invention" },
    { id: "summoner", name: t("Призыватель", "Summoner"), description: t("Договоры с духами леса.", "Pacts with forest spirits."), statBonus: { wisdom: 2, charisma: 1 }, skill: "spellcraft" }
  ],
  familySecrets: [
    { id: "is-hero-blood", name: t("Кровь героя", "Hero's blood"), hint: t("Мать хранит меч, который никто не может вынуть из ножен.", "Mother keeps a sword no one can draw from its sheath."), reveal: t("Прадед был героем, победившим прошлого Короля демонов. Меч вынимается.", "Great-grandfather was the hero who defeated the last Demon Lord. The sword comes free."), effects: [fx.rep(15), fx.stat("strength", 2), fx.meter("system-favor", 15)] },
    { id: "is-two-souls", name: t("Две души", "Two souls"), hint: t("Жрица при рождении сказала, что в ребёнке звучат два голоса.", "At birth the priestess said two voices sounded in the child."), reveal: t("Перерождение было не случайным: Система выбрала эту душу заранее.", "The rebirth was no accident: the System chose this soul in advance."), effects: [fx.meter("system-favor", 25), fx.awakenTalent()] },
    { id: "is-noble-bastard", name: t("Тайное родство", "Secret kinship"), hint: t("Раз в год в дом приходит богатый незнакомец и долго молчит у колыбели.", "Once a year a wealthy stranger visits and stands silent by the cradle."), reveal: t("Незнакомец — граф, настоящий отец. Он признаёт ребёнка.", "The stranger is a count, the true father. He acknowledges the child."), effects: [fx.socialClass("gentry"), fx.wealth(80), fx.faction("crown", 10)], origins: ["villager", "orphan"] }
  ],
  birthplaces: [
    t("деревня у Эльфийского леса", "a village by the Elven Wood"),
    t("торговый квартал столицы Арденвейла", "the merchant quarter of Ardenvale's capital"),
    t("пограничный замок барона", "a baron's border castle"),
    t("приют при храме Хора", "the orphanage of the Choir's temple")
  ],
  omens: [
    { text: t("В момент рождения перед глазами повитухи вспыхнуло синее окно: «Получен новый пользователь».", "At the moment of birth a blue window flashed before the midwife: 'New user received'.") },
    { text: t("Хор Системы пропел в храме среди ночи, хотя служба давно кончилась.", "The System Choir sang in the temple at midnight, though the service had long ended.") },
    { text: t("Над домом прошла радуга, хотя дождя не было.", "A rainbow passed over the house though there was no rain."), minDestiny: 7 },
    { text: t("В тот же час в далёкой крепости проснулся Король демонов.", "At the same hour, in a distant fortress, the Demon Lord awoke."), minDestiny: 9 }
  ],
  npcTitles: {
    mentor: [t("Отставной искатель ранга S", "Retired rank S adventurer"), t("Эльфийская волшебница", "Elven sorceress")],
    teacher: [t("Жрица Хора", "Choir priestess"), t("Преподаватель академии", "Academy lecturer")],
    rival: [t("Другой перерождённый", "Another reincarnator"), t("Сын соседнего барона", "Neighbouring baron's son")],
    friend: [t("Зверолюд-разведчик", "Beastkin scout"), t("Подмастерье кузнеца", "Smith's apprentice")]
  },
  consequences: [
    { id: "is.c-patent", title: t("Патент короны", "A crown patent"), text: t("Изобретение {name} разошлось по королевству. Корона выплачивает долю.", "{name}'s invention has spread across the realm. The crown pays a share."), effects: [fx.wealth(60), fx.faction("crown", 10), fx.skill("invention", 5)] },
    { id: "is.c-shared-knowledge", title: t("Подаренное знание", "A gifted knowledge"), text: t("Деревня, которой {name} рассказал о мыловарении, больше не болеет. Старейшины приходят с благодарностью.", "The village {name} taught soap-making no longer falls ill. The elders come to give thanks."), effects: [fx.rep(10), fx.karma(5), fx.npc("friend")] },
    { id: "is.c-demon-scar", title: t("Шрам войны", "A scar of war"), text: t("Рана из похода против Короля демонов открывается снова.", "The wound from the campaign against the Demon Lord reopens."), chance: 0.6, effects: [fx.health(-20), fx.weakness("otherworld-ache")] },
    { id: "is.c-rival-reincarnator", title: t("Второй перерождённый", "The second reincarnator"), text: t("Тот, кто тоже помнит прошлый мир, узнаёт в {name} своего. Теперь у {name} есть соперник, который знает те же секреты.", "Someone else who remembers the old world recognises {name}. Now {name} has a rival who knows the same secrets."), effects: [fx.npc("rival"), fx.stat("intelligence", 1)] }
  ],
  quests: [
    { id: "is.q-learn", title: t("Знание — сила", "Knowledge is power"), text: t("Система: поднимите навык «Знания» до 15.", "System: raise the Lore skill to 15."), goal: [when.skill("lore", 15)], years: 4, reward: [fx.xp(60), fx.stat("intelligence", 2)], penalty: [fx.stat("intelligence", -1)], minAge: 10 },
    { id: "is.q-gold", title: t("Первый капитал", "Seed capital"), text: t("Система: накопите 100 золота.", "System: save up 100 gold."), goal: [when.wealth(100)], years: 6, reward: [fx.skill("trade", 8), fx.rep(5)], penalty: [fx.wealth(-15)], minAge: 14 },
    { id: "is.q-rank", title: t("Ранг D", "Rank D"), text: t("Система: получите ранг Гильдии D.", "System: reach Guild rank D."), goal: [when.rank(2)], years: 6, reward: [fx.track(15), fx.ability("appraisal")], penalty: [fx.track(-10)], minAge: 12 },
    { id: "is.q-friend", title: t("Не в одиночку", "Not alone"), text: t("Система: заведите близкого друга (отношение 60+).", "System: make a close friend (affinity 60+)."), goal: [when.affinity("friend", 60)], years: 5, reward: [fx.stat("charisma", 2), fx.affinity("friend", 10)], penalty: [fx.stat("charisma", -1)], minAge: 10 },
    { id: "is.q-weakness", title: t("Перезагрузка", "Reboot"), text: t("Система: избавьтесь от слабости.", "System: overcome a weakness."), goal: [{ type: "weakness", ids: [], has: false }], years: 5, reward: [fx.health(30), fx.stat("willpower", 2)], penalty: [fx.health(-15)], minAge: 14 }
  ],
  abilityCategories: { appraisal: "utility", "spell-weave": "magic", "modern-knowledge": "utility" },
  abilities: [
    { id: "inventory", name: t("Инвентарь", "Inventory"), description: t("Карман вне пространства. Подарок Системы.", "A pocket outside space. A gift from the System."), category: "utility" },
    { id: "fireball", name: t("Огненный шар", "Fireball"), description: t("Классика. Работает всегда.", "A classic. Always works."), category: "magic" }
  ],
  events: [
    {
      id: "is.temple-school",
      kind: "personal",
      title: t("Храмовая школа", "The temple school"),
      text: t("Жрица Хора приглашает детей учиться письму. В прошлой жизни {name} это уже умел — но здесь другой алфавит.", "A Choir priestess invites children to learn writing. In the past life {name} already could — but here the alphabet is different."),
      minAge: 6,
      maxAge: 10,
      maxOccurrences: 1,
      conditions: [when.educationAtMost(0)],
      choices: [
        { id: "study", text: t("Учиться прилежно", "Study diligently"), success: { text: t("Жрица хвалит: таких способных она не видела.", "The priestess is impressed: she has never seen anyone so able."), effects: [fx.education("is-temple"), fx.npc("teacher"), fx.meter("system-favor", 5)] } },
        { id: "show-off", text: t("Блеснуть знаниями прошлого мира", "Show off otherworld knowledge"), requires: [when.flag("remembers")], check: check(["charisma", "intelligence"], 10), success: { text: t("Жрица поражена. О ребёнке говорят в столице.", "The priestess is astonished. The capital talks of the child."), effects: [fx.education("is-temple"), fx.rep(8), fx.npc("rival")] }, failure: { text: t("Слова звучат как бред. Дети дразнят «чудиком».", "The words sound like nonsense. The children call {name} a weirdo."), effects: [fx.education("is-temple"), fx.rep(-5), fx.weakness("otherworld-ache")] } }
      ]
    },
    {
      id: "is.guild-licence",
      kind: "path",
      title: t("Экзамен на лицензию", "The licence exam"),
      text: t("Гильдия набирает новичков на курс. После него — лицензия и первые контракты.", "The Guild recruits novices for a course. After it — a licence and first contracts."),
      minAge: 13,
      maxAge: 22,
      maxOccurrences: 1,
      conditions: [when.educationAtMost(1)],
      choices: [
        { id: "enroll", text: t("Записаться", "Enrol"), check: check(["agility", "intelligence"], 10), success: { text: t("Лицензия в руках. Мир стал больше.", "The licence is in hand. The world has grown larger."), effects: [fx.education("is-guild-course"), fx.profession("adventurer"), fx.socialClass("adventurer"), fx.faction("guild", 15)] }, failure: { text: t("Экзаменатор советует прийти через год.", "The examiner advises coming back in a year."), effects: [fx.skill("guild-craft", 3)] } },
        { id: "skip", text: t("Не сейчас", "Not now"), success: { text: t("Подземелья подождут.", "The dungeons can wait."), effects: [] } }
      ]
    },
    {
      id: "is.system-gift",
      kind: "world",
      title: t("Подарок Системы", "A gift from the System"),
      text: t("Перед глазами вспыхивает окно: «За прилежание вам доступна награда. Выберите одну».", "A window flashes before the eyes: 'For diligence a reward is available. Choose one.'"),
      minAge: 10,
      maxOccurrences: 2,
      cooldown: 8,
      conditions: [when.meter("system-favor", 50)],
      choices: [
        { id: "inventory", text: t("Инвентарь", "Inventory"), success: { text: t("Карман вне пространства. Невероятно удобно.", "A pocket outside space. Incredibly handy."), effects: [fx.ability("inventory"), fx.meter("system-favor", -15)] } },
        { id: "talent", text: t("Пробудить скрытый дар", "Awaken a hidden gift"), requires: [when.dormantTalent()], success: { text: t("Что-то внутри щёлкает и встаёт на место.", "Something inside clicks into place."), effects: [fx.awakenTalent(), fx.reveal("potential"), fx.meter("system-favor", -20)] } },
        { id: "gold", text: t("Золото", "Gold"), success: { text: t("Звенящий мешочек падает с потолка.", "A jingling pouch drops from the ceiling."), effects: [fx.wealth(50), fx.meter("system-favor", -10)] } }
      ]
    },
    {
      id: "is.fireball",
      kind: "stat",
      title: t("Формула огня", "The formula of fire"),
      text: t("{name} понимает: местные маги не знают о кислороде. Огненный шар можно сделать вдвое сильнее.", "{name} realises the local mages don't know about oxygen. A fireball could be twice as strong."),
      minAge: 12,
      maxOccurrences: 1,
      conditions: [when.stat("intelligence", 16), when.flag("remembers")],
      choices: [
        { id: "try", text: t("Попробовать", "Try it"), check: check(["intelligence", "wisdom"], 12, 0, { skill: "spellcraft" }), success: { text: t("Пламя ревёт синим. Маги в ужасе и восторге.", "The flame roars blue. The mages are horrified and delighted."), effects: [fx.ability("fireball"), fx.skill("spellcraft", 8), fx.rep(5)] }, failure: { text: t("Брови сгорели первыми.", "The eyebrows went first."), effects: [fx.health(-15), fx.skill("spellcraft", 3)] } },
        { id: "keep", text: t("Не раскрывать секрет", "Keep the secret"), success: { text: t("Знание — оружие. Им не размахивают.", "Knowledge is a weapon. One doesn't wave it around."), effects: [fx.stat("wisdom", 1)] } }
      ]
    },
    {
      id: "is.mother-illness",
      kind: "family",
      title: t("Болезнь матери", "Mother's illness"),
      text: t("Мать слегла с лихорадкой. Местные лекари пускают кровь — {name} помнит, что так делать нельзя.", "Mother has fallen ill with fever. Local healers bleed her — {name} remembers that this is wrong."),
      minAge: 10,
      maxOccurrences: 1,
      conditions: [when.npc("mother")],
      choices: [
        { id: "treat", text: t("Лечить по знаниям прошлого мира", "Treat with otherworld knowledge"), check: check(["intelligence", "wisdom"], 11, 0, { skill: "medicine" }), success: { text: t("Кипячёная вода, отвар ивы и покой. Мать встаёт через неделю.", "Boiled water, willow tea and rest. Mother is up in a week."), effects: [fx.affinity("mother", 20), fx.skill("medicine", 6), fx.karma(5)] }, failure: { text: t("Лихорадка отступает медленно. Мать слабеет, но живёт.", "The fever retreats slowly. Mother weakens but lives."), effects: [fx.affinity("mother", 10), fx.skill("medicine", 3)] } },
        { id: "healer", text: t("Позвать жрицу Хора (20 золота)", "Call a Choir priestess (20 gold)"), requires: [when.wealth(20)], success: { text: t("Жрица поёт над постелью, и жар спадает.", "The priestess sings over the bed and the fever breaks."), effects: [fx.wealth(-20), fx.affinity("mother", 12)] } },
        { id: "trust", text: t("Довериться лекарям", "Trust the healers"), success: { text: t("Мать не переживает зиму.", "Mother does not survive the winter."), effects: [fx.npcDies("mother"), fx.stat("willpower", 2), fx.weakness("otherworld-ache")] } }
      ]
    },
    {
      id: "is.party",
      kind: "npc",
      title: t("Свой отряд", "A party of one's own"),
      text: t("В таверне Гильдии собирают отряд на трёхдневный контракт. Не хватает одного.", "In the Guild tavern a party is forming for a three-day contract. They're one short."),
      minAge: 15,
      cooldown: 4,
      conditions: [when.profession("adventurer")],
      choices: [
        { id: "join", text: t("Присоединиться", "Join"), check: check(["agility", "charisma"], 11, 0, { skill: "guild-craft" }), success: { text: t("Контракт выполнен, а в отряде появился настоящий друг.", "The contract is done, and the party gained a real friend."), effects: [fx.npc("friend"), fx.wealth(25), fx.track(6), fx.skill("guild-craft", 3)] }, failure: { text: t("Контракт сорван. Отряд расходится, виня друг друга.", "The contract fails. The party breaks up, blaming each other."), effects: [fx.health(-15), fx.faction("guild", -5)] } },
        { id: "solo", text: t("Идти одному", "Go solo"), check: check(["strength", "agility"], 13), success: { text: t("Вся награда себе.", "All the reward to yourself."), effects: [fx.wealth(40), fx.track(5)] }, failure: { text: t("Одному тяжело. Возвращение — ползком.", "Alone it's hard. The return is a crawl."), effects: [fx.health(-30)] } }
      ]
    },
    {
      id: "is.specialize",
      kind: "path",
      title: t("Выбор класса", "Choosing a class"),
      text: t("Система предлагает выбрать класс. Выбор нельзя будет изменить.", "The System offers a class choice. It cannot be changed later."),
      minAge: 16,
      maxOccurrences: 1,
      conditions: [when.rank(2), when.noSpecialization()],
      choices: [
        { id: "spellblade", text: t("Магический мечник", "Spellblade"), success: { text: t("Клинок вспыхивает рунами.", "The blade flares with runes."), effects: [fx.specialization("spellblade")] } },
        { id: "artificer", text: t("Артефактор", "Artificer"), success: { text: t("В руках оживает первый артефакт.", "The first artefact comes alive in the hands."), effects: [fx.specialization("artificer"), fx.profession("inventor")] } },
        { id: "summoner", text: t("Призыватель", "Summoner"), success: { text: t("Лесной дух отвечает на зов.", "A forest spirit answers the call."), effects: [fx.specialization("summoner")] } }
      ]
    },
    {
      id: "is.royal-academy",
      kind: "personal",
      title: t("Приглашение в академию", "An academy invitation"),
      text: t("Королевская академия магии заметила {name}. Учёба стоит дорого, но открывает двери ко двору.", "The Royal Academy of Magic has noticed {name}. Study is costly but opens the doors of the court."),
      minAge: 16,
      maxAge: 30,
      maxOccurrences: 1,
      conditions: [when.stat("intelligence", 16), when.educationAtMost(2)],
      choices: [
        { id: "enter", text: t("Поступить (60 золота)", "Enrol (60 gold)"), requires: [when.wealth(60)], success: { text: t("Мантия академии сидит как влитая.", "The academy robe fits perfectly."), effects: [fx.wealth(-60), fx.education("is-royal-academy"), fx.faction("crown", 10), fx.npc("teacher")] } },
        { id: "scholarship", text: t("Сдать экзамен на стипендию", "Sit the scholarship exam"), check: check(["intelligence", "wisdom"], 15, 0, { skill: "spellcraft" }), success: { text: t("Стипендия получена. Завистников сразу много.", "Scholarship granted. Envious rivals appear at once."), effects: [fx.education("is-royal-academy"), fx.npc("rival")] }, failure: { text: t("Не хватило пары баллов.", "A couple of points short."), effects: [fx.skill("spellcraft", 3)] } },
        { id: "decline", text: t("Отказаться", "Decline"), success: { text: t("Свобода дороже мантии.", "Freedom is worth more than a robe."), effects: [fx.stat("luck", 1)] } }
      ]
    }
  ]
};
