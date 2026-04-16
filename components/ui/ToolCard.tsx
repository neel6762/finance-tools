interface ToolCardProps {
  children: React.ReactNode;
  className?: string;
}

export function ToolCard({ children, className = "" }: ToolCardProps) {
  return (
    <div className={`bg-s2 border border-border rounded-[10px] p-4 ${className}`}>
      {children}
    </div>
  );
}
