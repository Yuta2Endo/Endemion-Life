import type { HTMLAttributes } from "react";
import { cn } from "./cn.js";

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: "section" | "div" | "article" | "aside";
  /** Золотая рамка для главного блока экрана */
  accent?: boolean;
  tone?: "default" | "quiet";
}

export function Panel({ as: Tag = "section", accent = false, tone = "default", className, ...props }: PanelProps) {
  return (
    <Tag
      className={cn(
        "relative rounded-sm border bg-ink-900 p-5",
        tone === "quiet" ? "bg-transparent" : "",
        accent ? "border-gold-500/55" : "border-line",
        className
      )}
      {...props}
    />
  );
}
