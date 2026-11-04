// Законы наследования шести миров: кто наследует, с какого возраста наследник ведёт жизнь сам,
// какая доля уходит главному наследнику, сколько забирает казна, орден, клан или секта, какое сословие передаётся
import { t, type LocalizedText } from "../i18n.js";
import type { UniverseId } from "../types.js";

/** Кого закон ставит первым: старшего, сильнейшего, всех поровну или того, кого назвал умерший */
export type HeirOrder = "eldest" | "merit" | "equal" | "chosen";

export interface InheritanceLaw {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  order: HeirOrder;
  /** С этого возраста наследник ведёт жизнь сам */
  controlAge: number;
  /** Можно выбрать младшего: до controlAge за него правит опекун. Иначе младшие наследники недоступны */
  regency: boolean;
  /** Доля главного наследника в том, что осталось после сборов и доли супруга */
  heirShare: number;
  /** Сбор с наследства: десятина, налог, доля клана или секты */
  levy: number;
  levyName: LocalizedText;
  /** Доля живого супруга умершего */
  spouseShare: number;
  /** Сословия, которые переходят по наследству. Остальные (клир, охотник с лицензией, старейшина) — личные */
  hereditary: readonly string[];
  /** Флаги пути силы, которые передаются с кровью: корень духа, метка Мглы, пробуждение */
  bloodFlags: readonly { flag: string; chance: number }[];
  /** Какая часть шкалы мира переходит к наследнику: угроза Врат — общая для всех, скверна — личная */
  meterCarry: Readonly<Record<string, number>>;
  /** Приёмный ребёнок наследует сословие */
  adoptedClass: boolean;
}

export const INHERITANCE_LAWS: Readonly<Record<UniverseId, InheritanceLaw>> = {
  "dark-fantasy": {
    id: "ash-primogeniture",
    name: t("Право первородства", "Primogeniture"),
    description: t(
      "Дом и надел получает старший кровный наследник. Орден Последнего Огня берёт десятину, остальным достаётся немного. За младшего правит опекун до шестнадцати лет.",
      "The eldest blood heir takes the house and land. The Order of the Last Flame takes its tithe; the rest receive little. A guardian rules for a minor heir until sixteen."
    ),
    order: "eldest",
    controlAge: 16,
    regency: true,
    heirShare: 0.75,
    levy: 0.1,
    levyName: t("Десятина Ордена", "The Order's tithe"),
    spouseShare: 0.1,
    hereditary: ["outcast", "serf", "townsfolk", "nobility"],
    bloodFlags: [{ flag: "mist-mark", chance: 0.3 }],
    meterCarry: { corruption: 0.2, ember: 0.3 },
    adoptedClass: false
  },
  isekai: {
    id: "ardenvale-partition",
    name: t("Раздел поровну", "Equal partition"),
    description: t(
      "Королевство делит имущество между детьми поровну, супругу — его часть. Гильдия берёт пошлину. Вести жизнь сам наследник может с пятнадцати лет; опекунства закон не знает.",
      "The kingdom splits the estate equally among the children, the spouse keeps a share. The guild takes a duty. An heir may lead their life from fifteen; the law knows no guardianship."
    ),
    order: "equal",
    controlAge: 15,
    regency: false,
    heirShare: 1,
    levy: 0.08,
    levyName: t("Пошлина гильдии", "Guild duty"),
    spouseShare: 0.25,
    hereditary: ["commoner", "burgher", "gentry"],
    bloodFlags: [],
    meterCarry: { "system-favor": 0 },
    adoptedClass: true
  },
  murim: {
    id: "clan-merit",
    name: t("Закон клана", "Clan law"),
    description: t(
      "Главой дома становится достойнейший: сила и мастерство важнее старшинства. Клан забирает свою долю на нужды школы. Младших не ставят во главе.",
      "The worthiest becomes head of the house: strength and mastery matter more than age. The clan takes its share for the school. The young are never made head."
    ),
    order: "merit",
    controlAge: 16,
    regency: false,
    heirShare: 0.7,
    levy: 0.15,
    levyName: t("Доля клана", "The clan's share"),
    spouseShare: 0.15,
    hereditary: ["commoner", "clan"],
    bloodFlags: [{ flag: "martial-school", chance: 0.6 }],
    meterCarry: { "qi-deviation": 0 },
    adoptedClass: true
  },
  xianxia: {
    id: "sect-claim",
    name: t("Право секты", "The sect's claim"),
    description: t(
      "Секта забирает часть наследия культиватора. Остальное получает названный наследник. Корень духа передаётся с кровью не всегда. Юного наследника опекают старшие до двенадцати лет.",
      "The sect claims part of a cultivator's legacy. The named heir receives the rest. A spirit root does not always pass with the blood. Elders watch over a young heir until twelve."
    ),
    order: "merit",
    controlAge: 12,
    regency: true,
    heirShare: 0.8,
    levy: 0.25,
    levyName: t("Доля секты", "The sect's share"),
    spouseShare: 0.1,
    hereditary: ["mortal", "clan-scion"],
    bloodFlags: [{ flag: "spirit-root", chance: 0.55 }],
    meterCarry: { "dao-heart": 0, "karmic-debt": 0.5 },
    adoptedClass: false
  },
  hunter: {
    id: "civil-code",
    name: t("Гражданский кодекс", "Civil code"),
    description: t(
      "Супругу — половина, остальное — наследнику по завещанию. Государство берёт налог на наследство. Управлять имуществом можно только совершеннолетнему.",
      "The spouse receives half, the rest goes to the heir named in the will. The state levies an inheritance tax. Only an adult may manage the estate."
    ),
    order: "chosen",
    controlAge: 18,
    regency: false,
    heirShare: 0.85,
    levy: 0.2,
    levyName: t("Налог на наследство", "Inheritance tax"),
    spouseShare: 0.5,
    hereditary: ["underclass", "citizen", "hunter-clan", "chaebol"],
    bloodFlags: [{ flag: "awakened", chance: 0.25 }],
    meterCarry: { "gate-threat": 1, fame: 0.1 },
    adoptedClass: true
  },
  academy: {
    id: "imperial-entail",
    name: t("Майорат", "Entail"),
    description: t(
      "Титул и имение неделимы и переходят к старшему законному наследнику. Корона берёт пошлину, младшие получают содержание. За несовершеннолетнего правит опекун до шестнадцати лет.",
      "Title and estate are indivisible and pass to the eldest lawful heir. The Crown takes its fee; younger children receive an allowance. A guardian rules for a minor until sixteen."
    ),
    order: "eldest",
    controlAge: 16,
    regency: true,
    heirShare: 0.85,
    levy: 0.05,
    levyName: t("Пошлина короны", "The Crown's fee"),
    spouseShare: 0.1,
    hereditary: ["commoner", "lesser-noble", "high-noble", "imperial"],
    bloodFlags: [{ flag: "noble-blood", chance: 0.5 }],
    meterCarry: { "court-favor": 0.5, scandal: 0.5 },
    adoptedClass: false
  }
};

export function lawOf(universeId: UniverseId): InheritanceLaw {
  return INHERITANCE_LAWS[universeId];
}
