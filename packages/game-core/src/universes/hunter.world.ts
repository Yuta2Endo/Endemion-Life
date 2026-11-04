// Нео-Сеул, Stage 02: угроза Врат над городом растёт каждый год и прорывается в районе; слава и ранг приносят доход;
// гильдии, Ассоциация и корпорации делят пробуждённых
import { t } from "../i18n.js";
import { check, fx, when } from "../narrative/dsl.js";
import type { WorldDefinition } from "./types.js";

export const HUNTER_WORLD: WorldDefinition = {
  mechanics: [
    { name: t("Угроза Врат", "Gate threat"), description: t("Над городом каждый год открываются новые Врата. Когда угроза доходит до 80, Врата прорываются в районе персонажа.", "New Gates open over the city every year. When the threat reaches 80, a Gate breaks in the character's district.") },
    { name: t("Слава охотника", "Hunter fame"), description: t("Слава приносит контракты и ускоряет рост ранга, но быстро забывается без новых подвигов.", "Fame brings contracts and speeds rank growth, but fades fast without new feats.") },
    { name: t("Доход от зачисток", "Clear income"), description: t("Пробуждённый получает доход по рангу каждый год.", "An Awakened earns income by rank every year.") }
  ],
  originProfiles: {
    ordinary: { socialClassId: "citizen", skills: { athletics: 3, lore: 3 }, history: t("Квартира в спальном районе, кредит за неё и отец, который работает в две смены.", "A flat in a commuter district, the loan on it, and a father working double shifts.") },
    "hunter-family": { socialClassId: "hunter-clan", skills: { "dungeon-combat": 6, athletics: 4 }, factions: { association: 10 }, history: t("Отец — охотник ранга B. Медали на стене и шрамы, о которых он не говорит.", "Father is a B-rank hunter. Medals on the wall and scars he never talks about.") },
    "gate-orphan": { socialClassId: "underclass", family: "orphan", skills: { survival: 6, stealth: 3 }, meters: { "gate-threat": 30 }, history: t("Семья погибла при прорыве Врат в Мапхо. Государственный приют помнит её имя хуже, чем номер дела.", "The family died in the Mapo Gate break. The state orphanage remembers the name less well than the case number.") },
    chaebol: { socialClassId: "chaebol", skills: { trade: 6, persuasion: 4 }, factions: { "hanseong-corp": 20 }, history: t("Корпорация «Хансон» продаёт артефакты из подземелий. Дед построил её на костях первых охотников.", "Hanseong Corporation sells dungeon artefacts. Grandfather built it on the bones of the first hunters.") }
  },
  raceTalents: { human: ["latent-s-rank"] },
  socialClasses: [
    { id: "underclass", name: t("Дно города", "City underclass"), description: t("Районы у самых Врат.", "Districts right under the Gates."), standing: 0, income: 0, occupations: [t("Курьер", "Courier"), t("Уборщик подземелий", "Dungeon cleaner")] },
    { id: "citizen", name: t("Горожанин", "Citizen"), description: t("Работа, кредит и надежда на пробуждение детей.", "A job, a loan and hope that the children awaken."), standing: 1, income: 2, occupations: [t("Офисный работник", "Office worker"), t("Медсестра", "Nurse"), t("Таксист", "Taxi driver")] },
    { id: "licensed-hunter", name: t("Лицензированный охотник", "Licensed hunter"), description: t("Удостоверение Ассоциации.", "An Association badge."), standing: 2, income: 3, occupations: [t("Охотник ранга C", "C-rank hunter")] },
    { id: "hunter-clan", name: t("Семья охотников", "Hunter family"), description: t("Ранги, медали и связи в гильдиях.", "Ranks, medals and guild connections."), standing: 3, income: 4, occupations: [t("Охотник ранга B", "B-rank hunter"), t("Целительница гильдии", "Guild healer")] },
    { id: "chaebol", name: t("Корпоративная элита", "Corporate elite"), description: t("Деньги, которые покупают всё, кроме пробуждения.", "Money that buys everything except awakening."), standing: 4, income: 8, occupations: [t("Директор корпорации", "Corporate director")] },
    { id: "national-hunter", name: t("Национальный охотник", "National hunter"), description: t("Ранг S и защита целой страны.", "Rank S and the defence of a nation."), standing: 5, income: 12, occupations: [t("Национальный охотник", "National hunter")] }
  ],
  meters: [
    { id: "gate-threat", name: t("Угроза Врат", "Gate threat"), description: t("Сколько Врат открыто над районом.", "How many Gates are open over the district."), min: 0, max: 100, initial: 20, danger: true },
    { id: "fame", name: t("Слава", "Fame"), description: t("Знают ли охотника в лицо.", "Whether people know the hunter by face."), min: 0, max: 100, initial: 0 }
  ],
  factions: [
    { id: "association", name: t("Ассоциация охотников", "Hunter Association"), description: t("Государство, ранги и лицензии.", "The state, ranks and licences.") },
    { id: "white-tiger", name: t("Гильдия «Белый тигр»", "White Tiger Guild"), description: t("Крупнейшая гильдия Нео-Сеула.", "Neo-Seoul's largest guild.") },
    { id: "hanseong-corp", name: t("Корпорация «Хансон»", "Hanseong Corporation"), description: t("Артефакты, кристаллы и контракты.", "Artefacts, crystals and contracts.") }
  ],
  skills: [
    { id: "dungeon-combat", name: t("Бой в подземелье", "Dungeon combat"), description: t("Тактика против монстров и боссов.", "Tactics against monsters and bosses."), category: "combat", stats: ["strength", "agility"] },
    { id: "mana-control", name: t("Контроль маны", "Mana control"), description: t("Как не сжечь себя собственной силой.", "How not to burn out with one's own power."), category: "magic", stats: ["intelligence", "willpower"] },
    { id: "streaming", name: t("Стриминг", "Streaming"), description: t("Зачистка в прямом эфире — тоже работа.", "A live-streamed clear is work too."), category: "social", stats: ["charisma", "luck"] }
  ],
  talents: [
    { id: "latent-s-rank", name: t("Скрытый ранг S", "Latent S-rank"), description: t("Мана внутри больше, чем показывают приборы.", "There is more mana within than the instruments show."), trackFactor: 1.35, checks: ["willpower"], weight: 0.4 },
    { id: "gate-born", name: t("Дитя Врат", "Gate-born"), description: t("Чувствует разломы раньше датчиков.", "Senses rifts before the sensors do."), growth: ["wisdom"], skills: ["survival"], checks: ["wisdom"] },
    { id: "camera-face", name: t("Лицо для камеры", "Camera face"), description: t("Зрители любят с первого кадра.", "Viewers love them from the first frame."), growth: ["charisma"], skills: ["streaming"], checks: ["charisma"] }
  ],
  weaknesses: [
    { id: "mana-burn", name: t("Ожоги маны", "Mana burns"), description: t("Сила обжигает каналы при каждом рывке.", "Power scorches the channels at every surge."), healing: 0.8, checks: ["vitality"] },
    { id: "gate-trauma", name: t("Травма Врат", "Gate trauma"), description: t("Синий свет разлома возвращает в худший день.", "The blue light of a rift brings back the worst day."), checks: ["willpower"], conflicts: ["gate-born"] }
  ],
  professions: [
    { id: "raid-hunter", name: t("Рейдовый охотник", "Raid hunter"), description: t("Зачистки за долю добычи.", "Clears for a share of the loot."), skill: "dungeon-combat", stats: ["strength", "agility"], base: 5 },
    { id: "hunter-streamer", name: t("Охотник-стример", "Hunter streamer"), description: t("Подписчики платят лучше гильдий.", "Subscribers pay better than guilds."), skill: "streaming", stats: ["charisma", "luck"], base: 4 },
    { id: "gate-analyst", name: t("Аналитик Врат", "Gate analyst"), description: t("Прогноз прорывов для Ассоциации.", "Break forecasts for the Association."), skill: "lore", stats: ["intelligence", "wisdom"], base: 4 }
  ],
  education: [
    { id: "hu-school", name: t("Городская школа", "City school"), description: t("Обычные уроки и тренировки по эвакуации.", "Regular lessons and evacuation drills."), tier: 1, skills: ["lore"] },
    { id: "hu-hunter-academy", name: t("Академия охотников", "Hunter Academy"), description: t("Для пробуждённых: бой, мана и тактика.", "For the Awakened: combat, mana and tactics."), tier: 2, skills: ["dungeon-combat", "mana-control"] },
    { id: "hu-gate-institute", name: t("Институт изучения Врат", "Gate Research Institute"), description: t("Наука о том, что находится по ту сторону.", "The science of what lies beyond."), tier: 3, skills: ["lore", "mana-control"] }
  ],
  specializations: [
    { id: "tank", name: t("Танк", "Tank"), description: t("Встать между монстром и группой.", "Stand between the monster and the party."), statBonus: { vitality: 2, strength: 1 }, skill: "dungeon-combat" },
    { id: "assassin", name: t("Ассасин", "Assassin"), description: t("Удар из тени по слабому месту.", "A strike from the shadow at the weak spot."), statBonus: { agility: 2, luck: 1 }, skill: "stealth" },
    { id: "mage", name: t("Маг", "Mage"), description: t("Огонь, лёд и молния по площади.", "Fire, ice and lightning over an area."), statBonus: { intelligence: 2, willpower: 1 }, skill: "mana-control" }
  ],
  familySecrets: [
    { id: "hu-gate-child", name: t("Ребёнок из Врат", "A child from the Gate"), hint: t("В свидетельстве о рождении нет графы «место рождения» — её вымарали чёрным.", "The birth certificate has no 'place of birth' — it was blacked out."), reveal: t("Ребёнка нашли внутри Врат и вынесли охотники. Мана подземелья — родная.", "The child was found inside a Gate and carried out by hunters. Dungeon mana is native."), effects: [fx.flag("awakened"), fx.talent("gate-born"), fx.faction("association", -10)] },
    { id: "hu-father-rank", name: t("Скрытый ранг отца", "Father's hidden rank"), hint: t("Отец никогда не ходит в подземелья, но по ночам его вызывают люди в чёрном.", "Father never enters dungeons, yet men in black summon him at night."), reveal: t("Отец — засекреченный охотник ранга S. Его враги знают о семье.", "Father is a classified S-rank hunter. His enemies know about the family."), effects: [fx.affinity("father", 15), fx.npc("rival"), fx.faction("association", 15)] },
    { id: "hu-corp-crime", name: t("Преступление корпорации", "The corporation's crime"), hint: t("Дед держит в сейфе флешку, которую нельзя трогать.", "Grandfather keeps a drive in the safe that must not be touched."), reveal: t("Корпорация открывала Врата искусственно. На флешке — доказательства.", "The corporation opened Gates artificially. The drive holds the proof."), effects: [fx.faction("hanseong-corp", -30), fx.faction("association", 20), fx.karma(10)], origins: ["chaebol"] }
  ],
  birthplaces: [
    t("спальный район Тобон под тремя Вратами", "the Dobong commuter district beneath three Gates"),
    t("квартира над тренировочным залом гильдии", "a flat above a guild training hall"),
    t("государственный приют в Мапхо", "a state orphanage in Mapo"),
    t("пентхаус корпорации в Каннаме", "a corporate penthouse in Gangnam")
  ],
  omens: [
    { text: t("В ночь рождения над роддомом открылись и сразу закрылись Врата.", "On the night of the birth a Gate opened over the maternity ward and closed at once.") },
    { text: t("Все датчики маны в квартале на минуту показали ноль.", "Every mana sensor in the block read zero for a minute."), minDestiny: 6 },
    { text: t("Город спал спокойно: ни одной тревоги за ночь.", "The city slept peacefully: not a single alarm all night.") },
    { text: t("Над Сеулом впервые за двадцать лет встало красное солнце Врат.", "For the first time in twenty years a red Gate sun rose over Seoul."), minDestiny: 9 }
  ],
  npcTitles: {
    mentor: [t("Отставной охотник ранга A", "Retired A-rank hunter"), t("Инструктор академии", "Academy instructor")],
    teacher: [t("Классный руководитель", "Homeroom teacher"), t("Тренер по эвакуации", "Evacuation coach")],
    rival: [t("Пробуждённый одноклассник", "Awakened classmate"), t("Наследник «Белого тигра»", "Heir of the White Tiger")],
    friend: [t("Соседка-хакер", "Hacker neighbour"), t("Друг детства из приюта", "Childhood friend from the orphanage")]
  },
  consequences: [
    { id: "hu.c-saved-civilians", title: t("Спасённые помнят", "The saved remember"), text: t("Люди, которых {name} вывел из прорыва, собрали деньги и подарили новое снаряжение.", "The people {name} led out of the break pooled money and gifted new gear."), effects: [fx.meter("fame", 15), fx.wealth(40), fx.npc("friend")] },
    { id: "hu.c-guild-contract", title: t("Контракт гильдии", "The guild contract"), text: t("Гильдия требует отработать подписанный контракт в самом опасном рейде года.", "The guild demands the signed contract be honoured in the year's most dangerous raid."), conditions: [when.flag("guild-member")], effects: [fx.health(-25), fx.track(12), fx.wealth(60)] },
    { id: "hu.c-hidden-power", title: t("Скрытое всплывает", "The hidden surfaces"), text: t("Ассоциация узнала, что на переоценке {name} скрыл силу. Штраф и пристальное внимание.", "The Association learned {name} hid power at re-evaluation. A fine and close scrutiny."), chance: 0.6, effects: [fx.wealth(-30), fx.faction("association", -15)] },
    { id: "hu.c-ran-away", title: t("Цена бегства", "The price of fleeing"), text: t("Видео, где {name} убегает от прорыва, набирает миллионы просмотров.", "A video of {name} fleeing a break gets millions of views."), effects: [fx.meter("fame", -10), fx.rep(-8), fx.weakness("gate-trauma")] }
  ],
  abilityCategories: { "mana-blade": "combat", "shadow-step": "combat", "gate-sense": "magic" },
  abilities: [
    { id: "aggro-roar", name: t("Рёв ярости", "Aggro Roar"), description: t("Все монстры смотрят только на вас.", "Every monster looks only at you."), category: "combat" },
    { id: "chain-lightning", name: t("Цепная молния", "Chain Lightning"), description: t("Молния прыгает от монстра к монстру.", "Lightning leaps from monster to monster."), category: "magic" }
  ],
  events: [
    {
      id: "hu.district-break",
      kind: "world",
      title: t("Прорыв в районе", "A district break"),
      text: t("Сирены. Врата над кварталом лопаются, и из синего света выходят монстры.", "Sirens. The Gate over the block bursts, and monsters step out of the blue light."),
      scheduledOnly: true,
      choices: [
        { id: "fight", text: t("Встать на пути монстров", "Stand in the monsters' path"), requires: [when.flag("awakened")], check: check(["strength", "agility", "vitality"], 13, 2, { skill: "dungeon-combat" }), success: { text: t("Врата закрыты. Камеры снимали всё.", "The Gate is closed. Cameras filmed everything."), effects: [fx.meter("gate-threat", -60), fx.meter("fame", 20), fx.track(15), fx.xp(80), fx.later("hu.c-saved-civilians", 2)] }, failure: { text: t("Монстров слишком много. Охотники Ассоциации успевают в последний момент.", "Too many monsters. Association hunters arrive at the last moment."), effects: [fx.meter("gate-threat", -40), fx.health(-45)] } },
        { id: "evacuate", text: t("Выводить людей", "Lead people out"), check: check(["agility", "charisma"], 11), success: { text: t("Двадцать семей выведены из квартала.", "Twenty families are led out of the block."), effects: [fx.meter("gate-threat", -40), fx.karma(10), fx.rep(8), fx.later("hu.c-saved-civilians", 2)] }, failure: { text: t("Обломок здания задевает плечо.", "A piece of building clips the shoulder."), effects: [fx.meter("gate-threat", -40), fx.health(-25), fx.karma(5)] } },
        { id: "flee", text: t("Бежать", "Run"), success: { text: t("Выжить — тоже победа.", "Surviving is a victory too."), effects: [fx.meter("gate-threat", -40), fx.later("hu.c-ran-away", 1)] } }
      ]
    },
    {
      id: "hu.academy",
      kind: "path",
      title: t("Академия охотников", "Hunter Academy"),
      text: t("Пробуждённых подростков приглашают в Академию охотников. Бесплатно — за контракт с Ассоциацией.", "Awakened teens are invited to the Hunter Academy. Free — in exchange for an Association contract."),
      minAge: 14,
      maxAge: 22,
      maxOccurrences: 1,
      conditions: [when.flag("awakened"), when.educationAtMost(1)],
      choices: [
        { id: "enroll", text: t("Поступить", "Enrol"), success: { text: t("Форма академии, общежитие и новые соперники.", "An academy uniform, a dorm and new rivals."), effects: [fx.education("hu-hunter-academy"), fx.npc("rival"), fx.npc("mentor"), fx.faction("association", 10), fx.socialClass("licensed-hunter")] } },
        { id: "solo", text: t("Учиться самому в подземельях", "Learn alone in the dungeons"), check: check(["strength", "luck"], 12), success: { text: t("Без лицензии, зато без хозяев.", "No licence, but no masters either."), effects: [fx.skill("dungeon-combat", 6), fx.track(5)] }, failure: { text: t("Подземелье E-ранга чуть не стало последним.", "An E-rank dungeon nearly became the last."), effects: [fx.health(-30)] } }
      ]
    },
    {
      id: "hu.stream",
      kind: "stat",
      title: t("Камера включена", "Camera on"),
      text: t("Друг предлагает снимать зачистку в прямом эфире.", "A friend offers to live-stream the clear."),
      minAge: 16,
      cooldown: 4,
      conditions: [when.flag("awakened")],
      choices: [
        { id: "stream", text: t("Выйти в эфир", "Go live"), check: check(["charisma", "luck"], 11, 0, { skill: "streaming" }), success: { text: t("Сто тысяч зрителей и донаты.", "A hundred thousand viewers and donations."), effects: [fx.meter("fame", 12), fx.wealth(25), fx.skill("streaming", 4)] }, failure: { text: t("Трансляция обрывается на неловком моменте.", "The stream cuts off at an awkward moment."), effects: [fx.meter("fame", -5), fx.rep(-3)] } },
        { id: "no", text: t("Работать без камер", "Work without cameras"), success: { text: t("Тишина и сосредоточенность.", "Quiet and focus."), effects: [fx.skill("dungeon-combat", 2)] } }
      ]
    },
    {
      id: "hu.father-raid",
      kind: "family",
      title: t("Последний рейд отца", "Father's last raid"),
      text: t("Отец уходит в рейд ранга A и просит {name} не провожать. Он так никогда раньше не делал.", "Father leaves for an A-rank raid and asks {name} not to see him off. He has never done that before."),
      minAge: 12,
      maxOccurrences: 1,
      conditions: [when.npc("father"), when.origin("hunter-family")],
      choices: [
        { id: "follow", text: t("Тайком пойти следом", "Secretly follow"), check: check(["agility", "luck"], 13, 0, { skill: "stealth" }), success: { text: t("В решающий момент {name} отвлекает босса. Отец выживает и обнимает так, что трещат рёбра.", "At the decisive moment {name} distracts the boss. Father survives and hugs so hard the ribs creak."), effects: [fx.affinity("father", 25), fx.flag("awakened"), fx.track(8)] }, failure: { text: t("{name} опаздывает. Из Врат выносят только щит отца.", "{name} arrives too late. Only father's shield is carried out of the Gate."), effects: [fx.npcDies("father"), fx.weakness("gate-trauma"), fx.stat("willpower", 3)] } },
        { id: "wait", text: t("Ждать дома", "Wait at home"), success: { text: t("Отец возвращается через неделю, постаревший на годы.", "Father returns a week later, aged by years."), effects: [fx.affinity("father", 10)] } }
      ]
    },
    {
      id: "hu.rival-ranking",
      kind: "npc",
      title: t("Рейтинг академии", "The academy ranking"),
      text: t("Соперник обходит {name} в рейтинге и предлагает спарринг на глазах у всех.", "The rival overtakes {name} in the ranking and proposes a public sparring match."),
      minAge: 14,
      cooldown: 4,
      conditions: [when.npc("rival"), when.flag("awakened")],
      choices: [
        { id: "spar", text: t("Выйти на арену", "Step into the arena"), check: check(["strength", "agility"], 11, 0, { skill: "dungeon-combat", versus: "rival" }), success: { text: t("Победа. Рейтинг возвращается.", "Victory. The ranking is restored."), effects: [fx.meter("fame", 8), fx.affinity("rival", 10), fx.track(4)] }, failure: { text: t("Соперник смеётся над синяками.", "The rival laughs at the bruises."), effects: [fx.health(-15), fx.affinity("rival", -8), fx.meter("fame", -4)] } },
        { id: "ignore", text: t("Не реагировать", "Ignore it"), success: { text: t("Тренировки важнее рейтингов.", "Training matters more than rankings."), effects: [fx.skill("mana-control", 3)] } }
      ]
    },
    {
      id: "hu.specialize",
      kind: "path",
      title: t("Роль в группе", "Party role"),
      text: t("Ассоциация просит указать роль в рейдовой группе.", "The Association asks to register a raid party role."),
      minAge: 16,
      maxOccurrences: 1,
      conditions: [when.rank(2), when.noSpecialization()],
      choices: [
        { id: "tank", text: t("Танк", "Tank"), success: { text: t("Щит выше головы.", "The shield goes up."), effects: [fx.specialization("tank"), fx.ability("aggro-roar")] } },
        { id: "assassin", text: t("Ассасин", "Assassin"), success: { text: t("Тень становится домом.", "The shadow becomes home."), effects: [fx.specialization("assassin")] } },
        { id: "mage", text: t("Маг", "Mage"), success: { text: t("Мана течёт молнией.", "Mana flows as lightning."), effects: [fx.specialization("mage"), fx.ability("chain-lightning")] } }
      ]
    },
    {
      id: "hu.national",
      kind: "world",
      title: t("Призыв страны", "The nation's call"),
      text: t("Ассоциация предлагает статус национального охотника. Слава, деньги — и долг идти туда, куда пошлют.", "The Association offers national hunter status. Fame, money — and the duty to go wherever sent."),
      minAge: 20,
      maxOccurrences: 1,
      conditions: [when.rank(4)],
      choices: [
        { id: "accept", text: t("Принять", "Accept"), success: { text: t("Имя {name} теперь знает каждый.", "Everyone now knows {name}'s name."), effects: [fx.socialClass("national-hunter"), fx.meter("fame", 30), fx.faction("association", 25)] } },
        { id: "refuse", text: t("Остаться свободным", "Stay free"), success: { text: t("Свобода выбирать, кого спасать.", "The freedom to choose whom to save."), effects: [fx.stat("willpower", 2), fx.faction("association", -10)] } }
      ]
    }
  ]
};
