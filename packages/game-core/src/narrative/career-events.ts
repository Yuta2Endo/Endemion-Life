// Stage 02.2: события образования и карьеры. Строятся из справочников мира,
// поэтому названия школ, профессий и ступеней всегда совпадают с досье и не расходятся с ним.
import { t, type LocalizedText } from "../i18n.js";
import { EDUCATION_LADDER, educationStep, tuitionFor } from "../life/education.js";
import { careerTracksOf, type CareerTrackDefinition } from "../life/careers.js";
import type { EducationDefinition, ProfessionDefinition } from "../universes/types.js";
import type { UniverseId } from "../types.js";
import { check, fx, when } from "./dsl.js";
import type { EventDefinition } from "./types.js";

interface Flavor {
  work: LocalizedText;
  promotion: LocalizedText;
  layoff: LocalizedText;
  retirement: LocalizedText;
}

const FLAVOR: Readonly<Record<UniverseId, Flavor>> = {
  "dark-fantasy": {
    work: t("Цеха и Орден ищут людей.", "The guilds and the Order are looking for people."),
    promotion: t("Орден замечает усердие.", "The Order notices diligence."),
    layoff: t("Голодные годы добрались и до цехов.", "The hungry years have reached the guilds."),
    retirement: t("Мгла больше не по силам.", "The Mist is more than the body can bear.")
  },
  isekai: {
    work: t("Гильдии и мастерские ищут людей.", "Guilds and workshops are looking for people."),
    promotion: t("Гильдия замечает усердие.", "The Guild notices diligence."),
    layoff: t("Застой на рынках добрался и до Гильдии.", "The stagnant markets have reached the Guild."),
    retirement: t("Приключения больше не по силам.", "Adventuring is more than the body can bear.")
  },
  murim: {
    work: t("Охранные бюро и лекари ищут людей.", "Escort agencies and physicians are looking for people."),
    promotion: t("Старейшины замечают усердие.", "The elders notice diligence."),
    layoff: t("Смутные годы добрались и до бюро.", "The troubled years have reached the agencies."),
    retirement: t("Клинок больше не по силам.", "The blade is more than the body can bear.")
  },
  xianxia: {
    work: t("Секты и мастерские ищут людей.", "Sects and workshops are looking for people."),
    promotion: t("Старейшины замечают усердие.", "The elders notice diligence."),
    layoff: t("Скудная ци добралась и до мастерских.", "Thin qi has reached the workshops."),
    retirement: t("Путь больше не по силам.", "The path is more than the body can bear.")
  },
  hunter: {
    work: t("Ассоциация и корпорации ищут людей.", "The Association and the corporations are looking for people."),
    promotion: t("Ассоциация замечает усердие.", "The Association notices diligence."),
    layoff: t("Спад на рынке артефактов добрался и до контор.", "The artifact slump has reached the offices."),
    retirement: t("Врата больше не по силам.", "The Gates are more than the body can bear.")
  },
  academy: {
    work: t("Двор и Башня ищут людей.", "The court and the Tower are looking for people."),
    promotion: t("Двор замечает усердие.", "The court notices diligence."),
    layoff: t("Пустая казна добралась и до дворца.", "An empty treasury has reached the palace."),
    retirement: t("Служба больше не по силам.", "Service is more than the body can bear.")
  }
};

function schoolEvent(universeId: UniverseId, school: EducationDefinition, flavor: Flavor): EventDefinition {
  const step = educationStep(school.tier) ?? EDUCATION_LADDER[0]!;
  return {
    id: `edu.school.${universeId}`,
    kind: "personal",
    title: t(`Школа: ${school.name.ru}`, `School: ${school.name.en}`),
    text: t(
      `${school.description.ru} Наставники берут учеников на ${step.duration} года. ${flavor.work.ru}`,
      `${school.description.en} The teachers take pupils for ${step.duration} years. ${flavor.work.en}`
    ),
    minAge: step.minAge,
    maxAge: step.minAge + 6,
    maxOccurrences: 2,
    cooldown: 2,
    weight: 2,
    conditions: [when.educationAtMost(0), when.studying(false)],
    choices: [
      {
        id: "study",
        text: t("Учиться", "Study"),
        success: {
          text: t(`Начинается учёба: ${school.name.ru}.`, `Study begins: ${school.name.en}.`),
          effects: [fx.enrollEducation(school.id)]
        }
      },
      {
        id: "work",
        text: t("Остаться при хозяйстве", "Stay with the household"),
        success: {
          text: t("Руки нужны дома. Грамота подождёт.", "Hands are needed at home. Letters can wait."),
          effects: [fx.skill("craft", 2)]
        }
      }
    ]
  };
}

function advancedSchoolEvent(universeId: UniverseId, school: EducationDefinition, flavor: Flavor, previousTier: number): EventDefinition {
  const step = educationStep(school.tier) ?? EDUCATION_LADDER[0]!;
  const tuition = tuitionFor(universeId, school.tier);
  const trade = school.tier === 2;
  return {
    id: trade ? `edu.trade.${universeId}` : `edu.university.${universeId}`,
    kind: "personal",
    title: t(
      trade ? `Следующая ступень: ${school.name.ru}` : `Высшая ступень: ${school.name.ru}`,
      trade ? `Next step: ${school.name.en}` : `Higher learning: ${school.name.en}`
    ),
    text: t(
      `${school.description.ru} Обучение длится ${step.duration} года и стоит ${tuition} золота в год. Путь открыт тем, кто уже прошёл предыдущую ступень.`,
      `${school.description.en} The course lasts ${step.duration} years and costs ${tuition} gold a year. It is open to those who completed the previous step.`
    ),
    minAge: step.minAge,
    maxAge: step.minAge + 14,
    maxOccurrences: 2,
    cooldown: 3,
    weight: 2,
    conditions: [when.education(previousTier), when.educationAtMost(previousTier), when.studying(false)],
    choices: [
      {
        id: "enroll",
        text: t(`Поступить (${tuition} золота в год)`, `Enrol (${tuition} gold a year)`),
        requires: tuition > 0 ? [when.wealth(tuition)] : [],
        success: {
          text: t(`Начинается обучение: ${school.name.ru}.`, `The course begins: ${school.name.en}.`),
          effects: [fx.enrollEducation(school.id)]
        }
      },
      {
        id: "decline",
        text: t("Пока не время", "Not yet"),
        success: {
          text: t("Учение подождёт. Жизнь идёт своим чередом.", "Learning can wait. Life goes on."),
          effects: []
        }
      }
    ]
  };
}

function specializationEvent(universeId: UniverseId, universeEducation: readonly EducationDefinition[], specializations: readonly { id: string; name: LocalizedText; description: LocalizedText }[], flavor: Flavor): EventDefinition | null {
  const highest = universeEducation.reduce<EducationDefinition | undefined>((best, item) => (best === undefined || item.tier > best.tier ? item : best), undefined);
  if (!highest || specializations.length === 0) return null;
  return {
    id: `edu.specialize.${universeId}`,
    kind: "path",
    title: t("Выбор специализации", "Choosing a specialization"),
    text: t(
      `Обучение завершено: ${highest.name.ru}. Пора выбрать, каким путём идти дальше. ${flavor.work.ru}`,
      `The course is complete: ${highest.name.en}. It is time to choose the road ahead. ${flavor.work.en}`
    ),
    minAge: 18,
    cooldown: 4,
    weight: 1.6,
    conditions: [when.education(highest.tier), when.noSpecialization()],
    choices: specializations.map((specialization) => ({
      id: specialization.id,
      text: specialization.name,
      success: {
        text: specialization.description,
        effects: [fx.specialization(specialization.id)]
      }
    }))
  };
}

function professionName(professions: readonly ProfessionDefinition[], id: string): LocalizedText {
  return professions.find((profession) => profession.id === id)?.name ?? t(id, id);
}

function careerOfferEvent(universeId: UniverseId, professions: readonly ProfessionDefinition[], flavor: Flavor): EventDefinition {
  const tracks = careerTracksOf(universeId);
  return {
    id: `career.offer.${universeId}`,
    kind: "personal",
    title: t("Работа ищет человека", "Work seeks a person"),
    text: t(
      `${flavor.work.ru} Место зависит от образования и навыков: недоступное отмечено причиной.`,
      `${flavor.work.en} The place depends on education and skills: unavailable offers show the reason.`
    ),
    minAge: 16,
    cooldown: 2,
    weight: 2.4,
    conditions: [when.employment("unemployed"), when.studying(false)],
    choices: tracks.map((track: CareerTrackDefinition) => {
      const profession = professionName(professions, track.professionId);
      const first = track.ranks[0]!;
      return {
        id: `take-${track.professionId}`,
        text: t(`${profession.ru} — ${first.name.ru}`, `${profession.en} — ${first.name.en}`),
        requires: [when.education(track.education), when.skill(track.skill, track.skillMin)],
        success: {
          text: t(
            `Первый день на новом месте. ${profession.ru}, ступень «${first.name.ru}».`,
            `First day at the new place. ${profession.en}, rank ${first.name.en}.`
          ),
          effects: [fx.startCareer(track.professionId)]
        }
      };
    })
  };
}

function promotionEvent(universeId: UniverseId, flavor: Flavor): EventDefinition {
  return {
    id: `career.promotion.${universeId}`,
    kind: "personal",
    title: t("Повышение", "Promotion"),
    text: t(
      `${flavor.promotion.ru} Начальство спрашивает, готов ли {name} взять больше ответственности.`,
      `${flavor.promotion.en} The superiors ask whether {name} is ready for more responsibility.`
    ),
    minAge: 18,
    cooldown: 3,
    weight: 2.2,
    conditions: [when.employment("employed"), when.promotionReady()],
    choices: [
      {
        id: "ask",
        text: t("Просить повышения", "Ask for the promotion"),
        check: check(["willpower", "charisma"], 12, 0, { skill: "persuasion" }),
        success: {
          text: t("Ступень выше. Жалованье тоже.", "A rank higher. The wages too."),
          effects: [fx.promoteCareer(), fx.rep(1)]
        },
        failure: {
          text: t("Ответ уклончивый. Придётся подождать.", "The answer is evasive. Waiting is required."),
          effects: [fx.stat("wisdom", 1)]
        }
      },
      {
        id: "wait",
        text: t("Пока остаться на месте", "Stay where you are for now"),
        success: {
          text: t("Работа знакомая. Уверенность крепнет.", "The work is familiar. Confidence grows."),
          effects: [fx.skill("persuasion", 1)]
        }
      }
    ]
  };
}

function layoffEvent(universeId: UniverseId, flavor: Flavor): EventDefinition {
  return {
    id: `career.layoff.${universeId}`,
    kind: "world",
    title: t("Сокращение", "Layoff"),
    text: t(
      `${flavor.layoff.ru} Список мест уже лежит на столе, и {name} в нём есть.`,
      `${flavor.layoff.en} The list of positions is already on the table, and {name} is on it.`
    ),
    minAge: 18,
    cooldown: 6,
    weight: 1.5,
    conditions: [when.employment("employed"), when.careerRisk(1)],
    choices: [
      {
        id: "hold",
        text: t("Держаться за место", "Fight for the position"),
        check: check(["willpower", "charisma"], 13, 0, { skill: "persuasion" }),
        success: {
          text: t("Место остаётся за {name}. Пока.", "The position stays with {name}. For now."),
          effects: [fx.rep(1)]
        },
        failure: {
          text: t("Список не переписали. Работа потеряна, но выходное пособие выплачено.", "The list was not rewritten. The job is lost, but severance is paid."),
          effects: [fx.severance(1), fx.loseCareer()]
        }
      },
      {
        id: "accept",
        text: t("Уйти с выходным пособием", "Leave with severance"),
        success: {
          text: t("Расчёт подписан. Впереди — поиск нового места.", "The settlement is signed. A new position must be found."),
          effects: [fx.severance(2), fx.loseCareer()]
        }
      }
    ]
  };
}

function retirementEvent(universeId: UniverseId, flavor: Flavor): EventDefinition {
  return {
    id: `career.retirement.${universeId}`,
    kind: "age",
    title: t("Пора на покой", "Time to retire"),
    text: t(
      `${flavor.retirement.ru} Работа больше не держит, а дом ждёт. Можно передать дела и жить на сбережения.`,
      `${flavor.retirement.en} Work no longer holds, and home is waiting. The affairs can be handed over and life continued on savings.`
    ),
    minAge: 45,
    cooldown: 2,
    weight: 4,
    conditions: [when.retirementDue()],
    choices: [
      {
        id: "retire",
        text: t("Выйти на покой", "Retire"),
        success: {
          text: t("Жалованье остаётся в прошлом. Впереди — тишина и свои дни.", "Wages are left behind. Ahead lie quiet and one's own days."),
          effects: [fx.retireCareer(), fx.rep(2)]
        }
      },
      {
        id: "stay",
        text: t("Поработать ещё", "Work a little longer"),
        success: {
          text: t("Дела не отпускают. {name} остаётся ещё на год.", "Affairs do not let go. {name} stays another year."),
          effects: [fx.stat("willpower", 1)]
        }
      }
    ]
  };
}

/** События образования и карьеры для одного мира. Строятся один раз при сборке вселенной */
export function careerEventsFor(
  universeId: UniverseId,
  education: readonly EducationDefinition[],
  specializations: readonly { id: string; name: LocalizedText; description: LocalizedText }[],
  professions: readonly ProfessionDefinition[]
): EventDefinition[] {
  const flavor = FLAVOR[universeId];
  const events: EventDefinition[] = [];
  const tiers = [...education].sort((a, b) => a.tier - b.tier);
  const school = tiers.find((item) => item.tier === 1);
  const trade = tiers.find((item) => item.tier === 2);
  const university = tiers.find((item) => item.tier === 3);
  if (school) events.push(schoolEvent(universeId, school, flavor));
  if (trade) events.push(advancedSchoolEvent(universeId, trade, flavor, 1));
  if (university) events.push(advancedSchoolEvent(universeId, university, flavor, 2));
  const specialization = specializationEvent(universeId, education, specializations, flavor);
  if (specialization) events.push(specialization);
  events.push(careerOfferEvent(universeId, professions, flavor));
  events.push(promotionEvent(universeId, flavor));
  events.push(layoffEvent(universeId, flavor));
  events.push(retirementEvent(universeId, flavor));
  return events;
}
