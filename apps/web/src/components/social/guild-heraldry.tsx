const FIELDS = [
  ["#B9924F", "#6B4E24"],
  ["#6FA98A", "#315847"],
  ["#B24B37", "#64281E"],
  ["#7C8FA8", "#3B4658"],
  ["#A58A6A", "#5D4B38"],
  ["#8D7FA8", "#493F5D"]
] as const;

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

/** A stable seal for a guild: same name and id always produce the same shield. */
export function GuildHeraldry({ guildId, name, size = 56 }: { guildId: string; name: string; size?: number }) {
  const seed = hash(`${guildId}:${name}`);
  const [field, deep] = FIELDS[seed % FIELDS.length];
  const clip = `guild-seal-${seed.toString(36)}`;

  return (
    <svg width={size} height={Math.round(size * 1.16)} viewBox="0 0 48 56" role="presentation" aria-hidden="true" className="shrink-0">
      <defs>
        <clipPath id={clip}>
          <path d="M3 3h42v29c0 12-10.4 18.6-21 22C13.4 50.6 3 44 3 32Z" />
        </clipPath>
      </defs>
      <path d="M3 3h42v29c0 12-10.4 18.6-21 22C13.4 50.6 3 44 3 32Z" fill={field} />
      <g clipPath={`url(#${clip})`}>
        <path d="M0 0h48v13H0Z" fill={deep} />
        <path d="M0 43 24 22l24 21v10H0Z" fill={deep} opacity="0.55" />
        <path d="M24 13v37" stroke="#E9E2D4" strokeOpacity="0.28" strokeWidth="1" />
      </g>
      <path d="M3 3h42v29c0 12-10.4 18.6-21 22C13.4 50.6 3 44 3 32Z" fill="none" stroke="#E9E2D4" strokeOpacity="0.38" strokeWidth="1.5" />
      <text x="24" y="32" textAnchor="middle" fontFamily="var(--font-alegreya), serif" fontSize="16" fontWeight="600" fill="#E9E2D4">
        {initials(name)}
      </text>
    </svg>
  );
}
