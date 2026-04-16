"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar open={sidebarOpen} />
      <main className="flex min-h-0 flex-col flex-1 overflow-hidden bg-content">
        <div className="flex md:hidden h-12 flex-shrink-0 items-center px-3 border-b border-border bg-shell">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 flex items-center justify-center text-t2 hover:text-t1 rounded-lg active:bg-hover"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
