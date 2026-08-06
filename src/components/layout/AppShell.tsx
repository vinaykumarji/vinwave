import { useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import { PropertiesPanel } from "@/components/layout/PropertiesPanel";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatusBar } from "@/components/layout/StatusBar";
import { Toolbar } from "@/components/layout/Toolbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStudio } from "@/store/studio";

/**
 * Single-window application shell:
 * sidebar · toolbar · workspace · properties panel · status bar.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { propertiesOpen } = useStudio();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Toolbar onOpenSettings={() => navigate({ to: "/settings" })} />

          <div className="flex min-h-0 flex-1">
            <main key={pathname} className="animate-page-in min-w-0 flex-1 overflow-y-auto">
              {children}
            </main>
            {propertiesOpen ? <PropertiesPanel /> : null}
          </div>

          <StatusBar />
        </div>
      </div>
    </TooltipProvider>
  );
}

export function Workspace({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`min-w-0 p-4 ${className ?? ""}`}>{children}</div>;
}
