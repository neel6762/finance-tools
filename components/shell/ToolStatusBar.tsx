interface ToolStatusBarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
}

export function ToolStatusBar({ left, right }: ToolStatusBarProps) {
  return (
    <div className="h-[28px] flex-shrink-0 bg-content border-t border-border px-3 md:px-5 flex items-center justify-between text-[10.5px] font-mono text-t3 overflow-hidden safe-area-bottom">
      <div className="truncate">{left}</div>
      <div className="hidden md:block shrink-0">{right}</div>
    </div>
  );
}
