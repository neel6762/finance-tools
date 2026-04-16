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
        <div className="flex md:hidden h-10 flex-shrink-0 items-center px-3 border-b border-border bg-shell">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-t2 hover:text-t1 rounded"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
