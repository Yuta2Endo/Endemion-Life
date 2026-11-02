import type { HTMLAttributes } from "react";
import { cn } from "./cn.js";

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: "section" | "div" | "article" | "aside";
  /** Золотая рамка для главного блока экрана */
  accent?: boolean;
}

export function Panel({ as: Tag = "section", accent = false, className, ...props }: PanelProps) {
  return (
    <Tag
      className={cn(
        "relative rounded-xl border bg-linear-to-b from-ink-800/90 to-ink-900/90 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-sm",
        accent ? "border-gold-500/45" : "border-line",
        className
      )}
      {...props}
    />
  );
}
