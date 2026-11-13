import type { LocalizedText } from "../i18n.js";
import type { ResourceKey, StatKey } from "../stats.js";
import type { EconomyCycle, EmploymentStatus, HiddenKey, LifeStage, NpcRole, StoryScope, UniverseId, WorldInfluenceKind } from "../types.js";

/** Роль NPC, любой из родителей или вся семья (родители, бабушки и дедушки, братья и сёстры, супруг, дети) */
export type NpcRef = NpcRole | "parent" | "family";

/** Условие события или варианта выбора. Проверяется только на сервере, по состоянию персонажа */
export type Condition =
  | { type: "stat"; stat: StatKey; min?: number; max?: number }
  | { type: "flag"; flag: string; has: boolean }
  | { type: "karma"; min?: number; max?: number }
  | { type: "reputation"; min?: number; max?: number }
  | { type: "wealth"; min?: number; max?: number }
  /** Stage 04: сколько лет подряд не хватает денег на расходы */
  | { type: "hardship"; min?: number; max?: number }
  /** Stage 04: состояние хозяйства мира — спад, обычные годы, подъём */
  | { type: "cycle"; ids: EconomyCycle[] }
  /** Stage 06: напряжение края, 0–100 */
  | { type: "strain"; min?: number; max?: number }
  /** Stage 06: благополучие края, 0–100 */
  | { type: "prosperity"; min?: number; max?: number }
  /** Stage 09: конкретное приключение пройдено (done) или провалено */
  | { type: "deed"; id: string; done: boolean }
  /** Stage 09: пройдено хоть одно приключение */
  | { type: "deedAny" }
  /** Stage 09: у рода есть достижение */
  | { type: "achievement"; id: string }
  | { type: "level"; min: number }
  | { type: "rank"; min?: number; max?: number }
  /** Путь требует прорыва: очки упёрлись в порог следующего ранга */
  | { type: "trackReady" }
  | { type: "origin"; ids: string[] }
  | { type: "race"; ids: string[] }
  | { type: "temperament"; ids: string[] }
  | { type: "ability"; id: string; has: boolean }
  | { type: "skill"; id: string; min: number }
  /** Есть (или нет) один из талантов. Пустой список — любой талант */
  | { type: "talent"; ids: string[]; has: boolean }
  /** Есть (или нет) одна из слабостей. Пустой список — любая слабость */
  | { type: "weakness"; ids: string[]; has: boolean }
  /** Есть живой NPC этой роли (рядом, не пропавший). minAge и maxAge — возраст NPC */
  | { type: "npc"; role: NpcRef; has: boolean; minAge?: number; maxAge?: number }
  /** Отношение самого близкого живого NPC этой роли */
  | { type: "affinity"; role: NpcRef; min?: number; max?: number }
  | { type: "meter"; id: string; min?: number; max?: number }
  | { type: "faction"; id: string; min?: number; max?: number }
  | { type: "socialClass"; ids: string[] }
  /** Знатность сословия: 0 — низы, 5 — высшая знать */
  | { type: "standing"; min?: number; max?: number }
  /** Есть (или нет) одно из ремёсел. Пустой список — любое ремесло */
  | { type: "profession"; ids: string[]; has: boolean }
  /** Ступень полученного образования: 0 — никакого */
  | { type: "education"; min?: number; max?: number }
  | { type: "specialization"; has: boolean }
  /** Есть ли таланты, которые ещё не проявились */
  | { type: "dormantTalent"; has: boolean }
  /** Скрытые характеристики: игрок их не видит, но они решают, придёт ли событие */
  | { type: "hidden"; key: "potential" | "destiny"; min?: number; max?: number }
  /** У семьи есть тайна, и она раскрыта (revealed: true) или ещё нет (false) */
  | { type: "secret"; revealed: boolean }
  /** Идёт задание Системы */
  | { type: "quest"; active: boolean }
  /** До конца отпущенного срока осталось не больше max лет */
  | { type: "yearsLeft"; max: number }
  // Stage 03: род и поколения
  /** Поколение персонажа: 1 — основатель рода */
  | { type: "generation"; min?: number; max?: number }
  /** Слава рода от -100 до 100 */
  | { type: "renown"; min?: number; max?: number }
  /** Нить рода: долг, враг, тайна, позор, знание… */
  | { type: "thread"; id: string; has: boolean }
  /** Сюжет поколений случался в роду меньше max раз */
  | { type: "story"; id: string; max: number }
  | { type: "world"; ids: UniverseId[] }
  /** Кто-то из родни пропал без вести */
  | { type: "missingKin"; has: boolean }
  /** Персонаж сейчас в браке (супруг жив) */
  | { type: "married"; has: boolean }
  /** Состояние конкретного поселения мира (процветание/стабильность) */
  | { type: "settlement"; id: string; prosperity?: { min?: number; max?: number }; stability?: { min?: number; max?: number } }
  /** Состояние фракции мира (власть/влияние/отношение) */
  | { type: "worldFaction"; id: string; power?: { min?: number; max?: number }; influence?: { min?: number; max?: number }; standing?: { min?: number; max?: number } }
  /** Активная личная цель игрока */
  | { type: "goal"; id: string }
  /** Фамильная реликвия в наличии. Без id — любая реликвия рода */
  | { type: "relic"; id?: string }
  /** Этап личного или фамильного сюжета: точный номер этапа и область действия */
  | { type: "storyStage"; id: string; stage: number; scope: StoryScope }
  /** Выбор, сделанный в событии сюжета: id сюжета, id события, id варианта и область действия */
  | { type: "storyChoice"; id: string; eventId: string; choiceId: string; scope: StoryScope }
  /** Сюжет завершён: дальнейшее продвижение невозможно */
  | { type: "storyCompleted"; id: string; scope: StoryScope }
  /** Stage 02.1: длительное здоровье 0–100 */
  | { type: "health"; min?: number; max?: number }
  /** Stage 02.1: активная болезнь или рана из каталога жизни */
  | { type: "condition"; id: string; has: boolean }
  /** Stage 02.2: персонаж сейчас учится */
  | { type: "studying"; has: boolean }
  /** Stage 02.2: статус занятости — работает, без работы или на покое */
  | { type: "employment"; status: EmploymentStatus }
  /** Stage 02.2: ступень карьеры */
  | { type: "careerRank"; min?: number; max?: number }
  /** Stage 02.2: полный стаж в нынешней профессии */
  | { type: "tenure"; min: number }
  /** Stage 02.2: риск потерять работу: спад, нужда, напряжение края */
  | { type: "careerRisk"; min: number }
  /** Stage 02.2: на нынешней ступени отработано достаточно для повышения */
  | { type: "promotionReady" }
  /** Stage 02.2: возраст дошёл до пенсионного для нынешней профессии */
  | { type: "retirementDue" }
  // Stage 02.3: жильё, дом и своё дело
  /** Вид жилья: без своего, аренда или собственность */
  | { type: "housing"; kinds: ("homeless" | "rent" | "own")[] }
  /** Персонаж владеет именно этим домом */
  | { type: "home"; id: string }
  /** Состояние собственного дома не выше max */
  | { type: "propertyCondition"; max: number }
  /** Есть ли своё дело (или именно это дело) */
  | { type: "business"; has: boolean; id?: string }
  /** Сколько своих дел сейчас открыто */
  | { type: "businessCount"; min?: number; max?: number }
  /** Убыточных лет подряд у дела (или у самого убыточного дела) не меньше min */
  | { type: "businessLosses"; min: number; id?: string }
  // Stage 02.4: нынешнее поселение — по id и/или тегам каталога мира
  /** Событие доступно только в поселении с одним из id и/или тегов */
  | { type: "location"; ids?: string[]; tags?: string[] };

/** Последствие выбора */
export type Effect =
  | { type: "stat"; stat: StatKey; delta: number }
  | { type: "resource"; resource: ResourceKey; delta: number }
  | { type: "reputation"; delta: number }
  | { type: "karma"; delta: number }
  | { type: "wealth"; delta: number }
  | { type: "xp"; amount: number }
  | { type: "track"; delta: number }
  | { type: "breakthrough" }
  | { type: "flag"; flag: string; set: boolean }
  | { type: "ability"; id: string }
  /** Продолжение сюжетной цепочки через inYears лет */
  | { type: "schedule"; eventId: string; inYears: number }
  | { type: "death"; cause: LocalizedText }
  | { type: "skill"; id: string; delta: number }
  /** Талант проявляется: из спящих, а если его там нет — появляется заново */
  | { type: "talent"; id: string }
  /** Проявляется первый из спящих талантов */
  | { type: "awakenTalent" }
  | { type: "weakness"; id: string; add: boolean }
  /** Побороть первую из слабостей */
  | { type: "overcomeWeakness" }
  /** Новый человек в жизни персонажа */
  | { type: "npc"; role: NpcRole }
  | { type: "affinity"; role: NpcRef; delta: number }
  /** Роль NPC меняется: возлюбленный становится супругом, друг — соперником */
  | { type: "npcRole"; from: NpcRole; to: NpcRole }
  /** Умирает самый близкий живой NPC роли (для "parent" — один из родителей) */
  | { type: "npcDies"; role: NpcRef }
  /** Навык, которому учит NPC этой роли, растёт */
  | { type: "npcSkill"; role: NpcRole; delta: number }
  | { type: "meter"; id: string; delta: number }
  | { type: "faction"; id: string; delta: number }
  | { type: "socialClass"; id: string }
  | { type: "profession"; id: string }
  | { type: "education"; id: string }
  /** Первое образование этой ступени в мире персонажа: у каждой вселенной своя школа */
  | { type: "educationTier"; tier: number }
  | { type: "specialization"; id: string }
  /** Отложенное последствие: наступит само через inYears лет */
  | { type: "later"; id: string; inYears: number }
  /** Игрок узнаёт скрытую характеристику */
  | { type: "reveal"; key: HiddenKey }
  // Stage 03: род и поколения
  | { type: "renown"; delta: number }
  /** Нить рода появляется или обрывается. Нити переходят к наследнику */
  | { type: "thread"; id: string; add: boolean }
  /** Последствие для рода: наступит через inYears лет, даже если персонаж умрёт раньше — тогда при потомке */
  | { type: "lineageLater"; id: string; inYears: number }
  /** Пропавший родственник возвращается */
  | { type: "kinReturns" }
  /** Родственник этой роли пропадает без вести */
  | { type: "kinMissing"; role: NpcRef }
  /** Сословие на ступень выше или ниже */
  | { type: "classStep"; delta: 1 | -1 }
  /** Персонаж берёт на воспитание ребёнка: приёмный сын или дочь, наследник наравне с родными */
  | { type: "adopt" }
  /** Stage 06: напряжение края */
  | { type: "strain"; delta: number }
  /** Stage 06: благополучие края */
  | { type: "prosperity"; delta: number }
  /** Stage 04.5.1: изменение состояния поселения мира. Значения — дельты, зажимаются в 0–100 */
  | { type: "settlement"; id: string; prosperity?: number; stability?: number }
  /** Stage 04.5.2: многолетнее влияние рода на поселение или фракцию. Складывается, зажимается ±5 */
  | { type: "influence"; kind: WorldInfluenceKind; id: string; delta: number }
  /** Получение реликвия рода */
  | { type: "relic"; id: string }
  /** Stage 03.1: потеря реликвии рода. Нет реликвии — тихий no-op, повтор безопасен */
  | { type: "loseRelic"; id: string }
  /** Страховой этап сюжета: продвигается только при совпадении текущего этапа с ожидаемым */
  | { type: "advanceStory"; id: string; expectedStage: number; nextStage: number; scope: StoryScope }
  /** Запись выбора в событии сюжета: id сюжета, id события, id варианта и область действия */
  | { type: "recordStoryChoice"; id: string; eventId: string; choiceId: string; scope: StoryScope }
  /** Завершение сюжета: дальнейшее продвижение невозможно */
  | { type: "completeStory"; id: string; scope: StoryScope }
  /** Stage 02.1: наложить болезнь или рану. severity и duration переопределяют каталог */
  | { type: "condition"; id: string; severity?: number; duration?: number }
  /** Stage 02.1: вылечить болезнь или рану */
  | { type: "cure"; id: string }
  /** Stage 02.2: поступить на курс обучения. Недоступный курс — тихий no-op */
  | { type: "enrollEducation"; id: string }
  /** Stage 02.2: начать работу по профессии. Требования проверяются ещё раз */
  | { type: "startCareer"; id: string }
  /** Stage 02.2: повышение на следующую ступень */
  | { type: "promoteCareer" }
  /** Stage 02.2: потерять работу */
  | { type: "loseCareer" }
  /** Stage 02.2: выйти на покой */
  | { type: "retireCareer" }
  /** Stage 02.2: выходное пособие в годовых жалованьях. Считается по текущей работе */
  | { type: "severance"; years: number }
  // Stage 02.3: жильё, дом и своё дело
  /** Снять дом из каталога мира. Недоступный дом — тихий no-op */
  | { type: "rentHome"; id: string }
  /** Купить дом: цена списывается один раз, состояние становится собственным */
  | { type: "buyProperty"; id: string }
  /** Продать собственный дом. id не задан — продать нынешний */
  | { type: "sellProperty"; id?: string }
  /** Починить собственный дом: цена берётся из каталога */
  | { type: "repairProperty" }
  /** Запустить дом: состояние падает без ремонта */
  | { type: "neglectHome"; amount: number }
  /** Открыть или купить дело из каталога мира */
  | { type: "startBusiness"; id: string }
  /** Вложить золото в капитал дела */
  | { type: "investBusiness"; id: string; amount: number }
  /** Продать дело: возвращает часть капитала */
  | { type: "sellBusiness"; id?: string }
  /** Закрыть дело без выручки */
  | { type: "closeBusiness"; id?: string };

export interface StatCheck {
  /** Берётся среднее по этим характеристикам (с бонусом ранга) */
  stats: StatKey[];
  difficulty: number;
  /** Сложность растёт с каждым рангом пути: прорывы даются всё труднее */
  perRank?: number;
  /** Навык добавляет до +25% к шансу */
  skill?: string;
  /** Шкалы мира сдвигают шанс: (значение − base) × per */
  meters?: { id: string; per: number; base: number }[];
  /** Противник: его сила повышает сложность */
  versus?: NpcRole;
}

export interface OutcomeDefinition {
  text: LocalizedText;
  effects: Effect[];
}

export interface ChoiceDefinition {
  id: string;
  text: LocalizedText;
  /** Без этих условий вариант виден, но недоступен */
  requires?: Condition[];
  check?: StatCheck;
  success: OutcomeDefinition;
  /** Исход при провале проверки. Нет — провал без последствий */
  failure?: OutcomeDefinition;
}

/** Вид события: по нему видно, откуда оно взялось, и проверяется разнообразие контента */
export type EventKind = "life" | "personal" | "family" | "age" | "stat" | "world" | "npc" | "chain" | "path" | "legacy";

export interface EventDefinition {
  id: string;
  kind?: EventKind;
  title: LocalizedText;
  text: LocalizedText;
  minAge?: number;
  maxAge?: number;
  stages?: LifeStage[];
  conditions?: Condition[];
  /** Вес при случайном выборе. По умолчанию 1 у общих событий и 2 у событий вселенной */
  weight?: number;
  /** Не чаще, чем раз в cooldown лет. Без cooldown и maxOccurrences — не чаще раза в DEFAULT_COOLDOWN лет */
  cooldown?: number;
  maxOccurrences?: number;
  /**
   * Stage 02.4: теги поселений, где событие вероятнее. Само событие может быть доступно везде;
   * жёсткая привязка задаётся условием location
   */
  locationTags?: readonly string[];
  /** Сколько раз событие может случиться за всю историю рода (lineage.stories). Stage 03: сюжеты поколений не повторяются без причины */
  lineageMax?: number;
  /** Событие приходит только как продолжение цепочки (Effect schedule) */
  scheduledOnly?: boolean;
  choices: ChoiceDefinition[];
}

/** Отложенное последствие: приходит само, без выбора, и записывается в хронику */
export interface ConsequenceDefinition {
  id: string;
  title: LocalizedText;
  text: LocalizedText;
  /** Если условия не выполнены, когда срок настал, последствие тихо отменяется */
  conditions?: Condition[];
  /** Вероятность, что последствие всё-таки наступит. По умолчанию 1 */
  chance?: number;
  effects: Effect[];
}
