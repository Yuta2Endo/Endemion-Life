import { cn } from "./cn.js";

/** Разделитель с ромбом посередине */
export function Ornament({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 text-gold-500/70", className)} aria-hidden="true">
      <span className="h-px flex-1 bg-linear-to-r from-transparent to-gold-500/50" />
      <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0">
        <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="currentColor" />
      </svg>
      <span className="h-px flex-1 bg-linear-to-l from-transparent to-gold-500/50" />
    </div>
  );
}
