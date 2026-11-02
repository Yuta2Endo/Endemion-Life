import { cn } from "./cn.js";

export interface MeterProps {
  label: string;
  value: number;
  max: number;
  tone?: "gold" | "blood" | "jade" | "azure" | "bone";
  /** Подпись справа. По умолчанию «значение / максимум» */
  caption?: string;
}

const TONES = {
  gold: "from-gold-500 to-gold-300",
  blood: "from-blood-600 to-blood-400",
  jade: "from-jade-600 to-jade-400",
  azure: "from-azure-600 to-azure-400",
  bone: "from-bone-500 to-bone-300"
} as const;

export function Meter({ label, value, max, tone = "gold", caption }: MeterProps) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="uppercase tracking-[0.14em] text-bone-300">{label}</span>
        <span className="tabular-nums text-bone-100">{caption ?? `${value} / ${max}`}</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-ink-950/80 ring-1 ring-line"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div className={cn("h-full rounded-full bg-linear-to-r transition-[width] duration-700 ease-out", TONES[tone])} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
