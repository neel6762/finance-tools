import { iconMap } from "@/lib/icons";

interface ToolToolbarProps {
  title: string;
  icon?: string;
  children?: React.ReactNode;
}

export function ToolToolbar({ title, icon, children }: ToolToolbarProps) {
  const Icon = icon ? iconMap[icon] : null;

  return (
    <div className="h-[48px] md:h-[44px] flex-shrink-0 bg-content border-b border-border px-3 md:px-5 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon size={14} className="text-t2 shrink-0" />}
        <h1 className="text-[14px] md:text-[15px] font-semibold text-t1 tracking-[-0.02em] truncate">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-1 md:gap-1.5 shrink-0">{children}</div>
    </div>
  );
}
