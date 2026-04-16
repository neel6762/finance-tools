interface LabelProps {
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export function Label({ htmlFor, className, children }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={className ?? "block text-[12px] font-medium text-t2 mb-1.5"}
    >
      {children}
    </label>
  );
}
