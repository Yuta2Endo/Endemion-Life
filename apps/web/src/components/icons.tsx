type IconProps = { className?: string };

function LineIcon({ children, className }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function AgeIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M12 3a9 9 0 1 0 9 9" />
      <path d="M12 7v5l3 2" />
      <path d="M18 3v4h-4" />
    </LineIcon>
  );
}

export function HealthIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M3 12h4l2-4 4 8 2-4h6" />
    </LineIcon>
  );
}

export function WealthIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 9h6M12 7v10M9 15h6" />
    </LineIcon>
  );
}

export function SkillIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.9L12 16.4 6.8 19.2l1-5.9-4.3-4.1 5.9-.9Z" />
    </LineIcon>
  );
}

export function RelationIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <circle cx="9" cy="9" r="3" />
      <circle cx="17" cy="10" r="2.4" />
      <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5M15 15.4c2.6.2 4.5 1.9 4.5 4.6" />
    </LineIcon>
  );
}

export function TravelIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M4 17l6-2 8 3 2-1M3 7l5 1 10-3 3 1-9 4-2 7-2-1 1-5-6-1Z" />
    </LineIcon>
  );
}

export function GuildIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M12 3l7 3v5c0 4.2-2.8 7.7-7 9-4.2-1.3-7-4.8-7-9V6Z" />
      <path d="M9 12l2 2 4-4" />
    </LineIcon>
  );
}

export function LegacyIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M12 3v18M5 7h14M7 7v5c0 2.8 2 5 5 5s5-2.2 5-5V7M7 21h10" />
    </LineIcon>
  );
}

export function LifespanIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" />
    </LineIcon>
  );
}
