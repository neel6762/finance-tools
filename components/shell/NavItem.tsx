"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { iconMap } from "@/lib/icons";
import type { Tool } from "@/config/tools";

interface NavItemProps {
  tool: Tool;
}

export function NavItem({ tool }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === `/tools/${tool.slug}`;
  const Icon = iconMap[tool.icon];

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] cursor-pointer transition-all duration-[120ms] ${
        isActive
          ? "bg-white text-t1 font-medium shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
          : "text-t2 hover:bg-hover hover:text-t1"
      }`}
    >
      {Icon && (
        <Icon
          size={15}
          className={isActive ? "text-[var(--color-blue)]" : ""}
        />
      )}
      <span>{tool.label}</span>
    </Link>
  );
}
