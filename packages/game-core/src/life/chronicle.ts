import type { LocalizedText } from "../i18n.js";
import type { ChangeKind, HistoryEntry, HistoryKind, UniverseId } from "../types.js";

export type ChronicleCategory =
  | "birth"
  | "childhood"
  | "education"
  | "career"
  | "relationships"
  | "family"
  | "health"
  | "wealth"
  | "travel"
  | "achievements"
  | "conflicts"
  | "major"
  | "death"
  | "legacy";

export type ChronicleImportance = "quiet" | "notable" | "major";

export interface LifeChronicleEntry {
  id: string;
  characterId: string;
  worldId: UniverseId;
  age: number;
  year: number;
  category: ChronicleCategory;
  title: LocalizedText;
  description: LocalizedText;
  decision: LocalizedText | null;
  consequence: LocalizedText | null;
  /** Event id that caused this entry, when the engine can establish it. */
  sourceEventId: string | null;
  /** For a delayed consequence, the source decision/event id. */
  consequenceOf: string | null;
  relatedCharacters: string[];
  importance: ChronicleImportance;
  timestamp: number;
  source: HistoryEntry;
}

function category(kind: HistoryKind, changes: ChangeKind[], age: number): ChronicleCategory {
  if (kind === "birth") return "birth";
  if (kind === "death") return "death";
  if (kind === "legacy") return "legacy";
  if (kind === "adventure" || kind === "travel") return "travel";
  if (kind === "market" || changes.includes("wealth")) return "wealth";
  if (kind === "people" || changes.includes("relation") || changes.includes("npc")) return "relationships";
  if (kind === "event" && age < 18) return "childhood";
  if (changes.includes("education")) return "education";
  if (changes.includes("profession") || changes.includes("class")) return "career";
  if (changes.includes("resource")) return "health";
  if (changes.includes("achievement")) return "achievements";
  return kind === "consequence" ? "major" : "major";
}

function importance(entry: HistoryEntry): ChronicleImportance {
  if (entry.kind === "birth" || entry.kind === "death" || entry.kind === "legacy") return "major";
  if (entry.kind === "event" || entry.kind === "consequence" || entry.kind === "adventure" || entry.kind === "travel") return "notable";
  if (entry.choice || entry.changes.length >= 2) return "notable";
  return "quiet";
}

/**
 * Адаптер существующего журнала действий к хронике Stage 01.
 * Он не создаёт новый источник истины: `source` остаётся тем же HistoryEntry,
 * который уже сохраняется в PostgreSQL/localStorage и участвует в откатах.
 */
export function toLifeChronicle(entries: readonly HistoryEntry[], worldId: UniverseId, characterId: string): LifeChronicleEntry[] {
  return entries
    .map((entry) => ({
      id: entry.eventId ? `${entry.eventId}:${entry.seq}` : `history:${entry.seq}`,
      characterId,
      worldId,
      age: entry.age,
      year: entry.age,
      category: category(entry.kind, entry.changes.map((change) => change.kind), entry.age),
      title: entry.title,
      description: entry.text,
      decision: entry.choice ?? null,
      consequence: entry.outcome ?? null,
      sourceEventId: entry.sourceEventId ?? null,
      consequenceOf: entry.consequenceOf ?? (entry.kind === "consequence" ? entry.sourceEventId ?? null : null),
      relatedCharacters: entry.changes.filter((change) => change.kind === "relation" || change.kind === "npc").map((change) => String(change.value ?? change.key ?? "" )).filter(Boolean),
      importance: importance(entry),
      timestamp: entry.seq,
      source: entry
    }))
    .sort((a, b) => a.age - b.age || a.timestamp - b.timestamp);
}
