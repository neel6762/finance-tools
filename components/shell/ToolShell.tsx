interface ToolShellProps {
  children: React.ReactNode;
}

export function ToolShell({ children }: ToolShellProps) {
  return (
    <div className="flex min-h-0 flex-col flex-1 overflow-hidden tool-enter">
      {children}
    </div>
  );
}
