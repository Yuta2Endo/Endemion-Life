import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn.js";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "quiet";
  size?: "md" | "lg";
}

const VARIANTS = {
  primary:
    "border-gold-400/70 bg-linear-to-b from-gold-400/25 to-gold-600/10 text-gold-200 shadow-[0_0_24px_-8px_var(--color-gold-400)] hover:border-gold-300 hover:from-gold-400/35 hover:text-gold-100",
  ghost: "border-line bg-ink-800/60 text-bone-100 hover:border-gold-500/60 hover:text-gold-200",
  quiet: "border-transparent bg-transparent text-bone-300 hover:text-gold-200"
} as const;

const SIZES = { md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" } as const;

/** Классы кнопки. Нужны и ссылкам, которые выглядят как кнопка: кнопку нельзя класть внутрь ссылки */
export function buttonClass({ variant = "ghost", size = "md", className }: Pick<ButtonProps, "variant" | "size" | "className"> = {}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md border font-medium tracking-wide transition duration-200",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300",
    "disabled:cursor-not-allowed disabled:opacity-45",
    VARIANTS[variant],
    SIZES[size],
    className
  );
}

export function Button({ variant = "ghost", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />;
}
