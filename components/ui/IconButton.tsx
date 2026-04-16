import { type ButtonHTMLAttributes } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function IconButton({ className = "", children, ...props }: IconButtonProps) {
  return (
    <button
      className={`w-7 h-7 rounded-[7px] flex items-center justify-center text-t2 transition-all duration-[120ms] hover:bg-surface hover:text-t1 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
