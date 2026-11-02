// Тексты интерфейса на всех языках. Контент мира (события, расы) лежит в game-core и уже содержит оба языка
import { DEFAULT_LOCALE, LOCALES, t, type Locale, type LocalizedText } from "@endemion/game-core";

export const LOCALE_COOKIE = "el_locale";

/** Запоминает язык в cookie: сервер прочитает его при следующей отрисовке */
export function saveLocale(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function toLocale(value: string | undefined | null): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
}

export const M = {
  "brand.tagline": t("Проживите жизнь, которой не было", "Live a life that never was"),
  "nav.home": t("Главная", "Home"),
  "nav.worlds": t("Миры", "Worlds"),
  "nav.language": t("Язык", "Language"),

  "store.cloud": t("Облачные сохранения", "Cloud saves"),
  "store.local": t("Локальное сохранение", "Local save"),
  "store.checking": t("Связь с сервером…", "Connecting…"),
  "store.localHint": t(
    "Сервер недоступен: жизнь хранится в этом браузере. Исходы считает браузер, это режим прототипа.",
    "The server is unavailable: this life is stored in this browser. Outcomes are computed in the browser — prototype mode."
  ),

  "home.kicker": t("Симулятор жизни · RPG · Интерактивная история", "Life simulator · RPG · Interactive story"),
  "home.title": t("Одна жизнь. Тысяча решений.", "One life. A thousand choices."),
  "home.lead": t(
    "Родитесь в одном из шести миров, вырастите, найдите свой путь силы и узнайте, чем закончится история, которую пишут ваши решения и характеристики.",
    "Be born into one of six worlds, grow up, find your path of power, and learn how the story written by your choices and your stats will end."
  ),
  "home.start": t("Начать новую жизнь", "Begin a new life"),
  "home.explore": t("Посмотреть миры", "Explore the worlds"),
  "home.continue": t("Продолжить жизнь", "Continue a life"),
  "home.noLives": t("Здесь появятся ваши жизни.", "Your lives will appear here."),
  "home.pillar1.title": t("Шесть вселенных", "Six universes"),
  "home.pillar1.text": t("У каждого мира свои расы, происхождения, события и путь силы.", "Each world has its own races, origins, events and path of power."),
  "home.pillar2.title": t("Выбор имеет цену", "Every choice has a price"),
  "home.pillar2.text": t("Характеристики решают исход проверок, а последствия догоняют годы спустя.", "Stats decide checks, and consequences catch up years later."),
  "home.pillar3.title": t("Судьба по зерну", "Fate from a seed"),
  "home.pillar3.text": t("Одно зерно судьбы и одни решения — одна и та же жизнь. Сервер не даёт её подделать.", "The same seed and the same choices yield the same life. The server keeps it honest."),
  "home.worldsTitle": t("Миры Endemion", "The worlds of Endemion"),

  "worlds.title": t("Выберите мир рождения", "Choose a world to be born in"),
  "worlds.lead": t("Мир определяет, кем вы можете стать. Изменить его после рождения нельзя.", "The world decides who you can become. It cannot be changed after birth."),
  "worlds.born": t("Родиться здесь", "Be born here"),
  "worlds.path": t("Путь силы", "Path of power"),
  "worlds.rules": t("Законы мира", "Laws of the world"),
  "worlds.lifespan": t("Обычный срок жизни: {years} лет", "Usual lifespan: {years} years"),

  "create.title": t("Рождение персонажа", "Character creation"),
  "create.lead": t("Выберите сами или доверьтесь судьбе: всё, что не выбрано, решит случай.", "Choose yourself or trust fate: anything left unchosen is decided by chance."),
  "create.name": t("Имя", "Name"),
  "create.namePlaceholder": t("Пусто — имя выберет судьба", "Empty — fate will choose"),
  "create.gender": t("Пол", "Gender"),
  "create.female": t("Женский", "Female"),
  "create.male": t("Мужской", "Male"),
  "create.race": t("Раса", "Race"),
  "create.origin": t("Происхождение", "Origin"),
  "create.temperament": t("Характер", "Temperament"),
  "create.random": t("Случай", "Chance"),
  "create.seed": t("Зерно судьбы", "Seed of fate"),
  "create.seedHint": t("Одно зерно и одни решения — одна жизнь. Пусто — новое зерно.", "The same seed and choices give the same life. Empty — a new seed."),
  "create.advanced": t("Дополнительно", "Advanced"),
  "create.submit": t("Родиться", "Be born"),
  "create.submitting": t("Судьба решается…", "Fate is being decided…"),
  "create.gold": t("{n} золота", "{n} gold"),

  "play.loading": t("Загрузка жизни…", "Loading the life…"),
  "play.notFound": t("Жизнь не найдена. Возможно, она хранится в другом браузере.", "Life not found. It may be stored in another browser."),
  "play.advance1": t("Прожить год", "Live a year"),
  "play.advance5": t("5 лет", "5 years"),
  "play.advance10": t("10 лет", "10 years"),
  "play.advanceHint": t("Время остановится на первом событии.", "Time stops at the first event."),
  "play.quiet": t("Жизнь идёт своим чередом.", "Life goes on."),
  "play.choose": t("Ваш выбор", "Your choice"),
  "play.chance": t("Шанс {n}%", "Chance {n}%"),
  "play.locked": t("Недоступно", "Unavailable"),
  "play.outcome": t("Итог", "Outcome"),
  "play.success": t("Успех", "Success"),
  "play.failure": t("Провал", "Failure"),
  "play.tabEvent": t("Судьба", "Fate"),
  "play.tabCharacter": t("Персонаж", "Character"),
  "play.tabTimeline": t("Хроника", "Chronicle"),
  "play.timeline": t("Хроника жизни", "Chronicle of a life"),
  "play.loadEarlier": t("Показать раньше", "Show earlier"),
  "play.decision": t("Решение", "Decision"),
  "play.conflict": t("Жизнь изменилась в другой вкладке. Загружаем свежее состояние.", "The life changed in another tab. Loading the latest state."),
  "play.retry": t("Повторить", "Retry"),
  "play.saves": t("Сохранения", "Saves"),
  "play.savesTitle": t("Версии сохранения", "Save versions"),
  "play.savesHint": t("Вернуться можно к любой из последних версий. Всё, что было после, исчезнет.", "You can return to any recent version. Everything after it will vanish."),
  "play.restore": t("Вернуться", "Return"),
  "play.restoreConfirm": t("Вернуться к возрасту {age}? Все последующие события будут стёрты.", "Return to age {age}? All later events will be erased."),
  "play.current": t("сейчас", "now"),
  "play.close": t("Закрыть", "Close"),
  "play.deathTitle": t("Конец пути", "The end of the road"),
  "play.deathLived": t("{name} прожил(а) {age}.", "{name} lived {age}."),
  "play.newLifeSame": t("Новая жизнь в этом мире", "A new life in this world"),
  "play.otherWorld": t("Другой мир", "Another world"),

  "sheet.level": t("Уровень {n}", "Level {n}"),
  "sheet.xp": t("Опыт", "Experience"),
  "sheet.stats": t("Характеристики", "Attributes"),
  "sheet.standing": t("Положение", "Standing"),
  "sheet.reputation": t("Репутация", "Reputation"),
  "sheet.karma": t("Карма", "Karma"),
  "sheet.wealth": t("Золото", "Gold"),
  "sheet.abilities": t("Способности", "Abilities"),
  "sheet.noAbilities": t("Пока нет", "None yet"),
  "sheet.trackClosed": t("Путь пока закрыт: нужны особые обстоятельства.", "The path is closed for now: special circumstances are needed."),
  "sheet.trackMax": t("Высший ранг", "Highest rank"),
  "sheet.rankBonus": t("+{n} от ранга", "+{n} from rank"),

  "reason.create": t("рождение", "birth"),
  "reason.action": t("действие", "action"),
  "reason.restore": t("возврат", "rewind"),

  "change.level": t("Уровень {n}", "Level {n}"),
  "change.rank": t("Ранг: {name}", "Rank: {name}"),
  "change.ability": t("Способность: {name}", "Ability: {name}"),

  "error.generic": t("Что-то пошло не так. Попробуйте ещё раз.", "Something went wrong. Please try again."),
  "error.offline": t("Нет связи с сервером.", "No connection to the server."),
  "error.notFoundTitle": t("Такой страницы нет", "This page does not exist"),
  "error.toHome": t("На главную", "Back home"),
  "common.years": t("{n} лет", "{n} years")
} satisfies Record<string, LocalizedText>;

export type MessageKey = keyof typeof M;
export type MessageVars = Readonly<Record<string, string | number>>;

export function msg(locale: Locale, key: MessageKey, vars?: MessageVars): string {
  const text = M[key][locale];
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (vars[name] === undefined ? match : String(vars[name])));
}
