interface ChartTooltipShellProps {
  active?: boolean;
  children: React.ReactNode;
}

export function ChartTooltipShell({ active, children }: ChartTooltipShellProps) {
  if (!active) return null;
  return (
    <div className="bg-[var(--color-bg-surface-2)] border border-border rounded-[7px] p-3 text-[12px] font-mono shadow-lg">
      {children}
    </div>
  );
}
