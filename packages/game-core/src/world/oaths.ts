// R5.7: обеты шести миров. Игрок принимает их сам в Атласе; случайная выдача не используется.
import { t } from "../i18n.js";
import { fx, when } from "../narrative/dsl.js";
import type { UniverseId } from "../types.js";
import type { QuestDefinition } from "../universes/types.js";

const DF_ISSUER = t("Орден Пепла", "Order of Ash");
const DF_ARC = t("Клятва у Стены", "The Wall Oath");
const IS_ISSUER = t("Гильдия искателей", "Adventurers Guild");
const IS_ARC = t("Путь контракта", "The Contract Road");
const MU_ISSUER = t("Союз Ортодоксальных школ", "Orthodox Alliance");
const MU_ARC = t("Долг школы", "A School's Debt");
const XI_ISSUER = t("Облачный Пик", "Cloud Peak");
const XI_ARC = t("Тропа Дао", "The Dao Road");
const HU_ISSUER = t("Ассоциация охотников", "Hunters Association");
const HU_ARC = t("Лицензия", "The Licence");
const AC_ISSUER = t("Императорский двор", "Imperial Court");
const AC_ARC = t("Ступени двора", "Steps of the Court");

export const WORLD_OATHS: Readonly<Record<UniverseId, readonly QuestDefinition[]>> = {
  "dark-fantasy": [
    {
      id: "df.q-wall",
      issuer: DF_ISSUER,
      arc: DF_ARC,
      title: t("Первый дозор", "The first watch"),
      text: t("Орден Пепла ищет тех, кто умеет держать оружие. Докажите, что клинок в ваших руках не дрожит.", "The Order of Ash seeks those who can hold a weapon. Prove that the blade in your hand does not shake."),
      goal: [when.skill("melee", 8)],
      years: 5,
      reward: [fx.xp(40), fx.rep(2), fx.skill("melee", 3)],
      penalty: [fx.rep(-2)],
      minAge: 10,
      next: "df.q-ash"
    },
    {
      id: "df.q-ash",
      issuer: DF_ISSUER,
      arc: DF_ARC,
      title: t("Пепел на клинке", "Ash on the blade"),
      text: t("Орден хочет видеть не просто воина, а своего. Служите ему так, чтобы пепел стал второй кожей.", "The Order wants more than a warrior: it wants one of its own. Serve until ash becomes a second skin."),
      goal: [when.faction("order-of-ash", 10)],
      years: 6,
      reward: [fx.xp(60), fx.faction("order-of-ash", 4), fx.skill("oathcraft", 5)],
      penalty: [fx.faction("order-of-ash", -3), fx.rep(-2)],
      minAge: 14,
      requires: ["df.q-wall"],
      next: "df.q-cathedral"
    },
    {
      id: "df.q-cathedral",
      issuer: DF_ISSUER,
      arc: DF_ARC,
      title: t("Слово под собором", "The word beneath the cathedral"),
      text: t("Орден готов доверить вам клятву, которую произносят раз в жизни. Под собором ждут те, кто помнит каждое слово.", "The Order is ready to entrust you with an oath spoken once in a lifetime. Beneath the cathedral wait those who remember every word."),
      goal: [when.skill("oathcraft", 15), when.faction("order-of-ash", 20)],
      years: 8,
      reward: [fx.xp(100), fx.faction("order-of-ash", 10), fx.rep(8), fx.ability("ember-ward")],
      penalty: [fx.health(-15), fx.faction("order-of-ash", -5)],
      minAge: 18,
      requires: ["df.q-ash"]
    }
  ],
  isekai: [
    {
      id: "is.q-guild",
      issuer: IS_ISSUER,
      arc: IS_ARC,
      title: t("Печать гильдии", "The guild seal"),
      text: t("Гильдия искателей выдаёт контракты только тем, кто умеет работать руками и головой. Начните с простого ремесла.", "The Adventurers Guild issues contracts only to those who can work with hands and head. Start with honest craft."),
      goal: [when.skill("guild-craft", 8)],
      years: 5,
      reward: [fx.xp(40), fx.wealth(20), fx.skill("guild-craft", 3)],
      penalty: [fx.wealth(-15)],
      minAge: 10,
      next: "is.q-ledger"
    },
    {
      id: "is.q-ledger",
      issuer: IS_ISSUER,
      arc: IS_ARC,
      title: t("Долговая книга", "The ledger of debts"),
      text: t("Гильдия помнит каждый контракт. Проведите несколько сделок так, чтобы ваше имя стояло в книге без помарок.", "The Guild remembers every contract. Close enough deals that your name stands in the ledger without a blot."),
      goal: [when.faction("guild", 10)],
      years: 6,
      reward: [fx.xp(60), fx.faction("guild", 4), fx.skill("trade", 5)],
      penalty: [fx.faction("guild", -3), fx.wealth(-10)],
      minAge: 14,
      requires: ["is.q-guild"],
      next: "is.q-name"
    },
    {
      id: "is.q-name",
      issuer: IS_ISSUER,
      arc: IS_ARC,
      title: t("Имя в договоре", "A name on the contract"),
      text: t("Гильдия предлагает вам собственный контракт — не работу по найму, а место в её истории. Цена — репутация.", "The Guild offers you a contract of your own: not hired work, but a place in its history. The price is reputation."),
      goal: [when.skill("guild-craft", 15), when.reputation(25)],
      years: 8,
      reward: [fx.xp(100), fx.faction("guild", 10), fx.rep(8), fx.wealth(50)],
      penalty: [fx.rep(-5), fx.wealth(-30)],
      minAge: 18,
      requires: ["is.q-ledger"]
    }
  ],
  murim: [
    {
      id: "mu.q-stance",
      issuer: MU_ISSUER,
      arc: MU_ARC,
      title: t("Стойка у реки", "The stance by the river"),
      text: t("Союз Ортодоксальных школ ищет тех, кто готов повторить одну стойку тысячу раз. Начните с тела.", "The Orthodox Alliance seeks those ready to repeat one stance a thousand times. Begin with the body."),
      goal: [when.skill("martial-arts", 8)],
      years: 5,
      reward: [fx.xp(40), fx.rep(2), fx.skill("martial-arts", 3)],
      penalty: [fx.meter("qi-deviation", 3)],
      minAge: 10,
      next: "mu.q-debt"
    },
    {
      id: "mu.q-debt",
      issuer: MU_ISSUER,
      arc: MU_ARC,
      title: t("Долг школы", "A school's debt"),
      text: t("Школы помнят, кто приходил на их зов, а кто только говорил. Покажите Союзу, что ваше слово имеет вес.", "The schools remember who answered their call and who only talked. Show the Alliance that your word carries weight."),
      goal: [when.faction("orthodox-alliance", 10)],
      years: 6,
      reward: [fx.xp(60), fx.faction("orthodox-alliance", 4), fx.skill("inner-cultivation", 5)],
      penalty: [fx.faction("orthodox-alliance", -3), fx.meter("qi-deviation", 4)],
      minAge: 14,
      requires: ["mu.q-stance"],
      next: "mu.q-name"
    },
    {
      id: "mu.q-name",
      issuer: MU_ISSUER,
      arc: MU_ARC,
      title: t("Имя без школы", "A name without a school"),
      text: t("Союз предлагает вам место среди старших — если тело и дыхание выдержат их мерку. Ошибка здесь стоит крови.", "The Alliance offers you a place among its elders, if body and breath can bear their measure. A mistake here costs blood."),
      goal: [when.skill("inner-cultivation", 15), when.skill("lightness", 10)],
      years: 8,
      reward: [fx.xp(100), fx.faction("orthodox-alliance", 10), fx.rep(8), fx.ability("light-step")],
      penalty: [fx.health(-20), fx.faction("orthodox-alliance", -5)],
      minAge: 18,
      requires: ["mu.q-debt"]
    }
  ],
  xianxia: [
    {
      id: "xi.q-breath",
      issuer: XI_ISSUER,
      arc: XI_ARC,
      title: t("Первый вдох", "The first breath"),
      text: t("Облачный Пик принимает послушников, которые умеют слушать собственное дыхание. Покажите, что слышите.", "Cloud Peak accepts disciples who can listen to their own breath. Show that you hear it."),
      goal: [when.skill("cultivation", 8)],
      years: 5,
      reward: [fx.xp(40), fx.skill("cultivation", 3), fx.meter("dao-heart", 3)],
      penalty: [fx.meter("karmic-debt", 3)],
      minAge: 10,
      next: "xi.q-heart"
    },
    {
      id: "xi.q-heart",
      issuer: XI_ISSUER,
      arc: XI_ARC,
      title: t("Сердце Дао", "The heart of the Dao"),
      text: t("Пик смотрит не на слова, а на поступки. Пусть ваше имя станет известно его хранителям.", "The Peak looks not at words but at deeds. Let its keepers know your name."),
      goal: [when.faction("cloud-peak", 10)],
      years: 6,
      reward: [fx.xp(60), fx.faction("cloud-peak", 4), fx.skill("alchemy", 5)],
      penalty: [fx.faction("cloud-peak", -3), fx.meter("karmic-debt", 4)],
      minAge: 14,
      requires: ["xi.q-breath"],
      next: "xi.q-sky"
    },
    {
      id: "xi.q-sky",
      issuer: XI_ISSUER,
      arc: XI_ARC,
      title: t("Небо под ногами", "The sky beneath your feet"),
      text: t("Вам предлагают тропу, по которой ходят только старшие. Небо под ногами не терпит спешки.", "You are offered a path walked only by elders. The sky beneath your feet does not suffer haste."),
      goal: [when.skill("cultivation", 15), when.meter("dao-heart", 50)],
      years: 8,
      reward: [fx.xp(100), fx.faction("cloud-peak", 10), fx.rep(8), fx.ability("spirit-sense")],
      penalty: [fx.health(-20), fx.meter("karmic-debt", 6)],
      minAge: 18,
      requires: ["xi.q-heart"]
    }
  ],
  hunter: [
    {
      id: "hu.q-license",
      issuer: HU_ISSUER,
      arc: HU_ARC,
      title: t("Временная лицензия", "A provisional licence"),
      text: t("Ассоциация выдаёт временные лицензии тем, кто умеет держать оружие в разломе. Покажите, что не побежите.", "The Association issues provisional licences to those who can hold a weapon in a rift. Show that you will not run."),
      goal: [when.skill("dungeon-combat", 8)],
      years: 4,
      reward: [fx.xp(40), fx.faction("association", 2), fx.skill("dungeon-combat", 3)],
      penalty: [fx.meter("fame", -2)],
      minAge: 16,
      next: "hu.q-gate"
    },
    {
      id: "hu.q-gate",
      issuer: HU_ISSUER,
      arc: HU_ARC,
      title: t("Врата на карте", "A gate on the map"),
      text: t("Ассоциация отмечает охотников, которые закрывают врата, а не открывают их. Ваше имя должно появиться на карте.", "The Association marks hunters who close gates, not open them. Your name must appear on the map."),
      goal: [when.faction("association", 10)],
      years: 5,
      reward: [fx.xp(60), fx.faction("association", 4), fx.skill("mana-control", 5)],
      penalty: [fx.faction("association", -3), fx.meter("fame", -4)],
      minAge: 18,
      requires: ["hu.q-license"],
      next: "hu.q-red"
    },
    {
      id: "hu.q-red",
      issuer: HU_ISSUER,
      arc: HU_ARC,
      title: t("Красный допуск", "Red clearance"),
      text: t("Вам предлагают допуск к вратам, о которых не пишут в новостях. Ассоциация хочет знать, выдержите ли вы тишину.", "You are offered clearance to gates the news never mentions. The Association wants to know if you can bear the silence."),
      goal: [when.skill("dungeon-combat", 15), when.meter("fame", 25)],
      years: 7,
      reward: [fx.xp(100), fx.faction("association", 10), fx.wealth(60), fx.rep(8), fx.ability("gate-sense")],
      penalty: [fx.health(-25), fx.meter("fame", -5)],
      minAge: 20,
      requires: ["hu.q-gate"]
    }
  ],
  academy: [
    {
      id: "ac.q-etiquette",
      issuer: AC_ISSUER,
      arc: AC_ARC,
      title: t("Поклон на лестнице", "A bow on the stair"),
      text: t("Императорский двор замечает не только кровь, но и манеры. Покажите, что умеете держать спину прямо.", "The Imperial Court notices not only blood but manners. Show that you can keep your back straight."),
      goal: [when.skill("etiquette", 8)],
      years: 4,
      reward: [fx.xp(40), fx.skill("etiquette", 3), fx.meter("court-favor", 3)],
      penalty: [fx.meter("scandal", 3)],
      minAge: 16,
      next: "ac.q-favor"
    },
    {
      id: "ac.q-favor",
      issuer: AC_ISSUER,
      arc: AC_ARC,
      title: t("Знак благосклонности", "A mark of favour"),
      text: t("Двор даёт вам возможность стать своим. Ошибка на балу будет стоить дороже, чем год учёбы.", "The Court gives you a chance to belong. A mistake at the ball will cost more than a year of study."),
      goal: [when.meter("court-favor", 30)],
      years: 5,
      reward: [fx.xp(60), fx.faction("imperial-court", 4), fx.skill("arcana", 5), fx.meter("court-favor", 4)],
      penalty: [fx.meter("court-favor", -5), fx.meter("scandal", 4)],
      minAge: 18,
      requires: ["ac.q-etiquette"],
      next: "ac.q-court"
    },
    {
      id: "ac.q-court",
      issuer: AC_ISSUER,
      arc: AC_ARC,
      title: t("Ступень у трона", "A step by the throne"),
      text: t("Вам предлагают место в свите, где каждое слово слышат все. Двор ждёт ответа, а Роза и Башня — ошибки.", "You are offered a place in the retinue where everyone hears every word. The Court waits for an answer; the Rose and the Tower wait for a mistake."),
      goal: [when.faction("imperial-court", 20), when.skill("etiquette", 15)],
      years: 7,
      reward: [fx.xp(100), fx.faction("imperial-court", 10), fx.rep(8), fx.wealth(40), fx.ability("charm-word")],
      penalty: [fx.meter("scandal", 6), fx.meter("court-favor", -5)],
      minAge: 20,
      requires: ["ac.q-favor"]
    }
  ]
};

function blank(text: { ru: string; en: string }): boolean {
  return !text.ru.trim() || !text.en.trim();
}

function cycleIn(start: string, edges: ReadonlyMap<string, readonly string[]>): string[] | null {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  const walk = (id: string): string[] | null => {
    if (visiting.has(id)) return [...stack.slice(stack.indexOf(id)), id];
    if (visited.has(id)) return null;
    visiting.add(id);
    stack.push(id);
    for (const next of edges.get(id) ?? []) {
      const cycle = walk(next);
      if (cycle) return cycle;
    }
    visiting.delete(id);
    stack.pop();
    visited.add(id);
    return null;
  };
  return walk(start);
}

/** Проверка обетов: битые ссылки цепочки, пустые тексты, петли. Ничего не меняет */
export function oathProblems(): string[] {
  const problems: string[] = [];
  for (const universeId of Object.keys(WORLD_OATHS) as UniverseId[]) {
    const oaths = WORLD_OATHS[universeId];
    const byId = new Map<string, QuestDefinition>();
    for (const oath of oaths) {
      if (byId.has(oath.id)) problems.push(`${universeId}: повтор обета ${oath.id}`);
      byId.set(oath.id, oath);
      if (blank(oath.title)) problems.push(`${universeId}: пустое название обета ${oath.id}`);
      if (blank(oath.text)) problems.push(`${universeId}: пустой текст обета ${oath.id}`);
      if (oath.issuer && blank(oath.issuer)) problems.push(`${universeId}: пустой источник обета ${oath.id}`);
      if (oath.arc && blank(oath.arc)) problems.push(`${universeId}: пустая линия обета ${oath.id}`);
      if (oath.goal.length === 0) problems.push(`${universeId}: у обета ${oath.id} нет цели`);
      if (oath.reward.length === 0) problems.push(`${universeId}: у обета ${oath.id} нет награды`);
      if (oath.penalty.length === 0) problems.push(`${universeId}: у обета ${oath.id} нет штрафа`);
      if (!Number.isInteger(oath.years) || oath.years < 1) problems.push(`${universeId}: неверный срок обета ${oath.id}`);
      if (oath.minAge !== undefined && (!Number.isInteger(oath.minAge) || oath.minAge < 0)) problems.push(`${universeId}: неверный возраст обета ${oath.id}`);
    }
    const nextEdges = new Map<string, readonly string[]>();
    const requireEdges = new Map<string, readonly string[]>();
    for (const oath of oaths) {
      for (const required of oath.requires ?? []) {
        if (required === oath.id) problems.push(`${universeId}: обет ${oath.id} требует сам себя`);
        else if (!byId.has(required)) problems.push(`${universeId}: обет ${oath.id} требует неизвестный ${required}`);
      }
      if (oath.next) {
        if (oath.next === oath.id) problems.push(`${universeId}: обет ${oath.id} ведёт сам в себя`);
        else if (!byId.has(oath.next)) problems.push(`${universeId}: обет ${oath.id} ведёт в неизвестный ${oath.next}`);
      }
      nextEdges.set(oath.id, oath.next ? [oath.next] : []);
      requireEdges.set(oath.id, oath.requires ?? []);
    }
    for (const oath of oaths) {
      const nextCycle = cycleIn(oath.id, nextEdges);
      if (nextCycle) {
        problems.push(`${universeId}: петля next ${nextCycle.join(" → ")}`);
        break;
      }
    }
    for (const oath of oaths) {
      const requireCycle = cycleIn(oath.id, requireEdges);
      if (requireCycle) {
        problems.push(`${universeId}: петля requires ${requireCycle.join(" → ")}`);
        break;
      }
    }
  }
  return problems;
}
