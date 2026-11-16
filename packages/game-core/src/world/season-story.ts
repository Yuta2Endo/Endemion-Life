// R5.12: сезонная история общего мира. Четыре главы на мир: три общие цели и финал.
// История выводится из состояния сезона, не хранится в сохранении и не тратит случайность.
import { t, type LocalizedText } from "../i18n.js";
import type { UniverseId } from "../types.js";

export const SEASON_STORY_CHAPTERS = 4;

export type SeasonGoalId = "prosperity" | "stability" | "factions";
export type SeasonChapterGoal = SeasonGoalId | "final";
export type SeasonChapterStatus = "done" | "active" | "locked";

export interface SeasonGoalView {
  id: string;
  title: LocalizedText;
  current: number;
  target: number;
  progress: number;
  met: boolean;
}

export interface SeasonStoryChapterDefinition {
  id: string;
  title: LocalizedText;
  text: LocalizedText;
  epilogue: LocalizedText;
  goal: SeasonChapterGoal;
}

export interface SeasonStoryDefinition {
  title: LocalizedText;
  lead: LocalizedText;
  chapters: readonly SeasonStoryChapterDefinition[];
}

export const SEASON_STORIES: Readonly<Record<UniverseId, SeasonStoryDefinition>> = {
  "dark-fantasy": {
    title: t("Колокол под стеной", "The Bell beneath the Wall"),
    lead: t("Сезон, когда Пепельная Стена снова слышит колокол. Деревни, дороги и Орден должны решить, кто будет говорить от имени живых.", "A season when the Ashen Wall hears the bell again. Villages, roads and the Order must decide who speaks for the living."),
    chapters: [
      {
        id: "df.season-lamps",
        goal: "prosperity",
        title: t("Огни в деревнях", "Lamps in the villages"),
        text: t("Караваны не доходят до Стены. Зажгите огни в поселениях, и торговля вернётся на дороги.", "Caravans no longer reach the Wall. Light the settlements and trade will return to the roads."),
        epilogue: t("В деревнях снова горят окна. Возчики вспоминают дорогу к Стене.", "Windows burn in the villages again. Carters remember the road to the Wall.")
      },
      {
        id: "df.season-wall",
        goal: "stability",
        title: t("Стена держит", "The Wall holds"),
        text: t("Туман пробует камень на прочность. Порядок в поселениях — это ещё один камень в стену.", "The mist tests the stone. Order in the settlements is another stone in the wall."),
        epilogue: t("Стража стоит ровно. На этот раз стена не треснула.", "The watch stands steady. This time the wall did not crack.")
      },
      {
        id: "df.season-crown",
        goal: "factions",
        title: t("Пепел и корона", "Ash and crown"),
        text: t("Орден и корона тянут Стены в разные стороны. Ни одна сила не должна забрать всё.", "The Order and the crown pull the Wall in different directions. No single power should take it all."),
        epilogue: t("У Стены снова три голоса. Ни один не заглушил остальные.", "The Wall has three voices again. None drowned out the others.")
      },
      {
        id: "df.season-bell",
        goal: "final",
        title: t("Колокол молчит", "The bell is silent"),
        text: t("Когда деревни, стража и Орден выстоят вместе, колокол под водой замолкает.", "When villages, watch and Order stand together, the bell beneath the water falls silent."),
        epilogue: t("Сезон закрыт. Пепельная Стена помнит имена тех, кто не ушёл.", "The season closes. The Ashen Wall remembers the names of those who stayed.")
      }
    ]
  },
  isekai: {
    title: t("Сезон контрактов", "The Season of Contracts"),
    lead: t("Гильдия объявляет сезон открытых контрактов. Города ждут товаров, улицы — тишины, а Лига — своей доли.", "The Guild opens a season of contracts. Cities wait for goods, streets for quiet, and the League for its share."),
    chapters: [
      {
        id: "is.season-caravans",
        goal: "prosperity",
        title: t("Караваны возвращаются", "The caravans return"),
        text: t("Старый тракт снова проходим. Наполните рынки, чтобы караваны не развернулись у ворот.", "The old road is passable again. Fill the markets so caravans do not turn back at the gates."),
        epilogue: t("У ворот снова стоят фургоны. Гильдия записывает первый маршрут сезона.", "Wagons stand at the gates again. The Guild records the season's first route.")
      },
      {
        id: "is.season-streets",
        goal: "stability",
        title: t("Улицы без слухов", "Streets without rumours"),
        text: t("Каждый вечер на улицах новый слух. Порядок в городах гасит их быстрее, чем стража.", "Every evening brings a new rumour. Order in the cities quiets them faster than the watch."),
        epilogue: t("Горожане спорят о ценах, а не о том, кто исчез ночью.", "Citizens argue about prices, not about who vanished in the night.")
      },
      {
        id: "is.season-league",
        goal: "factions",
        title: t("Гильдия и Лига", "The Guild and the League"),
        text: t("Лига предлагает золото, Гильдия — место в реестре. Город не должен принадлежать одной конторе.", "The League offers gold, the Guild a place in the register. The city must not belong to one office."),
        epilogue: t("На дверях Гильдии и Лиги снова две разные печати.", "The Guild and the League have two different seals on their doors again.")
      },
      {
        id: "is.season-name",
        goal: "final",
        title: t("Имя в реестре", "A name in the register"),
        text: t("Сезон закрывают не победой, а записью: кто-то впервые становится именем, а не строкой.", "The season closes not with a victory but with a record: someone becomes a name instead of a line."),
        epilogue: t("Реестр открыт. В нём есть имя, которое город произносит вслух.", "The register is open. It holds a name the city says aloud.")
      }
    ]
  },
  murim: {
    title: t("Турнир у Девяти Рек", "The Tournament of Nine Rivers"),
    lead: t("Реки мелеют, школы собираются на турнир. Рынки ждут гостей, клинки — повода остаться в ножнах.", "The rivers run low and the schools gather for a tournament. Markets wait for guests, blades for a reason to stay sheathed."),
    chapters: [
      {
        id: "mu.season-markets",
        goal: "prosperity",
        title: t("Рынки у реки", "Markets by the river"),
        text: t("Гости турнира приходят за хлебом и слухами. Наполните рынки, и город выдержит наплыв.", "Tournament guests come for bread and rumours. Fill the markets and the city will bear the crowd."),
        epilogue: t("У причалов снова торгуют до темноты. Школы присылают людей за провизией.", "The docks trade until dark again. The schools send people for supplies.")
      },
      {
        id: "mu.season-sheathed",
        goal: "stability",
        title: t("Клинки в ножнах", "Blades sheathed"),
        text: t("Один поединок на улице — и турнир превратится в войну. Держите порядок в городе.", "One duel in the street and the tournament becomes a war. Keep order in the city."),
        epilogue: t("Поединки остались на арене. На улицах считают только выручку.", "Duels remain in the arena. The streets count only takings.")
      },
      {
        id: "mu.season-council",
        goal: "factions",
        title: t("Совет школ", "The council of schools"),
        text: t("Союз, демонический культ и нищие делят место за столом. Ни одна школа не должна решать за всех.", "The Alliance, the demonic cult and the beggars divide seats at the table. No single school should decide for all."),
        epilogue: t("Совет расходится без крови. Это уже победа.", "The council disperses without blood. That is already a victory.")
      },
      {
        id: "mu.season-stone",
        goal: "final",
        title: t("Имя на камне", "A name on the stone"),
        text: t("Победитель турнира получает не корону, а строку на камне у реки.", "The tournament's winner receives not a crown but a line on the stone by the river."),
        epilogue: t("Камень обновлён. Реки уносят старую воду и оставляют новое имя.", "The stone is updated. The rivers carry away old water and leave a new name.")
      }
    ]
  },
  xianxia: {
    title: t("Звёздный колодец", "The Star Well"),
    lead: t("Колодец открывается раз в поколение. Травы на склонах, порядок на пике и воля сект решают, кто увидит небо.", "The well opens once in a generation. Herbs on the slopes, order on the peak and the will of the sects decide who sees the sky."),
    chapters: [
      {
        id: "xi.season-herbs",
        goal: "prosperity",
        title: t("Травы на склонах", "Herbs on the slopes"),
        text: t("Паломники поднимаются к колодцу. Склоны должны накормить их, иначе начнётся давка.", "Pilgrims climb to the well. The slopes must feed them, or the crowd will turn to crush."),
        epilogue: t("На склонах снова собирают травы. Паломники получают еду и место.", "Herbs are gathered on the slopes again. Pilgrims receive food and a place.")
      },
      {
        id: "xi.season-peak",
        goal: "stability",
        title: t("Облако над пиком", "Cloud over the peak"),
        text: t("Чем ближе открытие колодца, тем чаще ссоры на ступенях. Порядок на пике — часть ритуала.", "The closer the well opens, the more often quarrels break out on the steps. Order on the peak is part of the rite."),
        epilogue: t("Ступени свободны. Облако над пиком не окрашено кровью.", "The steps are clear. The cloud over the peak is not stained with blood.")
      },
      {
        id: "xi.season-sects",
        goal: "factions",
        title: t("Секты у колодца", "Sects at the well"),
        text: t("Облачный Пик, Багровая Луна и смертный двор тянут руки к одной чаше.", "Cloud Peak, the Blood Moon and the mortal court reach for one cup."),
        epilogue: t("Чаша остаётся на камне. Ни одна секта не забрала её целиком.", "The cup remains on the stone. No sect took it whole.")
      },
      {
        id: "xi.season-sky",
        goal: "final",
        title: t("Небо отвечает", "The sky answers"),
        text: t("Колодец показывает каждому своё небо. Сезон завершается не ответом, а выбором, что сделать с ним.", "The well shows each person their own sky. The season ends not with an answer but with a choice of what to do with it."),
        epilogue: t("Вода в колодце снова темна. На пике помнят, кто смотрел в неё и не отвернулся.", "The water is dark again. The peak remembers who looked into it and did not turn away.")
      }
    ]
  },
  hunter: {
    title: t("Красный сезон", "The Red Season"),
    lead: t("Врата открываются чаще обычного. Город ждёт спокойных ночей, Ассоциация — закрытых разломов, корпорации — своих людей внутри.", "Gates open more often than usual. The city waits for quiet nights, the Association for sealed rifts, corporations for their people inside."),
    chapters: [
      {
        id: "hu.season-city",
        goal: "prosperity",
        title: t("Город спит спокойно", "The city sleeps quietly"),
        text: t("Ремонт, еда и свет стоят денег. Наполните город, чтобы люди не считали каждую ночь последней.", "Repairs, food and light cost money. Fill the city so people stop counting every night as their last."),
        epilogue: t("Витрины снова светятся после заката. Очереди у убежищ короче.", "Shop windows glow after sunset again. Queues at shelters are shorter.")
      },
      {
        id: "hu.season-gates",
        goal: "stability",
        title: t("Врата под контролем", "The gates under control"),
        text: t("Каждый незакрытый разлом делает следующий прорыв ближе. Держите улицы и врата в порядке.", "Every unsealed rift brings the next break closer. Keep the streets and gates in order."),
        epilogue: t("Ни один прорыв не дошёл до жилых кварталов.", "No break reached the residential blocks.")
      },
      {
        id: "hu.season-powers",
        goal: "factions",
        title: t("Ассоциация и корпорации", "The Association and the corporations"),
        text: t("Частные команды идут в разломы без приказа. Ассоциация должна остаться голосом города, а не одной компании.", "Private teams enter rifts without orders. The Association must remain the city's voice, not one company's."),
        epilogue: t("Отчёты о рейдах снова проходят через один стол.", "Raid reports pass through one desk again.")
      },
      {
        id: "hu.season-zero",
        goal: "final",
        title: t("Ни одного прорыва", "Not a single break"),
        text: t("Сезон заканчивается тишиной в эфире: ни сирен, ни новых имён на стене.", "The season ends with silence on the air: no sirens, no new names on the wall."),
        epilogue: t("Красный сезон закрыт. В городе снова слышно метро, а не сирены.", "The Red Season is closed. The city hears the subway again, not sirens.")
      }
    ]
  },
  academy: {
    title: t("Придворный сезон", "The Court Season"),
    lead: t("Двор открывает сезон. Салоны ждут гостей, император — тишины, Башня и Роза — нового повода для спора.", "The court opens its season. Salons wait for guests, the Emperor for quiet, the Tower and the Rose for a new reason to argue."),
    chapters: [
      {
        id: "ac.season-salon",
        goal: "prosperity",
        title: t("Салон открыт", "The salon is open"),
        text: t("Гости приезжают за разговором и вином. Наполните город, чтобы приём не закончился долгами.", "Guests come for conversation and wine. Fill the city so the reception does not end in debts."),
        epilogue: t("Салон снова полон. Счёт за вино оплачен до последней бутылки.", "The salon is full again. The wine bill is paid to the last bottle.")
      },
      {
        id: "ac.season-scandal",
        goal: "stability",
        title: t("Скандал утихает", "The scandal quiets"),
        text: t("Один неверный поклон — и двор говорит только о нём. Порядок в городе гасит слухи быстрее указов.", "One wrong bow and the court speaks of nothing else. Order in the city quiets rumours faster than decrees."),
        epilogue: t("Двор обсуждает погоду. Это лучший комплимент сезону.", "The court discusses the weather. It is the season's best compliment.")
      },
      {
        id: "ac.season-tower",
        goal: "factions",
        title: t("Трон и Башня", "The throne and the Tower"),
        text: t("Императорский двор, Башня магии и Роза тянут придворную сцену в разные стороны. Ни одна не должна играть одна.", "The Imperial Court, the Magic Tower and the Rose pull the court stage in different directions. None should play alone."),
        epilogue: t("На сцене снова три голоса. Ни один не заглушил остальные.", "Three voices are on the stage again. None drowned out the others.")
      },
      {
        id: "ac.season-star",
        goal: "final",
        title: t("Звезда над дворцом", "A star over the palace"),
        text: t("Сезон закрывают на балу: одна звезда, одно имя и один выбор, который двор запомнит.", "The season closes at a ball: one star, one name and one choice the court will remember."),
        epilogue: t("Звезда над дворцом горит ровно. Двор запомнил, кто её зажёг.", "The star over the palace burns steady. The court remembers who lit it.")
      }
    ]
  }
};

function goalOf(goals: readonly SeasonGoalView[], id: SeasonGoalId): SeasonGoalView | undefined {
  return goals.find((goal) => goal.id === id);
}

/** Собирает сезонную историю из общих целей. Чистая функция: не меняет состояние и не бросает случайность. */
export function presentSeasonStory(universeId: UniverseId, season: number, goals: readonly SeasonGoalView[]): SeasonStoryView {
  const definition = SEASON_STORIES[universeId];
  const coreGoals = (["prosperity", "stability", "factions"] as const).map((id) => goalOf(goals, id));
  const allMet = coreGoals.every((goal) => goal?.met === true);
  const chapterViews = definition.chapters.map((chapter, index): SeasonStoryChapterView => {
    if (chapter.goal === "final") {
      return {
        ...chapter,
        status: allMet ? "done" : "locked",
        progress: allMet ? 100 : Math.round(coreGoals.reduce((sum, goal) => sum + (goal?.progress ?? 0), 0) / 3),
        goalTitle: t("Финал сезона", "Season finale")
      };
    }
    const goal = goalOf(goals, chapter.goal);
    const previousDone = definition.chapters.slice(0, index).every((item) => item.goal === "final" || goalOf(goals, item.goal)?.met === true);
    const status: SeasonChapterStatus = !previousDone ? "locked" : goal?.met ? "done" : "active";
    return {
      ...chapter,
      status,
      progress: goal?.progress ?? 0,
      goalTitle: goal?.title ?? t("Общая цель", "Shared goal")
    };
  });
  const progress = allMet ? 100 : Math.round(coreGoals.reduce((sum, goal) => sum + (goal?.met ? 100 : goal?.progress ?? 0), 0) / 3);
  return {
    universeId,
    season,
    title: definition.title,
    lead: definition.lead,
    progress,
    completed: allMet,
    chapters: chapterViews
  };
}

export interface SeasonStoryChapterView extends SeasonStoryChapterDefinition {
  status: SeasonChapterStatus;
  progress: number;
  goalTitle: LocalizedText;
}

export interface SeasonStoryView {
  universeId: UniverseId;
  season: number;
  title: LocalizedText;
  lead: LocalizedText;
  progress: number;
  completed: boolean;
  chapters: SeasonStoryChapterView[];
}

/** Проверка контента сезонных историй: четыре главы, уникальные id и непустые тексты */
export function seasonStoryProblems(): string[] {
  const problems: string[] = [];
  for (const universeId of Object.keys(SEASON_STORIES) as UniverseId[]) {
    const story = SEASON_STORIES[universeId];
    if (!story.title.ru.trim() || !story.title.en.trim()) problems.push(`${universeId}: пустой заголовок сезона`);
    if (!story.lead.ru.trim() || !story.lead.en.trim()) problems.push(`${universeId}: пустое вступление сезона`);
    if (story.chapters.length !== SEASON_STORY_CHAPTERS) problems.push(`${universeId}: нужно ${SEASON_STORY_CHAPTERS} главы`);
    const ids = new Set<string>();
    for (const chapter of story.chapters) {
      if (ids.has(chapter.id)) problems.push(`${universeId}: повтор главы ${chapter.id}`);
      ids.add(chapter.id);
      for (const [field, text] of Object.entries({ title: chapter.title, text: chapter.text, epilogue: chapter.epilogue })) {
        if (!text.ru.trim() || !text.en.trim()) problems.push(`${universeId}: пустой ${field} в ${chapter.id}`);
      }
    }
    if (story.chapters[story.chapters.length - 1]?.goal !== "final") problems.push(`${universeId}: последняя глава не финальная`);
  }
  return problems;
}
