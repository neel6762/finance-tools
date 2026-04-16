"use client";

import { TOOLS } from "@/config/tools";
import { NavItem } from "./NavItem";

interface SidebarProps {
  open?: boolean;
}

export function Sidebar({ open }: SidebarProps) {
  return (
    <aside
      className={`fixed md:relative inset-y-0 left-0 z-50 md:z-auto w-[220px] flex-shrink-0 bg-shell border-r border-border flex flex-col overflow-hidden transform transition-transform duration-200 md:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="h-[52px] flex-shrink-0 border-b border-border flex items-center px-4">
        <span className="text-[14px] font-semibold text-t1 tracking-[-0.02em]">
          Finance Tools
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {TOOLS.map((tool) => (
          <NavItem key={tool.slug} tool={tool} />
        ))}
      </nav>
      <div className="mt-auto pt-3 border-t border-border px-2.5 pb-2 flex items-center justify-between">
        <span className="text-[11px] text-t3">Finance Tools</span>
        <span className="text-[11px] font-mono text-[var(--color-blue)]">
          v0.1.0
        </span>
      </div>
    </aside>
  );
}
