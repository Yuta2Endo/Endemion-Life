import type { UniverseId } from "@endemion/game-core";

/**
 * Wide atmospheric line art for a world plate.
 * Every world gets its own composition so the six are recognisable without colour.
 */
export function WorldPlateArt({ id, accent }: { id: UniverseId; accent: string }) {
  return (
    <svg
      viewBox="0 0 630 270"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="h-full w-full"
      data-testid={`world-art-${id}`}
    >
      <defs>
        <linearGradient id={`plate-fade-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="630" height="270" fill={`url(#plate-fade-${id})`} />
      <g fill="none" stroke={accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.8">
        {id === "dark-fantasy" && (
          <>
            <circle cx="486" cy="74" r="34" opacity="0.55" />
            <path d="M-10 232 L88 138 L150 198 L224 104 L298 214 L360 164 L420 226 L630 210" />
            <path d="M78 232 V156 H118 V232 M86 156 V140 H110 V156" />
            <path d="M88 176 L126 150" opacity="0.6" />
            <path d="M0 246 Q120 238 240 246 T480 244 T630 248" opacity="0.35" />
            <path d="M300 64 L314 92 L300 120 L286 92 Z" opacity="0.6" />
          </>
        )}
        {id === "isekai" && (
          <>
            <path d="M74 190 L164 108 L254 190 Z" />
            <path d="M352 206 L444 120 L536 206 Z" />
            <path d="M120 190 V216 M200 190 V232 M398 206 V236 M492 206 V224" opacity="0.6" />
            <circle cx="314" cy="118" r="48" opacity="0.55" />
            <path d="M266 118 H362 M314 70 V166" opacity="0.4" />
            <path d="M236 70 L314 24 L392 70" opacity="0.7" />
            <path d="M40 230 Q94 214 148 230 T256 228 T364 232 T472 226 T580 232" opacity="0.35" />
          </>
        )}
        {id === "murim" && (
          <>
            <path d="M-10 226 L108 120 L186 200 L282 92 L380 210 L470 140 L630 226" />
            <path d="M86 226 Q210 180 330 218 T630 206" opacity="0.55" />
            <path d="M420 66 L572 218 M548 52 L420 218" opacity="0.7" />
            <path d="M470 118 L510 158" opacity="0.5" />
            <path d="M0 248 Q126 240 252 248 T504 246 T630 250" opacity="0.3" />
            <path d="M180 64 L196 80 M196 64 L180 80" opacity="0.6" />
          </>
        )}
        {id === "xianxia" && (
          <>
            <circle cx="486" cy="80" r="42" opacity="0.5" />
            <path d="M-10 236 L92 154 L150 194 L236 74 L318 202 L386 140 L444 200 L520 118 L630 226" />
            <path d="M0 214 Q80 196 160 214 T320 210 T480 216 T630 208" opacity="0.45" />
            <path d="M0 242 Q92 226 184 242 T368 238 T552 244 T630 240" opacity="0.3" />
            <path d="M330 108 L346 86 L362 108" opacity="0.6" />
          </>
        )}
        {id === "hunter" && (
          <>
            <path d="M44 226 V130 H92 V226 M110 226 V102 H166 V226 M184 226 V150 H230 V226 M514 226 V116 H570 V226 M580 226 V146 H626 V226" />
            <path d="M262 226 V92 H302 V226 M320 226 V64 H360 V226" />
            <path d="M446 56 L494 104 L446 198 L398 104 Z" opacity="0.75" />
            <path d="M446 56 V198 M398 104 H494" opacity="0.4" />
            <path d="M0 240 H630" opacity="0.35" />
            <path d="M86 150 H100 M86 176 H100 M122 122 H154 M204 176 H216 M530 146 H556" opacity="0.55" />
          </>
        )}
        {id === "academy" && (
          <>
            <path d="M96 226 V132 H534 V226" />
            <path d="M124 132 V100 H506 V132" />
            <path d="M160 132 V226 M238 132 V226 M314 132 V226 M390 132 V226 M468 132 V226" opacity="0.7" />
            <path d="M126 226 H504 M96 226 H534" />
            <path d="M252 96 Q314 44 376 96" opacity="0.7" />
            <circle cx="314" cy="78" r="18" opacity="0.55" />
            <path d="M314 60 V96 M296 78 H332" opacity="0.45" />
            <path d="M0 244 H630" opacity="0.3" />
          </>
        )}
      </g>
    </svg>
  );
}
