export * from "./i18n.js";
export * from "./rng.js";
export * from "./stats.js";
export * from "./types.js";
export * from "./errors.js";
export * from "./catalog.js";
export { deepClone } from "./clone.js";

export type * from "./narrative/types.js";
export type * from "./universes/types.js";
export { getUniverse, isUniverseId, listUniverses } from "./universes/registry.js";
export { COMMON_EVENTS } from "./narrative/common.js";
export { eventIndex, eventProblems, findEvent, isEligible } from "./narrative/selection.js";
export {
  canClaim,
  canMove,
  dayKey,
  dueStatus,
  isLiveStatus,
  joinBlock,
  utcDay,
  utcWeek,
  weekKey,
  worldFits,
  LIVE_STATUSES,
  type LiveRules,
  type LiveStatus
} from "./live/ops.js";
export { findTemplate, LIVE_TEMPLATES, type LiveTemplate } from "./live/templates.js";
export {
  balanceNote,
  factProblem,
  isInsightName,
  INSIGHT_HARD_RATE,
  INSIGHT_KEEP_DAYS,
  INSIGHT_MIN_SAMPLE,
  INSIGHT_NAMES,
  type BalanceNote,
  type InsightFact,
  type InsightName
} from "./live/insights.js";

export { TEMPERAMENTS, type TemperamentDefinition } from "./character/temperaments.js";
export {
  generateCharacter,
  normalizeName,
  validateCharacterInput,
  validateName,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  type CharacterInput,
  type GeneratedCharacter
} from "./character/generator.js";
export { effectiveStats, lifespanOf, maxResources, MAX_LEVEL, nextRankThreshold, xpForLevel } from "./character/derived.js";

export { STAGE_INFO, stageForAge } from "./life/stages.js";
export { DEFAULT_MILESTONE_AGES, isMilestoneEvent, milestoneAges, milestoneAt, milestoneEvent, milestoneId } from "./life/milestones.js";
export { toLifeChronicle, type ChronicleCategory, type ChronicleImportance, type LifeChronicleEntry } from "./life/chronicle.js";
export { naturalDeathChance } from "./life/death.js";
export {
  addHealthCondition,
  conditionDeathCause,
  conditionName,
  cureHealthCondition,
  findHealthCondition,
  HEALTH_CONDITIONS,
  HEALTH_MAX,
  HEALTH_MIN,
  healthConditionNames,
  healthFatalCause,
  healthFromState,
  healthValueFromResources,
  healthYear,
  MAX_CONDITION_DAMAGE,
  MAX_CONDITION_YEARS,
  MAX_HEALTH_CONDITIONS,
  newHealthState,
  normalizeHealthState,
  presentHealth,
  type HealthConditionDefinition,
  type HealthConditionView,
  type HealthView,
  type HealthYearResult
} from "./life/health.js";
export {
  EDUCATION_LADDER,
  EDUCATION_TUITION,
  MAX_EDUCATION_DURATION,
  canEnrollEducation,
  educationDuration,
  educationOfTier,
  educationStep,
  educationStepName,
  educationYear,
  enrollEducation,
  newEducationState,
  normalizeEducationState,
  presentEducation,
  tuitionFor,
  type EducationCourseView,
  type EducationStep,
  type EducationView
} from "./life/education.js";
export {
  HOUSEHOLD_AGE,
  MAX_ARREARS,
  PROPERTY_DECAY,
  PROPERTY_KINDS,
  REPAIR_AMOUNT,
  RESIDENCE_NAMES,
  WORLD_PROPERTIES,
  dependentsOf,
  findProperty,
  homeOf,
  householdCrowded,
  householdMembers,
  householdSize,
  householdYear,
  housingCosts,
  leaveHome,
  neglectHome,
  newHouseholdState,
  normalizeHouseholdState,
  ownHome,
  presentHousehold,
  propertiesOf,
  rentHome,
  repairCost,
  repairCostOf,
  repairHome,
  saleValue,
  saleValueOfProperty,
  type HouseholdHomeView,
  type HouseholdMember,
  type HouseholdMemberView,
  type HouseholdView,
  type PropertyDefinition,
  type PropertyKind
} from "./life/household.js";
export {
  BUSINESS_BANKRUPTCY_HARDSHIP,
  BUSINESS_GROWTH_YEARS,
  BUSINESS_LEVEL_COSTS,
  BUSINESS_LEVEL_REVENUE,
  MAX_BUSINESSES,
  MAX_BUSINESS_LOSSES,
  WORLD_BUSINESSES,
  addBusiness,
  businessBadYear,
  businessForecast,
  businessIncome,
  businessNet,
  businessNumbers,
  businessOperatingCosts,
  businessSaleValue,
  businessYear,
  businessesOf,
  findBusiness,
  findVenture,
  investInBusiness,
  newBusinessState,
  normalizeBusinessState,
  presentBusiness,
  removeBusiness,
  type BusinessDefinition,
  type BusinessVentureView,
  type BusinessView,
  type BusinessYearNumbers
} from "./life/business.js";
export {
  EMPLOYMENT_STATUS_NAMES,
  canStartCareer,
  careerTracksOf,
  careerWage,
  careerYear,
  currentRank,
  currentTrack,
  employmentStatus,
  findCareerTrack,
  loseCareer,
  maxCareerRank,
  newCareerState,
  nextRank,
  normalizeCareerState,
  presentCareer,
  promoteCareer,
  promotionReady,
  retireCareer,
  retirementDue,
  startCareer,
  type CareerRankDefinition,
  type CareerTrackDefinition,
  type CareerView
} from "./life/careers.js";

export { checkChance, MAX_CHANCE, MIN_CHANCE } from "./engine/checks.js";
export {
  presentProfile,
  type InteractionView,
  type LifeProfile,
  type MeterView,
  type NpcEventView,
  type NpcStoryView,
  type NpcView,
  type QuestView,
  type RelationshipView,
  type SecretView
} from "./engine/profile.js";
export { AFFINITY_LIMIT, affinityLabel, FAMILY_ROLES, roleName } from "./character/npcs.js";
export { GIFT_COST, INTERACTION_RULES, interactionBlock } from "./character/interactions.js";
export {
  MAX_RELATIONSHIPS,
  MAX_STORY_RECORDS,
  newSocialState,
  normalizeSocialState,
  npcLifeStage,
  npcSettlementId,
  npcSettlementName,
  readSocialState,
  relationshipBetween,
  relationshipName,
  relationshipsOf,
  socialInfluence,
  RELATIONSHIP_NAMES
} from "./character/social.js";
export { activeStoryOf, advanceStory, failStory, findStory, MAX_ACTIVE_STORIES, NPC_STORIES, storyTick } from "./character/stories.js";
export { applyEffect, BOND_AT, BOND_FLAG, changeNpcAffinity } from "./engine/effects.js";
export { COMMON_PROFESSIONS, COMMON_SKILLS, COMMON_TALENTS, COMMON_WEAKNESSES, NPC_TRAITS } from "./rpg/common.js";
export { allProfessions, allSkills, educationTier, findEducation, findProfession, findSkill, pathSkill, SKILL_MAX } from "./rpg/skills.js";
export { allTalents, allWeaknesses, findTalent, findWeakness } from "./rpg/talents.js";
export { DEFAULT_COOLDOWN, RECENT_LIMIT } from "./narrative/selection.js";
export { PEOPLE_EVENTS, COMMON_CONSEQUENCES } from "./narrative/people.js";
export { meterValue, worldTrackFactor } from "./world/rules.js";
export {
  MAX_WORLD_ACTIVITIES,
  MAX_WORLD_SETTLEMENTS,
  SETTLEMENT_KINDS,
  SETTLEMENT_KIND_NAMES,
  SETTLEMENT_TAGS,
  SETTLEMENT_TAG_NAMES,
  findSettlementSeed,
  newWorldState,
  normalizeWorldState,
  presentWorld,
  settlementHasTag,
  settlementSeeds,
  worldTick,
  type SettlementKind,
  type SettlementSeed,
  type SettlementTag,
  type WorldView,
  type WorldViewFaction,
  type WorldViewSettlement
} from "./world/state.js";
export {
  MAX_LOCATION_HISTORY,
  currentSettlement,
  eventLocationWeight,
  locationCostFactor,
  locationMatches,
  locationWageFactor,
  newLocationState,
  normalizeLocationState,
  presentLocation,
  travel,
  travelCostBetween,
  travelCostTo,
  type LocationHistoryView,
  type LocationView,
  type TravelDestinationView,
  type TravelResult
} from "./world/location.js";
export { worldMetrics, type WorldMetrics, type MetricRange, type SettlementMetrics, type FactionMetrics, type ActivityMetrics } from "./world/metrics.js";
export { ADULT_AGE, CYCLE_FACTOR, HARDSHIP_PENALTY_YEARS, economyYear, livingCost, MAX_ECONOMY_YEARS, newEconomy, presentEconomy, tuitionCost, yearLines, type EconomyLineView, type EconomyView } from "./economy/economy.js";
export { economyOf, WORLD_ECONOMIES, type WorldEconomy } from "./economy/worlds.js";
export {
  changeProsperity,
  changeStrain,
  newRegion,
  presentRegion,
  regionFactor,
  regionStock,
  regionYear,
  STOCK_MAX,
  STOCK_REGEN,
  STOCK_START,
  stockBand,
  stockFactor,
  tradeRegion,
  type RegionState,
  type RegionView,
  type StockBand
} from "./economy/region.js";
export {
  BUY_MARKUP,
  findGood,
  goodsOf,
  MARKET_AGE,
  MAX_STOCK,
  MAX_TRADE_QTY,
  presentMarket,
  pricesOf,
  SELL_DISCOUNT,
  WORLD_GOODS,
  type GoodDefinition,
  type GoodView,
  type MarketView
} from "./economy/market.js";
export { checkCondition, describeCondition } from "./engine/conditions.js";
export { applyAction, newGame, restoreState, SAVE_SCHEMA_VERSION, SEED_MAX_LENGTH, type NewGameInput } from "./engine/game.js";
export { findObjective, newMastery, presentMastery, SKILL_MASTERY, type MasteryState, type MasteryView } from "./endgame/mastery.js";
export { migrateSave, parseSave } from "./engine/save.js";
export { importLevelCap, importWealthCap, prepareImport, type ImportAdjustment, type ImportResult } from "./engine/import.js";
export { presentEvent, summarizeCharacter, type ChoiceView, type CharacterSummary, type EventView } from "./engine/view.js";

// Stage 03: родство, род, наследование, сюжеты поколений, достижения, итоги жизни
export { KinGraph, kinProblem, isKin, isPresent, BLOOD_RELATIONS, MIN_PARENT_AGE, MIN_MARRIAGE_AGE, type KinRelation } from "./family/kin.js";
export { MAX_LIVING_NPCS, MAX_NPCS } from "./character/npc-life.js";
export { INHERITANCE_LAWS, lawOf, type InheritanceLaw, type HeirOrder } from "./legacy/laws.js";
export { heirCandidates, succeed, MAX_GENERATIONS, type HeirCandidate, type SuccessionResult } from "./legacy/succession.js";
export { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, findAchievement, unlockAchievements, type AchievementCategory, type AchievementDefinition } from "./legacy/achievements.js";
export { scoreLife, LIFE_TITLES, SCORE_PARTS, SCORE_PART_NAMES, type LifeScore, type ScorePart } from "./legacy/summary.js";
export { LEGACY_EVENTS, LINEAGE_CONSEQUENCES, THREADS } from "./legacy/stories.js";
export { MAX_CHRONICLE, lineageYear } from "./legacy/chronicle.js";
export {
  abandonAdventure,
  adventureBlock,
  beginAdventure,
  MAX_ADVENTURE_LOG,
  newAdventure,
  presentAdventure,
  venture,
  type AdventureBoard,
  type AdventureView as AdventureCardView,
  type ChoiceView as VentureChoiceView,
  type PlaceView,
  type RewardView
} from "./adventure/adventure.js";
export { adventuresOf, contentProblems, findAdventure, findPlace, placesOf } from "./adventure/content.js";
export type { AdventureDefinition, AdventureState, PlaceDefinition, StepOutcome, VentureChoice } from "./adventure/types.js";
export {
  presentHeirs,
  presentLegacy,
  presentLineage,
  renderChronicle,
  DEATH_CAUSE_NAMES,
  NPC_STATUS_NAMES,
  RELATION_NAMES,
  type AchievementView,
  type ChronicleView,
  type DecisionView,
  type HeirView,
  type InheritanceView,
  type LawView,
  type LegacyBrief,
  type CurrentLifeSummaryView,
  type LifeSummaryView,
  type LineageView,
  type TreeNodeView,
  type DynastyView
} from "./legacy/present.js";
