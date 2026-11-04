// World Engine: правила, которые каждый мир применяет раз в год. Шкалы и фракции описаны в universes/<id>.world.ts,
// а здесь — как они меняются. Шесть миров живут по разным законам: скверна, задания Системы, искажение ци,
// сердце Дао, угроза Врат и милость двора
import { effectiveStats, lifespanOf } from "../character/derived.js";
import type { EngineContext } from "../engine/context.js";
import { applyEffect, changeFaction, changeMeter, changeResource, changeStat, kill, setSocialClass } from "../engine/effects.js";
import { t, type LocalizedText } from "../i18n.js";
import type { GameState, HistoryKind, UniverseId } from "../types.js";
import { getUniverse } from "../universes/registry.js";

/** Запись в хронику от правил мира: отдельная строка после итогов года */
export type Emit = (kind: HistoryKind, title: LocalizedText, text: LocalizedText) => void;

interface WorldRules {
  yearly: (ctx: EngineContext, emit: Emit) => void;
  /** Множитель прироста пути силы от состояния мира */
  trackFactor: (state: GameState) => number;
}

export function meterValue(state: GameState, id: string): number {
  const meter = getUniverse(state.character.universeId).meters.find((m) => m.id === id);
  return state.meters[id] ?? meter?.initial ?? 0;
}

const has = (state: GameState, flag: string) => state.flags.includes(flag);

const RULES: Readonly<Record<UniverseId, WorldRules>> = {
  // Пепельные Королевства: клятва Мгле даёт силу ценой скверны, клятва Ордену копит свет очага
  "dark-fantasy": {
    yearly(ctx) {
      const s = ctx.state;
      if (has(s, "mist-oath")) changeMeter(ctx, "corruption", ctx.rng.int(2, 4));
      if (has(s, "order-oath")) {
        changeMeter(ctx, "corruption", -1);
        changeMeter(ctx, "ember", 1);
      }
      if (s.character.originId === "mist-touched" && s.life.age >= 12 && ctx.rng.chance(0.3)) changeMeter(ctx, "corruption", 1);
      const corruption = meterValue(s, "corruption");
      if (corruption >= 50 && ctx.rng.chance(0.5)) applyEffect(ctx, { type: "karma", delta: -1 });
      if (corruption >= 90 && meterValue(s, "ember") < 50 && ctx.rng.chance(0.15)) {
        kill(ctx, t("Мгла забрала то, что ещё оставалось человеком", "The Mist took what was still human"));
      }
    },
    trackFactor(state) {
      if (has(state, "mist-oath")) return 1 + meterValue(state, "corruption") / 200;
      if (has(state, "order-oath")) return 1 + meterValue(state, "ember") / 300;
      return 1;
    }
  },

  // Арденвейл: память прошлой жизни и расположение Системы. Задания Системы — в world/quests.ts
  isekai: {
    yearly(ctx) {
      const s = ctx.state;
      if (has(s, "remembers") && s.life.age <= 20 && ctx.rng.chance(0.3)) changeStat(ctx, "intelligence", 1);
      if (meterValue(s, "system-favor") > 50 && ctx.rng.chance(0.5)) changeMeter(ctx, "system-favor", -1);
    },
    trackFactor(state) {
      return 1 + meterValue(state, "system-favor") / 250;
    }
  },

  // Девять Рек: тёмный путь быстрее, но ци искажается. Праведность и тьма двигают отношение фракций
  murim: {
    yearly(ctx) {
      const s = ctx.state;
      if (has(s, "demonic-path")) {
        changeMeter(ctx, "qi-deviation", ctx.rng.int(2, 4));
        changeFaction(ctx, "demonic-cult", 2);
        changeFaction(ctx, "orthodox-alliance", -1);
      } else if (has(s, "martial-school") && s.life.age >= 10) {
        changeMeter(ctx, "qi-deviation", -2);
      }
      if (has(s, "martial-school") && s.character.karma >= 30 && ctx.rng.chance(0.5)) changeFaction(ctx, "orthodox-alliance", 1);
      const deviation = meterValue(s, "qi-deviation");
      if (deviation >= 60) changeResource(ctx, "health", -(deviation - 50));
      if (deviation >= 100) kill(ctx, t("Ци обратилось против собственного тела", "Qi turned against its own body"));
    },
    trackFactor(state) {
      const demonic = has(state, "demonic-path") ? 1.35 : 1;
      return meterValue(state, "qi-deviation") >= 60 ? demonic * 0.8 : demonic;
    }
  },

  // Небесный Предел: сердце Дао ускоряет культивацию, кармический долг тянет вниз
  xianxia: {
    yearly(ctx) {
      const s = ctx.state;
      if (has(s, "spirit-root") && effectiveStats(s.character).wisdom >= 20 && ctx.rng.chance(0.5)) changeMeter(ctx, "dao-heart", 1);
      if (s.character.karma <= -30) changeMeter(ctx, "karmic-debt", 2);
      else if (ctx.rng.chance(0.5)) changeMeter(ctx, "karmic-debt", -1);
    },
    trackFactor(state) {
      const dao = Math.min(1.4, Math.max(0.8, 1 + (meterValue(state, "dao-heart") - 30) / 200));
      return meterValue(state, "karmic-debt") >= 60 ? dao * 0.8 : dao;
    }
  },

  // Нео-Сеул: угроза Врат над городом растёт каждый год и прорывается событием района.
  // Доход пробуждённых от зачисток считает хозяйство мира (economy/worlds.ts): он входит в доходы года и облагается налогом
  hunter: {
    yearly(ctx) {
      const s = ctx.state;
      // В среднем +4 в год: от 20 до порога 80 — около 15 лет, после прорыва угроза падает на 40–60
      changeMeter(ctx, "gate-threat", ctx.rng.int(2, 6));
      if (meterValue(s, "gate-threat") >= 80 && s.life.age >= 8 && !s.scheduled.some((x) => x.eventId === "hu.district-break")) {
        s.scheduled.push({ eventId: "hu.district-break", age: s.life.age });
      }
      if (meterValue(s, "fame") > 0 && ctx.rng.chance(0.6)) changeMeter(ctx, "fame", -2);
    },
    trackFactor(state) {
      return 1 + meterValue(state, "fame") / 400;
    }
  },

  // Империя Лиреваль: милость двора зависит от сословия и обаяния, скандалы бьют по репутации.
  // Большая милость может поднять семью на ступень выше
  academy: {
    yearly(ctx, emit) {
      const s = ctx.state;
      const universe = ctx.universe;
      const standing = universe.socialClasses.find((c) => c.id === s.character.socialClassId)?.standing ?? 0;
      if (s.life.age >= 12) {
        const drift = (standing >= 3 ? 1 : 0) + (effectiveStats(s.character).charisma >= 20 ? 1 : 0) - (meterValue(s, "court-favor") > 60 ? 1 : 0);
        if (drift !== 0 && ctx.rng.chance(0.6)) changeMeter(ctx, "court-favor", drift);
      }
      changeMeter(ctx, "scandal", -4);
      if (meterValue(s, "scandal") >= 50) applyEffect(ctx, { type: "reputation", delta: -2 });
      if (meterValue(s, "court-favor") >= 75 && standing < 4 && s.life.age >= 18 && ctx.rng.chance(0.15)) {
        const next = universe.socialClasses.find((c) => c.standing === standing + 1);
        if (next) {
          setSocialClass(ctx, next.id);
          changeMeter(ctx, "court-favor", -30);
          emit(
            "quest",
            t("Высочайшая милость", "Imperial favour"),
            t(`Указ императора возводит ${s.character.name} в новое сословие: ${next.name.ru}.`, `An imperial decree raises ${s.character.name} to a new station: ${next.name.en}.`)
          );
        }
      }
    },
    trackFactor(state) {
      return has(state, "academy-student") && (state.character.factions["magic-tower"] ?? 0) >= 30 ? 1.15 : 1;
    }
  }
};

export function worldYearly(ctx: EngineContext, emit: Emit): void {
  RULES[ctx.universe.id].yearly(ctx, emit);
}

export function worldTrackFactor(state: GameState): number {
  return RULES[state.character.universeId].trackFactor(state);
}

/** Сколько лет осталось до конца отпущенного срока */
export function yearsLeft(state: GameState): number {
  return lifespanOf(state.character) - state.life.age;
}
