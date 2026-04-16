import { type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "ghost" | "danger" | "subtle";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-blue)] text-white hover:brightness-110",
  ghost:
    "bg-surface text-t2 border border-border hover:bg-hover hover:text-t1",
  danger:
    "bg-[var(--color-red-dim)] text-[var(--color-red)] hover:bg-[var(--color-red)] hover:text-white",
  subtle:
    "text-t2 hover:bg-hover hover:text-t1",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    variant === "subtle"
      ? "inline-flex items-center gap-1.5 px-2.5 py-2 md:py-1 rounded-[6px] text-[12px] font-medium transition-all duration-[120ms] active:opacity-70"
      : "inline-flex items-center gap-1.5 px-3.5 py-2 md:py-[5px] rounded-[7px] text-[12px] font-medium transition-all duration-[120ms] active:opacity-70";

  return (
    <button
      className={`${base} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
