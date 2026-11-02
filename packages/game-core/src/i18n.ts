export const LOCALES = ["ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ru";

/** Текст на всех языках игры. Контент хранится сразу на обоих, интерфейс выбирает нужный */
export type LocalizedText = Readonly<Record<Locale, string>>;

export function t(ru: string, en: string): LocalizedText {
  return { ru, en };
}

export type TextVars = Readonly<Record<string, string | number | LocalizedText>>;

/** Подставляет {name} и другие переменные в текст на каждом языке */
export function fillText(text: LocalizedText, vars: TextVars): LocalizedText {
  const fill = (source: string, locale: Locale) =>
    source.replace(/\{(\w+)\}/g, (match, key: string) => {
      const value = vars[key];
      if (value === undefined) return match;
      return typeof value === "object" ? value[locale] : String(value);
    });
  return { ru: fill(text.ru, "ru"), en: fill(text.en, "en") };
}

/** Русское склонение по числу: 1 год, 2 года, 5 лет */
export function pluralRu(n: number, forms: readonly [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export function ageText(age: number): LocalizedText {
  return t(`${age} ${pluralRu(age, ["год", "года", "лет"])}`, `${age} ${age === 1 ? "year" : "years"}`);
}
