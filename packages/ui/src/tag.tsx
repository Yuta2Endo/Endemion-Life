import type { ReactNode } from "react";
import { cn } from "./cn.js";

export interface TagProps {
  children: ReactNode;
  tone?: "neutral" | "good" | "bad" | "gold";
  className?: string;
}

const TONES = {
  neutral: "border-line text-bone-300",
  good: "border-jade-500/40 text-jade-300",
  bad: "border-blood-500/40 text-blood-300",
  gold: "border-gold-500/50 text-gold-200"
} as const;

export function Tag({ children, tone = "neutral", className }: TagProps) {
  return <span className={cn("inline-flex items-center rounded border bg-ink-950/50 px-1.5 py-0.5 text-[11px] tabular-nums", TONES[tone], className)}>{children}</span>;
}
