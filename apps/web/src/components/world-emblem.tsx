import type { UniverseId } from "@endemion/game-core";

/** Знак каждой вселенной: тонкие линии вместо картинок, цвет — акцент мира */
const GLYPHS: Readonly<Record<UniverseId, string>> = {
  // Погасшее солнце с пепельными лучами
  "dark-fantasy": "M50 30 A20 20 0 1 0 50.01 30 M50 18 V8 M50 92 V82 M18 50 H8 M92 50 H82 M27 27 L20 20 M73 73 L80 80 M73 27 L80 20 M27 73 L20 80",
  // Врата между мирами
  isekai: "M30 82 V40 A20 20 0 0 1 70 40 V82 M38 82 V44 A12 12 0 0 1 62 44 V82 M24 82 H76",
  // Скрещённые клинки
  murim: "M24 24 L76 76 M76 24 L24 76 M20 30 L30 20 M70 20 L80 30 M44 56 L56 44",
  // Пик над облаками
  xianxia: "M18 74 L42 34 L52 50 L62 38 L82 74 M24 82 Q36 76 50 82 Q64 88 76 82",
  // Разлом подземелья
  hunter: "M50 14 L60 34 L52 46 L64 62 L50 86 L40 64 L48 52 L36 36 Z",
  // Корона академии над раскрытой книгой
  academy: "M28 44 L36 26 L50 38 L64 26 L72 44 Z M22 58 Q36 52 50 60 Q64 52 78 58 V80 Q64 74 50 82 Q36 74 22 80 Z M50 60 V82"
};

export function WorldEmblem({ id, accent, size = 96 }: { id: UniverseId; accent: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="shrink-0">
      <defs>
        <radialGradient id={`halo-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#halo-${id})`} />
      <circle cx="50" cy="50" r="46" fill="none" stroke={accent} strokeOpacity="0.35" strokeWidth="0.8" />
      <circle cx="50" cy="50" r="41" fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="0.6" strokeDasharray="2 3" />
      <path d={GLYPHS[id]} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
