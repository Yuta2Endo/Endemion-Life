// Stage 15: два окна календаря. Тексты не подменяют события миров — это объявления доски.
import { t, type LocalizedText } from "../i18n.js";
import { dayKey, utcDay, utcWeek, weekKey } from "./ops.js";

export interface LiveTemplate {
  id: string;
  title: LocalizedText;
  text: LocalizedText;
  /** Пусто — все миры */
  worlds: readonly string[];
  minAge: number;
  goal: number;
  perLife: number;
  gold: number;
  slotKey: (now: number) => string;
  window: (now: number) => { start: number; end: number };
}

export const LIVE_TEMPLATES: readonly LiveTemplate[] = [
  {
    id: "daily-watch",
    title: t("Ночная стража", "The night watch"),
    text: t(
      "До полуночи UTC город просит одну смену стражи. Золото — тем, кто вышел.",
      "Until midnight UTC the city asks for one watch. Gold goes to those who stood it."
    ),
    worlds: [],
    minAge: 16,
    goal: 25,
    perLife: 1,
    gold: 40,
    slotKey: (now) => dayKey("daily-watch", now),
    window: utcDay
  },
  {
    id: "weekly-store",
    title: t("Недельный запас", "The week's store"),
    text: t(
      "За неделю UTC края просят пополнить запас. Одна жизнь отдаёт не больше трёх раз, по разу в год.",
      "Across the UTC week the regions ask for stores. One life may give three times, once a year."
    ),
    worlds: [],
    minAge: 12,
    goal: 60,
    perLife: 3,
    gold: 80,
    slotKey: (now) => weekKey("weekly-store", now),
    window: utcWeek
  }
];

export function findTemplate(id: string): LiveTemplate | undefined {
  return LIVE_TEMPLATES.find((item) => item.id === id);
}
