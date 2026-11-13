// Stage 02.3: события жилья, дома и своего дела. Как и события образования и карьеры,
// они строятся из справочников мира, поэтому названия домов и дел совпадают с досье.
// Все решения — обычные варианты событий: отдельного действия в игре нет.
import { t, type LocalizedText } from "../i18n.js";
import { businessesOf, MAX_BUSINESSES, type BusinessDefinition } from "../life/business.js";
import { propertiesOf, repairCostOf, saleValueOfProperty, type PropertyDefinition } from "../life/household.js";
import type { UniverseId } from "../types.js";
import { fx, when } from "./dsl.js";
import type { EventDefinition } from "./types.js";

interface EstateFlavor {
  homeTitle: LocalizedText;
  homeText: LocalizedText;
  stay: LocalizedText;
  maintenanceTitle: LocalizedText;
  maintenanceText: LocalizedText;
  saleTitle: LocalizedText;
  saleText: LocalizedText;
  opportunityTitle: LocalizedText;
  opportunityText: LocalizedText;
  troubleTitle: LocalizedText;
  troubleText: LocalizedText;
}

const FLAVOR: Readonly<Record<UniverseId, EstateFlavor>> = {
  "dark-fantasy": {
    homeTitle: t("Кров над головой", "A roof over your head"),
    homeText: t("В Пепельных Королевствах своя крыша — редкость. У соборной стены можно снять угол, а у ремесленников — выкупить дом.", "In the Ashen Kingdoms a roof of your own is rare. You can rent a corner by the cathedral wall or buy a craftsman's house."),
    stay: t("Остаться при родне", "Stay with kin"),
    maintenanceTitle: t("Дом просит огня и рук", "The house asks for fire and hands"),
    maintenanceText: t("Ставни перекосились, крыша течёт. Плотник обещает починить, иначе дом скоро охладится до улицы.", "The shutters are warped and the roof leaks. A carpenter promises to fix it, or the house will soon be as cold as the street."),
    saleTitle: t("Дом под молоток", "The house under the hammer"),
    saleText: t("Нужда заставляет считать всё, что можно продать. За дом дают золото — в зависимости от состояния.", "Need forces you to count everything that can be sold. The house may fetch gold, depending on its condition."),
    opportunityTitle: t("Своё дело", "A business of your own"),
    opportunityText: t("В цехах говорят: кто держит лавку, тот не кланяется каждому. Можно открыть дело, если хватает золота на первый взнос.", "In the guilds they say a shopkeeper bows to no one. A business can be opened if there is gold for the first stake."),
    troubleTitle: t("Дело буксует", "The business falters"),
    troubleText: t("Счётов больше, чем покупателей. Дело едва сводит концы с концами, и кредиторы уже спрашивают о сроках.", "There are more bills than buyers. The business barely makes ends meet, and creditors are already asking about dates.")
  },
  isekai: {
    homeTitle: t("Свой угол", "A place of your own"),
    homeText: t("В Арденвейле Гильдия и Торговая лига сдают комнаты и продают дома. Комната над лавкой дешевле, дом у стены — просторнее.", "In Ardenvale the Guild and the Merchant League rent rooms and sell houses. A room above a shop is cheaper; a house by the wall is roomier."),
    stay: t("Пожить у знакомых", "Stay with acquaintances"),
    maintenanceTitle: t("Дом требует починки", "The house needs repairs"),
    maintenanceText: t("Прохудилась крыша, а с ней и уверенность в завтрашнем дне. Плотник уже стоит у двери.", "The roof has failed, and with it the certainty of tomorrow. The carpenter is already at the door."),
    saleTitle: t("Продажа дома", "Selling the house"),
    saleText: t("Покупатель нашёлся быстро. Он ждёт ответа и торгуется.", "A buyer turned up quickly. He is waiting for an answer and haggling."),
    opportunityTitle: t("Своё дело", "A business of your own"),
    opportunityText: t("Гильдия выдаёт место у входа, Лига — кредит под будущую выручку. Главное — не прогореть в первый год.", "The Guild offers a place by the entrance, the League a loan against future takings. The trick is not to burn out in the first year."),
    troubleTitle: t("Дело буксует", "The business falters"),
    troubleText: t("Покупатели обходят лоток стороной. Дело теряет деньги, и надо решать: вкладываться, продавать или закрываться.", "Buyers walk past the stall. The business is losing money, and a decision is needed: invest, sell or close."),
  },
  murim: {
    homeTitle: t("Крыша над головой", "A roof over your head"),
    homeText: t("В Девяти Реклах место на постоялом дворе сдаётся, а флигель можно выкупить. Клан смотрит, кто пускает корни.", "In the Nine Rivers a place at the inn can be rented, and a wing bought outright. The clan watches who puts down roots."),
    stay: t("Остаться при клане", "Stay with the clan"),
    maintenanceTitle: t("Дом просит хозяйской руки", "The house asks for a master's hand"),
    maintenanceText: t("Крыша течёт, а во дворе уже шепчутся. Починка не подождёт.", "The roof leaks and the courtyard is already whispering. Repairs will not wait."),
    saleTitle: t("Продать дом", "Sell the house"),
    saleText: t("Покупатель уже торгуется. Для клана продажа дома — тоже разговор.", "A buyer is already haggling. For the clan, selling a house is a conversation too."),
    opportunityTitle: t("Своё дело", "A business of your own"),
    opportunityText: t("Чайная или охранное бюро — оба дела кормят, если за ними следить. Начальный взнос решает, каким путём идти.", "A teahouse or an escort office both feed their owner if watched. The first stake decides the road."),
    troubleTitle: t("Дело буксует", "The business falters"),
    troubleText: t("Долги растут, а выручка тает. Дело держится на честном слове и старых связях.", "Debts grow and takings melt. The business holds on by a word and old connections."),
  },
  xianxia: {
    homeTitle: t("Хижина у жилы", "A hut by the vein"),
    homeText: t("У подножия Небесного Предела можно снять хижину или выкупить её у секты. Говорят, у духовной жилы и спится крепче.", "At the foot of the Heavenly Peak a hut can be rented or bought from the sect. They say one sleeps better by a spirit vein."),
    stay: t("Остаться в секте", "Stay with the sect"),
    maintenanceTitle: t("Хижина просит камня и ци", "The hut asks for stone and qi"),
    maintenanceText: t("Бамбук расшатался, крыша пропускает дождь. Мастер-строитель уже осматривает дом.", "The bamboo is loose and the roof lets in rain. The builder is already inspecting the house."),
    saleTitle: t("Продажа хижины", "Selling the hut"),
    saleText: t("Сосед-ученик давно присматривался. Он готов торговаться.", "A neighbouring disciple has been eyeing it for a while. He is ready to haggle."),
    opportunityTitle: t("Своё дело", "A business of your own"),
    opportunityText: t("Лавка трав или мастерская пилюль — смертные платят золотом, ученики — услугами. Начать можно, если хватает на первый сбор.", "An herb stall or a pill workshop: mortals pay gold, disciples pay in favours. One can start with enough for the first gathering."),
    troubleTitle: t("Дело буксует", "The business falters"),
    troubleText: t("Травы подорожали, покупатели ушли к конкурентам. Дело теряет капитал.", "Herbs have grown dear and buyers have gone to rivals. The business is losing capital."),
  },
  hunter: {
    homeTitle: t("Квартира в Нео-Сеуле", "An apartment in Neo-Seoul"),
    homeText: t("В Нео-Сеуле комнату сдают помесячно, а квартиру можно взять в собственность. Цены кусаются, но своя крыша — своя.", "In Neo-Seoul rooms are rented monthly and apartments bought outright. The prices bite, but your own roof is your own."),
    stay: t("Пожить у родни", "Stay with family"),
    maintenanceTitle: t("Дом требует ремонта", "The home needs repairs"),
    maintenanceText: t("Протечка, старые трубы и управляющий с счётом. Ремонт не подождёт.", "A leak, old pipes and a manager with a bill. Repairs will not wait."),
    saleTitle: t("Продажа квартиры", "Selling the apartment"),
    saleText: t("Агент нашёл покупателя. Покупатель уже смотрит документы.", "The agent has found a buyer. The buyer is already looking over the papers."),
    opportunityTitle: t("Своё дело", "A business of your own"),
    opportunityText: t("Лоток с ядрами у Врат или магазин артефактов — оба варианта кормят, если не прогореть на налогах.", "A core kiosk by the Gates or an artifact shop: both feed their owner if the taxes do not eat them first."),
    troubleTitle: t("Дело буксует", "The business falters"),
    troubleText: t("Аренда растёт, поставки срываются. Дело уходит в минус, и кредиторы звонят каждый день.", "Rent rises and deliveries fail. The business is in the red, and creditors call every day."),
  },
  academy: {
    homeTitle: t("Дом в столице", "A house in the capital"),
    homeText: t("В Империи Лиреваль адрес значит не меньше титула. Снять дом или купить его — дело вкуса и кошелька.", "In the Lireval Empire an address means as much as a title. Renting or buying a house is a matter of taste and purse."),
    stay: t("Остаться при дворе", "Stay at court"),
    maintenanceTitle: t("Дом требует внимания", "The house demands attention"),
    maintenanceText: t("Трещина в стене, облупившийся фасад и счёт от мастера. Починка не подождёт.", "A crack in the wall, a peeling facade and a craftsman's bill. Repairs will not wait."),
    saleTitle: t("Продажа дома", "Selling the house"),
    saleText: t("Покупатель из младших дворян уже назначил цену. В салонах обсуждают сделку.", "A buyer from the lesser nobility has already named a price. The salons are discussing it."),
    opportunityTitle: t("Своё дело", "A business of your own"),
    opportunityText: t("Салон или торговый дом — дело требует не только золота, но и правильных знакомств. Начать можно с первого взноса.", "A salon or a trading house demands not only gold but the right acquaintances. The first stake is enough to begin."),
    troubleTitle: t("Дело буксует", "The business falters"),
    troubleText: t("Расходы двора растут, а гости не спешат платить. Дело теряет капитал и лицо.", "Court expenses grow while guests delay payment. The business is losing capital and face."),
  }
};

function homeEvent(universeId: UniverseId, flavor: EstateFlavor): EventDefinition {
  const homes = propertiesOf(universeId);
  const choices: EventDefinition["choices"] = [];
  for (const property of homes) {
    choices.push({
      id: `rent-${property.id}`,
      text: t(`Снять: ${property.name.ru} (${property.rent} золота в год)`, `Rent: ${property.name.en} (${property.rent} gold a year)`),
      requires: [when.wealth(property.rent)],
      success: {
        text: t(`Ключи от ${property.name.ru} в руке. Теперь за крышу надо платить каждый год.`, `The keys to ${property.name.en} are in hand. The roof must now be paid for every year.`),
        effects: [fx.rentHome(property.id)]
      }
    });
    choices.push({
      id: `buy-${property.id}`,
      text: t(`Купить: ${property.name.ru} (${property.price} золота)`, `Buy: ${property.name.en} (${property.price} gold)`),
      requires: [when.wealth(property.price)],
      success: {
        text: t(`Дом куплен: ${property.name.ru}. ${property.description.ru}`, `The house is bought: ${property.name.en}. ${property.description.en}`),
        effects: [fx.buyProperty(property.id)]
      }
    });
  }
  choices.push({ id: "stay", text: flavor.stay, success: { text: t("Крыша над головой подождёт. Пока есть где спать.", "The roof can wait. There is somewhere to sleep for now."), effects: [] } });
  return {
    id: `home.choice.${universeId}`,
    kind: "life",
    title: flavor.homeTitle,
    text: flavor.homeText,
    minAge: 18,
    cooldown: 3,
    weight: 3.2,
    conditions: [when.housing("homeless")],
    choices
  };
}

function maintenanceEvent(universeId: UniverseId, property: PropertyDefinition, flavor: EstateFlavor): EventDefinition {
  const cost = repairCostOf(property);
  const value = saleValueOfProperty(property, 100);
  return {
    id: `property.maintenance.${universeId}.${property.id}`,
    kind: "life",
    title: flavor.maintenanceTitle,
    text: t(
      `${flavor.maintenanceText.ru} Дом «${property.name.ru}». Починка: ${cost} золота; продажа даст до ${value} золота.`,
      `${flavor.maintenanceText.en} The home is ${property.name.en}. Repairs: ${cost} gold; a sale would bring up to ${value} gold.`
    ),
    minAge: 18,
    cooldown: 3,
    weight: 2.4,
    conditions: [when.home(property.id), when.propertyCondition(40)],
    choices: [
      {
        id: "repair",
        text: t(`Починить (${cost} золота)`, `Repair (${cost} gold)`),
        requires: [when.wealth(cost)],
        success: {
          text: t("Дом снова держит тепло. Плотник обещает, что до следующей зимы.", "The house holds warmth again. The carpenter promises it will last until next winter."),
          effects: [fx.repairProperty(), fx.skill("craft", 1)]
        }
      },
      {
        id: "sell",
        text: t(`Продать дом (до ${value} золота)`, `Sell the house (up to ${value} gold)`),
        success: {
          text: t("Дом уходит с молотка. В кармане золото, за плечами — улица.", "The house goes under the hammer. Gold in hand, the street at your back."),
          effects: [fx.sellProperty()]
        }
      },
      {
        id: "defer",
        text: t("Отложить ремонт", "Put off the repairs"),
        success: {
          text: t("Плотник уходит. Дом скрипит громче, и спать в нём холоднее.", "The carpenter leaves. The house creaks louder and sleeps colder."),
          effects: [fx.neglectHome(15), fx.health(-4)]
        }
      }
    ]
  };
}

function saleEvent(universeId: UniverseId, property: PropertyDefinition, flavor: EstateFlavor): EventDefinition {
  const value = saleValueOfProperty(property, 100);
  return {
    id: `property.sale.${universeId}.${property.id}`,
    kind: "world",
    title: flavor.saleTitle,
    text: t(
      `${flavor.saleText.ru} Дом «${property.name.ru}» оценён не выше ${value} золота.`,
      `${flavor.saleText.en} The home is ${property.name.en}; it is valued at no more than ${value} gold.`
    ),
    minAge: 18,
    cooldown: 5,
    weight: 2,
    conditions: [when.home(property.id), when.hardship(1)],
    choices: [
      {
        id: "sell",
        text: t(`Продать (до ${value} золота)`, `Sell (up to ${value} gold)`),
        success: {
          text: t("Сделка подписана. Дом больше не ваш, но долги стали меньше.", "The deal is signed. The house is no longer yours, but the debts are smaller."),
          effects: [fx.sellProperty()]
        }
      },
      {
        id: "hold",
        text: t("Держаться за дом", "Hold on to the house"),
        success: {
          text: t("Дом остаётся. Придётся искать деньги другим путём.", "The house stays. The money must be found another way."),
          effects: [fx.stat("willpower", 1)]
        }
      }
    ]
  };
}

function businessOpportunityEvent(universeId: UniverseId, flavor: EstateFlavor): EventDefinition {
  const definitions = businessesOf(universeId);
  const choices: EventDefinition["choices"] = definitions.map((definition: BusinessDefinition) => ({
    id: `start-${definition.id}`,
    text: t(`Открыть: ${definition.name.ru} (${definition.cost} золота)`, `Start: ${definition.name.en} (${definition.cost} gold)`),
    requires: [when.wealth(definition.cost), when.business(false, definition.id)],
    success: {
      text: t(`Дело открыто: ${definition.name.ru}. ${definition.description.ru}`, `The business is open: ${definition.name.en}. ${definition.description.en}`),
      effects: [fx.startBusiness(definition.id)]
    }
  }));
  choices.push({
    id: "decline",
    text: t("Пока не время", "Not yet"),
    success: { text: t("Золото остаётся в сундуке. Дело подождёт.", "The gold stays in the chest. The business can wait."), effects: [] }
  });
  const cheapest = Math.min(...definitions.map((definition) => definition.cost));
  return {
    id: `business.opportunity.${universeId}`,
    kind: "life",
    title: flavor.opportunityTitle,
    text: flavor.opportunityText,
    minAge: 18,
    cooldown: 4,
    weight: 2.8,
    // Предложение приходит, пока есть свободное место для ещё одного дела
    conditions: [when.businessCount(undefined, MAX_BUSINESSES - 1), when.wealth(cheapest)],
    choices
  };
}

function businessTroubleEvent(universeId: UniverseId, definition: BusinessDefinition, flavor: EstateFlavor): EventDefinition {
  const invest = Math.max(5, Math.round(definition.capital * 0.6));
  return {
    id: `business.trouble.${universeId}.${definition.id}`,
    kind: "world",
    title: flavor.troubleTitle,
    text: t(
      `${flavor.troubleText.ru} Дело «${definition.name.ru}». Вложить ещё ${invest} золота, продать дело или закрыть его?`,
      `${flavor.troubleText.en} The business is ${definition.name.en}. Put in another ${invest} gold, sell it, or close it?`
    ),
    minAge: 18,
    cooldown: 3,
    weight: 2.5,
    conditions: [when.business(true, definition.id), when.businessLosses(1, definition.id)],
    choices: [
      {
        id: "invest",
        text: t(`Вложить ${invest} золота`, `Invest ${invest} gold`),
        requires: [when.wealth(invest)],
        success: {
          text: t("Капитал пополнен. Дело получает ещё один год, чтобы выправиться.", "Capital is replenished. The business gets another year to recover."),
          effects: [fx.investBusiness(definition.id, invest)]
        }
      },
      {
        id: "sell",
        text: t("Продать дело", "Sell the business"),
        success: {
          text: t("Покупатель нашёлся. Часть капитала возвращается в кошелёк.", "A buyer is found. Part of the capital returns to your purse."),
          effects: [fx.sellBusiness(definition.id)]
        }
      },
      {
        id: "close",
        text: t("Закрыть дело", "Close the business"),
        success: {
          text: t("Вывеска снята, счета закрыты. Капитал потерян, зато долги не растут.", "The sign comes down and the accounts close. The capital is lost, but the debts stop growing."),
          effects: [fx.closeBusiness(definition.id)]
        }
      },
      {
        id: "hold",
        text: t("Продержаться ещё год", "Hold on another year"),
        success: {
          text: t("Дело работает как работает. Время покажет.", "The business runs as it runs. Time will tell."),
          effects: [fx.stat("willpower", 1)]
        }
      }
    ]
  };
}

/** События жилья и дела для одного мира. Строятся один раз при сборке вселенной */
export function estateEventsFor(universeId: UniverseId): EventDefinition[] {
  const flavor = FLAVOR[universeId];
  const events: EventDefinition[] = [homeEvent(universeId, flavor), businessOpportunityEvent(universeId, flavor)];
  for (const property of propertiesOf(universeId)) {
    events.push(maintenanceEvent(universeId, property, flavor));
    events.push(saleEvent(universeId, property, flavor));
  }
  for (const definition of businessesOf(universeId)) events.push(businessTroubleEvent(universeId, definition, flavor));
  return events;
}
