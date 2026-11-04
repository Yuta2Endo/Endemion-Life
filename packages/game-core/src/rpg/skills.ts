// RPG Engine: навыки, ремёсла и образование. Общие определения (rpg/common.ts) и определения мира складываются здесь
import type { CharacterState } from "../types.js";
import type { EducationDefinition, ProfessionDefinition, SkillDefinition, UniverseDefinition } from "../universes/types.js";
import { COMMON_PROFESSIONS, COMMON_SKILLS } from "./common.js";

export const SKILL_MAX = 100;

const skillsByUniverse = new Map<string, readonly SkillDefinition[]>();
const professionsByUniverse = new Map<string, readonly ProfessionDefinition[]>();

/** Навыки мира и общие навыки. Навыки мира идут первыми: первый из них — навык пути силы */
export function allSkills(universe: UniverseDefinition): readonly SkillDefinition[] {
  let list = skillsByUniverse.get(universe.id);
  if (!list) {
    list = [...universe.skills, ...COMMON_SKILLS];
    skillsByUniverse.set(universe.id, list);
  }
  return list;
}

export function findSkill(universe: UniverseDefinition, id: string): SkillDefinition | undefined {
  return allSkills(universe).find((skill) => skill.id === id);
}

/** Навык пути силы мира: его растят тренировки пути и наставник */
export function pathSkill(universe: UniverseDefinition): SkillDefinition {
  return allSkills(universe)[0]!;
}

export function allProfessions(universe: UniverseDefinition): readonly ProfessionDefinition[] {
  let list = professionsByUniverse.get(universe.id);
  if (!list) {
    list = [...universe.professions, ...COMMON_PROFESSIONS];
    professionsByUniverse.set(universe.id, list);
  }
  return list;
}

export function findProfession(universe: UniverseDefinition, id: string): ProfessionDefinition | undefined {
  return allProfessions(universe).find((profession) => profession.id === id);
}

export function findEducation(universe: UniverseDefinition, id: string | null): EducationDefinition | undefined {
  return id === null ? undefined : universe.education.find((education) => education.id === id);
}

/** Ступень образования персонажа: 0 — никакого */
export function educationTier(universe: UniverseDefinition, character: CharacterState): number {
  return findEducation(universe, character.educationId)?.tier ?? 0;
}

export function skillLevel(character: CharacterState, id: string): number {
  return character.skills[id] ?? 0;
}
