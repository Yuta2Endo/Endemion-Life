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
export { eventIndex, findEvent, isEligible } from "./narrative/selection.js";

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
export { naturalDeathChance } from "./life/death.js";

export { checkChance, MAX_CHANCE, MIN_CHANCE } from "./engine/checks.js";
export { presentProfile, type InteractionView, type LifeProfile, type MeterView, type NpcView, type QuestView, type SecretView } from "./engine/profile.js";
export { AFFINITY_LIMIT, affinityLabel, FAMILY_ROLES, roleName } from "./character/npcs.js";
export { GIFT_COST, INTERACTION_RULES } from "./character/interactions.js";
export { COMMON_PROFESSIONS, COMMON_SKILLS, COMMON_TALENTS, COMMON_WEAKNESSES, NPC_TRAITS } from "./rpg/common.js";
export { allProfessions, allSkills, educationTier, findEducation, findProfession, findSkill, pathSkill, SKILL_MAX } from "./rpg/skills.js";
export { allTalents, allWeaknesses, findTalent, findWeakness } from "./rpg/talents.js";
export { DEFAULT_COOLDOWN, RECENT_LIMIT } from "./narrative/selection.js";
export { PEOPLE_EVENTS, COMMON_CONSEQUENCES } from "./narrative/people.js";
export { meterValue, worldTrackFactor } from "./world/rules.js";
export { checkCondition, describeCondition } from "./engine/conditions.js";
export { applyAction, newGame, restoreState, SAVE_SCHEMA_VERSION, SEED_MAX_LENGTH, type NewGameInput } from "./engine/game.js";
export { migrateSave, parseSave } from "./engine/save.js";
export { presentEvent, summarizeCharacter, type ChoiceView, type CharacterSummary, type EventView } from "./engine/view.js";
